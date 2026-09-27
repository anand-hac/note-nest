import { 
  getFirebaseAuth, 
  getFirebaseDb, 
  getFirebaseStorage,
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
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { Note, Reminder, ChatMessage, OnlineStatus, User, MediaPost, MediaComment } from '../types';

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
  // CLOUD STORAGE: MEDIA & PHOTO UPLOADS
  // ==========================================

  /**
   * Uploads a file (photo or video) to Firebase Storage.
   * If Firebase Storage is unavailable, converts safely to optimized Base64 Data URL.
   */
  async uploadMediaFile(file: File, folder: string = 'media'): Promise<string> {
    const storage = getFirebaseStorage();
    if (storage) {
      try {
        const fileExt = file.name.split('.').pop() || 'dat';
        const uniqueName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
        const storageRef = ref(storage, uniqueName);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
      } catch (err) {
        console.warn('Firebase Storage upload failed, falling back to local DataURL:', err);
      }
    }

    // High quality local Data URL fallback
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  // ==========================================
  // REALTIME FIRESTORE: USER PROFILES & WORK HISTORY
  // ==========================================

  async syncUserProfile(user: User): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || '',
        coverUrl: user.coverUrl || '',
        status: user.status || 'online',
        customStatus: user.customStatus || '',
        bio: user.bio || '',
        role: user.role || '',
        location: user.location || '',
        skills: user.skills || [],
        workHistory: user.workHistory || [],
        connections: user.connections || [],
        githubUrl: user.githubUrl || '',
        linkedinUrl: user.linkedinUrl || '',
        websiteUrl: user.websiteUrl || '',
        lastActive: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase user profile sync warning:', err);
    }
  },

  subscribeUser(userId: string, onUpdate: (user: Partial<User>) => void): (() => void) | null {
    const db = getFirebaseDb();
    if (!db) return null;
    try {
      const userRef = doc(db, 'users', userId);
      return onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as User);
        }
      }, (err) => {
        console.warn('Firebase user listener warning:', err);
      });
    } catch (err) {
      console.warn('Firebase user subscribe error:', err);
      return null;
    }
  },

  // ==========================================
  // REALTIME FIRESTORE: PUBLIC MEDIA POSTS (PHOTOS & VIDEOS)
  // ==========================================

  async syncMediaPost(post: MediaPost): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const postRef = doc(db, 'media_posts', post.id);
      await setDoc(postRef, post, { merge: true });
    } catch (err) {
      console.warn('Firebase media post sync warning:', err);
    }
  },

  async deleteMediaPost(postId: string): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const postRef = doc(db, 'media_posts', postId);
      await deleteDoc(postRef);
    } catch (err) {
      console.warn('Firebase media post delete warning:', err);
    }
  },

  subscribeMediaPosts(onUpdate: (posts: MediaPost[]) => void): (() => void) | null {
    const db = getFirebaseDb();
    if (!db) return null;
    try {
      const q = query(collection(db, 'media_posts'));
      return onSnapshot(q, (snapshot) => {
        const posts: MediaPost[] = [];
        snapshot.forEach((doc) => {
          posts.push(doc.data() as MediaPost);
        });
        // Sort newest first
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(posts);
      }, (err) => {
        console.warn('Firebase media posts listener warning:', err);
      });
    } catch (err) {
      console.warn('Firebase media posts subscribe error:', err);
      return null;
    }
  },

  async likeMediaPost(postId: string, userId: string, isLiked: boolean): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const postRef = doc(db, 'media_posts', postId);
      if (isLiked) {
        await setDoc(postRef, { likes: arrayUnion(userId) }, { merge: true });
      } else {
        await setDoc(postRef, { likes: arrayRemove(userId) }, { merge: true });
      }
    } catch (err) {
      console.warn('Firebase like media warning:', err);
    }
  },

  async commentMediaPost(postId: string, comment: MediaComment): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;
    try {
      const postRef = doc(db, 'media_posts', postId);
      await setDoc(postRef, { comments: arrayUnion(comment) }, { merge: true });
    } catch (err) {
      console.warn('Firebase comment media warning:', err);
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
