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

    // Fetch from persistent server database
    fetch('/api/courses')
      .then((res) => (res.ok ? res.json() : null))
      .then((list) => {
        if (Array.isArray(list)) {
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
          if (Array.isArray(list)) notifyCourseSubscribers(list);
        })
        .catch(() => {});
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }

    return () => {
      courseSubscribers.delete(onSuccess);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  },

  getAllCourses: async (): Promise<Course[]> => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const list: Course[] = await res.json();
        if (Array.isArray(list)) {
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
};
