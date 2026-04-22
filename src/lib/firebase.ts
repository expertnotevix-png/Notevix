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
  experimentalForceLongPolling: true,
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

// System-wide quota lockout (30 minutes)
const QUOTA_LOCK_KEY = 'firestore_quota_lockout';
const QUOTA_LOCK_DURATION = 30 * 60 * 1000;

export const checkQuotaLock = (): boolean => {
  const lockout = localStorage.getItem(QUOTA_LOCK_KEY);
  if (lockout) {
    const lockTime = parseInt(lockout);
    if (Date.now() - lockTime < QUOTA_LOCK_DURATION) {
      return true;
    }
    localStorage.removeItem(QUOTA_LOCK_KEY);
  }
  return false;
};

export const setQuotaLock = () => {
  localStorage.setItem(QUOTA_LOCK_KEY, Date.now().toString());
};

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = false) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const isQuotaError = errorMsg.toLowerCase().includes('quota') || 
                      (error as any)?.code === 'resource-exhausted';

  if (isQuotaError) {
    setQuotaLock();
    console.warn("Firestore Quota hit. Lockout active.");
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
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
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// Removed testConnection to save quota (1 read per load)
