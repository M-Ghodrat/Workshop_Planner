import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../config/firebase';
import { UserProfile, UserRole, OperationType } from '../types';

const COLLECTION_NAME = 'users';
const ROLE_OVERRIDES_KEY = 'ucw_user_role_overrides';

export const DEFAULT_FACULTY: UserProfile[] = [
  {
    id: 'demo-admin-ucw-01',
    email: 'admin@ucw.ca',
    displayName: 'Administrator',
    role: 'administrator',
    department: 'Administration & Governance',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'dev_cheryl_thomas',
    email: 'cheryl.thomas@ucw.ca',
    displayName: 'Cheryl Thomas',
    role: 'developer',
    department: 'Department of Management',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'dev_amirhossein_zaji',
    email: 'amirhossein.zaji@ucw.ca',
    displayName: 'Amirhossein Zaji',
    role: 'developer',
    department: 'Department of Analytics',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'dev_mohsen_ghodrat',
    email: 'mohsen.ghodrat@ucw.ca',
    displayName: 'Mohsen Ghodrat',
    role: 'developer',
    department: 'School of Business & Technology',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-04T00:00:00.000Z',
  },
];

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

  // Check if role should be Administrator by default for Administrator account
  const isDefaultAdmin =
    user.id === 'demo-admin-ucw-01' ||
    user.email?.toLowerCase() === 'admin@ucw.ca' ||
    user.email?.toLowerCase() === 'admin@ucanwest.ca' ||
    displayName === 'Administrator';

  // Check if role should be Developer by default for Cheryl, Amirhossein, Mohsen
  const isDefaultDev =
    user.id === 'dev_mohsen_ghodrat' ||
    user.id === 'dev_amirhossein_zaji' ||
    user.id === 'dev_cheryl_thomas' ||
    displayName.includes('Mohsen Ghodrat') ||
    displayName.includes('Amirhossein Zaji') ||
    displayName.includes('Cheryl Thomas') ||
    user.email?.toLowerCase().includes('mohsen.ghodrat') ||
    user.email?.toLowerCase().includes('mohsenghodrat') ||
    user.email?.toLowerCase().includes('amirhossein') ||
    user.email?.toLowerCase().includes('cheryl');

  const overrides = getStoredRoleOverrides();
  let role = overrides[user.id] || overrides[user.email || ''];
  if (!role) {
    if (isDefaultAdmin) {
      role = 'administrator';
    } else if (isDefaultDev) {
      role = 'developer';
    } else {
      role = user.role || 'developer';
    }
  }

  return {
    ...user,
    displayName,
    role,
  };
};

const mergeWithDefaultFaculty = (firestoreUsers: UserProfile[]): UserProfile[] => {
  const result: UserProfile[] = [...firestoreUsers];

  DEFAULT_FACULTY.forEach((defaultUser) => {
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

  return result.map(sanitizeUser);
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
};
