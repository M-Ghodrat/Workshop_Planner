import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  where,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../config/firebase';
import { Course, OutcomeMapping, OperationType, UserProfile } from '../types';

const COURSES_COLLECTION = 'courses';
const MAPPINGS_COLLECTION = 'outcome_mappings';

export const courseService = {
  // Subscribe to all courses in real-time
  subscribeCourses: (
    onSuccess: (courses: Course[]) => void,
    onError?: (err: any) => void
  ) => {
    try {
      const collRef = collection(db, COURSES_COLLECTION);
      return onSnapshot(
        collRef,
        (snapshot) => {
          const list: Course[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<Course, 'id'>),
            id: docSnap.id,
          }));
          onSuccess(list);
        },
        (error) => {
          console.warn('Courses subscription error:', error);
          try {
            handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
          } catch (e) {
            onError?.(e);
          }
        }
      );
    } catch (error) {
      console.warn('Failed to initialize courses subscription:', error);
      return () => {};
    }
  },

  createCourse: async (
    courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    user: UserProfile
  ): Promise<string> => {
    const path = COURSES_COLLECTION;
    try {
      const newCourse: Omit<Course, 'id'> = {
        ...courseData,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, path), newCourse);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateCourse: async (
    id: string,
    updates: Partial<Course>
  ): Promise<void> => {
    const path = `${COURSES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, COURSES_COLLECTION, id);
      const payload: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      delete payload.id;

      await updateDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteCourse: async (id: string): Promise<void> => {
    const path = `${COURSES_COLLECTION}/${id}`;
    try {
      await deleteDoc(doc(db, COURSES_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Subscribe to all outcome mappings in real-time
  subscribeMappings: (
    onSuccess: (mappings: OutcomeMapping[]) => void,
    onError?: (err: any) => void
  ) => {
    try {
      const collRef = collection(db, MAPPINGS_COLLECTION);
      return onSnapshot(
        collRef,
        (snapshot) => {
          const list: OutcomeMapping[] = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<OutcomeMapping, 'id'>),
            id: docSnap.id,
          }));
          onSuccess(list);
        },
        (error) => {
          console.warn('Mappings subscription error:', error);
          try {
            handleFirestoreError(error, OperationType.LIST, MAPPINGS_COLLECTION);
          } catch (e) {
            onError?.(e);
          }
        }
      );
    } catch (error) {
      console.warn('Failed to initialize mappings subscription:', error);
      return () => {};
    }
  },

  // Toggle mapping: if mapping exists, remove it; if not, add it
  toggleMapping: async (
    mappingData: Omit<OutcomeMapping, 'id' | 'createdAt'>,
    user: UserProfile
  ): Promise<void> => {
    const path = MAPPINGS_COLLECTION;
    try {
      const collRef = collection(db, path);
      // Query to find if this specific mapping already exists
      const q = query(
        collRef,
        where('courseId', '==', mappingData.courseId),
        where('courseLoId', '==', mappingData.courseLoId),
        where('targetType', '==', mappingData.targetType),
        where('targetId', '==', mappingData.targetId),
        where('targetLoId', '==', mappingData.targetLoId)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // If it exists, delete all matching mappings (typically just 1)
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, path, docSnap.id));
        }
      } else {
        // Create new mapping
        const newMapping: Omit<OutcomeMapping, 'id'> = {
          ...mappingData,
          mappedBy: user.id,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collRef, newMapping);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Clear all mappings for a specific course or target if needed
  deleteMappingsForCourse: async (courseId: string): Promise<void> => {
    const path = MAPPINGS_COLLECTION;
    try {
      const q = query(collection(db, path), where('courseId', '==', courseId));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, path, docSnap.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
