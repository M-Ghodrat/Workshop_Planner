import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Workshop, UserProfile, WorkshopStatus } from '../types';
import { INITIAL_WORKSHOPS } from '../data/initialData';

const COLLECTION_NAME = 'workshops';
const LOCAL_STORAGE_KEY = 'ucw_cached_workshops';
const DELETED_WORKSHOPS_KEY = 'ucw_deleted_workshop_ids';

export const getStoredDeletedWorkshopIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_WORKSHOPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addStoredDeletedWorkshopId = (id: string) => {
  try {
    const deleted = getStoredDeletedWorkshopIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(DELETED_WORKSHOPS_KEY, JSON.stringify(deleted));
    }
  } catch (e) {
    console.warn('Could not store deleted workshop id:', e);
  }
};

const getCachedWorkshops = (): Workshop[] => {
  const deletedIds = getStoredDeletedWorkshopIds();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((w) => w.id && !deletedIds.includes(w.id));
      }
    }
  } catch {}
  const seeded = INITIAL_WORKSHOPS.filter((w) => w.id && !deletedIds.includes(w.id));
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

const saveCachedWorkshops = (list: Workshop[]) => {
  try {
    const deletedIds = getStoredDeletedWorkshopIds();
    const cleanList = list.filter((w) => w.id && !deletedIds.includes(w.id));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanList));
  } catch {}
};

type WorkshopSubscriber = (workshops: Workshop[]) => void;
const subscribers = new Set<WorkshopSubscriber>();

function notifySubscribers(list: Workshop[]) {
  const deletedIds = getStoredDeletedWorkshopIds();
  const cleanList = list.filter((w) => w.id && !deletedIds.includes(w.id));
  saveCachedWorkshops(cleanList);
  subscribers.forEach((cb) => {
    try {
      cb(cleanList);
    } catch (e) {
      console.warn('Workshop subscriber notice:', e);
    }
  });
}

const sanitizeWorkshop = (w: Workshop): Workshop => {
  let createdByName = w.createdByName;
  let updatedByName = w.updatedByName;
  let assignedDevelopers = w.assignedDevelopers;
  let status = w.status;

  if ((status as any) === 'Review') {
    status = 'In Development';
  }

  if (createdByName && createdByName.includes('Mohsen Ghodrat')) {
    createdByName = createdByName.replace(/Dr\.\s*Mohsen Ghodrat/gi, 'Mohsen Ghodrat').trim();
  }
  if (updatedByName && updatedByName.includes('Mohsen Ghodrat')) {
    updatedByName = updatedByName.replace(/Dr\.\s*Mohsen Ghodrat/gi, 'Mohsen Ghodrat').trim();
  }
  if (assignedDevelopers && assignedDevelopers.some((d) => d.name?.includes('Mohsen Ghodrat'))) {
    assignedDevelopers = assignedDevelopers.map((d) => {
      if (d.name?.includes('Mohsen Ghodrat')) {
        return {
          ...d,
          name: d.name.replace(/Dr\.\s*Mohsen Ghodrat/gi, 'Mohsen Ghodrat').trim(),
        };
      }
      return d;
    });
  }

  return {
    ...w,
    status: status || 'In Development',
    createdByName,
    updatedByName,
    assignedDevelopers: assignedDevelopers || [],
  };
};

