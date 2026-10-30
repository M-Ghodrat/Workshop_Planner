import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
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
const LEGACY_DELETED_WORKSHOP_IDS = ['ws-pm-654', 'ws-data-610', 'ws-cloud-630'];

export const getStoredDeletedWorkshopIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_WORKSHOPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...LEGACY_DELETED_WORKSHOP_IDS, ...(Array.isArray(parsed) ? parsed : [])]));
  } catch {
    return [...LEGACY_DELETED_WORKSHOP_IDS];
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

export const formatWorkshopId = (
  workshopData: Partial<Workshop>,
  existingIds: string[] = []
): string => {
  const rawSeriesName = (workshopData.seriesName || '').trim();
  const rawSeriesId = (workshopData.seriesId || '').trim();

  let seriesSlug = '';
  if (rawSeriesName) {
    seriesSlug = rawSeriesName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^series_/, '');
  } else if (rawSeriesId) {
    if (rawSeriesId === 'series_ai_explorer') {
      seriesSlug = 'applied_ai_1';
    } else {
      seriesSlug = rawSeriesId
        .toLowerCase()
        .replace(/^series[-_]/, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
  }
  if (!seriesSlug || seriesSlug === 'ai_explorer') {
    seriesSlug = seriesSlug === 'ai_explorer' ? 'applied_ai_1' : 'unassigned';
  }

  const prefixSlug =
    (workshopData.prefix || 'ws')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'ws';

  const codeSlug =
    (workshopData.code || '001')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || '001';

  const baseId = `workshop_${seriesSlug}_${prefixSlug}_${codeSlug}`;
  if (!existingIds.includes(baseId)) {
    return baseId;
  }

  let seq = 2;
  while (existingIds.includes(`${baseId}_${String(seq).padStart(2, '0')}`)) {
    seq++;
  }
  return `${baseId}_${String(seq).padStart(2, '0')}`;
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

    // 1. Live Firestore real-time listener (primary cloud database)
    let hasFirestoreWorkshops = false;
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const collRef = collection(db, COLLECTION_NAME);
      unsubscribeFirestore = onSnapshot(
        collRef,
        (snap) => {
          hasFirestoreWorkshops = true;
          if (!snap.empty) {
            const deletedIds = getStoredDeletedWorkshopIds();
            const rawDocs: Workshop[] = snap.docs
              .map((d) => sanitizeWorkshop({ id: d.id, ...(d.data() as any) }))
              .filter((w) => w.id && !deletedIds.includes(w.id));

            const usedIds: string[] = [];
            const liveList: Workshop[] = rawDocs.map((w) => {
              const normalizedSeriesId =
                w.seriesId === 'series_ai_explorer' ? 'series_applied_ai_1' : w.seriesId;
              const normalizedSeriesName =
                w.seriesId === 'series_ai_explorer' ||
                (w.seriesName && w.seriesName.toLowerCase().includes('ai explorer'))
                  ? 'Applied AI 1'
                  : w.seriesName;

              const normalizedW: Workshop = {
                ...w,
                seriesId: normalizedSeriesId,
                seriesName: normalizedSeriesName,
              };

              const expectedId = formatWorkshopId(normalizedW, usedIds);
              usedIds.push(expectedId);

              if (w.id && w.id !== expectedId) {
                const oldId = w.id;
                const migrated: Workshop = {
                  ...normalizedW,
                  id: expectedId,
                  updatedAt: new Date().toISOString(),
                };
                addStoredDeletedWorkshopId(oldId);
                setDoc(doc(db, COLLECTION_NAME, expectedId), migrated, { merge: true })
                  .then(() => deleteDoc(doc(db, COLLECTION_NAME, oldId)))
                  .catch(() => {});
                return migrated;
              }
              return normalizedW;
            });

            if (liveList.length > 0) {
              notifySubscribers(liveList);
              fetch('/api/sync-workshops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workshops: liveList }),
              }).catch(() => {});
            }
          }
        },
        (err) => {
          console.debug('Firestore workshop subscription notice (falling back to local cache):', err.message);
        }
      );
    } catch (e) {
      console.debug('Could not attach Firestore workshop listener:', e);
    }

    // 2. Fetch from persistent server database if Firestore has not responded yet
    fetch('/api/workshops')
      .then((res) => (res.ok ? res.json() : null))
      .then((list) => {
        if (!hasFirestoreWorkshops && Array.isArray(list) && list.length > 0) {
          const sanitizedList = list.map(sanitizeWorkshop);
          notifySubscribers(sanitizedList);
        }
      })
      .catch(() => {});

    return () => {
      subscribers.delete(onSuccess);
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  },

  getAllWorkshops: async (userId?: string, isAdmin?: boolean): Promise<Workshop[]> => {
    try {
      const res = await fetch('/api/workshops');
      if (res.ok) {
        const list: Workshop[] = await res.json();
        if (Array.isArray(list)) {
          const sanitizedList = list.map(sanitizeWorkshop);
          notifySubscribers(sanitizedList);
          if (!isAdmin && userId) {
            return sanitizedList.filter(
              (w) =>
                w.createdBy === userId ||
                (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId)) ||
                w.status === 'Approved'
            );
          }
          return sanitizedList;
        }
      }
    } catch (e) {
      console.debug('getAllWorkshops API notice:', e);
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
      const res = await fetch('/api/workshops');
      if (res.ok) {
        const list: Workshop[] = await res.json();
        const found = list.find((w) => w.id === id);
        if (found) return sanitizeWorkshop(found);
      }
    } catch (e) {
      console.debug('getWorkshopById API notice:', e);
    }

    const cached = getCachedWorkshops();
    const found = cached.find((w) => w.id === id);
    return found ? sanitizeWorkshop(found) : null;
  },

  createWorkshop: async (
    workshopData: Omit<Workshop, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'>,
    user: UserProfile
  ): Promise<string> => {
    const cached = getCachedWorkshops();
    const existingIds = cached.map((w) => w.id).filter(Boolean) as string[];
    const newId = formatWorkshopId(workshopData, existingIds);
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
    notifySubscribers([sanitized, ...cached]);

    // 1. Direct Firestore cloud persistence
    try {
      await setDoc(doc(db, COLLECTION_NAME, newId), sanitized);
      if (sanitized.seriesId) {
        const seriesRef = doc(db, 'workshopSeries', sanitized.seriesId);
        const seriesSnap = await getDoc(seriesRef);
        if (seriesSnap.exists()) {
          const sData = seriesSnap.data();
          const currentWIds: string[] = Array.isArray(sData.workshopIds) ? sData.workshopIds : [];
          if (!currentWIds.includes(newId)) {
            const updatedWIds = [...currentWIds, newId];
            await setDoc(
              seriesRef,
              {
                workshopIds: updatedWIds,
                workshopCount: updatedWIds.length,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        }
      }
    } catch (err) {
      console.warn('Firestore workshop write notice:', err);
    }

    // 2. Local server sync if available
    try {
      const res = await fetch('/api/workshops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      });
      if (res.ok) {
        const saved = await res.json();
        return saved.id || newId;
      }
    } catch (error) {
      console.debug('Saved workshop locally / offline:', error);
    }
    return newId;
  },

  updateWorkshop: async (
    id: string,
    updates: Partial<Workshop>,
    user: UserProfile
  ): Promise<string> => {
    const cached = getCachedWorkshops();
    const existing = cached.find((w) => w.id === id);
    const otherIds = cached
      .filter((w) => w.id && w.id !== id)
      .map((w) => w.id as string);

    const mergedCandidate: Partial<Workshop> = {
      ...(existing || {}),
      ...updates,
    };

    const targetId =
      mergedCandidate.prefix && mergedCandidate.code
        ? formatWorkshopId(mergedCandidate, otherIds)
        : id;

    const updatedDoc = sanitizeWorkshop({
      ...(existing || ({} as Workshop)),
      ...updates,
      id: targetId,
      updatedBy: user.id,
      updatedByName: user.displayName,
      updatedAt: new Date().toISOString(),
    });

    if (existing) {
      if (targetId !== id) {
        addStoredDeletedWorkshopId(id);
      }
      const updatedList = cached.map((w) => (w.id === id ? updatedDoc : w));
      notifySubscribers(updatedList);
    }

    // 1. Direct Firestore cloud update (and migrate ID if series/prefix/code changed)
    try {
      if (targetId !== id) {
        await setDoc(doc(db, COLLECTION_NAME, targetId), updatedDoc, { merge: true });
        await deleteDoc(doc(db, COLLECTION_NAME, id));
      } else {
        await setDoc(
          doc(db, COLLECTION_NAME, id),
          {
            ...updates,
            id: targetId,
            updatedBy: user.id,
            updatedByName: user.displayName,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // Sync series workshopIds if seriesId is set
      if (updatedDoc.seriesId) {
        const seriesRef = doc(db, 'workshopSeries', updatedDoc.seriesId);
        const seriesSnap = await getDoc(seriesRef);
        if (seriesSnap.exists()) {
          const sData = seriesSnap.data();
          const currentWIds: string[] = Array.isArray(sData.workshopIds) ? sData.workshopIds : [];
          const filteredWIds = currentWIds.filter((wid) => wid !== id);
          if (!filteredWIds.includes(targetId)) {
            filteredWIds.push(targetId);
          }
          await setDoc(
            seriesRef,
            {
              workshopIds: filteredWIds,
              workshopCount: filteredWIds.length,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }
    } catch (err) {
      console.warn('Firestore workshop update notice:', err);
    }

    // 2. Local server sync if available
    try {
      if (targetId !== id) {
        await fetch('/api/workshops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedDoc),
        });
        await fetch(`/api/workshops/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/workshops/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      }
    } catch (error) {
      console.debug('Updated workshop API notice:', error);
    }

    return targetId;
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

    // 1. Direct Firestore cloud deletion
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err) {
      console.warn('Firestore workshop delete notice:', err);
    }

    // 2. Local server sync if available
    try {
      await fetch(`/api/workshops/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.debug('deleteWorkshop API notice:', e);
    }
  },
};
