import { 
  getFirebaseAuth, 
  getFirebaseDb, 
  isFirebaseConfigured, 
  googleProvider 
} from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { Note, Reminder, ChatMessage, OnlineStatus, User } from '../types';

export const firebaseService = {
  isAvailable(): boolean {
    return isFirebaseConfigured();
  },

  /**
   * Tests Firebase connection by pinging Firestore / Auth.
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { 
        success: false, 
        message: 'Firebase credentials are not configured yet. Enter your project details below.' 
      };
    }

    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Could not initialize Firestore instance.');
      
      // Ping Firestore by getting root collection reference
      const colRef = collection(db, 'system_health');
      await getDocs(query(colRef));
      return { 
        success: true, 
        message: 'Successfully connected to Firebase Cloud Firestore!' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.message || 'Firebase connection failed. Check your API key and Project ID.' 
      };
    }
  },

  // ==========================================
  // FIREBASE AUTHENTICATION
  // ==========================================

  async loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth is not available.');
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    return userCred.user;
  },

  async registerWithEmail(email: string, password: string, displayName?: string): Promise<FirebaseUser> {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth is not available.');
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCred.user) {
      await updateProfile(userCred.user, { displayName });
    }
    return userCred.user;
  },

  async loginWithGoogle(): Promise<FirebaseUser> {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase Auth is not available.');
    const userCred = await signInWithPopup(auth, googleProvider);
    return userCred.user;
  },

  async logout(): Promise<void> {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
  },

  // ==========================================
  // REALTIME FIRESTORE: NOTES
  // ==========================================

  async syncNote(note: Note): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const noteRef = doc(db, 'notes', note.id);
      await setDoc(noteRef, {
        ...note,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase note sync warning:', err);
    }
  },

  async deleteNote(noteId: string): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const noteRef = doc(db, 'notes', noteId);
      await deleteDoc(noteRef);
    } catch (err) {
      console.warn('Firebase delete note warning:', err);
    }
  },

  subscribeNotes(userId: string, onUpdate: (notes: Note[]) => void): (() => void) | null {
    const db = getFirebaseDb();
    if (!db) return null;
    try {
      const q = query(collection(db, 'notes'), where('userId', '==', userId));
      return onSnapshot(q, (snapshot) => {
        const notes: Note[] = [];
        snapshot.forEach((doc) => {
          notes.push(doc.data() as Note);
        });
        onUpdate(notes);
      }, (err) => {
        console.warn('Firebase notes listener warning:', err);
      });
    } catch (err) {
      console.warn('Firebase notes subscribe error:', err);
      return null;
    }
  },

  // ==========================================
  // REALTIME FIRESTORE: REMINDERS
  // ==========================================

  async syncReminder(reminder: Reminder): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const remRef = doc(db, 'reminders', reminder.id);
      await setDoc(remRef, {
        ...reminder,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase reminder sync warning:', err);
    }
  },

  async deleteReminder(reminderId: string): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const remRef = doc(db, 'reminders', reminderId);
      await deleteDoc(remRef);
    } catch (err) {
      console.warn('Firebase delete reminder warning:', err);
    }
  },

  subscribeReminders(userId: string, onUpdate: (reminders: Reminder[]) => void): (() => void) | null {
    const db = getFirebaseDb();
    if (!db) return null;
    try {
      const q = query(collection(db, 'reminders'), where('userId', '==', userId));
      return onSnapshot(q, (snapshot) => {
        const reminders: Reminder[] = [];
        snapshot.forEach((doc) => {
          reminders.push(doc.data() as Reminder);
        });
        onUpdate(reminders);
      }, (err) => {
        console.warn('Firebase reminders listener warning:', err);
      });
    } catch (err) {
      console.warn('Firebase reminders subscribe error:', err);
      return null;
    }
  },

  // ==========================================
  // REALTIME FIRESTORE: CHAT & PRESENCE
  // ==========================================

  async sendChatMessage(message: ChatMessage): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const msgRef = doc(db, 'messages', message.id);
      await setDoc(msgRef, message);
    } catch (err) {
      console.warn('Firebase chat message sync warning:', err);
    }
  },

  subscribeChatMessages(recipientId: string, onUpdate: (messages: ChatMessage[]) => void): (() => void) | null {
    const db = getFirebaseDb();
    if (!db) return null;
    try {
      const q = query(
        collection(db, 'messages'),
        where('recipientId', '==', recipientId)
      );
      return onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          messages.push(doc.data() as ChatMessage);
        });
        // Sort chronologically
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        onUpdate(messages);
      }, (err) => {
        console.warn('Firebase chat listener warning:', err);
      });
    } catch (err) {
      console.warn('Firebase chat subscribe error:', err);
      return null;
    }
  },

  async updateOnlinePresence(userId: string, status: OnlineStatus, customStatus?: string): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const presenceRef = doc(db, 'presence', userId);
      await setDoc(presenceRef, {
        userId,
        status,
        customStatus: customStatus || '',
        lastActive: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase presence update warning:', err);
    }
  },
};
