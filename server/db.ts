import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { DatabaseSchema, User, Note, Reminder, SafeUser, ChatMessage, OnlineStatus } from './types.js';

const DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');

// Initial seed data
const getInitialData = (): DatabaseSchema => {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password123!', salt);

  const alexId = 'usr_alex_001';
  const sarahId = 'usr_sarah_002';
  const davidId = 'usr_david_003';

  const now = new Date();
  const todayDue = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const tomorrowDue = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const pastDue = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();

  const users: User[] = [
    {
      id: alexId,
      username: 'alex',
      email: 'alex@notenest.com',
      name: 'Alex Rivera',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      customStatus: 'Reviewing shared architecture notes 📌',
      bio: 'Product Lead. Focusing on clean UX, neumorphic systems, and offline-first notes.',
      role: 'Product Lead',
      lastActive: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        soundEnabled: true,
        notificationsEnabled: true,
      },
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: sarahId,
      username: 'sarah',
      email: 'sarah@notenest.com',
      name: 'Sarah Chen',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      customStatus: 'Refining sticky note color palettes 🎨',
      bio: 'Senior Product Designer. Passionate about typography, post-it aesthetics, and design tokens.',
      role: 'Senior Product Designer',
      lastActive: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        soundEnabled: true,
        notificationsEnabled: true,
      },
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: davidId,
      username: 'david',
      email: 'david@notenest.com',
      name: 'David Kim',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: 'idle',
      customStatus: 'Monitoring backend locks ⚡',
      bio: 'DevOps & Systems. Infra, encryption, and real-time syncing.',
      role: 'DevOps & Systems',
      lastActive: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      preferences: {
        theme: 'dark',
        soundEnabled: true,
        notificationsEnabled: false,
      },
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const notes: Note[] = [];
  const reminders: Reminder[] = [];

  const messages: ChatMessage[] = [
    {
      id: 'msg_001',
      senderId: sarahId,
      senderName: 'Sarah Chen',
      senderUsername: 'sarah',
      senderAvatar: users[1].avatarUrl,
      recipientId: 'team',
      text: 'Hey team! Check out the newly styled Canary Yellow sticky notes on the board 📝',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      isRead: true,
    },
    {
      id: 'msg_002',
      senderId: alexId,
      senderName: 'Alex Rivera',
      senderUsername: 'alex',
      senderAvatar: users[0].avatarUrl,
      recipientId: 'team',
      text: 'The handwritten Caveat font looks great! Very natural and tactile.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isRead: true,
    },
    {
      id: 'msg_003',
      senderId: sarahId,
      senderName: 'Sarah Chen',
      senderUsername: 'sarah',
      senderAvatar: users[1].avatarUrl,
      recipientId: alexId,
      text: 'I updated the Architecture Sync note. Take a look when you have a moment!',
      attachedNoteId: 'note_002',
      attachedNoteTitle: 'Quarterly Architecture Sync',
      attachedNoteColor: 'blue',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      isRead: false,
    },
  ];

  return { users, notes, reminders, messages };
};

