import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfigOptions {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY = 'notenest_firebase_config';

/**
 * Retrieves the active Firebase configuration from localStorage or Vite environment variables.
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

  // Fallback to Vite env variables
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

/**
 * Checks whether Firebase credentials have been provided.
 */
export function isFirebaseConfigured(): boolean {
  const config = getActiveFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
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
  if (!config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length === 0) {
      firebaseAppInstance = initializeApp(config);
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
