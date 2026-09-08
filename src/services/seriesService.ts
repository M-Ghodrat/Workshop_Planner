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
import { db, handleFirestoreError } from '../config/firebase';
import { WorkshopSeries, UserProfile, OperationType } from '../types';

const COLLECTION_NAME = 'workshopSeries';

export const seriesService = {
  subscribeSeries: (
    onSuccess: (series: WorkshopSeries[]) => void,
    onError?: (err: any) => void
  ) => {
    try {
      const collRef = collection(db, COLLECTION_NAME);
      const q = query(collRef, orderBy('createdAt', 'desc'));

      return onSnapshot(
        q,
        (snapshot) => {
          const list: WorkshopSeries[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<WorkshopSeries, 'id'>),
            id: docSnap.id,
          }));
          onSuccess(list);
        },
        (error) => {
          console.warn('Series subscription error:', error);
          try {
            handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
          } catch (e) {
            onError?.(e);
          }
        }
      );
    } catch (error) {
      console.warn('Failed to initialize series subscription:', error);
      return () => {};
    }
  },

  getAllSeries: async (): Promise<WorkshopSeries[]> => {
    const path = COLLECTION_NAME;
    try {
      const collRef = collection(db, path);
      const snapshot = await getDocs(collRef);
      return snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Omit<WorkshopSeries, 'id'>),
        id: docSnap.id,
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  getSeriesById: async (id: string): Promise<WorkshopSeries | null> => {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...(snap.data() as Omit<WorkshopSeries, 'id'>), id: snap.id };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  createSeries: async (
    seriesData: Omit<WorkshopSeries, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    user: UserProfile
  ): Promise<string> => {
    const path = COLLECTION_NAME;
    try {
      const newSeries: Omit<WorkshopSeries, 'id'> = {
        ...seriesData,
        workshopIds: seriesData.workshopIds || [],
        workshopCount: (seriesData.workshopIds || []).length,
        createdBy: user.id,
        createdByName: user.displayName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, path), newSeries);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateSeries: async (
    id: string,
    updates: Partial<WorkshopSeries>,
    user?: UserProfile
  ): Promise<void> => {
    const path = `${COLLECTION_NAME}/${id}`;
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
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteSeries: async (id: string): Promise<void> => {
    const path = `${COLLECTION_NAME}/${id}`;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