export class Database {
  private data: DatabaseSchema;
  private isSaving: boolean = false;
  private saveQueued: boolean = false;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.messages) parsed.messages = [];
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, initializing fresh:', err);
    }

    const initial = getInitialData();
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DatabaseSchema) {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private async persist(): Promise<void> {
    if (this.isSaving) {
      this.saveQueued = true;
      return;
    }
    this.isSaving = true;
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      await fs.promises.rename(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
    } finally {
      this.isSaving = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.persist();
      }
    }
  }

  // Safe user conversion
  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status || 'online',
      customStatus: user.customStatus || '',
      bio: user.bio || '',
      role: user.role || 'Member',
      lastActive: user.lastActive || new Date().toISOString(),
      preferences: user.preferences,
      createdAt: user.createdAt,
    };
  }

  // User Operations
  findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  searchUsers(query: string, excludeUserId?: string): SafeUser[] {
    const q = query.toLowerCase().trim();
    if (!q) {
      return this.data.users
        .filter(u => u.id !== excludeUserId)
        .map(u => this.toSafeUser(u));
    }
    return this.data.users
      .filter(u => u.id !== excludeUserId && (
        u.username.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) || 
        u.name.toLowerCase().includes(q) ||
        (u.role && u.role.toLowerCase().includes(q))
      ))
      .map(u => this.toSafeUser(u));
  }

  getAllTeamMembers(currentUserId?: string): SafeUser[] {
    return this.data.users
      .filter(u => u.id !== currentUserId)
      .map(u => this.toSafeUser(u));
  }

  async createUser(user: User): Promise<User> {
    if (!user.status) user.status = 'online';
    this.data.users.push(user);
    await this.persist();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    await this.persist();
    return this.data.users[idx];
  }

  async updateUserPresence(userId: string, status: OnlineStatus, customStatus?: string, bio?: string): Promise<SafeUser | null> {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.status = status;
    if (customStatus !== undefined) user.customStatus = customStatus;
    if (bio !== undefined) user.bio = bio;
    user.lastActive = new Date().toISOString();
    await this.persist();
    return this.toSafeUser(user);
  }

  async deleteUser(id: string): Promise<boolean> {
    const initialCount = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.data.notes = this.data.notes.filter(n => n.userId !== id);
    this.data.reminders = this.data.reminders.filter(r => r.userId !== id);
    this.data.notes.forEach(n => {
      n.collaborators = n.collaborators.filter(c => c.userId !== id);
    });
    this.data.messages = this.data.messages.filter(m => m.senderId !== id && m.recipientId !== id);
    await this.persist();
    return this.data.users.length < initialCount;
  }

  // Note Operations
  getNotesForUser(userId: string): { owned: Note[]; shared: Note[] } {
    const owned = this.data.notes.filter(n => n.userId === userId && !n.isTrash);
    const shared = this.data.notes.filter(n => n.userId !== userId && !n.isTrash && n.collaborators.some(c => c.userId === userId));
    return { owned, shared };
  }

  getTrashNotes(userId: string): Note[] {
    return this.data.notes.filter(n => n.userId === userId && n.isTrash);
  }

  findNoteById(id: string): Note | undefined {
    return this.data.notes.find(n => n.id === id);
  }

  async createNote(note: Note): Promise<Note> {
    this.data.notes.unshift(note);
    await this.persist();
    return note;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
    const idx = this.data.notes.findIndex(n => n.id === id);
    if (idx === -1) return null;
    this.data.notes[idx] = {
      ...this.data.notes[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.data.notes[idx];
  }

  async deleteNote(id: string): Promise<boolean> {
    const initialCount = this.data.notes.length;
    this.data.notes = this.data.notes.filter(n => n.id !== id);
    this.data.reminders.forEach(r => {
      if (r.noteId === id) r.noteId = null;
    });
    await this.persist();
    return this.data.notes.length < initialCount;
  }

  // Reminder Operations
  getRemindersForUser(userId: string): Reminder[] {
    return this.data.reminders.filter(r => r.userId === userId);
  }

  findReminderById(id: string): Reminder | undefined {
    return this.data.reminders.find(r => r.id === id);
  }

  async createReminder(reminder: Reminder): Promise<Reminder> {
    this.data.reminders.unshift(reminder);
    await this.persist();
    return reminder;
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
    const idx = this.data.reminders.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data.reminders[idx] = {
      ...this.data.reminders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.persist();
    return this.data.reminders[idx];
  }

  async deleteReminder(id: string): Promise<boolean> {
    const initialCount = this.data.reminders.length;
    this.data.reminders = this.data.reminders.filter(r => r.id !== id);
    await this.persist();
    return this.data.reminders.length < initialCount;
  }

  // Chat & Messaging Operations
  getMessages(userId: string, recipientId?: string): ChatMessage[] {
    if (!this.data.messages) this.data.messages = [];
    if (!recipientId || recipientId === 'team') {
      return this.data.messages.filter(m => m.recipientId === 'team');
    }
    // Direct 1-on-1 messages between userId and recipientId
    return this.data.messages.filter(
      m => (m.senderId === userId && m.recipientId === recipientId) || (m.senderId === recipientId && m.recipientId === userId)
    );
  }

  async createChatMessage(message: ChatMessage): Promise<ChatMessage> {
    if (!this.data.messages) this.data.messages = [];
    this.data.messages.push(message);
    await this.persist();
    return message;
  }

  async markMessagesAsRead(userId: string, senderId: string): Promise<void> {
    if (!this.data.messages) this.data.messages = [];
    let updated = false;
    this.data.messages.forEach(m => {
      if (m.recipientId === userId && m.senderId === senderId && !m.isRead) {
        m.isRead = true;
        updated = true;
      }
    });
    if (updated) await this.persist();
  }

  getUnreadMessageCount(userId: string): number {
    if (!this.data.messages) return 0;
    return this.data.messages.filter(m => (m.recipientId === userId || m.recipientId === 'team') && m.senderId !== userId && !m.isRead).length;
  }
}

export const db = new Database();
