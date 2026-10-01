import dotenv from 'dotenv';
dotenv.config();

import express, { Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db.js';
import { initPostgresSchema, isPostgresAvailable } from './db/postgres.js';
import { postgresRepo } from './db/postgresRepository.js';
import { requireAuth, AuthenticatedRequest, generateToken, hashPassword, comparePassword } from './auth.js';
import { Note, Reminder, User, Collaborator, ChatMessage, OnlineStatus } from './types.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Root API check & health
app.get('/api', (req, res) => {
  res.json({ status: 'ok', name: 'Note Nest API', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

// List demo users for quick testing
app.get('/api/auth/demo-users', (req, res) => {
  const users = [
    { username: 'alex', email: 'alex@notenest.com', name: 'Alex Rivera', role: 'Product Lead' },
    { username: 'sarah', email: 'sarah@notenest.com', name: 'Sarah Chen', role: 'Senior Designer' },
    { username: 'david', email: 'david@notenest.com', name: 'David Kim', role: 'DevOps Engineer' },
  ];
  res.json({ demoUsers: users, defaultPassword: 'Password123!' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields (name, username, email, password) are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (db.findUserByUsername(cleanUsername)) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    if (db.findUserByEmail(cleanEmail)) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: `usr_${uuidv4().slice(0, 8)}`,
      username: cleanUsername,
      email: cleanEmail,
      name: name.trim(),
      passwordHash,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`,
      preferences: {
        theme: 'dark',
        soundEnabled: true,
        notificationsEnabled: true,
      },
      createdAt: new Date().toISOString(),
    };

    await db.createUser(newUser);
    const safeUser = db.toSafeUser(newUser);
    const token = generateToken(safeUser);

    res.status(201).json({ user: safeUser, token });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter your username or email and password.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    let user = db.findUserByEmail(cleanId) || db.findUserByUsername(cleanId);
    if (!user && isPostgresAvailable()) {
      try {
        const pgUser = (await postgresRepo.findUserByEmail(cleanId)) || (await postgresRepo.findUserByUsername(cleanId));
        if (pgUser) {
          db.syncUserFromPg(pgUser);
          user = pgUser;
        }
      } catch (e) {}
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
    }

    const safeUser = db.toSafeUser(user);
    const token = generateToken(safeUser);

    res.json({ user: safeUser, token });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

// Google Sign-In & Onboarding (Brand new users start from scratch)
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, avatarUrl, googleId } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Google email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let existingUser = db.findUserByEmail(cleanEmail);
    if (!existingUser && isPostgresAvailable()) {
      try {
        const pgUser = await postgresRepo.findUserByEmail(cleanEmail);
        if (pgUser) {
          db.syncUserFromPg(pgUser);
          existingUser = pgUser;
        }
      } catch (e) {}
    }
    let isBrandNew = false;

    if (!existingUser) {
      // Create fresh user starting completely from scratch (0 notes, 0 reminders)
      isBrandNew = true;
      const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'google_user';
      let candidate = baseUsername;
      let counter = 1;
      while (db.findUserByUsername(candidate)) {
        candidate = `${baseUsername}${counter++}`;
      }

      const displayName = name?.trim() || candidate.charAt(0).toUpperCase() + candidate.slice(1);
      const photo = avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${candidate}`;
      const dummyHash = await hashPassword(googleId || `g_auth_${Date.now()}`);

      const newUser: User = {
        id: `usr_${uuidv4().slice(0, 8)}`,
        username: candidate,
        email: cleanEmail,
        name: displayName,
        passwordHash: dummyHash,
        avatarUrl: photo,
        role: 'Collaborator',
        status: 'online',
        customStatus: 'Just joined Note Nest 👋',
        bio: 'Note Nest collaborator',
        lastActive: new Date().toISOString(),
        preferences: {
          theme: 'dark',
          soundEnabled: true,
          notificationsEnabled: true,
        },
        createdAt: new Date().toISOString(),
      };

      await db.createUser(newUser);
      existingUser = newUser;
    } else {
      // Existing user logging in - update avatar and name if provided
      const updates: Partial<User> = { status: 'online', lastActive: new Date().toISOString() };
      if (avatarUrl) updates.avatarUrl = avatarUrl;
      if (name && name.trim()) updates.name = name.trim();
      await db.updateUser(existingUser.id, updates);
    }

    // Always fetch the freshest user record with all saved profile data, cover, and history
    const freshUser = db.findUserById(existingUser.id) || db.findUserByEmail(cleanEmail) || existingUser;
    if (isPostgresAvailable()) {
      try {
        await postgresRepo.createUser(freshUser);
      } catch (e) {}
    }
    const safeUser = db.toSafeUser(freshUser);
    const token = generateToken(safeUser);

    res.json({ user: safeUser, token, isBrandNew });
  } catch (err: any) {
    console.error('Google sign-in error:', err);
    res.status(500).json({ error: 'Failed to process Google sign-in.' });
  }
});

// Get current user profile (supports both /api/auth/me and /api/users/me)
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  let current = db.findUserById(req.user!.id);
  if (!current && isPostgresAvailable()) {
    try {
      const pgUser = await postgresRepo.findUserById(req.user!.id);
      if (pgUser) {
        db.syncUserFromPg(pgUser);
        current = pgUser;
      }
    } catch (e) {}
  }
  res.json({ user: current ? db.toSafeUser(current) : req.user });
});

app.get('/api/users/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  let current = db.findUserById(req.user!.id);
  if (!current && isPostgresAvailable()) {
    try {
      const pgUser = await postgresRepo.findUserById(req.user!.id);
      if (pgUser) {
        db.syncUserFromPg(pgUser);
        current = pgUser;
      }
    } catch (e) {}
  }
  res.json({ user: current ? db.toSafeUser(current) : req.user });
});

// Update profile / preferences / work history
app.put('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { 
      name, 
      avatarUrl, 
      coverUrl, 
      bio, 
      role, 
      location, 
      customStatus,
      skills, 
      workHistory, 
      githubUrl, 
      linkedinUrl, 
      websiteUrl, 
      preferences 
    } = req.body;

    const updates: Partial<User> = {};
    if (name) updates.name = name.trim();
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (coverUrl !== undefined) updates.coverUrl = coverUrl;
    if (bio !== undefined) updates.bio = bio;
    if (role !== undefined) updates.role = role;
    if (location !== undefined) updates.location = location;
    if (customStatus !== undefined) updates.customStatus = customStatus;
    if (skills !== undefined) updates.skills = Array.isArray(skills) ? skills : [];
    if (workHistory !== undefined) updates.workHistory = Array.isArray(workHistory) ? workHistory : [];
    if (githubUrl !== undefined) updates.githubUrl = githubUrl;
    if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;
    if (websiteUrl !== undefined) updates.websiteUrl = websiteUrl;

    if (preferences) {
      const currentUser = db.findUserById(userId);
      updates.preferences = {
        ...currentUser?.preferences,
        ...preferences,
      };
    }

    const updated = await db.updateUser(userId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update profile.' });
  }
});

