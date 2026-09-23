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
        email: 'admin@ucanwest.ca',
        displayName: 'Administrator',
        role: 'administrator',
        department: 'Administration & Governance',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin_komil_mamajanov',
        email: 'komil.mamajanov@ucanwest.ca',
        displayName: 'Komil Mamajanov',
        role: 'administrator',
        department: 'Administration & Governance',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'lead_mohsen_ghodrat',
        email: 'mohsen.ghodrat@ucanwest.ca',
        displayName: 'Mohsen Ghodrat',
        role: 'workshop_lead',
        department: 'School of Business & Technology',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'lead_cheryl_thomas',
        email: 'cheryl.thomas@ucanwest.ca',
        displayName: 'Cheryl Thomas',
        role: 'workshop_lead',
        department: 'Department of Management',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'lead_amirhossein_zaji',
        email: 'amirhossein.zaji@ucanwest.ca',
        displayName: 'Amirhossein Zaji',
        role: 'workshop_lead',
        department: 'Department of Analytics',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'dev_faculty_member',
        email: 'developer@ucanwest.ca',
        displayName: 'Developer',
        role: 'developer',
        department: 'Curriculum Development',
        assignedWorkshopCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const dev of demoDevelopers) {
      await setDoc(doc(db, 'users', dev.id), dev, { merge: true });
    }
  }
};
