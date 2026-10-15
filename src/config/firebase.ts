import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { FirestoreErrorInfo, OperationType } from '../types';
import appletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyAoA6LK04iM116qKFN8y5_ZjGjYpxE0eY8",
  authDomain: appletConfig.authDomain || "ucw-workshop-planner.firebaseapp.com",
  projectId: appletConfig.projectId || "ucw-workshop-planner",
  storageBucket: appletConfig.storageBucket || "ucw-workshop-planner.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "712007730290",
  appId: appletConfig.appId || "1:712007730290:web:76713a5254f7656f636eeb",
  measurementId: appletConfig.measurementId || ""
};

export const FIRESTORE_DATABASE_ID = appletConfig.firestoreDatabaseId || "ai-studio-workshopplanner-d0c2e3a2-d296-40a7-bf60-068133983b2e";

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = FIRESTORE_DATABASE_ID ? getFirestore(app, FIRESTORE_DATABASE_ID) : getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore Error Handler as specified in Firebase Skill
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection to Firestore
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable.');
    }
    return false;
  }
}
