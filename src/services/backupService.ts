import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  SystemBackup,
  BackupSnapshot,
  Workshop,
  WorkshopSeries,
  Material,
  UserProfile,
  Course,
  OutcomeMapping,
  OperationType,
  FirestoreErrorInfo,
} from '../types';

const BACKUPS_COLLECTION = 'backups';
const LOCAL_BACKUPS_KEY = 'ucw_cached_backups';

const LOCAL_STORAGE_KEYS = {
  workshops: 'ucw_cached_workshops',
  series: 'ucw_cached_series',
  courses: 'ucw_cached_courses',
  mappings: 'ucw_cached_mappings',
  materials: 'ucw_cached_materials',
  users: 'ucw_cached_users',
};

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const cleanUndefined = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

const getCachedBackups = (): SystemBackup[] => {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading cached backups:', e);
  }
  return [];
};

const saveCachedBackups = (backups: SystemBackup[]) => {
  try {
    localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(backups));
  } catch (e) {
    console.warn('Error caching backups locally:', e);
  }
};

export const backupService = {
  subscribeBackups: (callback: (backups: SystemBackup[]) => void) => {
    const cached = getCachedBackups();
    if (cached.length > 0) {
      callback(cached);
    }

    const unsubscribe = onSnapshot(
      collection(db, BACKUPS_COLLECTION),
      (snapshot) => {
        const items: SystemBackup[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as SystemBackup),
          id: docSnap.id,
        }));
        const sorted = items.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        saveCachedBackups(sorted);
        callback(sorted);
      },
      (error) => {
        console.warn('Firestore backups subscription notice:', error);
        callback(getCachedBackups());
      }
    );

    return unsubscribe;
  },

  createBackup: async (
    name: string,
    description: string,
    snapshotData: BackupSnapshot,
    user: UserProfile
  ): Promise<SystemBackup> => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timePart = now.toTimeString().slice(0, 5).replace(':', '');
    const slug = (name || 'backup')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32);
    const backupId = `backup_${datePart}_${timePart}_${slug || 'state'}`;

    const cleanSnapshot: BackupSnapshot = cleanUndefined({
      workshops: Array.isArray(snapshotData.workshops) ? snapshotData.workshops : [],
      series: Array.isArray(snapshotData.series) ? snapshotData.series : [],
      materials: Array.isArray(snapshotData.materials) ? snapshotData.materials : [],
      users: Array.isArray(snapshotData.users) ? snapshotData.users : [],
      courses: Array.isArray(snapshotData.courses) ? snapshotData.courses : [],
      mappings: Array.isArray(snapshotData.mappings) ? snapshotData.mappings : [],
    });

    const newBackup: SystemBackup = {
      id: backupId,
      name: name.trim() || `Backup ${now.toLocaleString()}`,
      description: description.trim(),
      createdAt: now.toISOString(),
      createdBy: user.id,
      createdByName: user.displayName || user.email,
      counts: {
        workshops: cleanSnapshot.workshops.length,
        series: cleanSnapshot.series.length,
        materials: cleanSnapshot.materials.length,
        users: cleanSnapshot.users.length,
        courses: cleanSnapshot.courses.length,
        mappings: cleanSnapshot.mappings.length,
      },
      snapshot: cleanSnapshot,
    };

    // Save in localStorage cache
    const existing = getCachedBackups().filter((b) => b.id !== backupId);
    saveCachedBackups([newBackup, ...existing]);

    // Check serialized size for main Firestore document (Firestore limit is 1MB per doc)
    const serializedMain = JSON.stringify(newBackup);
    const isUnderLimit = serializedMain.length < 750000;

    try {
      if (isUnderLimit) {
        await setDoc(doc(db, BACKUPS_COLLECTION, backupId), newBackup);
      } else {
        // Store lightweight metadata + core collections on main doc, and store full workshops & materials in subcollections
        const mainDocPayload: SystemBackup = {
          ...newBackup,
          snapshot: {
            workshops: [],
            series: cleanSnapshot.series,
            materials: [],
            users: cleanSnapshot.users,
            courses: cleanSnapshot.courses,
            mappings: cleanSnapshot.mappings,
          },
        };
        await setDoc(doc(db, BACKUPS_COLLECTION, backupId), mainDocPayload);
      }

      // Always store individual workshops and materials in subcollections for resilient recovery of large files & designs
      for (const w of cleanSnapshot.workshops) {
        if (w.id) {
          await setDoc(doc(db, BACKUPS_COLLECTION, backupId, 'backup_workshops', w.id), w);
        }
      }
      for (const m of cleanSnapshot.materials) {
        if (m.id) {
          await setDoc(doc(db, BACKUPS_COLLECTION, backupId, 'backup_materials', m.id), m);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${BACKUPS_COLLECTION}/${backupId}`);
    }

    return newBackup;
  },

  getFullBackupSnapshot: async (backup: SystemBackup): Promise<BackupSnapshot> => {
    let snapshot: BackupSnapshot = backup.snapshot
      ? { ...backup.snapshot }
      : {
          workshops: [],
          series: [],
          materials: [],
          users: [],
          courses: [],
          mappings: [],
        };

    try {
      const mainSnap = await getDoc(doc(db, BACKUPS_COLLECTION, backup.id));
      if (mainSnap.exists()) {
        const data = mainSnap.data() as SystemBackup;
        if (data.snapshot) {
          snapshot = { ...data.snapshot };
        }
      }

      // Check subcollections for workshops and materials
      const wsSnap = await getDocs(
        collection(db, BACKUPS_COLLECTION, backup.id, 'backup_workshops')
      );
      if (!wsSnap.empty) {
        snapshot.workshops = wsSnap.docs.map((d) => ({ ...(d.data() as Workshop), id: d.id }));
      }

      const matSnap = await getDocs(
        collection(db, BACKUPS_COLLECTION, backup.id, 'backup_materials')
      );
      if (!matSnap.empty) {
        snapshot.materials = matSnap.docs.map((d) => ({ ...(d.data() as Material), id: d.id }));
      }
    } catch (e) {
      console.warn('Using cached backup snapshot:', e);
    }

    return snapshot;
  },

  restoreBackupSnapshot: async (snapshot: BackupSnapshot): Promise<BackupSnapshot> => {
    const cleanSnapshot: BackupSnapshot = cleanUndefined({
      workshops: Array.isArray(snapshot.workshops) ? snapshot.workshops : [],
      series: Array.isArray(snapshot.series) ? snapshot.series : [],
      materials: Array.isArray(snapshot.materials) ? snapshot.materials : [],
      users: Array.isArray(snapshot.users) ? snapshot.users : [],
      courses: Array.isArray(snapshot.courses) ? snapshot.courses : [],
      mappings: Array.isArray(snapshot.mappings) ? snapshot.mappings : [],
    });

    // 1. Update local storage caches immediately
    localStorage.setItem(LOCAL_STORAGE_KEYS.workshops, JSON.stringify(cleanSnapshot.workshops));
    localStorage.setItem(LOCAL_STORAGE_KEYS.series, JSON.stringify(cleanSnapshot.series));
    localStorage.setItem(LOCAL_STORAGE_KEYS.materials, JSON.stringify(cleanSnapshot.materials));
    localStorage.setItem(LOCAL_STORAGE_KEYS.users, JSON.stringify(cleanSnapshot.users));
    localStorage.setItem(LOCAL_STORAGE_KEYS.courses, JSON.stringify(cleanSnapshot.courses));
    localStorage.setItem(LOCAL_STORAGE_KEYS.mappings, JSON.stringify(cleanSnapshot.mappings));

    // 2. Sync each collection in Firestore (delete items not in backup, write all items in backup)
    const syncCollection = async <T extends { id?: string }>(
      colName: string,
      targetItems: T[]
    ) => {
      const targetIds = new Set(targetItems.map((item) => item.id).filter(Boolean) as string[]);
      const existingDocs = await getDocs(collection(db, colName));
      for (const existingDoc of existingDocs.docs) {
        if (!targetIds.has(existingDoc.id)) {
          await deleteDoc(doc(db, colName, existingDoc.id));
        }
      }
      for (const item of targetItems) {
        if (item.id) {
          await setDoc(doc(db, colName, item.id), item);
        }
      }
    };

    try {
      await syncCollection('users', cleanSnapshot.users);
      await syncCollection('workshopSeries', cleanSnapshot.series);
      await syncCollection('workshops', cleanSnapshot.workshops);
      await syncCollection('materials', cleanSnapshot.materials);
      await syncCollection('courses', cleanSnapshot.courses);
      await syncCollection('outcome_mappings', cleanSnapshot.mappings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'restoreBackupSnapshot');
    }

    return cleanSnapshot;
  },

  deleteBackup: async (backupId: string): Promise<void> => {
    const remaining = getCachedBackups().filter((b) => b.id !== backupId);
    saveCachedBackups(remaining);

    try {
      const wsSnap = await getDocs(
        collection(db, BACKUPS_COLLECTION, backupId, 'backup_workshops')
      );
      for (const d of wsSnap.docs) {
        await deleteDoc(doc(db, BACKUPS_COLLECTION, backupId, 'backup_workshops', d.id));
      }
      const matSnap = await getDocs(
        collection(db, BACKUPS_COLLECTION, backupId, 'backup_materials')
      );
      for (const d of matSnap.docs) {
        await deleteDoc(doc(db, BACKUPS_COLLECTION, backupId, 'backup_materials', d.id));
      }
      await deleteDoc(doc(db, BACKUPS_COLLECTION, backupId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${BACKUPS_COLLECTION}/${backupId}`);
    }
  },
};
