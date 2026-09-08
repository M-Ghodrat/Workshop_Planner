import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../config/firebase';
import { Workshop, UserProfile, OperationType, AssignedDeveloper, WorkshopStatus } from '../types';

const COLLECTION_NAME = 'workshops';

const sanitizeWorkshop = (w: Workshop): Workshop => {
  let createdByName = w.createdByName;
  let updatedByName = w.updatedByName;
  let assignedDevelopers = w.assignedDevelopers;

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
    createdByName,
    updatedByName,
    assignedDevelopers,
  };
};

export const workshopService = {
  // Subscribe to workshops
  subscribeWorkshops: (
    onSuccess: (workshops: Workshop[]) => void,
    onError?: (err: any) => void,
    userId?: string,
    isAdmin?: boolean
  ) => {
    try {
      const collRef = collection(db, COLLECTION_NAME);
      let q = query(collRef, orderBy('updatedAt', 'desc'));

      return onSnapshot(
        q,
        (snapshot) => {
          const list: Workshop[] = snapshot.docs.map((docSnap) =>
            sanitizeWorkshop({
              ...(docSnap.data() as Omit<Workshop, 'id'>),
              id: docSnap.id,
            })
          );

          // If not admin, filter workshops to which the user is assigned or created
          if (!isAdmin && userId) {
            const filtered = list.filter(
              (w) =>
                w.createdBy === userId ||
                (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId)) ||
                w.status === 'Approved'
            );
            onSuccess(filtered);
          } else {
            onSuccess(list);
          }
        },
        (error) => {
          console.warn('Workshop subscription error, falling back to one-time query:', error);
          try {
            handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
          } catch (e) {
            onError?.(e);
          }
        }
      );
    } catch (error) {
      console.warn('Failed to initialize workshop subscription:', error);
      return () => {};
    }
  },

  // Get all workshops with optional filtering
  getAllWorkshops: async (userId?: string, isAdmin?: boolean): Promise<Workshop[]> => {
    const path = COLLECTION_NAME;
    try {
      const collRef = collection(db, path);
      const snapshot = await getDocs(collRef);
      const list: Workshop[] = snapshot.docs.map((docSnap) =>
        sanitizeWorkshop({
          ...(docSnap.data() as Omit<Workshop, 'id'>),
          id: docSnap.id,
        })
      );

      if (!isAdmin && userId) {
        return list.filter(
          (w) =>
            w.createdBy === userId ||
            (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId)) ||
            w.status === 'Approved'
        );
      }
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  // Get workshop by ID
  getWorkshopById: async (id: string): Promise<Workshop | null> => {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return sanitizeWorkshop({ ...(snap.data() as Omit<Workshop, 'id'>), id: snap.id });
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  // Create a new workshop
  createWorkshop: async (
    workshopData: Omit<Workshop, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    user: UserProfile
  ): Promise<string> => {
    const path = COLLECTION_NAME;
    try {
      const newWorkshop: Omit<Workshop, 'id'> = {
        ...workshopData,
        assignedDeveloperIds: workshopData.assignedDeveloperIds?.length
          ? workshopData.assignedDeveloperIds
          : [user.id],
        assignedDevelopers: workshopData.assignedDevelopers?.length
          ? workshopData.assignedDevelopers
          : [
              {
                id: user.id,
                name: user.displayName,
                email: user.email,
                department: user.department,
              },
            ],
        createdBy: user.id,
        createdByName: user.displayName,
        updatedBy: user.id,
        updatedByName: user.displayName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, path), newWorkshop);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Update existing workshop
  updateWorkshop: async (
    id: string,
    updates: Partial<Workshop>,
    user: UserProfile
  ): Promise<void> => {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const payload: Record<string, any> = {
        ...updates,
        updatedBy: user.id,
        updatedByName: user.displayName,
        updatedAt: new Date().toISOString(),
      };
      delete payload.id; // ensure ID is not in body

      await updateDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Delete workshop
  deleteWorkshop: async (id: string): Promise<void> => {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Assign/modify collaborators
  updateCollaborators: async (
    id: string,
    developers: AssignedDeveloper[],
    user: UserProfile
  ): Promise<void> => {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const developerIds = developers.map((d) => d.id);
      await updateDoc(docRef, {
        assignedDevelopers: developers,
        assignedDeveloperIds: developerIds,
        updatedBy: user.id,
        updatedByName: user.displayName,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Change status
  updateStatus: async (
    id: string,
    status: WorkshopStatus,
    user: UserProfile
  ): Promise<void> => {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status,
        updatedBy: user.id,
        updatedByName: user.displayName,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};