export const workshopService = {
  subscribeWorkshops: (
    onSuccess: (workshops: Workshop[]) => void,
    onError?: (err: any) => void,
    userId?: string,
    isAdmin?: boolean
  ) => {
    subscribers.add(onSuccess);
    const cached = getCachedWorkshops();
    if (!isAdmin && userId) {
      const filtered = cached.filter(
        (w) =>
          w.createdBy === userId ||
          (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId)) ||
          w.status === 'Approved'
      );
      onSuccess(filtered);
    } else {
      onSuccess(cached);
    }

    try {
      const collRef = collection(db, COLLECTION_NAME);
      const q = query(collRef, orderBy('updatedAt', 'desc'));

      const unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Workshop[] = snapshot.docs.map((docSnap) =>
              sanitizeWorkshop({
                ...(docSnap.data() as Omit<Workshop, 'id'>),
                id: docSnap.id,
              })
            );
            notifySubscribers(list);
          }
        },
        (error) => {
          console.warn('Workshop subscription notice:', error?.message || error);
        }
      );

      return () => {
        subscribers.delete(onSuccess);
        if (typeof unsubscribeFirestore === 'function') {
          unsubscribeFirestore();
        }
      };
    } catch (error) {
      console.warn('Failed to initialize workshop subscription:', error);
      return () => {
        subscribers.delete(onSuccess);
      };
    }
  },

  getAllWorkshops: async (userId?: string, isAdmin?: boolean): Promise<Workshop[]> => {
    try {
      const collRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(collRef);
      if (!snapshot.empty) {
        const list: Workshop[] = snapshot.docs.map((docSnap) =>
          sanitizeWorkshop({
            ...(docSnap.data() as Omit<Workshop, 'id'>),
            id: docSnap.id,
          })
        );
        notifySubscribers(list);

        if (!isAdmin && userId) {
          return list.filter(
            (w) =>
              w.createdBy === userId ||
              (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId)) ||
              w.status === 'Approved'
          );
        }
        return list;
      }
    } catch (error) {
      console.warn('getAllWorkshops fallback:', error);
    }

    const cached = getCachedWorkshops();
    if (!isAdmin && userId) {
      return cached.filter(
        (w) =>
          w.createdBy === userId ||
          (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId)) ||
          w.status === 'Approved'
      );
    }
    return cached;
  },

  getWorkshopById: async (id: string): Promise<Workshop | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return sanitizeWorkshop({ ...(snap.data() as Omit<Workshop, 'id'>), id: snap.id });
      }
    } catch (error) {
      console.warn('getWorkshopById fallback:', error);
    }

    const cached = getCachedWorkshops();
    const found = cached.find((w) => w.id === id);
    return found ? sanitizeWorkshop(found) : null;
  },

  createWorkshop: async (
    workshopData: Omit<Workshop, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'>,
    user: UserProfile
  ): Promise<string> => {
    const newId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newWorkshop: Workshop = {
      ...workshopData,
      id: newId,
      status: 'In Development',
      createdBy: user.id,
      createdByName: user.displayName,
      updatedBy: user.id,
      updatedByName: user.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sanitized = sanitizeWorkshop(newWorkshop);
    const cached = getCachedWorkshops();
    notifySubscribers([sanitized, ...cached]);

    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), sanitized);
      return docRef.id;
    } catch (error) {
      console.warn('Saved workshop locally:', error);
      return newId;
    }
  },

  updateWorkshop: async (
    id: string,
    updates: Partial<Workshop>,
    user: UserProfile
  ): Promise<void> => {
    const cached = getCachedWorkshops();
    const existing = cached.find((w) => w.id === id);
    if (existing) {
      const updated = sanitizeWorkshop({
        ...existing,
        ...updates,
        updatedBy: user.id,
        updatedByName: user.displayName,
        updatedAt: new Date().toISOString(),
      });
      const updatedList = cached.map((w) => (w.id === id ? updated : w));
      notifySubscribers(updatedList);
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const payload: Record<string, any> = {
        ...updates,
        updatedBy: user.id,
        updatedByName: user.displayName,
        updatedAt: new Date().toISOString(),
      };
      delete payload.id;
      await updateDoc(docRef, payload);
    } catch (error) {
      console.warn('Updated workshop locally:', error);
    }
  },

  updateStatus: async (
    id: string,
    status: WorkshopStatus,
    user: UserProfile
  ): Promise<void> => {
    await workshopService.updateWorkshop(id, { status }, user);
  },

  deleteWorkshop: async (id: string): Promise<void> => {
    addStoredDeletedWorkshopId(id);
    const cached = getCachedWorkshops();
    const updatedList = cached.filter((w) => w.id !== id);
    notifySubscribers(updatedList);

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.warn('Deleted workshop locally:', error);
    }
  },
};
