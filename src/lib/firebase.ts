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

// Quota & Cache Management
const CACHE_PREFIX = 'fs_cache_';

// Smart Cache: Stores data for X minutes to save reads
export const getCachedData = <T>(key: string): T | null => {
  const cached = window.localStorage.getItem(CACHE_PREFIX + key);
  if (!cached) return null;
  
  try {
    const { data, expiry } = JSON.parse(cached);
    if (Date.now() > expiry) {
      window.localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data as T;
  } catch (e) {
    return null;
  }
};

export const setCachedData = (key: string, data: any, ttlMinutes: number = 10) => {
  // If we are under high load (quota lock), we cache much longer (6 hours)
  const isLocked = checkQuotaLock();
  const effectiveTTL = isLocked ? Math.max(ttlMinutes, 360) : ttlMinutes;
  
  const expiry = Date.now() + (effectiveTTL * 60 * 1000);
  window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, expiry }));
};

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
const QUOTA_EVENT = 'notevix_quota_lock_changed';

export const checkQuotaLock = (): boolean => {
  const lockout = localStorage.getItem(QUOTA_LOCK_KEY);
  if (lockout) {
    const lockTime = parseInt(lockout);
    if (Date.now() - lockTime < QUOTA_LOCK_DURATION) {
      return true;
    }
    localStorage.removeItem(QUOTA_LOCK_KEY);
    window.dispatchEvent(new Event(QUOTA_EVENT));
  }
  return false;
};

export const setQuotaLock = () => {
  localStorage.setItem(QUOTA_LOCK_KEY, Date.now().toString());
  window.dispatchEvent(new Event(QUOTA_EVENT));
};

export const clearQuotaLock = () => {
  localStorage.removeItem(QUOTA_LOCK_KEY);
  window.dispatchEvent(new Event(QUOTA_EVENT));
};

export const listenToQuotaLock = (callback: (isLocked: boolean) => void) => {
  const handler = () => callback(checkQuotaLock());
  window.addEventListener(QUOTA_EVENT, handler);
  window.addEventListener('storage', (e) => {
    if (e.key === QUOTA_LOCK_KEY) handler();
  });
  return () => {
    window.removeEventListener(QUOTA_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
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
  const errorCode = (error as any)?.code;
  const isQuotaError = errorMsg.toLowerCase().includes('quota') || 
                      errorMsg.toLowerCase().includes('exhausted') ||
                      errorMsg.toLowerCase().includes('limit exceeded') ||
                      errorCode === 'resource-exhausted' ||
                      errorCode === '8' || // gRPC code for resource exhausted
                      errorMsg.includes('resource-exhausted');

  if (isQuotaError) {
    setQuotaLock();
    console.warn("Firestore Quota hit. Lockout active.", errorMsg);
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
