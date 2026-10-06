import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { WorkshopSeries, UserProfile } from '../types';
import { INITIAL_SERIES } from '../data/initialData';

const COLLECTION_NAME = 'workshopSeries';
const LOCAL_STORAGE_KEY = 'ucw_cached_series';
const DELETED_SERIES_KEY = 'ucw_deleted_series_ids';

export const getStoredDeletedSeriesIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_SERIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addStoredDeletedSeriesId = (id: string) => {
  try {
    const deleted = getStoredDeletedSeriesIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(DELETED_SERIES_KEY, JSON.stringify(deleted));
    }
  } catch (e) {
    console.warn('Could not store deleted series id:', e);
  }
};

const getCachedSeries = (): WorkshopSeries[] => {
  const deletedIds = getStoredDeletedSeriesIds();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => s.id && !deletedIds.includes(s.id));
      }
    }
  } catch {}
  const seeded = INITIAL_SERIES.filter((s) => s.id && !deletedIds.includes(s.id));
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

const saveCachedSeries = (list: WorkshopSeries[]) => {
  try {
    const deletedIds = getStoredDeletedSeriesIds();
    const cleanList = list.filter((s) => s.id && !deletedIds.includes(s.id));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanList));
  } catch {}
};

type SeriesSubscriber = (series: WorkshopSeries[]) => void;
const subscribers = new Set<SeriesSubscriber>();

function notifySubscribers(list: WorkshopSeries[]) {
  const deletedIds = getStoredDeletedSeriesIds();
  const cleanList = list.filter((s) => s.id && !deletedIds.includes(s.id));
  saveCachedSeries(cleanList);
  subscribers.forEach((cb) => {
    try {
      cb(cleanList);
    } catch (e) {
      console.warn('Series subscriber notification notice:', e);
    }
  });
}

export const seriesService = {
  subscribeSeries: (
    onSuccess: (series: WorkshopSeries[]) => void,
    onError?: (err: any) => void
  ) => {
    subscribers.add(onSuccess);
    const initial = getCachedSeries();
    onSuccess(initial);

    try {
      const collRef = collection(db, COLLECTION_NAME);
      const q = query(collRef, orderBy('createdAt', 'desc'));

      const unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const deletedIds = getStoredDeletedSeriesIds();
          const list: WorkshopSeries[] = snapshot.docs
            .map((docSnap) => ({
              ...(docSnap.data() as Omit<WorkshopSeries, 'id'>),
              id: docSnap.id,
            }))
            .filter((s) => s.id && !deletedIds.includes(s.id));

          if (list.length > 0 || !snapshot.empty) {
            notifySubscribers(list);
          }
        },
        (error) => {
          console.warn('Series subscription fallback to local cache:', error?.message || error);
        }
      );

      return () => {
        subscribers.delete(onSuccess);
        if (typeof unsubscribeFirestore === 'function') {
          unsubscribeFirestore();
        }
      };
    } catch (error) {
      console.warn('Failed to initialize series subscription:', error);
      return () => {
        subscribers.delete(onSuccess);
      };
    }
  },

  getAllSeries: async (): Promise<WorkshopSeries[]> => {
    const deletedIds = getStoredDeletedSeriesIds();
    try {
      const collRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(collRef);
      if (!snapshot.empty) {
        const list: WorkshopSeries[] = snapshot.docs
          .map((docSnap) => ({
            ...(docSnap.data() as Omit<WorkshopSeries, 'id'>),
            id: docSnap.id,
          }))
          .filter((s) => s.id && !deletedIds.includes(s.id));
        notifySubscribers(list);
        return list;
      }
    } catch (error) {
      console.warn('getAllSeries fallback:', error);
    }
    return getCachedSeries();
  },

  getSeriesById: async (id: string): Promise<WorkshopSeries | null> => {
    const deletedIds = getStoredDeletedSeriesIds();
    if (deletedIds.includes(id)) return null;

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...(snap.data() as Omit<WorkshopSeries, 'id'>), id: snap.id };
      }
    } catch (error) {
      console.warn('getSeriesById fallback:', error);
    }
    const cached = getCachedSeries();
    return cached.find((s) => s.id === id) || null;
  },

  createSeries: async (
    seriesData: Omit<WorkshopSeries, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    user: UserProfile
  ): Promise<string> => {
    // Role check: Only Program Administrator can create series
    if (user.role !== 'administrator') {
      throw new Error('Access Restricted: Only the Program Administrator can create new workshop series.');
    }

    const newId = `series_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSeries: WorkshopSeries = {
      ...seriesData,
      id: newId,
      workshopIds: seriesData.workshopIds || [],
      workshopCount: (seriesData.workshopIds || []).length,
      leadIds: seriesData.leadIds || (seriesData.leadId ? [seriesData.leadId] : []),
      leads: seriesData.leads || [],
      createdBy: user.id,
      createdByName: user.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cached = getCachedSeries();
    notifySubscribers([newSeries, ...cached]);

    try {
      await setDoc(doc(db, COLLECTION_NAME, newId), newSeries);
      return newId;
    } catch (error) {
      console.warn('Created series locally:', error);
      return newId;
    }
  },

  updateSeries: async (
    id: string,
    updates: Partial<WorkshopSeries>,
    user?: UserProfile
  ): Promise<void> => {
    // Permission check: Only Program Administrator can assign series to another lead
    if (user && user.role !== 'administrator') {
      delete updates.leadIds;
      delete updates.leads;
      delete updates.leadId;
      delete updates.leadName;
      delete updates.leadEmail;
    }

    const cached = getCachedSeries();
    const existing = cached.find((s) => s.id === id);
    if (existing) {
      const updated: WorkshopSeries = {
        ...existing,
        ...updates,
        workshopCount: updates.workshopIds ? updates.workshopIds.length : existing.workshopCount,
        updatedAt: new Date().toISOString(),
      };
      const updatedList = cached.map((s) => (s.id === id ? updated : s));
      notifySubscribers(updatedList);
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const payload: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      if (updates.workshopIds) {
        payload.workshopCount = updates.workshopIds.length;
      }
      delete payload.id;
      await updateDoc(docRef, payload);
    } catch (error) {
      console.warn('Updated series locally:', error);
    }
  },

  deleteSeries: async (id: string, user?: UserProfile): Promise<void> => {
    if (user && user.role !== 'administrator') {
      throw new Error('Access Restricted: Only the Program Administrator can delete a workshop series.');
    }

    // 1. Immediately store ID in deleted IDs list so it never resurrects
    addStoredDeletedSeriesId(id);

    // 2. Remove from cache and synchronously notify all subscribers
    const cached = getCachedSeries();
    const updatedList = cached.filter((s) => s.id !== id);
    notifySubscribers(updatedList);

    // 3. Attempt Firestore deletion
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.warn('Deleted series locally:', error);
    }
  },
};
