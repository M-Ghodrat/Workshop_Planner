import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Workshop, WorkshopSeries, UserProfile } from '../types';

export const seedService = {
  seedSampleData: async (currentUserProfile?: UserProfile | null): Promise<void> => {
    return seedService.seedInitialData(currentUserProfile);
  },

  seedInitialData: async (currentUserProfile?: UserProfile | null): Promise<void> => {
    const creatorId = currentUserProfile?.id || 'demo-admin-ucw-01';

    // 1. Wipe old data from Firestore to ensure a completely pristine layout
    const collectionsToClear = ['workshops', 'workshopSeries', 'users', 'materials'];
    for (const collName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, collName));
        const batch = writeBatch(db);
        snap.docs.forEach((docSnap) => {
          // Keep current active admin/developer session user so they aren't signed out
          if (collName === 'users' && docSnap.id === creatorId) {
            return;
          }
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      } catch (e) {
        console.warn(`Could not clear collection ${collName}:`, e);
      }
    }

    // 2. Seed Clean Faculty Developers list as requested
    const demoDevelopers: UserProfile[] = [
      {
        id: 'demo-admin-ucw-01',
        email: 'admin@ucw.ca',
        displayName: 'Administrator',
        role: 'administrator',
        department: 'Administration & Governance',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'dev_mohsen_ghodrat',
        email: 'mohsen.ghodrat@ucw.ca',
        displayName: 'Mohsen Ghodrat',
        role: 'developer',
        department: 'School of Business & Technology',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'dev_amirhossein_zaji',
        email: 'amirhossein.zaji@ucw.ca',
        displayName: 'Amirhossein Zaji',
        role: 'developer',
        department: 'Department of Analytics',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'dev_cheryl_thomas',
        email: 'cheryl.thomas@ucw.ca',
        displayName: 'Cheryl Thomas',
        role: 'developer',
        department: 'Department of Management',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const dev of demoDevelopers) {
      await setDoc(doc(db, 'users', dev.id), dev, { merge: true });
    }
  }
};
