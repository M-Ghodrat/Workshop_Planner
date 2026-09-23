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
import { db, handleFirestoreError } from '../config/firebase';
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

export const DEFAULT_FACULTY: UserProfile[] = [
  {
    id: 'admin_orkhon_erdenebaatar',
    email: 'orkhon.erdenebaatar@ucanwest.ca',
    displayName: 'Orkhon Erdenebaatar',
    role: 'administrator',
    department: 'Administration & Governance',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'lead_komil_mamajanov',
    email: 'komil.mamajanov@ucanwest.ca',
    displayName: 'Komil Mamajanov',
    role: 'project_lead',
    department: 'Administration & Governance',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'lead_mohsen_ghodrat',
    email: 'mohsen.ghodrat@ucanwest.ca',
    displayName: 'Mohsen Ghodrat',
    role: 'workshop_lead',
    department: 'School of Business & Technology',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-04T00:00:00.000Z',
  },
  {
    id: 'lead_cheryl_thomas',
    email: 'cheryl.thomas@ucanwest.ca',
    displayName: 'Cheryl Thomas',
    role: 'workshop_lead',
    department: 'Department of Management',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'lead_amirhossein_zaji',
    email: 'amirhossein.zaji@ucanwest.ca',
    displayName: 'Amirhossein Zaji',
    role: 'workshop_lead',
    department: 'Department of Analytics',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'affairs_amy_hua',
    email: 'amy.hua@ucanwest.ca',
    displayName: 'Amy Hua',
    role: 'academic_affairs',
    department: 'Academic Affairs',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'dev_faculty_member',
    email: 'developer@ucanwest.ca',
    displayName: 'Developer',
    role: 'developer',
    department: 'Curriculum Development',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-06T00:00:00.000Z',
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

  // Role detection:
  let defaultRole: UserRole = 'developer';

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
  } else if (user.role) {
    defaultRole = user.role;
  }

  const overrides = getStoredRoleOverrides();
  // Only Mohsen Ghodrat is permitted to have role overrides / toggle between roles
  const canHaveOverride = isMohsenGhodratUser(user);
  let role = canHaveOverride ? (overrides[user.id] || overrides[user.email || '']) : null;
  if (!role) {
    role = defaultRole;
  }

  return {
    ...user,
    displayName,
    role,
  };
};

const mergeWithDefaultFaculty = (firestoreUsers: UserProfile[]): UserProfile[] => {
  const deletedIds = getStoredDeletedUserIds();
  const result: UserProfile[] = [...firestoreUsers];

  DEFAULT_FACULTY.forEach((defaultUser) => {
    const isDeleted =
      deletedIds.includes(defaultUser.id.toLowerCase()) ||
      (defaultUser.email && deletedIds.includes(defaultUser.email.toLowerCase()));
    if (isDeleted) return;

    const idx = result.findIndex(
      (u) =>
        u.id === defaultUser.id ||
        (u.email && defaultUser.email && u.email.toLowerCase() === defaultUser.email.toLowerCase()) ||
        (u.displayName && defaultUser.displayName && u.displayName.toLowerCase() === defaultUser.displayName.toLowerCase())
    );

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

  return result
    .filter(
      (u) =>
        !deletedIds.includes(u.id.toLowerCase()) &&
        (!u.email || !deletedIds.includes(u.email.toLowerCase()))
    )
    .map(sanitizeUser);
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
    const path = `${COLLECTION_NAME}/${userId}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      await setDoc(
        docRef,
        {
          role: newRole,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('updateUserRole Firestore sync warning:', error);
    }
  },

  createDeveloperProfile: async (
    profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const path = COLLECTION_NAME;
    const autoId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const newProfile: UserProfile = {
        id: autoId,
        ...profileData,
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, COLLECTION_NAME, autoId), newProfile);
      return autoId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
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
  },
};