// Change Password
app.put('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = db.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const newHash = await hashPassword(newPassword);
    await db.updateUser(userId, { passwordHash: newHash });

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// Delete Account
app.delete('/api/auth/account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Please confirm your password to delete your account.' });
    }

    const user = db.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password. Account deletion aborted.' });
    }

    await db.deleteUser(userId);
    res.json({ message: 'Account permanently deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// Search Users for sharing & team chat
app.get('/api/users/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = (req.query.q as string) || '';
  const results = db.searchUsers(query, req.user!.id);
  res.json({ users: results });
});

// Invite or add a new member by username or email
app.post('/api/users/invite', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { identifier, name, role } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Username or email is required.' });
    }

    const clean = identifier.trim().toLowerCase();
    const isEmail = clean.includes('@');
    const existing = isEmail ? db.findUserByEmail(clean) : db.findUserByUsername(clean);

    if (existing) {
      return res.json({ user: db.toSafeUser(existing), isNew: false, message: 'Member already exists in the workspace.' });
    }

    const cleanUsername = isEmail
      ? clean.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')
      : clean.replace(/[^a-zA-Z0-9_]/g, '');
    const cleanEmail = isEmail ? clean : `${cleanUsername}@notenest.local`;
    const cleanName = name?.trim() || (cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1));

    const passwordHash = await hashPassword('Password123!');
    const newUser: User = {
      id: `usr_${uuidv4().slice(0, 8)}`,
      username: cleanUsername,
      email: cleanEmail,
      name: cleanName,
      passwordHash,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}`,
      role: role?.trim() || 'Collaborator',
      status: 'online',
      customStatus: 'Just joined Note Nest 👋',
      bio: 'Workspace collaborator',
      lastActive: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        soundEnabled: true,
        notificationsEnabled: true,
      },
      createdAt: new Date().toISOString(),
    };

    await db.createUser(newUser);
    const safeUser = db.toSafeUser(newUser);
    res.status(201).json({ user: safeUser, isNew: true, message: `New member @${cleanUsername} added successfully!` });
  } catch (err: any) {
    console.error('Invite member error:', err);
    res.status(500).json({ error: 'Failed to add new member.' });
  }
});

// ----------------------------------------------------
// NOTES ROUTES
// ----------------------------------------------------

// Get all notes for user (both owned and shared)
app.get('/api/notes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (isPostgresAvailable()) {
    try {
      const pgNotes = await postgresRepo.getNotes(userId);
      if (pgNotes && pgNotes.length > 0) {
        for (const n of pgNotes) {
          const idx = db.data.notes.findIndex(x => x.id === n.id);
          if (idx !== -1) {
            db.data.notes[idx] = { ...db.data.notes[idx], ...n };
          } else {
            db.data.notes.push(n);
          }
        }
      }
    } catch (e: any) {
      console.error('Error fetching notes from PG:', e.message);
    }
  }

  const { owned, shared } = db.getNotesForUser(userId);
  res.json({ owned, shared });
});

// Get single note
app.get('/api/notes/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const note = db.findNoteById(req.params.id);

  if (!note) {
    return res.status(404).json({ error: 'Note not found.' });
  }

  // Authorization check
  const isOwner = note.userId === userId;
  const collaborator = note.collaborators.find(c => c.userId === userId);

  if (!isOwner && !collaborator) {
    return res.status(403).json({ error: 'You do not have permission to view this note.' });
  }

  res.json({
    note,
    permission: isOwner ? 'owner' : collaborator?.permission,
  });
});

// Create note
app.post('/api/notes', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, content, checklist, color, tags, isPinned, reminder } = req.body;

    const noteId = `note_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    let reminderId: string | null = null;
    if (reminder && reminder.dueDateTime) {
      const newReminder: Reminder = {
        id: `rem_${uuidv4().slice(0, 8)}`,
        userId: user.id,
        noteId: noteId,
        noteTitle: title || 'Untitled Note',
        title: reminder.title || `Reminder: ${title || 'Note'}`,
        description: reminder.description || '',
        dueDateTime: reminder.dueDateTime,
        priority: reminder.priority || 'medium',
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
      };
      await db.createReminder(newReminder);
      reminderId = newReminder.id;
    }

    const newNote: Note = {
      id: noteId,
      userId: user.id,
      ownerUsername: user.username,
      ownerName: user.name,
      title: title || '',
      content: content || '',
      checklist: Array.isArray(checklist) ? checklist : [],
      color: color || 'default',
      tags: Array.isArray(tags) ? tags : [],
      isPinned: Boolean(isPinned),
      isArchived: false,
      isTrash: false,
      collaborators: [],
      reminderId,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await db.createNote(newNote);
    res.status(201).json({ note: saved });
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note.' });
  }
});

