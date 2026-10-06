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

    // Fetch from persistent server database
    fetch('/api/workshops')
      .then((res) => (res.ok ? res.json() : null))
      .then((list) => {
        if (Array.isArray(list)) {
          const sanitizedList = list.map(sanitizeWorkshop);
          notifySubscribers(sanitizedList);
        }
      })
      .catch((e) => {
        console.debug('Workshop API fetch notice:', e);
      });

    const onFocus = () => {
      fetch('/api/workshops')
        .then((res) => (res.ok ? res.json() : null))
        .then((list) => {
          if (Array.isArray(list)) {
            notifySubscribers(list.map(sanitizeWorkshop));
          }
        })
        .catch(() => {});
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      subscribers.delete(onSuccess);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
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
      await fetch(`/api/workshops/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.debug('Updated workshop API notice:', error);
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
      await fetch(`/api/workshops/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.debug('deleteWorkshop API notice:', e);
    }
  },
};
