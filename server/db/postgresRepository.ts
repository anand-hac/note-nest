import { query } from './postgres.js';
import { User, Note, Reminder, MediaPost, ChatMessage, SafeUser } from '../types.js';

// Convert user DB row to User object
function mapUserRow(row: any): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url || undefined,
    coverUrl: row.cover_url || undefined,
    status: row.status || 'offline',
    customStatus: row.custom_status || undefined,
    bio: row.bio || undefined,
    role: row.role || 'Collaborator',
    location: row.location || undefined,
    skills: Array.isArray(row.skills) ? row.skills : [],
    workHistory: Array.isArray(row.work_history) ? row.work_history : [],
    connections: Array.isArray(row.connections) ? row.connections : [],
    githubUrl: row.github_url || undefined,
    linkedinUrl: row.linkedin_url || undefined,
    websiteUrl: row.website_url || undefined,
    preferences: row.preferences || {
      theme: 'dark',
      soundEnabled: true,
      notificationsEnabled: true,
    },
    lastActive: row.last_active ? new Date(row.last_active).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

// Convert note DB row to Note object
function mapNoteRow(row: any): Note {
  return {
    id: row.id,
    userId: row.user_id,
    ownerUsername: row.owner_username,
    ownerName: row.owner_name,
    title: row.title,
    content: row.content || '',
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    color: row.color || 'default',
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPinned: Boolean(row.is_pinned),
    isArchived: Boolean(row.is_archived),
    isTrash: Boolean(row.is_trash),
    collaborators: Array.isArray(row.collaborators) ? row.collaborators : [],
    reminderId: row.reminder_id || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

// Convert reminder DB row to Reminder object
function mapReminderRow(row: any): Reminder {
  return {
    id: row.id,
    userId: row.user_id,
    noteId: row.note_id || null,
    noteTitle: row.note_title || undefined,
    title: row.title,
    description: row.description || undefined,
    dueDateTime: row.due_date_time ? new Date(row.due_date_time).toISOString() : new Date().toISOString(),
    priority: row.priority || 'medium',
    isCompleted: Boolean(row.is_completed),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

// Convert media DB row to MediaPost object
function mapMediaRow(row: any): MediaPost {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userUsername: row.user_username,
    userAvatar: row.user_avatar || undefined,
    userRole: row.user_role || undefined,
    title: row.title,
    caption: row.caption || '',
    type: row.type || 'photo',
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    likes: Array.isArray(row.likes) ? row.likes : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    visibility: row.visibility || 'public',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export const postgresRepo = {
  // ==========================================
  // USERS
  // ==========================================
  async findUserById(id: string): Promise<User | null> {
    const res = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  },

  async findUserByUsername(username: string): Promise<User | null> {
    const res = await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username.trim()]);
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email.trim()]);
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  },

  async createUser(user: User): Promise<User> {
    const sql = `
      INSERT INTO users (
        id, username, email, name, password_hash, avatar_url, cover_url,
        status, custom_status, bio, role, location, skills, work_history,
        connections, github_url, linkedin_url, website_url, preferences,
        last_active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21
      )
      RETURNING *;
    `;
    const params = [
      user.id,
      user.username.toLowerCase(),
      user.email.toLowerCase(),
      user.name,
      user.passwordHash,
      user.avatarUrl || null,
      user.coverUrl || null,
      user.status || 'offline',
      user.customStatus || null,
      user.bio || null,
      user.role || 'Collaborator',
      user.location || null,
      JSON.stringify(user.skills || []),
      JSON.stringify(user.workHistory || []),
      JSON.stringify(user.connections || []),
      user.githubUrl || null,
      user.linkedinUrl || null,
      user.websiteUrl || null,
      JSON.stringify(user.preferences || {}),
      user.lastActive || new Date().toISOString(),
      user.createdAt || new Date().toISOString(),
    ];
    const res = await query(sql, params);
    return mapUserRow(res.rows[0]);
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = await this.findUserById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    const sql = `
      UPDATE users SET
        name = $2,
        avatar_url = $3,
        cover_url = $4,
        status = $5,
        custom_status = $6,
        bio = $7,
        role = $8,
        location = $9,
        skills = $10,
        work_history = $11,
        connections = $12,
        github_url = $13,
        linkedin_url = $14,
        website_url = $15,
        preferences = $16,
        password_hash = $17,
        last_active = $18
      WHERE id = $1
      RETURNING *;
    `;
    const params = [
      id,
      merged.name,
      merged.avatarUrl || null,
      merged.coverUrl || null,
      merged.status || 'offline',
      merged.customStatus || null,
      merged.bio || null,
      merged.role || 'Collaborator',
      merged.location || null,
      JSON.stringify(merged.skills || []),
      JSON.stringify(merged.workHistory || []),
      JSON.stringify(merged.connections || []),
      merged.githubUrl || null,
      merged.linkedinUrl || null,
      merged.websiteUrl || null,
      JSON.stringify(merged.preferences || {}),
      merged.passwordHash,
      merged.lastActive || new Date().toISOString(),
    ];
    const res = await query(sql, params);
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  },

  async deleteUser(id: string): Promise<boolean> {
    const res = await query('DELETE FROM users WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  },

  // ==========================================
  // NOTES
  // ==========================================
  async getNotes(userId: string): Promise<Note[]> {
    const sql = `
      SELECT * FROM notes 
      WHERE user_id = $1 OR collaborators @> $2::jsonb
      ORDER BY is_pinned DESC, updated_at DESC;
    `;
    const collaboratorFilter = JSON.stringify([{ userId }]);
    const res = await query(sql, [userId, collaboratorFilter]);
    return res.rows.map(mapNoteRow);
  },

  async getNoteById(id: string): Promise<Note | null> {
    const res = await query('SELECT * FROM notes WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] ? mapNoteRow(res.rows[0]) : null;
  },

  async createNote(note: Note): Promise<Note> {
    const sql = `
      INSERT INTO notes (
        id, user_id, owner_username, owner_name, title, content,
        checklist, color, tags, is_pinned, is_archived, is_trash,
        collaborators, reminder_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16
      )
      RETURNING *;
    `;
    const params = [
      note.id,
      note.userId,
      note.ownerUsername,
      note.ownerName,
      note.title,
      note.content || '',
      JSON.stringify(note.checklist || []),
      note.color || 'default',
      JSON.stringify(note.tags || []),
      note.isPinned || false,
      note.isArchived || false,
      note.isTrash || false,
      JSON.stringify(note.collaborators || []),
      note.reminderId || null,
      note.createdAt || new Date().toISOString(),
      note.updatedAt || new Date().toISOString(),
    ];
    const res = await query(sql, params);
    return mapNoteRow(res.rows[0]);
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
    const existing = await this.getNoteById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const sql = `
      UPDATE notes SET
        title = $2,
        content = $3,
        checklist = $4,
        color = $5,
        tags = $6,
        is_pinned = $7,
        is_archived = $8,
        is_trash = $9,
        collaborators = $10,
        reminder_id = $11,
        updated_at = $12
      WHERE id = $1
      RETURNING *;
    `;
    const params = [
      id,
      merged.title,
      merged.content || '',
      JSON.stringify(merged.checklist || []),
      merged.color || 'default',
      JSON.stringify(merged.tags || []),
      merged.isPinned || false,
      merged.isArchived || false,
      merged.isTrash || false,
      JSON.stringify(merged.collaborators || []),
      merged.reminderId || null,
      merged.updatedAt,
    ];
    const res = await query(sql, params);
    return res.rows[0] ? mapNoteRow(res.rows[0]) : null;
  },

  async deleteNote(id: string): Promise<boolean> {
    const res = await query('DELETE FROM notes WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  },

  // ==========================================
  // REMINDERS
  // ==========================================
  async getReminders(userId: string): Promise<Reminder[]> {
    const sql = `
      SELECT * FROM reminders
      WHERE user_id = $1
      ORDER BY is_completed ASC, due_date_time ASC;
    `;
    const res = await query(sql, [userId]);
    return res.rows.map(mapReminderRow);
  },

  async getReminderById(id: string): Promise<Reminder | null> {
    const res = await query('SELECT * FROM reminders WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] ? mapReminderRow(res.rows[0]) : null;
  },

  async createReminder(reminder: Reminder): Promise<Reminder> {
    const sql = `
      INSERT INTO reminders (
        id, user_id, note_id, note_title, title, description,
        due_date_time, priority, is_completed, completed_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12
      )
      RETURNING *;
    `;
    const params = [
      reminder.id,
      reminder.userId,
      reminder.noteId || null,
      reminder.noteTitle || null,
      reminder.title,
      reminder.description || null,
      reminder.dueDateTime,
      reminder.priority || 'medium',
      reminder.isCompleted || false,
      reminder.completedAt || null,
      reminder.createdAt || new Date().toISOString(),
      reminder.updatedAt || new Date().toISOString(),
    ];
    const res = await query(sql, params);
    return mapReminderRow(res.rows[0]);
  },

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
    const existing = await this.getReminderById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const sql = `
      UPDATE reminders SET
        title = $2,
        description = $3,
        due_date_time = $4,
        priority = $5,
        is_completed = $6,
        completed_at = $7,
        updated_at = $8
      WHERE id = $1
      RETURNING *;
    `;
    const params = [
      id,
      merged.title,
      merged.description || null,
      merged.dueDateTime,
      merged.priority || 'medium',
      merged.isCompleted || false,
      merged.completedAt || null,
      merged.updatedAt,
    ];
    const res = await query(sql, params);
    return res.rows[0] ? mapReminderRow(res.rows[0]) : null;
  },

  async deleteReminder(id: string): Promise<boolean> {
    const res = await query('DELETE FROM reminders WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  },

  // ==========================================
  // MEDIA POSTS
  // ==========================================
  async getMediaPosts(): Promise<MediaPost[]> {
    const sql = 'SELECT * FROM media_posts ORDER BY created_at DESC;';
    const res = await query(sql);
    return res.rows.map(mapMediaRow);
  },

  async getMediaPostById(id: string): Promise<MediaPost | null> {
    const res = await query('SELECT * FROM media_posts WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] ? mapMediaRow(res.rows[0]) : null;
  },

  async createMediaPost(post: MediaPost): Promise<MediaPost> {
    const sql = `
      INSERT INTO media_posts (
        id, user_id, user_name, user_username, user_avatar, user_role,
        title, caption, type, media_url, thumbnail_url, tags, likes, comments,
        visibility, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16
      )
      RETURNING *;
    `;
    const params = [
      post.id,
      post.userId,
      post.userName,
      post.userUsername,
      post.userAvatar || null,
      post.userRole || null,
      post.title,
      post.caption || '',
      post.type || 'photo',
      post.mediaUrl,
      post.thumbnailUrl || null,
      JSON.stringify(post.tags || []),
      JSON.stringify(post.likes || []),
      JSON.stringify(post.comments || []),
      post.visibility || 'public',
      post.createdAt || new Date().toISOString(),
    ];
    const res = await query(sql, params);
    return mapMediaRow(res.rows[0]);
  },

  async updateMediaPost(id: string, updates: Partial<MediaPost>): Promise<MediaPost | null> {
    const existing = await this.getMediaPostById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    const sql = `
      UPDATE media_posts SET
        likes = $2,
        comments = $3,
        title = $4,
        caption = $5,
        tags = $6
      WHERE id = $1
      RETURNING *;
    `;
    const params = [
      id,
      JSON.stringify(merged.likes || []),
      JSON.stringify(merged.comments || []),
      merged.title,
      merged.caption || '',
      JSON.stringify(merged.tags || []),
    ];
    const res = await query(sql, params);
    return res.rows[0] ? mapMediaRow(res.rows[0]) : null;
  },

  async deleteMediaPost(id: string): Promise<boolean> {
    const res = await query('DELETE FROM media_posts WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
};
