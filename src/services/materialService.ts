import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage, handleFirestoreError } from '../config/firebase';
import { Material, MaterialCategory, UserProfile, OperationType } from '../types';
import { fileStorage } from '../utils/fileStorage';

const COLLECTION_NAME = 'materials';

// Global memory cache of active subscribers for instant optimistic updates
type SubscriberCallback = (materials: Material[]) => void;
const subscribers = new Set<SubscriberCallback>();
let cachedMaterials: Material[] = [];

function notifySubscribers(list: Material[]) {
  cachedMaterials = list;
  subscribers.forEach((cb) => {
    try {
      cb(list);
    } catch (e) {
      console.warn('Subscriber notification error:', e);
    }
  });
}

export const materialService = {
  // Subscribe to materials with dual Firestore + IndexedDB synchronization
  subscribeMaterials: (
    onSuccess: (materials: Material[]) => void,
    onError?: (err: any) => void,
    workshopId?: string
  ) => {
    subscribers.add(onSuccess);

    // If we already have cached materials, emit them immediately
    if (cachedMaterials.length > 0) {
      const filtered = workshopId
        ? cachedMaterials.filter((m) => m.workshopId === workshopId)
        : cachedMaterials;
      onSuccess(filtered);
    }

    // Load from local IndexedDB first for instant rendering
    fileStorage.getAllMetadata().then(async (localList: Material[]) => {
      if (localList && localList.length > 0) {
        // Hydrate object URLs for files stored in IndexedDB
        const hydrated = await Promise.all(
          localList.map(async (m) => {
            if (!m.downloadUrl || m.downloadUrl.startsWith('blob:')) {
              const liveUrl = await fileStorage.getFileUrl(m.id);
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
      let q = workshopId
        ? query(collRef, where('workshopId', '==', workshopId))
        : query(collRef, orderBy('createdAt', 'desc'));

      const unsubscribeFirestore = onSnapshot(
        q,
        async (snapshot) => {
          const firestoreList: Material[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<Material, 'id'>),
            id: docSnap.id,
          }));

          // Hydrate with local IndexedDB files if downloadUrl is empty or local
          const hydrated = await Promise.all(
            firestoreList.map(async (m) => {
              if (!m.downloadUrl || m.downloadUrl.startsWith('blob:')) {
                const liveUrl = await fileStorage.getFileUrl(m.id);
                if (liveUrl) return { ...m, downloadUrl: liveUrl };
              }
              return m;
            })
          );

          // Merge Firestore list with local IndexedDB cache
          const localList = await fileStorage.getAllMetadata();
          const combined = mergeMaterialLists(hydrated, localList);
          notifySubscribers(combined);
        },
        (error) => {
          console.warn('Materials Firestore subscription fallback:', error);
          try {
            handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
          } catch (e) {
            onError?.(e);
          }
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
      const list: Material[] = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Omit<Material, 'id'>),
        id: docSnap.id,
      }));

      const localList = await fileStorage.getAllMetadata();
      const combined = mergeMaterialLists(list, localList);
      return workshopId ? combined.filter((m) => m.workshopId === workshopId) : combined;
    } catch (error) {
      console.warn('getAllMaterials Firestore fetch failed, using local files:', error);
      const localList = await fileStorage.getAllMetadata();
      return workshopId ? localList.filter((m) => m.workshopId === workshopId) : localList;
    }
  },

  // Upload a physical file: saves to IndexedDB + Firestore with Cloud Storage integration
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
    onProgress?: (percent: number) => void
  ): Promise<Material> => {
    const timestamp = Date.now();
    const materialId = `mat_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const workshopFolder = metadata.workshopId || 'general';
    const storagePath = `workshops/${workshopFolder}/materials/${timestamp}_${sanitizedFileName}`;

    if (onProgress) onProgress(15);

    // 1. Permanently store the physical binary File/Blob into browser IndexedDB
    await fileStorage.saveFile(materialId, file);
    const liveBlobUrl = URL.createObjectURL(file);

    if (onProgress) onProgress(35);

    // 2. Convert to lightweight Data URL if <= 400KB so it can be stored directly in Firestore
    let inlineDataUrl: string | null = null;
    if (file.size <= 400 * 1024) {
      inlineDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    }

    if (onProgress) onProgress(50);

    // 3. Attempt Firebase Storage upload with a 2.5s non-blocking race
    let remoteDownloadUrl: string | null = null;
    let usedStoragePath: string | undefined = undefined;

    try {
      const storageRef = ref(storage, storagePath);
      const storagePromise = new Promise<{ downloadUrl: string; path: string }>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress && p > 50) onProgress(Math.min(85, Math.round(p)));
          },
          (err) => reject(err),
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({ downloadUrl: url, path: storagePath });
            } catch (e) {
              reject(e);
            }
          }
        );
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage timeout')), 2000)
      );

      const res = await Promise.race([storagePromise, timeoutPromise]);
      remoteDownloadUrl = res.downloadUrl;
      usedStoragePath = res.path;
    } catch (err) {
      console.info('Storage fallback engaged (file stored in browser IndexedDB):', err);
    }

    if (onProgress) onProgress(85);

    const finalDownloadUrl = remoteDownloadUrl || inlineDataUrl || liveBlobUrl;

    const materialRecord: Material = {
      id: materialId,
      title: metadata.title || file.name,
      fileName: file.name,
      fileType: file.type || file.name.split('.').pop() || 'application/octet-stream',
      fileSize: file.size,
      description: metadata.description || '',
      category: metadata.category,
      downloadUrl: finalDownloadUrl,
      storagePath: usedStoragePath,
      workshopId: metadata.workshopId,
      workshopTitle: metadata.workshopTitle,
      activityId: metadata.activityId,
      uploadedBy: user.id || 'usr_faculty',
      uploadedByName: user.displayName || 'Faculty Member',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. Save metadata to IndexedDB for offline & instant tab recovery
    await fileStorage.saveMetadata(materialRecord);

    if (onProgress) onProgress(90);

    // 5. Save metadata to Firestore (safely strip huge downloadUrl to prevent Firestore 1MB limits)
    try {
      const firestorePayload: any = { ...materialRecord };
      delete firestorePayload.id;
      // If downloadUrl is a huge data URL or ephemeral blob URL, store a placeholder in Firestore
      if (firestorePayload.downloadUrl?.startsWith('blob:')) {
        firestorePayload.downloadUrl = '';
      }
      await setDoc(doc(db, COLLECTION_NAME, materialId), firestorePayload);
    } catch (dbErr) {
      console.warn('Firestore write warning (persisted locally in IndexedDB):', dbErr);
    }

    if (onProgress) onProgress(100);

    // 6. Optimistically update in-memory cache and notify all listeners across the app
    const updatedList = [materialRecord, ...cachedMaterials.filter((m) => m.id !== materialId)];
    notifySubscribers(updatedList);

    return materialRecord;
  },

  // Update workshop association when a draft workshop is saved with a new Firestore ID
  relinkMaterialsToWorkshop: async (
    oldWorkshopId: string,
    newWorkshopId: string,
    workshopTitle?: string
  ) => {
    if (!oldWorkshopId || !newWorkshopId || oldWorkshopId === newWorkshopId) return;

    try {
      const updatedCache = cachedMaterials.map((m) => {
        if (m.workshopId === oldWorkshopId) {
          return {
            ...m,
            workshopId: newWorkshopId,
            workshopTitle: workshopTitle || m.workshopTitle,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      });
      notifySubscribers(updatedCache);

      // Update in IndexedDB
      const localList = await fileStorage.getAllMetadata();
      for (const m of localList) {
        if (m.workshopId === oldWorkshopId) {
          const updated = {
            ...m,
            workshopId: newWorkshopId,
            workshopTitle: workshopTitle || m.workshopTitle,
            updatedAt: new Date().toISOString(),
          };
          await fileStorage.saveMetadata(updated);
          try {
            await updateDoc(doc(db, COLLECTION_NAME, m.id), {
              workshopId: newWorkshopId,
              workshopTitle: workshopTitle || m.workshopTitle,
              updatedAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Could not update material workshop link in Firestore:', e);
          }
        }
      }
    } catch (err) {
      console.warn('Error relinking materials to workshop:', err);
    }
  },

  // Update metadata
  updateMaterial: async (
    id: string,
    updates: Partial<Material>,
    user: UserProfile
  ): Promise<void> => {
    const path = `${COLLECTION_NAME}/${id}`;
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    delete (payload as any).id;

    // Update in IndexedDB
    const existing = cachedMaterials.find((m) => m.id === id);
    if (existing) {
      const updated = { ...existing, ...payload, id };
      await fileStorage.saveMetadata(updated);
      const updatedList = cachedMaterials.map((m) => (m.id === id ? updated : m));
      notifySubscribers(updatedList);
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, payload);
    } catch (error) {
      console.warn('Firestore update failed (saved in IndexedDB):', error);
    }
  },

  // Delete material from IndexedDB, Storage, & Firestore
  deleteMaterial: async (
    materialOrId: Material | string,
    storagePath?: string
  ): Promise<void> => {
    const id = typeof materialOrId === 'string' ? materialOrId : materialOrId.id;
    const pathToDelete =
      typeof materialOrId === 'string' ? storagePath : materialOrId.storagePath;

    // 1. Delete from local cache and IndexedDB immediately
    if (id) {
      await fileStorage.deleteFile(id);
      const remaining = cachedMaterials.filter((m) => m.id !== id);
      notifySubscribers(remaining);
    }

    // 2. Delete from Storage if path exists
    if (pathToDelete) {
      try {
        const fileRef = ref(storage, pathToDelete);
        await deleteObject(fileRef);
      } catch (storageErr) {
        console.warn('Storage delete warning:', storageErr);
      }
    }

    // 3. Delete metadata doc from Firestore
    if (id) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
      } catch (error) {
        console.warn('Firestore delete warning:', error);
      }
    }
  },
};

// Helper to merge lists with de-duplication by id
function mergeMaterialLists(primary: Material[], secondary: Material[]): Material[] {
  const map = new Map<string, Material>();
  (primary || []).forEach((m) => {
    if (m && m.id) map.set(m.id, m);
  });
  (secondary || []).forEach((m) => {
    if (m && m.id) {
      if (!map.has(m.id)) {
        map.set(m.id, m);
      } else {
        const existing = map.get(m.id)!;
        // Prefer active downloadUrl if available
        if (!existing.downloadUrl && m.downloadUrl) {
          map.set(m.id, { ...existing, downloadUrl: m.downloadUrl });
        }
      }
    }
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

