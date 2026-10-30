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
import { db, auth, handleFirestoreError } from '../config/firebase';
import { UserProfile, UserRole, OperationType } from '../types';

const COLLECTION_NAME = 'users';
const ROLE_OVERRIDES_KEY = 'ucw_user_role_overrides';
const DELETED_USERS_KEY = 'ucw_deleted_user_ids';

export const getStoredDeletedUserIds = (): string[] => {
  try {
    const raw = localStorage.getItem(DELETED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addStoredDeletedUserId = (idOrEmail: string) => {
  try {
    const deleted = getStoredDeletedUserIds();
    if (!deleted.includes(idOrEmail.toLowerCase())) {
      deleted.push(idOrEmail.toLowerCase());
      localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(deleted));
    }
  } catch (e) {
    console.warn('Could not store deleted user id:', e);
  }
};

export const formatUserId = (displayName?: string, email?: string): string => {
  const cleanName = (displayName || '')
    .trim()
    .replace(/^(?:dr|prof|professor|mr|mrs|ms|miss)\.?\s+/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (cleanName) {
    return cleanName.startsWith('dev_') ? cleanName : `dev_${cleanName}`;
  }

  const emailPrefix = (email || '')
    .split('@')[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (emailPrefix) {
    return emailPrefix.startsWith('dev_') ? emailPrefix : `dev_${emailPrefix}`;
  }

  return 'dev_faculty_member';
};

const normalizePersonKey = (name?: string): string => {
  return (name || '')
    .trim()
    .replace(/^(?:dr|prof|professor|mr|mrs|ms|miss)\.?\s+/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
};

const normalizeEmailPrefix = (email?: string): string => {
  return (email || '').split('@')[0].trim().toLowerCase();
};

export const DEFAULT_FACULTY: UserProfile[] = [
  {
    id: 'dev_orkhon_erdenebaatar',
    email: 'orkhon.erdenebaatar@ucanwest.ca',
    displayName: 'Orkhon Erdenebaatar',
    role: 'administrator',
    department: 'Administration & Governance',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'dev_komil_mamajanov',
    email: 'komil.mamajanov@ucanwest.ca',
    displayName: 'Komil Mamajanov',
    role: 'project_lead',
    department: 'Administration & Governance',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'dev_mohsen_ghodrat',
    email: 'mohsen.ghodrat@ucanwest.ca',
    displayName: 'Mohsen Ghodrat',
    role: 'workshop_lead',
    department: 'School of Business & Technology',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-04T00:00:00.000Z',
  },
  {
    id: 'dev_cheryl_thomas',
    email: 'cheryl.thomas@ucanwest.ca',
    displayName: 'Cheryl Thomas',
    role: 'workshop_lead',
    department: 'Department of Management',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'dev_amirhossein_zaji',
    email: 'amirhossein.zaji@ucanwest.ca',
    displayName: 'Amirhossein Zaji',
    role: 'workshop_lead',
    department: 'Department of Analytics',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'dev_amy_hua',
    email: 'amy.hua@ucanwest.ca',
    displayName: 'Amy Hua',
    role: 'academic_affairs',
    department: 'Academic Affairs',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
];

export const isMohsenGhodratUser = (user?: Partial<UserProfile> | null): boolean => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase();
  const name = (user.displayName || '').toLowerCase();
  const id = (user.id || '').toLowerCase();
  return (
    name.includes('mohsen ghodrat') ||
    email.includes('mohsen.ghodrat') ||
    email.includes('mohsenghodrat') ||
    id.includes('mohsen_ghodrat')
  );
};

export const getStoredRoleOverrides = (): Record<string, UserRole> => {
  try {
    const raw = localStorage.getItem(ROLE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setStoredRoleOverride = (userId: string, role: UserRole) => {
  try {
    const overrides = getStoredRoleOverrides();
    overrides[userId] = role;
    localStorage.setItem(ROLE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Could not store role override:', e);
  }
};

const sanitizeUser = (user: UserProfile): UserProfile => {
  let displayName = user.displayName || '';
  if (displayName.includes('Mohsen Ghodrat') || user.email?.toLowerCase().includes('mohsenghodrat')) {
    displayName = displayName.replace(/Dr\.\s*Mohsen Ghodrat/gi, 'Mohsen Ghodrat').trim();
    if (!displayName) displayName = 'Mohsen Ghodrat';
  }

  const emailLower = (user.email || '').toLowerCase();
  const nameLower = displayName.toLowerCase();
  const idLower = (user.id || '').toLowerCase();

  let defaultRole: UserRole = user.role || 'developer';

  if (
    emailLower.includes('orkhon.erdenebaatar') ||
    nameLower.includes('orkhon erdenebaatar') ||
    emailLower === 'admin@ucanwest.ca' ||
    emailLower === 'admin@ucw.ca' ||
    idLower.includes('orkhon')
  ) {
    defaultRole = 'administrator';
  } else if (
    emailLower.includes('komil.mamajanov') ||
    nameLower.includes('komil mamajanov') ||
    idLower.includes('komil')
  ) {
    defaultRole = 'project_lead';
  } else if (
    emailLower.includes('mohsen.ghodrat') ||
    emailLower.includes('mohsenghodrat') ||
    nameLower.includes('mohsen ghodrat')
  ) {
    defaultRole = 'workshop_lead';
  } else if (
    emailLower.includes('cheryl.thomas') ||
    nameLower.includes('cheryl thomas') ||
    idLower.includes('cheryl')
  ) {
    defaultRole = 'workshop_lead';
  } else if (
    emailLower.includes('amirhossein.zaji') ||
    nameLower.includes('amirhossein') ||
    idLower.includes('amirhossein')
  ) {
    defaultRole = 'workshop_lead';
  } else if (
    emailLower.includes('amy.hua') ||
    nameLower.includes('amy hua') ||
    idLower.includes('amy')
  ) {
    defaultRole = 'academic_affairs';
  }

  const overrides = getStoredRoleOverrides();
  let role = overrides[user.id] || overrides[user.email || ''] || null;
  if (!role) {
    role = defaultRole;
  }

  return {
    ...user,
    displayName,
    role,
  };
};

const isLegacyRandomUserId = (id: string): boolean => {
  return /^(?:dev_\d+_[a-z0-9]+|usr_.+)$/i.test(id);
};

const normalizeAndMigrateFirestoreUsers = (rawUsers: UserProfile[]): UserProfile[] => {
  const seenIds = new Set<string>();
  const normalizedList: UserProfile[] = [];

  for (const u of rawUsers) {
    if (!u) continue;
    // Skip anonymous placeholder records if any were accidentally created
    if (u.displayName === 'UCW Faculty Member' && !u.email) {
      deleteDoc(doc(db, COLLECTION_NAME, u.id)).catch(() => {});
      continue;
    }

    let targetId = u.id;
    if (isLegacyRandomUserId(u.id)) {
      const structuredId = formatUserId(u.displayName, u.email);
      if (structuredId && structuredId !== u.id) {
        targetId = structuredId;
        const migratedProfile: UserProfile = {
          ...u,
          id: targetId,
          updatedAt: new Date().toISOString(),
        };
        // Migrate in Firestore: create structured doc and remove old random-ID doc
        setDoc(doc(db, COLLECTION_NAME, targetId), migratedProfile, { merge: true })
          .then(() => deleteDoc(doc(db, COLLECTION_NAME, u.id)))
          .catch((err) => console.warn('User ID migration notice:', err));
      }
    }

    if (!seenIds.has(targetId)) {
      seenIds.add(targetId);
      normalizedList.push({ ...u, id: targetId });
    }
  }

  return normalizedList;
};

const mergeWithDefaultFaculty = (firestoreUsers: UserProfile[]): UserProfile[] => {
  const deletedIds = getStoredDeletedUserIds();
  const normalizedFirestore = normalizeAndMigrateFirestoreUsers(firestoreUsers);
  const result: UserProfile[] = [...normalizedFirestore];

  DEFAULT_FACULTY.forEach((defaultUser) => {
    const isDeleted =
      deletedIds.includes(defaultUser.id.toLowerCase()) ||
      (defaultUser.email && deletedIds.includes(defaultUser.email.toLowerCase()));
    if (isDeleted) return;

    const defaultPersonKey = normalizePersonKey(defaultUser.displayName);
    const defaultEmailPre = normalizeEmailPrefix(defaultUser.email);

    const idx = result.findIndex((u) => {
      if (u.id === defaultUser.id) return true;
      if (defaultPersonKey && normalizePersonKey(u.displayName) === defaultPersonKey) return true;
      if (defaultEmailPre && normalizeEmailPrefix(u.email) === defaultEmailPre) return true;
      return false;
    });

    if (idx >= 0) {
      result[idx] = {
        ...defaultUser,
        ...result[idx],
        id: result[idx].id || defaultUser.id,
      };
    } else {
      result.push(defaultUser);
    }
  });

  // Deduplicate by person name / ID so there are never duplicate cards for the same person
  const deduped: UserProfile[] = [];
  const seenKeys = new Set<string>();
  for (const u of result) {
    if (
      deletedIds.includes(u.id.toLowerCase()) ||
      (u.email && deletedIds.includes(u.email.toLowerCase()))
    ) {
      continue;
    }
    const sanitized = sanitizeUser(u);
    const key = normalizePersonKey(sanitized.displayName) || sanitized.id.toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(sanitized);
    }
  }

  return deduped;
};

export const userService = {
  subscribeUsers: (
    onSuccess: (users: UserProfile[]) => void,
    onError?: (err: any) => void
  ) => {
    try {
      const collRef = collection(db, COLLECTION_NAME);

      return onSnapshot(
        collRef,
        (snapshot) => {
          const list: UserProfile[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<UserProfile, 'id'>),
            id: docSnap.id,
          }));
          const merged = mergeWithDefaultFaculty(list);
          onSuccess(merged);
        },
        (error) => {
          console.warn('Users subscription error, using defaults:', error);
          const defaults = mergeWithDefaultFaculty([]);
          onSuccess(defaults);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.warn('Error initiating users subscription:', error);
      const defaults = mergeWithDefaultFaculty([]);
      onSuccess(defaults);
    }
  },

  getAllUsers: async (): Promise<UserProfile[]> => {
    const path = COLLECTION_NAME;
    try {
      const collRef = collection(db, path);
      const snapshot = await getDocs(collRef);
      const list: UserProfile[] = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Omit<UserProfile, 'id'>),
        id: docSnap.id,
      }));
      return mergeWithDefaultFaculty(list);
    } catch (error) {
      console.warn('getAllUsers Firestore error, returning defaults:', error);
      return mergeWithDefaultFaculty([]);
    }
  },

  updateUserRole: async (userId: string, newRole: UserRole): Promise<void> => {
    // 1. Immediately store persistent override
    setStoredRoleOverride(userId, newRole);

    // 2. Persist to Firestore
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await setDoc(
        docRef,
        {
          id: userId,
          role: newRole,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('updateUserRole Firestore sync warning:', error);
    }

    // 3. Sync with local server cache
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole, updatedAt: new Date().toISOString() }),
      });
    } catch {}
  },

  createDeveloperProfile: async (
    profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const path = COLLECTION_NAME;
    const structuredId = formatUserId(profileData.displayName, profileData.email);
    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      id: structuredId,
      ...profileData,
      assignedWorkshopCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setStoredRoleOverride(structuredId, profileData.role);

    try {
      await setDoc(doc(db, COLLECTION_NAME, structuredId), newProfile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });
    } catch {}

    return structuredId;
  },

  deleteUser: async (userId: string, email?: string): Promise<void> => {
    addStoredDeletedUserId(userId);
    if (email) addStoredDeletedUserId(email);
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn('deleteUser Firestore warning:', error);
    }
    try {
      await fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    } catch {}
  },
};