// Update note
app.put('/api/notes/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;
    const existing = db.findNoteById(noteId);

    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const isOwner = existing.userId === userId;
    const collaborator = existing.collaborators.find(c => c.userId === userId);

    // Authorization: owner can edit everything. Collaborator can edit only if permission === 'edit'
    if (!isOwner && (!collaborator || collaborator.permission !== 'edit')) {
      return res.status(403).json({ error: 'You do not have edit permissions for this note.' });
    }

    const { title, content, checklist, color, tags, isPinned, isArchived, isTrash } = req.body;

    const updates: Partial<Note> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (checklist !== undefined) updates.checklist = checklist;
    if (color !== undefined) updates.color = color;
    if (tags !== undefined) updates.tags = tags;
    // Only owner can pin, archive, or trash a note
    if (isOwner) {
      if (isPinned !== undefined) updates.isPinned = isPinned;
      if (isArchived !== undefined) updates.isArchived = isArchived;
      if (isTrash !== undefined) updates.isTrash = isTrash;
    }

    const updated = await db.updateNote(noteId, updates);
    res.json({ note: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

// Delete note (Owner only)
app.delete('/api/notes/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;
    const existing = db.findNoteById(noteId);

    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Only the note owner can delete this note.' });
    }

    await db.deleteNote(noteId);
    res.json({ message: 'Note deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// Share note with collaborator (Owner only)
app.post('/api/notes/:id/share', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;
    const { usernameOrEmail, permission } = req.body;

    if (!usernameOrEmail || !['view', 'edit'].includes(permission)) {
      return res.status(400).json({ error: 'Valid username/email and permission (view or edit) are required.' });
    }

    const note = db.findNoteById(noteId);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    if (note.userId !== userId) {
      return res.status(403).json({ error: 'Only the note owner can manage sharing permissions.' });
    }

    const clean = usernameOrEmail.trim().toLowerCase();
    const targetUser = db.findUserByEmail(clean) || db.findUserByUsername(clean);

    if (!targetUser) {
      return res.status(404).json({ error: `User "${usernameOrEmail}" was not found.` });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ error: 'You are already the owner of this note.' });
    }

    const updatedCollaborators = [...note.collaborators];
    const existingIndex = updatedCollaborators.findIndex(c => c.userId === targetUser.id);

    const collaboratorEntry: Collaborator = {
      userId: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      name: targetUser.name,
      permission: permission as 'view' | 'edit',
      sharedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updatedCollaborators[existingIndex] = collaboratorEntry;
    } else {
      updatedCollaborators.push(collaboratorEntry);
    }

    const updatedNote = await db.updateNote(noteId, { collaborators: updatedCollaborators });
    res.json({ note: updatedNote, message: `Successfully shared note with @${targetUser.username}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to share note.' });
  }
});

// Remove collaborator (Owner only)
app.delete('/api/notes/:id/share/:collaboratorUserId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: noteId, collaboratorUserId } = req.params;

    const note = db.findNoteById(noteId);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    if (note.userId !== userId) {
      return res.status(403).json({ error: 'Only the note owner can remove collaborators.' });
    }

    const updatedCollaborators = note.collaborators.filter(c => c.userId !== collaboratorUserId);
    const updatedNote = await db.updateNote(noteId, { collaborators: updatedCollaborators });

    res.json({ note: updatedNote, message: 'Collaborator access removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke collaborator access.' });
  }
});

// ----------------------------------------------------
// REMINDERS ROUTES
// ----------------------------------------------------

// Get all reminders
app.get('/api/reminders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (isPostgresAvailable()) {
    try {
      const pgReminders = await postgresRepo.getReminders(userId);
      if (pgReminders && pgReminders.length > 0) {
        for (const r of pgReminders) {
          const idx = db.data.reminders.findIndex(x => x.id === r.id);
          if (idx !== -1) {
            db.data.reminders[idx] = { ...db.data.reminders[idx], ...r };
          } else {
            db.data.reminders.push(r);
          }
        }
      }
    } catch (e: any) {
      console.error('Error fetching reminders from PG:', e.message);
    }
  }

  const reminders = db.getRemindersForUser(userId);
  res.json({ reminders });
});

// Create reminder
app.post('/api/reminders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, description, dueDateTime, priority, noteId } = req.body;

    if (!title || !dueDateTime) {
      return res.status(400).json({ error: 'Reminder title and due date/time are required.' });
    }

    let noteTitle: string | undefined;
    if (noteId) {
      const note = db.findNoteById(noteId);
      if (note) noteTitle = note.title;
    }

    const now = new Date().toISOString();
    const newReminder: Reminder = {
      id: `rem_${uuidv4().slice(0, 8)}`,
      userId,
      noteId: noteId || null,
      noteTitle,
      title: title.trim(),
      description: description ? description.trim() : '',
      dueDateTime,
      priority: priority || 'medium',
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await db.createReminder(newReminder);

    // If attached to a note, update note's reminderId
    if (noteId) {
      await db.updateNote(noteId, { reminderId: saved.id });
    }

    res.status(201).json({ reminder: saved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reminder.' });
  }
});

// Update reminder
app.put('/api/reminders/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    const existing = db.findReminderById(id);

    if (!existing) return res.status(404).json({ error: 'Reminder not found.' });
    if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden.' });

    const { title, description, dueDateTime, priority, isCompleted } = req.body;
    const updates: Partial<Reminder> = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (dueDateTime !== undefined) updates.dueDateTime = dueDateTime;
    if (priority !== undefined) updates.priority = priority;
    if (isCompleted !== undefined) {
      updates.isCompleted = isCompleted;
      updates.completedAt = isCompleted ? new Date().toISOString() : null;
    }

    const updated = await db.updateReminder(id, updates);
    res.json({ reminder: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reminder.' });
  }
});

// Toggle completion
app.patch('/api/reminders/:id/toggle', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    const existing = db.findReminderById(id);

    if (!existing) return res.status(404).json({ error: 'Reminder not found.' });
    if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden.' });

    const newStatus = !existing.isCompleted;
    const updated = await db.updateReminder(id, {
      isCompleted: newStatus,
      completedAt: newStatus ? new Date().toISOString() : null,
    });

    res.json({ reminder: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle reminder.' });
  }
});

// Delete reminder
app.delete('/api/reminders/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id;
    const existing = db.findReminderById(id);

    if (!existing) return res.status(404).json({ error: 'Reminder not found.' });
    if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden.' });

    await db.deleteReminder(id);
    res.json({ message: 'Reminder deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete reminder.' });
  }
});

// ----------------------------------------------------
// CHAT & ONLINE PRESENCE ROUTES
// ----------------------------------------------------

// Get team members with their online status & bio profile
app.get('/api/chat/team', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const team = db.getAllTeamMembers(currentUserId);
  res.json({ team });
});

// Get messages for team room or direct conversation
app.get('/api/chat/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const recipientId = (req.query.recipientId as string) || 'team';
  const messages = db.getMessages(currentUserId, recipientId);
  res.json({ messages });
});

// Send a chat message
app.post('/api/chat/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { text, recipientId, attachedNoteId, attachedNoteTitle, attachedNoteColor } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const newMessage: ChatMessage = {
      id: `msg_${uuidv4().slice(0, 8)}`,
      senderId: user.id,
      senderName: user.name,
      senderUsername: user.username,
      senderAvatar: user.avatarUrl,
      recipientId: recipientId || 'team',
      text: text.trim(),
      attachedNoteId: attachedNoteId || undefined,
      attachedNoteTitle: attachedNoteTitle || undefined,
      attachedNoteColor: attachedNoteColor || undefined,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    const saved = await db.createChatMessage(newMessage);
    res.status(201).json({ message: saved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// Mark direct messages as read
app.patch('/api/chat/read/:senderId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const { senderId } = req.params;
    await db.markMessagesAsRead(currentUserId, senderId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark messages read.' });
  }
});

// Update online presence status & profile
app.put('/api/chat/presence', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;
    const { status, customStatus, bio } = req.body;
    const updated = await db.updateUserPresence(currentUserId, status, customStatus, bio);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update presence.' });
  }
});

// ----------------------------------------------------
// STATS & BACKUP
// ----------------------------------------------------
app.get('/api/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { owned, shared } = db.getNotesForUser(userId);
  const reminders = db.getRemindersForUser(userId);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  const dueToday = reminders.filter(r => {
    if (r.isCompleted) return false;
    const t = new Date(r.dueDateTime).getTime();
    return t >= todayStart && t <= todayEnd;
  }).length;

  const overdue = reminders.filter(r => {
    if (r.isCompleted) return false;
    return new Date(r.dueDateTime).getTime() < now.getTime();
  }).length;

  const pinnedNotes = owned.filter(n => n.isPinned).length;

  res.json({
    totalNotes: owned.length,
    pinnedNotes,
    sharedWithMe: shared.length,
    totalReminders: reminders.length,
    activeReminders: reminders.filter(r => !r.isCompleted).length,
    completedReminders: reminders.filter(r => r.isCompleted).length,
    dueTodayReminders: dueToday,
    overdueReminders: overdue,
    unreadMessages: db.getUnreadMessageCount(userId),
  });
});

// Export all user data as JSON backup
app.get('/api/export', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { owned, shared } = db.getNotesForUser(userId);
  const reminders = db.getRemindersForUser(userId);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=notenest-backup-${req.user!.username}-${Date.now()}.json`);

  res.json({
    user: req.user,
    exportedAt: new Date().toISOString(),
    notes: owned,
    sharedNotes: shared,
    reminders,
  });
});

// ----------------------------------------------------
// MEDIA & COMMUNITY POSTS (PHOTOS & VIDEOS)
// ----------------------------------------------------

// Get all media posts
app.get('/api/media', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { search, type, userId, onlyConnections } = req.query;

  if (isPostgresAvailable()) {
    try {
      const pgMedia = await postgresRepo.getMediaPosts();
      if (pgMedia && pgMedia.length > 0) {
        if (!db.data.mediaPosts) db.data.mediaPosts = [];
        for (const m of pgMedia) {
          const idx = db.data.mediaPosts.findIndex(x => x.id === m.id);
          if (idx !== -1) {
            db.data.mediaPosts[idx] = { ...db.data.mediaPosts[idx], ...m };
          } else {
            db.data.mediaPosts.push(m);
          }
        }
      }
    } catch (e: any) {
      console.error('Error fetching media from PG:', e.message);
    }
  }

  const posts = db.getMediaPosts({
    search: search as string,
    type: type as 'photo' | 'video',
    userId: userId as string,
    onlyConnections: onlyConnections === 'true',
    currentUserId: req.user!.id,
  });
  res.json({ posts });
});

// Create media post (photo / video)
app.post('/api/media', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = db.findUserById(req.user!.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const { title, caption, type, mediaUrl, thumbnailUrl, tags, visibility } = req.body;
    if (!mediaUrl) {
      return res.status(400).json({ error: 'Media URL or file is required.' });
    }

    const post = await db.createMediaPost(
      {
        title,
        caption,
        type: type === 'video' ? 'video' : 'photo',
        mediaUrl,
        thumbnailUrl,
        tags: Array.isArray(tags) ? tags : [],
        visibility: visibility === 'connections' ? 'connections' : 'public',
      },
      user
    );

    res.status(201).json({ post });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to upload media post.' });
  }
});

// Delete media post
app.delete('/api/media/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const deleted = await db.deleteMediaPost(id, req.user!.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Media post not found or unauthorized.' });
  }
  res.json({ success: true, message: 'Media post deleted.' });
});

