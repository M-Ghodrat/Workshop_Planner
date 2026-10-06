import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types';
import {
  INITIAL_USERS,
  INITIAL_SERIES,
  INITIAL_WORKSHOPS,
  INITIAL_COURSES,
  INITIAL_MAPPINGS,
  INITIAL_MATERIALS,
} from '../data/initialData';

const LOCAL_STORAGE_KEYS = {
  workshops: 'ucw_cached_workshops',
  series: 'ucw_cached_series',
  courses: 'ucw_cached_courses',
  mappings: 'ucw_cached_mappings',
  materials: 'ucw_cached_materials',
  users: 'ucw_cached_users',
};

export const seedService = {
  seedSampleData: async (currentUserProfile?: UserProfile | null): Promise<void> => {
    return seedService.seedInitialData(currentUserProfile);
  },

  seedInitialData: async (currentUserProfile?: UserProfile | null): Promise<void> => {
    // 1. Always update local storage first so UI has instant access
    localStorage.setItem(LOCAL_STORAGE_KEYS.users, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(LOCAL_STORAGE_KEYS.series, JSON.stringify(INITIAL_SERIES));
    localStorage.setItem(LOCAL_STORAGE_KEYS.workshops, JSON.stringify(INITIAL_WORKSHOPS));
    localStorage.setItem(LOCAL_STORAGE_KEYS.courses, JSON.stringify(INITIAL_COURSES));
    localStorage.setItem(LOCAL_STORAGE_KEYS.mappings, JSON.stringify(INITIAL_MAPPINGS));
    localStorage.setItem(LOCAL_STORAGE_KEYS.materials, JSON.stringify(INITIAL_MATERIALS));

    // 2. Persist to Firestore if online & authenticated
    try {
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.id), u, { merge: true });
      }
      for (const s of INITIAL_SERIES) {
        if (s.id) await setDoc(doc(db, 'workshopSeries', s.id), s, { merge: true });
      }
      for (const w of INITIAL_WORKSHOPS) {
        if (w.id) await setDoc(doc(db, 'workshops', w.id), w, { merge: true });
      }
      for (const c of INITIAL_COURSES) {
        if (c.id) await setDoc(doc(db, 'courses', c.id), c, { merge: true });
      }
      for (const m of INITIAL_MAPPINGS) {
        if (m.id) await setDoc(doc(db, 'outcome_mappings', m.id), m, { merge: true });
      }
      for (const mat of INITIAL_MATERIALS) {
        if (mat.id) await setDoc(doc(db, 'materials', mat.id), mat, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore seeding notice (cached locally):', err);
    }
  },
};
