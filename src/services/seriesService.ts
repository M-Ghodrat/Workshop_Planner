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
const LEGACY_DELETED_SERIES_IDS = ['series-pm-02', 'series-data-04', 'series-cloud-05'];

export const getStoredDeletedSeriesIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_SERIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...LEGACY_DELETED_SERIES_IDS, ...(Array.isArray(parsed) ? parsed : [])]));
  } catch {
    return [...LEGACY_DELETED_SERIES_IDS];
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

    // 1. Live Firestore real-time listener
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const collRef = collection(db, COLLECTION_NAME);
      unsubscribeFirestore = onSnapshot(
        collRef,
        (snap) => {
          if (!snap.empty) {
            const deletedIds = getStoredDeletedSeriesIds();
            const liveList: WorkshopSeries[] = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as any) }))
              .filter((s) => s.id && !deletedIds.includes(s.id));
            if (liveList.length > 0) {
              notifySubscribers(liveList);
            }
          }
        },
        (err) => {
          console.debug('Firestore series subscription notice (falling back to cache):', err.message);
        }
      );
    } catch (e) {
      console.debug('Could not attach Firestore series listener:', e);
    }

    // 2. Fetch from persistent server database if available
    fetch('/api/series')
      .then((res) => (res.ok ? res.json() : null))
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          notifySubscribers(list);
        }
      })
      .catch(() => {});

    const onFocus = () => {
      fetch('/api/series')
        .then((res) => (res.ok ? res.json() : null))
        .then((list) => {
          if (Array.isArray(list)) notifySubscribers(list);
        })
        .catch(() => {});
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      subscribers.delete(onSuccess);
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  },

  getAllSeries: async (): Promise<WorkshopSeries[]> => {
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (!snap.empty) {
        const deletedIds = getStoredDeletedSeriesIds();
        const liveList: WorkshopSeries[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((s) => s.id && !deletedIds.includes(s.id));
        if (liveList.length > 0) {
          notifySubscribers(liveList);
          return liveList;
        }
      }
    } catch {}

    try {
      const res = await fetch('/api/series');
      if (res.ok) {
        const list: WorkshopSeries[] = await res.json();
        if (Array.isArray(list)) {
          notifySubscribers(list);
          return list;
        }
      }
    } catch (e) {
      console.debug('getAllSeries API notice:', e);
    }
    return getCachedSeries();
  },

  getSeriesById: async (id: string): Promise<WorkshopSeries | null> => {
    const deletedIds = getStoredDeletedSeriesIds();
    if (deletedIds.includes(id)) return null;

    try {
      const res = await fetch('/api/series');
      if (res.ok) {
        const list: WorkshopSeries[] = await res.json();
        const found = list.find((s) => s.id === id);
        if (found) return found;
      }
    } catch (e) {
      console.debug('getSeriesById API notice:', e);
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

    // 1. Direct Firestore cloud persistence
    try {
      await setDoc(doc(db, COLLECTION_NAME, newId), newSeries);
    } catch (err) {
      console.warn('Firestore series write notice:', err);
    }

    // 2. Local server sync if available
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSeries),
      });
      if (res.ok) {
        const saved = await res.json();
        return saved.id || newId;
      }
    } catch (error) {
      console.debug('Created series locally / offline:', error);
    }
    return newId;
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

    // 1. Direct Firestore cloud update
    try {
      await setDoc(
        doc(db, COLLECTION_NAME, id),
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore series update notice:', err);
    }

    // 2. Local server sync if available
    try {
      await fetch(`/api/series/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.debug('Updated series API notice:', error);
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

    // 3. Direct Firestore cloud deletion
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err) {
      console.warn('Firestore series delete notice:', err);
    }

    // 4. Persist deletion in server database on disk if available
    try {
      await fetch(`/api/series/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.debug('deleteSeries API notice:', e);
    }
  },
};