// Like / unlike media post
app.post('/api/media/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const result = await db.likeMediaPost(id, req.user!.id);
  if (!result) {
    return res.status(404).json({ error: 'Media post not found.' });
  }
  res.json(result);
});

// Comment on media post
app.post('/api/media/:id/comment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  const user = req.user!;
  const post = await db.commentMediaPost(id, {
    userId: user.id,
    userName: user.name,
    userUsername: user.username,
    userAvatar: user.avatarUrl,
    text: text.trim(),
  });

  if (!post) {
    return res.status(404).json({ error: 'Media post not found.' });
  }
  res.json({ post });
});

// ----------------------------------------------------
// USERS, PROFILES & CONNECT NETWORK
// ----------------------------------------------------

// List users with search and profile info
app.get('/api/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const search = req.query.search as string;
  const users = db.searchUsers(search || '', req.user!.id);
  res.json({ users });
});

// Get user profile by ID with work history and media posts
app.get('/api/users/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  let user = db.findUserById(req.params.id);
  if (!user && isPostgresAvailable()) {
    try {
      const pgUser = await postgresRepo.findUserById(req.params.id);
      if (pgUser) {
        db.syncUserFromPg(pgUser);
        user = pgUser;
      }
    } catch (e) {}
  }
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Ensure media is synchronized from PostgreSQL
  if (isPostgresAvailable()) {
    try {
      const pgMedia = await postgresRepo.getMediaPosts();
      if (pgMedia && pgMedia.length > 0) {
        if (!db.data.mediaPosts) db.data.mediaPosts = [];
        for (const m of pgMedia) {
          const idx = db.data.mediaPosts.findIndex(x => x.id === m.id);
          if (idx !== -1) {
            db.data.mediaPosts[idx] = { ...db.data.mediaPosts[idx], ...m };
          } else {
            db.data.mediaPosts.push(m);
          }
        }
      }
    } catch (e) {}
  }

  const safe = db.toSafeUser(user);
  const userMedia = db.getMediaPosts({ userId: user.id });
  const isConnected = (req.user!.connections || []).includes(user.id);

  res.json({ 
    user: safe, 
    media: userMedia, 
    isConnected,
    connectionsCount: (user.connections || []).length 
  });
});

// Toggle connect with another user
app.post('/api/users/:id/connect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const result = await db.toggleConnection(req.user!.id, targetId);
  if (!result) {
    return res.status(400).json({ error: 'Could not connect with user.' });
  }
  res.json(result);
});

// ----------------------------------------------------
// UNIVERSAL SEARCH (NOTES, PHOTOS, VIDEOS, PROFILES, WORK HISTORY)
// ----------------------------------------------------
app.get('/api/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = (req.query.q as string) || '';
  const results = db.universalSearch(query, req.user!.id);
  res.json(results);
});


// Serve client production build if exists
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'An unexpected internal server error occurred.',
    code: err.code || 'INTERNAL_ERROR',
  });
});

if (!process.env.VERCEL) {
  initPostgresSchema()
    .then(async (connected) => {
      if (connected) {
        await db.syncWithPostgres();
      }
    })
    .catch((err) => {
      console.warn('PostgreSQL startup check notice:', err.message);
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Note Nest backend server running on http://localhost:${PORT}`);
        console.log(`REST API ready at http://localhost:${PORT}/api/`);
      });
    });
}

export default app;

