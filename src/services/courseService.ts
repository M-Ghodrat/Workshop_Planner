import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
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
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
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
  // Subscribe to all courses in real-time (both live Firestore & server sync)
  subscribeCourses: (
    onSuccess: (courses: Course[]) => void,
    onError?: (err: any) => void
  ) => {
    courseSubscribers.add(onSuccess);
    onSuccess(getCachedCourses());

    // 1. Direct Firestore real-time listener (attaches immediately to provisioned database)
    let unsubscribeFirestore: (() => void) | null = null;
    const attachFirestoreListener = () => {
      if (unsubscribeFirestore) {
        try {
          unsubscribeFirestore();
        } catch {}
        unsubscribeFirestore = null;
      }
      try {
        const collRef = collection(db, COURSES_COLLECTION);
        unsubscribeFirestore = onSnapshot(
          collRef,
          (snap) => {
            if (!snap.empty) {
              const liveList: Course[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
              }));
              notifyCourseSubscribers(liveList);
              // Sync with local server database
              fetch('/api/sync-courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courses: liveList }),
              }).catch(() => {});
            }
          },
          (firestoreErr) => {
            console.debug('Firestore live subscription notice (using server/cached data):', firestoreErr.message);
          }
        );
      } catch (e) {
        console.debug('Could not setup Firestore onSnapshot:', e);
      }
    };

    // Attach immediately
    attachFirestoreListener();

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        attachFirestoreListener();
        courseService.pullFromFirestore().catch(() => {});
      }
    });

    // 2. Fetch from persistent server database
    fetch('/api/courses')
      .then((res) => (res.ok ? res.json() : null))
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          notifyCourseSubscribers(list);
        }
      })
      .catch((e) => {
        console.debug('Courses API fetch notice:', e);
      });

    const onFocus = () => {
      fetch('/api/courses')
        .then((res) => (res.ok ? res.json() : null))
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) notifyCourseSubscribers(list);
        })
        .catch(() => {});
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      courseSubscribers.delete(onSuccess);
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeAuth) unsubscribeAuth();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  },

  // Pull explicitly from Firestore on demand
  pullFromFirestore: async (): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      const snap = await getDocs(collection(db, COURSES_COLLECTION));
      if (!snap.empty) {
        const liveList: Course[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        notifyCourseSubscribers(liveList);
        await fetch('/api/sync-courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courses: liveList }),
        }).catch(() => {});
        return { success: true, count: liveList.length };
      }
      return { success: true, count: 0 };
    } catch (err: any) {
      console.warn('Manual pull from Firestore notice:', err);
      return {
        success: false,
        count: 0,
        error: err.message || 'Permission denied or Firestore unreachable',
      };
    }
  },

  getAllCourses: async (): Promise<Course[]> => {
    // Try Firestore direct first
    try {
      const snap = await getDocs(collection(db, COURSES_COLLECTION));
      if (!snap.empty) {
        const liveList: Course[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        notifyCourseSubscribers(liveList);
        return liveList;
      }
    } catch (e) {
      console.debug('Direct Firestore getDocs notice:', e);
    }

    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const list: Course[] = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          notifyCourseSubscribers(list);
          return list;
        }
      }
    } catch (e) {
      console.debug('getAllCourses API notice:', e);
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

    // Persist to Firestore
    try {
      await setDoc(doc(db, COURSES_COLLECTION, newId), newCourse);
    } catch (error) {
      console.debug('Firestore course write notice:', error);
    }

    // Persist to local server
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse),
      });
      if (res.ok) {
        const saved = await res.json();
        return saved.id || newId;
      }
    } catch (error) {
      console.debug('Created course locally / offline:', error);
    }
    return newId;
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

    // Persist to Firestore
    try {
      await updateDoc(doc(db, COURSES_COLLECTION, id), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.debug('Firestore course update notice:', error);
    }

    // Persist to local server
    try {
      await fetch(`/api/courses/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.debug('Updated course API notice:', error);
    }
  },

  deleteCourse: async (id: string): Promise<void> => {
    const cached = getCachedCourses();
    const updatedList = cached.filter((c) => c.id !== id);
    notifyCourseSubscribers(updatedList);

    // Also delete any associated mappings
    const mappings = getCachedMappings();
    notifyMappingSubscribers(mappings.filter((m) => m.courseId !== id));

    // Delete from Firestore
    try {
      await deleteDoc(doc(db, COURSES_COLLECTION, id));
    } catch (error) {
      console.debug('Firestore course delete notice:', error);
    }

    // Delete from local server
    try {
      await fetch(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (error) {
      console.debug('Deleted course API notice:', error);
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

    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const collRef = collection(db, MAPPINGS_COLLECTION);
      unsubscribeFirestore = onSnapshot(
        collRef,
        (snap) => {
          const liveMappings: OutcomeMapping[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          notifyMappingSubscribers(liveMappings);
        },
        (err) => {
          console.debug('Firestore mappings subscription notice:', err.message);
        }
      );
    } catch (e) {
      console.debug('Could not setup Firestore mappings onSnapshot:', e);
    }

    fetch('/api/mappings')
      .then((res) => (res.ok ? res.json() : null))
      .then((list) => {
        if (Array.isArray(list)) {
          notifyMappingSubscribers(list);
        }
      })
      .catch((e) => {
        console.debug('Mappings API fetch notice:', e);
      });

    const onFocus = () => {
      fetch('/api/mappings')
        .then((res) => (res.ok ? res.json() : null))
        .then((list) => {
          if (Array.isArray(list)) notifyMappingSubscribers(list);
        })
        .catch(() => {});
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      mappingSubscribers.delete(onSuccess);
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  },

  getAllMappings: async (): Promise<OutcomeMapping[]> => {
    try {
      const res = await fetch('/api/mappings');
      if (res.ok) {
        const list: OutcomeMapping[] = await res.json();
        if (Array.isArray(list)) {
          notifyMappingSubscribers(list);
          return list;
        }
      }
    } catch (error) {
      console.debug('getAllMappings API notice:', error);
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

    // Direct Firestore write (works in AI Studio and on Netlify)
    try {
      await setDoc(doc(db, MAPPINGS_COLLECTION, newId), newMapping);
    } catch (e) {
      console.debug('Firestore direct createMapping notice:', e);
    }

    try {
      const res = await fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapping),
      });
      if (res.ok) {
        const saved = await res.json();
        return saved.id || newId;
      }
    } catch {
      return newId;
    }
    return newId;
  },

  deleteMapping: async (id: string): Promise<void> => {
    const cached = getCachedMappings();
    notifyMappingSubscribers(cached.filter((m) => m.id !== id));

    // Direct Firestore delete
    try {
      await deleteDoc(doc(db, MAPPINGS_COLLECTION, id));
    } catch (e) {
      console.debug('Firestore direct deleteMapping notice:', e);
    }

    try {
      await fetch(`/api/mappings/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

      // Direct Firestore update
      try {
        await updateDoc(doc(db, MAPPINGS_COLLECTION, existing.id), {
          matchLevel: mappingData.matchLevel,
          mappedBy: user.id,
        });
      } catch (e) {
        console.debug('Firestore direct updateDoc notice:', e);
      }

      try {
        await fetch(`/api/mappings/${encodeURIComponent(existing.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchLevel: mappingData.matchLevel, mappedBy: user.id }),
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

  clearAllMappings: async (): Promise<void> => {
    try {
      const snap = await getDocs(collection(db, MAPPINGS_COLLECTION));
      const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, MAPPINGS_COLLECTION, d.id)));
      await Promise.all(deletePromises);
    } catch (e) {
      console.warn('Firestore clearAllMappings notice:', e);
    }

    try {
      await fetch('/api/clear-mappings', { method: 'POST' });
    } catch {}

    saveCachedMappings([]);
    notifyMappingSubscribers([]);
  },
};
