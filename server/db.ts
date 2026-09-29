import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  DatabaseSchema, 
  User, 
  Note, 
  Reminder, 
  SafeUser, 
  ChatMessage, 
  OnlineStatus,
  MediaPost,
  MediaComment,
  WorkExperience
} from './types.js';
import { isPostgresAvailable, query } from './db/postgres.js';
import { postgresRepo, mapUserRow, mapNoteRow, mapReminderRow, mapMediaRow } from './db/postgresRepository.js';

const DB_FILE = process.env.VERCEL
  ? path.resolve('/tmp', 'db.json')
  : path.resolve(process.cwd(), 'data', 'db.json');

// Initial seed data
const getInitialData = (): DatabaseSchema => {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password123!', salt);

  const alexId = 'usr_alex_001';
  const sarahId = 'usr_sarah_002';
  const davidId = 'usr_david_003';

  const users: User[] = [
    {
      id: alexId,
      username: 'alex',
      email: 'alex@notenest.com',
      name: 'Alex Rivera',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
      status: 'online',
      customStatus: 'Reviewing shared architecture notes 📌',
      bio: 'Product Lead. Focusing on clean UX, neumorphic systems, and offline-first notes.',
      role: 'Product Lead',
      location: 'San Francisco, CA',
      skills: ['Product Strategy', 'System Architecture', 'TypeScript', 'CRDTs', 'UI/UX'],
      workHistory: [
        {
          id: 'work_alex_1',
          title: 'Product Lead',
          company: 'Linear',
          location: 'San Francisco, CA',
          startDate: '2023',
          current: true,
          description: 'Leading workspace collaboration, keyboard-first interactions, and real-time syncing pipelines.',
          skills: ['TypeScript', 'React', 'CRDTs', 'Product Strategy']
        },
        {
          id: 'work_alex_2',
          title: 'Senior Product Manager',
          company: 'Stripe',
          location: 'San Francisco, CA',
          startDate: '2020',
          endDate: '2023',
          current: false,
          description: 'Managed developer experiences, interactive API documentation, and checkout components.',
          skills: ['Product Management', 'API Design', 'Developer UX']
        }
      ],
      connections: [sarahId, davidId],
      githubUrl: 'https://github.com',
      linkedinUrl: 'https://linkedin.com',
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
      coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80',
      status: 'online',
      customStatus: 'Refining sticky note color palettes 🎨',
      bio: 'Senior Product Designer. Passionate about typography, post-it aesthetics, and design tokens.',
      role: 'Senior Product Designer',
      location: 'Seattle, WA',
      skills: ['Design Systems', 'Figma', 'Prototyping', 'Accessibility', 'Color Systems', 'Motion'],
      workHistory: [
        {
          id: 'work_sarah_1',
          title: 'Senior Product Designer',
          company: 'Figma',
          location: 'Seattle, WA',
          startDate: '2022',
          current: true,
          description: 'Crafting next-generation design token workflows, tactile component libraries, and soft neumorphic shadows.',
          skills: ['Figma', 'Design Tokens', 'Design Systems', 'Micro-interactions']
        },
        {
          id: 'work_sarah_2',
          title: 'UI/UX Designer',
          company: 'Airbnb',
          location: 'San Francisco, CA',
          startDate: '2019',
          endDate: '2022',
          current: false,
          description: 'Led visual consistency overhaul for international host dashboard and responsive card interfaces.',
          skills: ['Interaction Design', 'User Research', 'Design Systems']
        }
      ],
      connections: [alexId],
      githubUrl: 'https://github.com',
      linkedinUrl: 'https://linkedin.com',
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
      coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
      status: 'idle',
      customStatus: 'Monitoring backend locks ⚡',
      bio: 'DevOps & Systems. Infra, encryption, and real-time syncing.',
      role: 'DevOps & Systems Engineer',
      location: 'Austin, TX',
      skills: ['Kubernetes', 'Terraform', 'Firebase', 'AWS', 'Node.js', 'Distributed Systems'],
      workHistory: [
        {
          id: 'work_david_1',
          title: 'Staff DevOps Engineer',
          company: 'Cloudflare',
          location: 'Austin, TX',
          startDate: '2022',
          current: true,
          description: 'Architecting multi-region edge caches, low-latency Serverless deployment pipelines, and zero-trust policies.',
          skills: ['Edge Computing', 'Terraform', 'Kubernetes', 'Go']
        },
        {
          id: 'work_david_2',
          title: 'Systems Infrastructure Engineer',
          company: 'HashiCorp',
          location: 'Remote',
          startDate: '2018',
          endDate: '2022',
          current: false,
          description: 'Built automated cluster orchestration, failover monitors, and distributed database backups.',
          skills: ['Distributed Systems', 'Consul', 'Vault', 'Docker']
        }
      ],
      connections: [alexId],
      githubUrl: 'https://github.com',
      linkedinUrl: 'https://linkedin.com',
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
  ];

  const mediaPosts: MediaPost[] = [
    {
      id: 'media_seed_01',
      userId: sarahId,
      userName: 'Sarah Chen',
      userUsername: 'sarah',
      userAvatar: users[1].avatarUrl,
      userRole: 'Senior Product Designer',
      title: 'Neumorphic Tactile Cards & Color Swatches',
      caption: 'Exploring subtle inner-shadow depths and soft paper textures for our new sticky note release. Let me know what palette feels warmest!',
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80',
      tags: ['design', 'ui', 'neumorphism', 'palettes', 'creativity'],
      likes: [alexId, davidId],
      comments: [
        {
          id: 'comm_01',
          userId: alexId,
          userName: 'Alex Rivera',
          userUsername: 'alex',
          userAvatar: users[0].avatarUrl,
          text: 'The amber and canary tones have the best contrast in dark mode!',
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        }
      ],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      visibility: 'public',
    },
    {
      id: 'media_seed_02',
      userId: alexId,
      userName: 'Alex Rivera',
      userUsername: 'alex',
      userAvatar: users[0].avatarUrl,
      userRole: 'Product Lead',
      title: 'Distributed Real-Time Sync & Video Architecture Walkthrough',
      caption: 'Quick video demo on how conflict-free replicated data types (CRDTs) update across tabs in sub-50ms latency.',
      type: 'video',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
      tags: ['demo', 'video', 'crdt', 'realtime', 'engineering'],
      likes: [sarahId],
      comments: [
        {
          id: 'comm_02',
          userId: davidId,
          userName: 'David Kim',
          userUsername: 'david',
          userAvatar: users[2].avatarUrl,
          text: 'Super clean demo. The latency is practically zero.',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        }
      ],
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      visibility: 'public',
    },
    {
      id: 'media_seed_03',
      userId: davidId,
      userName: 'David Kim',
      userUsername: 'david',
      userAvatar: users[2].avatarUrl,
      userRole: 'DevOps & Systems Engineer',
      title: 'Hybrid Cloud Topology: Vercel + Firebase Storage',
      caption: 'Blueprint for Note Nest high availability setup. Fast edge serving paired with Firestore real-time snapshots.',
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
      tags: ['cloud', 'architecture', 'firebase', 'vercel', 'devops'],
      likes: [alexId, sarahId],
      comments: [],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      visibility: 'public',
    }
  ];

  return { users, notes, reminders, messages, mediaPosts };
};

export class Database {
  public data: DatabaseSchema;
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
        if (!parsed.mediaPosts) parsed.mediaPosts = [];
        return parsed;
      }

      // If running on Vercel and /tmp/db.json doesn't exist yet, check bundled data/db.json
      const bundledDb = path.resolve(process.cwd(), 'data', 'db.json');
      if (fs.existsSync(bundledDb)) {
        const raw = fs.readFileSync(bundledDb, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.messages) parsed.messages = [];
        if (!parsed.mediaPosts) parsed.mediaPosts = [];
        this.saveDirect(parsed);
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
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await fs.promises.writeFile(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database, executing synchronous write fallback:', err);
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (syncErr) {
        console.error('Critical: Failed to save database file:', syncErr);
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
      coverUrl: user.coverUrl,
      status: user.status || 'online',
      customStatus: user.customStatus || '',
      bio: user.bio || '',
      role: user.role || 'Member',
      location: user.location || '',
      skills: user.skills || [],
      workHistory: user.workHistory || [],
      connections: user.connections || [],
      githubUrl: user.githubUrl,
      linkedinUrl: user.linkedinUrl,
      websiteUrl: user.websiteUrl,
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
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.skills && u.skills.some(s => s.toLowerCase().includes(q)))
      ))
      .map(u => this.toSafeUser(u));
  }

  getAllTeamMembers(currentUserId?: string): SafeUser[] {
    return this.data.users.map(u => this.toSafeUser(u));
  }

  syncUserFromPg(user: User): void {
    const idx = this.data.users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx !== -1) {
      this.data.users[idx] = {
        ...this.data.users[idx],
        ...user,
        avatarUrl: user.avatarUrl || this.data.users[idx].avatarUrl,
        coverUrl: user.coverUrl || this.data.users[idx].coverUrl,
      };
    } else {
      this.data.users.push(user);
    }
  }

  async syncWithPostgres(): Promise<void> {
    if (!isPostgresAvailable()) return;
    try {
      // 1. Synchronize Users
      const pgUsers = await query('SELECT * FROM users');
      for (const row of pgUsers.rows) {
        const u = mapUserRow(row);
        const idx = this.data.users.findIndex(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
        if (idx !== -1) {
          this.data.users[idx] = {
            ...this.data.users[idx],
            ...u,
            avatarUrl: u.avatarUrl || this.data.users[idx].avatarUrl,
            coverUrl: u.coverUrl || this.data.users[idx].coverUrl,
          };
        } else {
          this.data.users.push(u);
        }
      }

      // Ensure seed users in this.data.users also exist in PostgreSQL
      for (const user of this.data.users) {
        const check = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [user.id]);
        if (check.rowCount === 0) {
          try {
            await postgresRepo.createUser(user);
          } catch (e: any) {
            // ignore if exists
          }
        }
      }

      // 2. Synchronize Notes (Sticky Notes)
      const pgNotes = await query('SELECT * FROM notes');
      for (const row of pgNotes.rows) {
        const n = mapNoteRow(row);
        const idx = this.data.notes.findIndex(x => x.id === n.id);
        if (idx !== -1) {
          this.data.notes[idx] = { ...this.data.notes[idx], ...n };
        } else {
          this.data.notes.push(n);
        }
      }

      // Ensure any existing in-memory notes exist in PostgreSQL
      for (const note of this.data.notes) {
        const check = await query('SELECT id FROM notes WHERE id = $1 LIMIT 1', [note.id]);
        if (check.rowCount === 0) {
          try {
            const userCheck = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [note.userId]);
            if (userCheck.rowCount > 0) {
              await postgresRepo.createNote(note);
            }
          } catch (e: any) {}
        }
      }

      // 3. Synchronize Reminders
      const pgReminders = await query('SELECT * FROM reminders');
      for (const row of pgReminders.rows) {
        const r = mapReminderRow(row);
        const idx = this.data.reminders.findIndex(x => x.id === r.id);
        if (idx !== -1) {
          this.data.reminders[idx] = { ...this.data.reminders[idx], ...r };
        } else {
          this.data.reminders.push(r);
        }
      }

      // Ensure any existing in-memory reminders exist in PostgreSQL
      for (const rem of this.data.reminders) {
        const check = await query('SELECT id FROM reminders WHERE id = $1 LIMIT 1', [rem.id]);
        if (check.rowCount === 0) {
          try {
            const userCheck = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [rem.userId]);
            if (userCheck.rowCount > 0) {
              await postgresRepo.createReminder(rem);
            }
          } catch (e: any) {}
        }
      }

      // 4. Synchronize Media Posts (Profile Media)
      if (!this.data.mediaPosts) this.data.mediaPosts = [];
      const pgMedia = await query('SELECT * FROM media_posts');
      for (const row of pgMedia.rows) {
        const m = mapMediaRow(row);
        const idx = this.data.mediaPosts.findIndex(x => x.id === m.id);
        if (idx !== -1) {
          this.data.mediaPosts[idx] = { ...this.data.mediaPosts[idx], ...m };
        } else {
          this.data.mediaPosts.push(m);
        }
      }

      // Ensure any existing in-memory media posts exist in PostgreSQL
      for (const post of this.data.mediaPosts) {
        const check = await query('SELECT id FROM media_posts WHERE id = $1 LIMIT 1', [post.id]);
        if (check.rowCount === 0) {
          try {
            const userCheck = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [post.userId]);
            if (userCheck.rowCount > 0) {
              await postgresRepo.createMediaPost(post);
            }
          } catch (e: any) {}
        }
      }

      await this.persist();
      console.log(`[DB] Successfully synchronized PostgreSQL: ${this.data.users.length} users, ${this.data.notes.length} notes, ${this.data.reminders.length} reminders, ${this.data.mediaPosts.length} media posts.`);
    } catch (err: any) {
      console.error('[DB] PostgreSQL synchronization error:', err.message);
    }
  }

  async createUser(user: User): Promise<SafeUser> {
    if (!user.workHistory) user.workHistory = [];
    if (!user.connections) user.connections = [];
    if (!user.skills) user.skills = [];
    const idx = this.data.users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...user };
    } else {
      this.data.users.push(user);
    }
    if (isPostgresAvailable()) {
      try {
        const check = await query('SELECT id FROM users WHERE id = $1 OR LOWER(email) = LOWER($2) LIMIT 1', [user.id, user.email]);
        if (check.rowCount === 0) {
          await postgresRepo.createUser(user);
        } else {
          await postgresRepo.updateUser(user.id, user);
        }
      } catch (err: any) {
        console.error('PostgreSQL createUser error:', err.message);
      }
    }
    await this.persist();
    return this.toSafeUser(user);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<SafeUser | null> {
    let idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1 && isPostgresAvailable()) {
      try {
        const pgUser = await postgresRepo.findUserById(id);
        if (pgUser) {
          this.data.users.push(pgUser);
          idx = this.data.users.length - 1;
        }
      } catch (e) {}
    }
    if (idx === -1) return null;

    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      lastActive: new Date().toISOString(),
    };
    if (isPostgresAvailable()) {
      try {
        await postgresRepo.updateUser(id, updates);
      } catch (err: any) {
        console.error('PostgreSQL updateUser error:', err.message);
      }
    }
    await this.persist();
    return this.toSafeUser(this.data.users[idx]);
  }

  async deleteUser(id: string): Promise<boolean> {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.data.notes = this.data.notes.filter(n => n.userId !== id);
    this.data.reminders = this.data.reminders.filter(r => r.userId !== id);
    if (this.data.mediaPosts) {
      this.data.mediaPosts = this.data.mediaPosts.filter(m => m.userId !== id);
    }
    if (isPostgresAvailable()) {
      try {
        await postgresRepo.deleteUser(id);
      } catch (err: any) {
        console.error('PostgreSQL deleteUser error:', err.message);
      }
    }
    await this.persist();
    return true;
  }

  // Connection Operations
  async toggleConnection(currentUserId: string, targetUserId: string): Promise<{ isConnected: boolean; connectionsCount: number } | null> {
    const currentUser = this.findUserById(currentUserId);
    const targetUser = this.findUserById(targetUserId);
    if (!currentUser || !targetUser || currentUserId === targetUserId) return null;

    if (!currentUser.connections) currentUser.connections = [];
    if (!targetUser.connections) targetUser.connections = [];

    const idx = currentUser.connections.indexOf(targetUserId);
    let isConnected: boolean;

    if (idx > -1) {
      currentUser.connections.splice(idx, 1);
      const targetIdx = targetUser.connections.indexOf(currentUserId);
      if (targetIdx > -1) targetUser.connections.splice(targetIdx, 1);
      isConnected = false;
    } else {
      currentUser.connections.push(targetUserId);
      if (!targetUser.connections.includes(currentUserId)) {
        targetUser.connections.push(currentUserId);
      }
      isConnected = true;
    }

    await this.persist();
    return { isConnected, connectionsCount: currentUser.connections.length };
  }

  // Media Operations (Photos & Videos)
  getMediaPosts(params: {
    search?: string;
    type?: 'photo' | 'video';
    userId?: string;
    onlyConnections?: boolean;
    currentUserId?: string;
  }): MediaPost[] {
    let list = [...(this.data.mediaPosts || [])];

    if (params.type) {
      list = list.filter(m => m.type === params.type);
    }

    if (params.userId) {
      list = list.filter(m => m.userId === params.userId);
    }

    if (params.onlyConnections && params.currentUserId) {
      const currentUser = this.findUserById(params.currentUserId);
      const connSet = new Set(currentUser?.connections || []);
      list = list.filter(m => connSet.has(m.userId) || m.userId === params.currentUserId);
    }

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.caption.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q)) ||
        m.userName.toLowerCase().includes(q) ||
        m.userUsername.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createMediaPost(data: Partial<MediaPost>, user: User): Promise<MediaPost> {
    const post: MediaPost = {
      id: `media_${uuidv4()}`,
      userId: user.id,
      userName: user.name,
      userUsername: user.username,
      userAvatar: user.avatarUrl,
      userRole: user.role || 'Member',
      title: data.title?.trim() || 'Untitled Media',
      caption: data.caption?.trim() || '',
      type: data.type === 'video' ? 'video' : 'photo',
      mediaUrl: data.mediaUrl || '',
      thumbnailUrl: data.thumbnailUrl,
      tags: Array.isArray(data.tags) ? data.tags : [],
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      visibility: data.visibility === 'connections' ? 'connections' : 'public',
    };

    if (!this.data.mediaPosts) this.data.mediaPosts = [];
    this.data.mediaPosts.unshift(post);
    if (isPostgresAvailable()) {
      try {
        const uCheck = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [user.id]);
        if (uCheck.rowCount === 0) {
          await postgresRepo.createUser(user);
        }
        await postgresRepo.createMediaPost(post);
      } catch (err: any) {
        console.error('PostgreSQL createMediaPost error:', err.message);
      }
    }
    await this.persist();
    return post;
  }

  async deleteMediaPost(id: string, userId: string): Promise<boolean> {
    if (!this.data.mediaPosts) return false;
    const idx = this.data.mediaPosts.findIndex(m => m.id === id && m.userId === userId);
    if (idx === -1) return false;
    this.data.mediaPosts.splice(idx, 1);
    if (isPostgresAvailable()) {
      try {
        await postgresRepo.deleteMediaPost(id);
      } catch (err: any) {
        console.error('PostgreSQL deleteMediaPost error:', err.message);
      }
    }
    await this.persist();
    return true;
  }

  async likeMediaPost(id: string, userId: string): Promise<{ post: MediaPost; isLiked: boolean } | null> {
    if (!this.data.mediaPosts) return null;
    const post = this.data.mediaPosts.find(m => m.id === id);
    if (!post) return null;

    const idx = post.likes.indexOf(userId);
    let isLiked: boolean;
    if (idx > -1) {
      post.likes.splice(idx, 1);
      isLiked = false;
    } else {
      post.likes.push(userId);
      isLiked = true;
    }

    if (isPostgresAvailable()) {
      try {
        await postgresRepo.updateMediaPost(id, { likes: post.likes });
      } catch (err: any) {
        console.error('PostgreSQL updateMediaPost likes error:', err.message);
      }
    }
    await this.persist();
    return { post, isLiked };
  }

  async commentMediaPost(
    id: string, 
    commentData: { userId: string; userName: string; userUsername: string; userAvatar?: string; text: string }
  ): Promise<MediaPost | null> {
    if (!this.data.mediaPosts) return null;
    const post = this.data.mediaPosts.find(m => m.id === id);
    if (!post) return null;

    const newComment: MediaComment = {
      id: `comm_${uuidv4()}`,
      userId: commentData.userId,
      userName: commentData.userName,
      userUsername: commentData.userUsername,
      userAvatar: commentData.userAvatar,
      text: commentData.text,
      createdAt: new Date().toISOString(),
    };

    post.comments.push(newComment);
    await this.persist();
    return post;
  }

  // Universal Search
  universalSearch(queryStr: string, currentUserId: string): {
    notes: Note[];
    media: MediaPost[];
    users: SafeUser[];
    workExperiences: { user: SafeUser; experience: WorkExperience }[];
  } {
    const q = queryStr.toLowerCase().trim();
    if (!q) {
      return { notes: [], media: [], users: [], workExperiences: [] };
    }

    // 1. Search notes (user's owned or shared notes)
    const userNotes = this.getNotesForUser(currentUserId);
    const allNotes = [...userNotes.owned, ...userNotes.shared];
    const matchingNotes = allNotes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );

    // 2. Search media posts (photos and videos)
    const allMedia = this.data.mediaPosts || [];
    const matchingMedia = allMedia.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.caption.toLowerCase().includes(q) ||
      m.tags.some(t => t.toLowerCase().includes(q)) ||
      m.userName.toLowerCase().includes(q) ||
      m.type.toLowerCase() === q
    );

    // 3. Search users (name, username, bio, role, skills, location)
    const matchingUsers = this.data.users
      .filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.bio && u.bio.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.location && u.location.toLowerCase().includes(q)) ||
        (u.skills && u.skills.some(s => s.toLowerCase().includes(q)))
      )
      .map(u => this.toSafeUser(u));

    // 4. Search work history specifically
    const workMatches: { user: SafeUser; experience: WorkExperience }[] = [];
    for (const u of this.data.users) {
      if (u.workHistory && Array.isArray(u.workHistory)) {
        for (const exp of u.workHistory) {
          if (
            exp.title.toLowerCase().includes(q) ||
            exp.company.toLowerCase().includes(q) ||
            exp.description.toLowerCase().includes(q) ||
            (exp.skills && exp.skills.some(s => s.toLowerCase().includes(q))) ||
            (exp.location && exp.location.toLowerCase().includes(q))
          ) {
            workMatches.push({
              user: this.toSafeUser(u),
              experience: exp,
            });
          }
        }
      }
    }

    return {
      notes: matchingNotes,
      media: matchingMedia,
      users: matchingUsers,
      workExperiences: workMatches,
    };
  }

  // Note Operations
  getNotesForUser(userId: string): { owned: Note[]; shared: Note[] } {
    const owned = this.data.notes.filter(n => n.userId === userId && !n.isTrash);
    const shared = this.data.notes.filter(n => 
      n.userId !== userId && 
      !n.isTrash && 
      n.collaborators.some(c => c.userId === userId)
    );
    return { owned, shared };
  }

  findNoteById(id: string): Note | undefined {
    return this.data.notes.find(n => n.id === id);
  }

  async createNote(note: Note): Promise<Note> {
    this.data.notes.unshift(note);
    if (isPostgresAvailable()) {
      try {
        const uCheck = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [note.userId]);
        if (uCheck.rowCount === 0) {
          const userObj = this.findUserById(note.userId);
          if (userObj) {
            await postgresRepo.createUser(userObj);
          }
        }
        await postgresRepo.createNote(note);
      } catch (err: any) {
        console.error('PostgreSQL createNote error:', err.message);
      }
    }
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
    if (isPostgresAvailable()) {
      try {
        await postgresRepo.updateNote(id, updates);
      } catch (err: any) {
        console.error('PostgreSQL updateNote error:', err.message);
      }
    }
    await this.persist();
    return this.data.notes[idx];
  }

  async deleteNote(id: string): Promise<boolean> {
    const initialCount = this.data.notes.length;
    this.data.notes = this.data.notes.filter(n => n.id !== id);
    this.data.reminders = this.data.reminders.filter(r => r.noteId !== id);
    if (isPostgresAvailable()) {
      try {
        await postgresRepo.deleteNote(id);
      } catch (err: any) {
        console.error('PostgreSQL deleteNote error:', err.message);
      }
    }
    await this.persist();
    return this.data.notes.length < initialCount;
  }

  // Reminder Operations
  getRemindersForUser(userId: string): Reminder[] {
    return this.data.reminders
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime());
  }

  findReminderById(id: string): Reminder | undefined {
    return this.data.reminders.find(r => r.id === id);
  }

  async createReminder(reminder: Reminder): Promise<Reminder> {
    this.data.reminders.push(reminder);
    if (isPostgresAvailable()) {
      try {
        const uCheck = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [reminder.userId]);
        if (uCheck.rowCount === 0) {
          const userObj = this.findUserById(reminder.userId);
          if (userObj) {
            await postgresRepo.createUser(userObj);
          }
        }
        await postgresRepo.createReminder(reminder);
      } catch (err: any) {
        console.error('PostgreSQL createReminder error:', err.message);
      }
    }
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
    if (isPostgresAvailable()) {
      try {
        await postgresRepo.updateReminder(id, updates);
      } catch (err: any) {
        console.error('PostgreSQL updateReminder error:', err.message);
      }
    }
    await this.persist();
    return this.data.reminders[idx];
  }

  async deleteReminder(id: string): Promise<boolean> {
    const initialCount = this.data.reminders.length;
    this.data.reminders = this.data.reminders.filter(r => r.id !== id);
    if (isPostgresAvailable()) {
      try {
        await postgresRepo.deleteReminder(id);
      } catch (err: any) {
        console.error('PostgreSQL deleteReminder error:', err.message);
      }
    }
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

  async syncWithPostgres(): Promise<void> {
    if (!isPostgresAvailable()) return;
    try {
      const res = await query('SELECT COUNT(*) FROM users');
      const count = parseInt(res.rows[0].count, 10);
      if (count === 0) {
        console.log('PostgreSQL is connected and empty. Seeding initial data...');
        for (const u of this.data.users) {
          await postgresRepo.createUser(u).catch(() => {});
        }
        for (const n of this.data.notes) {
          await postgresRepo.createNote(n).catch(() => {});
        }
        for (const r of this.data.reminders) {
          await postgresRepo.createReminder(r).catch(() => {});
        }
        for (const m of this.data.mediaPosts || []) {
          await postgresRepo.createMediaPost(m).catch(() => {});
        }
        console.log('PostgreSQL seeded successfully.');
      } else {
        console.log(`Connected to PostgreSQL with ${count} existing users in database.`);
      }
    } catch (err: any) {
      console.warn('PostgreSQL sync notice:', err.message);
    }
  }
}

export const db = new Database();

