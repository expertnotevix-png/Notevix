import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Ensure we only initialize once
console.log("Initializing Firebase with project:", firebaseConfig.projectId);
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics lazily with error safety
export const analytics = isSupported().then(yes => {
  if (yes) {
    try {
      const instance = getAnalytics(app);
      console.log("Firebase Analytics initialized");
      return instance;
    } catch (e) {
      console.warn("Analytics initialization failed:", e);
      return null;
    }
  }
  return null;
}).catch(() => null);

// Use robust Firestore settings for various network environments
console.log("Connecting to Firestore Database:", firebaseConfig.firestoreDatabaseId || '(default)');
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('TODO')) {
  console.warn("Firebase API Key is missing or invalid!");
}

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection to Firestore
async function testConnection() {
  // Wait a bit for network to stabilize
  await new Promise(r => setTimeout(r, 2000));
  try {
    console.log("Testing Firestore connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test completed (document may not exist, but connection is reached)");
  } catch (error: any) {
    if (error?.code === 'unavailable') {
      console.error("Firestore is UNAVAILABLE. This often means the Database ID is wrong or your network is blocking the connection.");
    } else {
      console.log("Firestore connection test reached server, responded with:", error?.code || error?.message);
    }
  }
}
testConnection();
