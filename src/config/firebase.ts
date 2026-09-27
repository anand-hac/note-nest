import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

export interface FirebaseConfigOptions {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

const STORAGE_KEY = 'notenest_firebase_config';

// Official project configuration for Note Nest
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfigOptions = {
  apiKey: 'AIzaSyAHc6ZmCdBVSYkGV2403LciQFj9ghSmqKY',
  authDomain: 'note-nest-67dc6.firebaseapp.com',
  projectId: 'note-nest-67dc6',
  storageBucket: 'note-nest-67dc6.firebasestorage.app',
  messagingSenderId: '639716888697',
  appId: '1:639716888697:web:f255d56607b136398304a8',
  measurementId: 'G-PG34V730Y4',
};

/**
 * Retrieves the active Firebase configuration from localStorage, Vite environment variables, or default.
 */
export function getActiveFirebaseConfig(): FirebaseConfigOptions {
  // Check localStorage first (in-app configured by user)
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // Fallback to Vite env variables or the official project defaults
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
  };
}

/**
 * Checks whether Firebase credentials have been provided.
 */
export function isFirebaseConfigured(): boolean {
  const config = getActiveFirebaseConfig();
  return Boolean(config.apiKey);
}

let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;
let firebaseDbInstance: Firestore | null = null;
let firebaseStorageInstance: FirebaseStorage | null = null;

/**
 * Initializes and returns the Firebase App instance.
 */
export function getFirebaseApp(): FirebaseApp | null {
  const config = getActiveFirebaseConfig();
  if (!config.apiKey) {
    return null;
  }

  const effectiveConfig = {
    ...config,
    projectId: config.projectId || 'note-nest-app',
    authDomain: config.authDomain || (config.projectId ? `${config.projectId}.firebaseapp.com` : 'note-nest-app.firebaseapp.com'),
  };

  try {
    if (getApps().length === 0) {
      firebaseAppInstance = initializeApp(effectiveConfig);
    } else {
      firebaseAppInstance = getApp();
    }
    return firebaseAppInstance;
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return null;
  }
}

/**
 * Retrieves the Firebase Auth service instance.
 */
export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!firebaseAuthInstance) {
    try {
      firebaseAuthInstance = getAuth(app);
    } catch (err) {
      console.error('Failed to get Firebase Auth:', err);
    }
  }
  return firebaseAuthInstance;
}

/**
 * Retrieves the Firebase Firestore database instance.
 */
export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!firebaseDbInstance) {
    try {
      firebaseDbInstance = getFirestore(app);
    } catch (err) {
      console.error('Failed to get Firestore:', err);
    }
  }
  return firebaseDbInstance;
}

/**
 * Retrieves the Firebase Storage instance.
 */
export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!firebaseStorageInstance) {
    try {
      firebaseStorageInstance = getStorage(app);
    } catch (err) {
      console.error('Failed to get Firebase Storage:', err);
    }
  }
  return firebaseStorageInstance;
}

let firebaseAnalyticsInstance: Analytics | null = null;

/**
 * Retrieves the Firebase Analytics instance if supported.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  const app = getFirebaseApp();
  if (!app) return null;
  if (firebaseAnalyticsInstance) return firebaseAnalyticsInstance;

  try {
    const supported = await isSupported();
    if (supported) {
      firebaseAnalyticsInstance = getAnalytics(app);
      return firebaseAnalyticsInstance;
    }
  } catch (err) {
    console.warn('Firebase Analytics not supported in this environment:', err);
  }
  return null;
}

export const googleProvider = new GoogleAuthProvider();

/**
 * Saves custom Firebase credentials into local storage and re-initializes.
 */
export function saveCustomFirebaseConfig(config: FirebaseConfigOptions): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Reset cached instances
    firebaseAppInstance = null;
    firebaseAuthInstance = null;
    firebaseDbInstance = null;
    firebaseStorageInstance = null;
    return true;
  } catch (err) {
    console.error('Failed to save Firebase config:', err);
    return false;
  }
}

/**
 * Clears custom Firebase credentials from local storage.
 */
export function clearCustomFirebaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    firebaseAppInstance = null;
    firebaseAuthInstance = null;
    firebaseDbInstance = null;
    firebaseStorageInstance = null;
  } catch {
    // ignore
  }
}
