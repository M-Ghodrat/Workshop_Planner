import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Material, MaterialCategory, UserProfile } from '../types';
import { fileStorage } from '../utils/fileStorage';
import { INITIAL_MATERIALS } from '../data/initialData';

const COLLECTION_NAME = 'materials';
const LOCAL_STORAGE_KEY = 'ucw_cached_materials';

const getStoredMaterials = (): Material[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MATERIALS));
  return INITIAL_MATERIALS;
};

const saveStoredMaterials = (list: Material[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
};

type SubscriberCallback = (materials: Material[]) => void;
const subscribers = new Set<SubscriberCallback>();
let cachedMaterials: Material[] = getStoredMaterials();

function notifySubscribers(list: Material[]) {
  cachedMaterials = list;
  saveStoredMaterials(list);
  subscribers.forEach((cb) => {
    try {
      cb(list);
    } catch (e) {
      console.warn('Subscriber notification error:', e);
    }
  });
}

function mergeMaterialLists(primary: Material[], secondary: Material[]): Material[] {
  const map = new Map<string, Material>();
  primary.forEach((m) => {
    if (m.id) map.set(m.id, m);
  });
  secondary.forEach((m) => {
    if (m.id && !map.has(m.id)) {
      map.set(m.id, m);
    }
  });
  return Array.from(map.values());
}

export const materialService = {
  subscribeMaterials: (
    onSuccess: (materials: Material[]) => void,
    onError?: (err: any) => void,
    workshopId?: string
  ) => {
    subscribers.add(onSuccess);

    const initial = getStoredMaterials();
    const initialFiltered = workshopId
      ? initial.filter((m) => m.workshopId === workshopId)
      : initial;
    onSuccess(initialFiltered);

    // Load from local IndexedDB
    fileStorage.getAllMetadata().then(async (localList: Material[]) => {
      if (localList && localList.length > 0) {
        const hydrated = await Promise.all(
          localList.map(async (m) => {
            if (!m.downloadUrl || m.downloadUrl.startsWith('blob:')) {
              const liveUrl = await fileStorage.getFileUrl(m.id || '');
              if (liveUrl) return { ...m, downloadUrl: liveUrl };
            }
            return m;
          })
        );
        const merged = mergeMaterialLists(cachedMaterials, hydrated);
        notifySubscribers(merged);
      }
    });

    try {
      const collRef = collection(db, COLLECTION_NAME);
      const q = workshopId
        ? query(collRef, where('workshopId', '==', workshopId))
        : query(collRef, orderBy('createdAt', 'desc'));

      const unsubscribeFirestore = onSnapshot(
        q,
        async (snapshot) => {
          if (!snapshot.empty) {
            const firestoreList: Material[] = snapshot.docs.map((docSnap) => ({
              ...(docSnap.data() as Omit<Material, 'id'>),
              id: docSnap.id,
            }));

            const localList = await fileStorage.getAllMetadata();
            const combined = mergeMaterialLists(firestoreList, localList);
            notifySubscribers(combined);
          } else {
            notifySubscribers(getStoredMaterials());
          }
        },
        (error) => {
          console.warn('Materials Firestore subscription fallback:', error?.message || error);
          notifySubscribers(getStoredMaterials());
        }
      );

      return () => {
        subscribers.delete(onSuccess);
        if (typeof unsubscribeFirestore === 'function') {
          unsubscribeFirestore();
        }
      };
    } catch (error) {
      console.warn('Failed to initialize materials subscription:', error);
      return () => {
        subscribers.delete(onSuccess);
      };
    }
  },

  getAllMaterials: async (workshopId?: string): Promise<Material[]> => {
    try {
      const collRef = collection(db, COLLECTION_NAME);
      const q = workshopId ? query(collRef, where('workshopId', '==', workshopId)) : collRef;
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const list: Material[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<Material, 'id'>),
          id: docSnap.id,
        }));
        const localList = await fileStorage.getAllMetadata();
        const combined = mergeMaterialLists(list, localList);
        saveStoredMaterials(combined);
        return workshopId ? combined.filter((m) => m.workshopId === workshopId) : combined;
      }
    } catch (error) {
      console.warn('getAllMaterials fallback:', error);
    }
    const current = getStoredMaterials();
    return workshopId ? current.filter((m) => m.workshopId === workshopId) : current;
  },

  uploadMaterial: async (
    file: File,
    metadata: {
      title: string;
      description?: string;
      category: MaterialCategory;
      workshopId?: string;
      workshopTitle?: string;
      activityId?: string;
    },
    user: UserProfile,
    onProgress?: (progress: number) => void
  ): Promise<Material> => {
    const fileId = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storagePath = `materials/${fileId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const newMaterial: Material = {
      id: fileId,
      title: metadata.title,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      description: metadata.description || '',
      category: metadata.category,
      downloadUrl: URL.createObjectURL(file),
      storagePath,
      workshopId: metadata.workshopId,
      workshopTitle: metadata.workshopTitle,
      activityId: metadata.activityId,
      uploadedBy: user.id,
      uploadedByName: user.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to IndexedDB
    try {
      await fileStorage.saveFile(fileId, file);
      await fileStorage.saveMetadata(newMaterial);
    } catch (e) {
      console.warn('IndexedDB save notice:', e);
    }

    // Save to Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, fileId);
      await setDoc(docRef, newMaterial);
    } catch (e) {
      console.warn('Firestore material sync notice:', e);
    }

    // Update active cache
    notifySubscribers([newMaterial, ...cachedMaterials]);
    onProgress?.(100);
    return newMaterial;
  },

  relinkMaterialsToWorkshop: async (
    tempWorkshopId: string,
    realWorkshopId: string,
    workshopTitle?: string
  ): Promise<void> => {
    const all = getStoredMaterials();
    const updated = all.map((m) => {
      if (m.workshopId === tempWorkshopId) {
        return {
          ...m,
          workshopId: realWorkshopId,
          workshopTitle: workshopTitle || m.workshopTitle,
        };
      }
      return m;
    });
    notifySubscribers(updated);
  },

  deleteMaterial: async (materialId: string, storagePath?: string): Promise<void> => {
    try {
      await fileStorage.deleteFile(materialId);
      await fileStorage.deleteMetadata(materialId);
    } catch (e) {}

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, materialId));
    } catch (e) {}

    const updated = cachedMaterials.filter((m) => m.id !== materialId);
    notifySubscribers(updated);
  },
};
