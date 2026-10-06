import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Course, OutcomeMapping, MatchLevel, UserProfile } from '../types';
import { INITIAL_COURSES, INITIAL_MAPPINGS } from '../data/initialData';

const COURSES_COLLECTION = 'courses';
const MAPPINGS_COLLECTION = 'outcome_mappings';

const COURSES_STORAGE_KEY = 'ucw_cached_courses';
const MAPPINGS_STORAGE_KEY = 'ucw_cached_mappings';

const getCachedCourses = (): Course[] => {
  try {
    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(INITIAL_COURSES));
  return INITIAL_COURSES;
};

const saveCachedCourses = (list: Course[]) => {
  try {
    localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(list));
  } catch {}
};

const getCachedMappings = (): OutcomeMapping[] => {
  try {
    const raw = localStorage.getItem(MAPPINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem(MAPPINGS_STORAGE_KEY, JSON.stringify(INITIAL_MAPPINGS));
  return INITIAL_MAPPINGS;
};

const saveCachedMappings = (list: OutcomeMapping[]) => {
  try {
    localStorage.setItem(MAPPINGS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
};

type CourseSubscriber = (courses: Course[]) => void;
const courseSubscribers = new Set<CourseSubscriber>();

function notifyCourseSubscribers(list: Course[]) {
  saveCachedCourses(list);
  courseSubscribers.forEach((cb) => {
    try {
      cb(list);
    } catch (e) {
      console.warn('Course subscriber notice:', e);
    }
  });
}

type MappingSubscriber = (mappings: OutcomeMapping[]) => void;
const mappingSubscribers = new Set<MappingSubscriber>();

function notifyMappingSubscribers(list: OutcomeMapping[]) {
  saveCachedMappings(list);
  mappingSubscribers.forEach((cb) => {
    try {
      cb(list);
    } catch (e) {
      console.warn('Mapping subscriber notice:', e);
    }
  });
}

export const courseService = {
  // Subscribe to all courses in real-time
  subscribeCourses: (
    onSuccess: (courses: Course[]) => void,
    onError?: (err: any) => void
  ) => {
    courseSubscribers.add(onSuccess);
    onSuccess(getCachedCourses());

    try {
      const collRef = collection(db, COURSES_COLLECTION);
      const unsubscribeFirestore = onSnapshot(
        collRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Course[] = snapshot.docs.map((docSnap) => ({
              ...(docSnap.data() as Omit<Course, 'id'>),
              id: docSnap.id,
            }));
            notifyCourseSubscribers(list);
          }
        },
        (error) => {
          console.warn('Courses subscription notice:', error?.message || error);
        }
      );

      return () => {
        courseSubscribers.delete(onSuccess);
        if (typeof unsubscribeFirestore === 'function') {
          unsubscribeFirestore();
        }
      };
    } catch (error) {
      console.warn('Failed to initialize courses subscription:', error);
      return () => {
        courseSubscribers.delete(onSuccess);
      };
    }
  },

  getAllCourses: async (): Promise<Course[]> => {
    try {
      const collRef = collection(db, COURSES_COLLECTION);
      const snapshot = await getDocs(collRef);
      if (!snapshot.empty) {
        const list: Course[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<Course, 'id'>),
          id: docSnap.id,
        }));
        notifyCourseSubscribers(list);
        return list;
      }
    } catch (error) {
      console.warn('getAllCourses fallback:', error);
    }
    return getCachedCourses();
  },

  createCourse: async (
    courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    user: UserProfile
  ): Promise<string> => {
    const newId = `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCourse: Course = {
      ...courseData,
      id: newId,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cached = getCachedCourses();
    notifyCourseSubscribers([newCourse, ...cached]);

    try {
      const docRef = await addDoc(collection(db, COURSES_COLLECTION), newCourse);
      return docRef.id;
    } catch (error) {
      console.warn('Created course locally:', error);
      return newId;
    }
  },

  updateCourse: async (
    id: string,
    updates: Partial<Course>
  ): Promise<void> => {
    const cached = getCachedCourses();
    const existing = cached.find((c) => c.id === id);
    if (existing) {
      const updated: Course = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      const updatedList = cached.map((c) => (c.id === id ? updated : c));
      notifyCourseSubscribers(updatedList);
    }

    try {
      const docRef = doc(db, COURSES_COLLECTION, id);
      const payload: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      delete payload.id;
      await updateDoc(docRef, payload);
    } catch (error) {
      console.warn('Updated course locally:', error);
    }
  },

  deleteCourse: async (id: string): Promise<void> => {
    const cached = getCachedCourses();
    const updatedList = cached.filter((c) => c.id !== id);
    notifyCourseSubscribers(updatedList);

    // Also delete any associated mappings
    const mappings = getCachedMappings();
    notifyMappingSubscribers(mappings.filter((m) => m.courseId !== id));

    try {
      await deleteDoc(doc(db, COURSES_COLLECTION, id));
    } catch (error) {
      console.warn('Deleted course locally:', error);
    }
  },

  deleteMappingsForCourse: async (courseId: string): Promise<void> => {
    const mappings = getCachedMappings();
    notifyMappingSubscribers(mappings.filter((m) => m.courseId !== courseId));
  },

  // Subscribe to all outcome mappings in real-time
  subscribeMappings: (
    onSuccess: (mappings: OutcomeMapping[]) => void,
    onError?: (err: any) => void
  ) => {
    mappingSubscribers.add(onSuccess);
    onSuccess(getCachedMappings());

    try {
      const collRef = collection(db, MAPPINGS_COLLECTION);
      const unsubscribeFirestore = onSnapshot(
        collRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: OutcomeMapping[] = snapshot.docs.map((docSnap) => ({
              ...(docSnap.data() as Omit<OutcomeMapping, 'id'>),
              id: docSnap.id,
            }));
            notifyMappingSubscribers(list);
          }
        },
        (error) => {
          console.warn('Mappings subscription notice:', error?.message || error);
        }
      );

      return () => {
        mappingSubscribers.delete(onSuccess);
        if (typeof unsubscribeFirestore === 'function') {
          unsubscribeFirestore();
        }
      };
    } catch (error) {
      console.warn('Failed to initialize mappings subscription:', error);
      return () => {
        mappingSubscribers.delete(onSuccess);
      };
    }
  },

  getAllMappings: async (): Promise<OutcomeMapping[]> => {
    try {
      const collRef = collection(db, MAPPINGS_COLLECTION);
      const snapshot = await getDocs(collRef);
      if (!snapshot.empty) {
        const list: OutcomeMapping[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<OutcomeMapping, 'id'>),
          id: docSnap.id,
        }));
        notifyMappingSubscribers(list);
        return list;
      }
    } catch (error) {
      console.warn('getAllMappings fallback:', error);
    }
    return getCachedMappings();
  },

  createMapping: async (
    mappingData: Omit<OutcomeMapping, 'id' | 'createdAt'>,
    user: UserProfile
  ): Promise<string> => {
    const newId = `map_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMapping: OutcomeMapping = {
      ...mappingData,
      id: newId,
      mappedBy: user.id,
      createdAt: new Date().toISOString(),
    };

    const cached = getCachedMappings();
    notifyMappingSubscribers([newMapping, ...cached]);

    try {
      const docRef = await addDoc(collection(db, MAPPINGS_COLLECTION), newMapping);
      return docRef.id;
    } catch {
      return newId;
    }
  },

  deleteMapping: async (id: string): Promise<void> => {
    const cached = getCachedMappings();
    notifyMappingSubscribers(cached.filter((m) => m.id !== id));

    try {
      await deleteDoc(doc(db, MAPPINGS_COLLECTION, id));
    } catch {
      // Local fallback handled silently
    }
  },

  setMappingLevel: async (
    mappingData: Omit<OutcomeMapping, 'id' | 'createdAt' | 'matchLevel'> & { matchLevel: MatchLevel | 'none' },
    user: UserProfile
  ): Promise<void> => {
    const mappings = getCachedMappings();
    const existing = mappings.find(
      (m) =>
        m.courseId === mappingData.courseId &&
        m.courseLoId === mappingData.courseLoId &&
        m.targetType === mappingData.targetType &&
        m.targetId === mappingData.targetId &&
        m.targetLoId === mappingData.targetLoId
    );

    if (mappingData.matchLevel === 'none') {
      if (existing && existing.id) {
        await courseService.deleteMapping(existing.id);
      }
      return;
    }

    if (existing && existing.id) {
      const updated: OutcomeMapping = {
        ...existing,
        matchLevel: mappingData.matchLevel,
        mappedBy: user.id,
      };
      const updatedList = mappings.map((m) => (m.id === existing.id ? updated : m));
      notifyMappingSubscribers(updatedList);

      try {
        await updateDoc(doc(db, MAPPINGS_COLLECTION, existing.id), {
          matchLevel: mappingData.matchLevel,
          mappedBy: user.id,
        });
      } catch {
        // Local fallback handled silently
      }
    } else {
      await courseService.createMapping(
        {
          courseId: mappingData.courseId,
          courseLoId: mappingData.courseLoId,
          targetType: mappingData.targetType,
          targetId: mappingData.targetId,
          targetLoId: mappingData.targetLoId,
          matchLevel: mappingData.matchLevel,
          mappedBy: user.id,
        },
        user
      );
    }
  },

  toggleMapping: async (
    mappingData: Omit<OutcomeMapping, 'id' | 'createdAt'>,
    user: UserProfile
  ): Promise<void> => {
    const mappings = getCachedMappings();
    const existing = mappings.find(
      (m) =>
        m.courseId === mappingData.courseId &&
        m.courseLoId === mappingData.courseLoId &&
        m.targetType === mappingData.targetType &&
        m.targetId === mappingData.targetId &&
        m.targetLoId === mappingData.targetLoId
    );

    // Cycle levels: none -> strong -> partial -> low -> none
    let nextLevel: MatchLevel | 'none' = 'strong';
    const currentLevel = existing?.matchLevel || (existing ? 'strong' : 'none');

    if (!existing) {
      nextLevel = 'strong';
    } else if (currentLevel === 'strong') {
      nextLevel = 'partial';
    } else if (currentLevel === 'partial') {
      nextLevel = 'low';
    } else {
      nextLevel = 'none';
    }

    await courseService.setMappingLevel(
      {
        ...mappingData,
        matchLevel: nextLevel,
      },
      user
    );
  },
};
