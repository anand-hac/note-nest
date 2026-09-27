export type OnlineStatus = 'online' | 'idle' | 'offline';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl?: string;
  status?: OnlineStatus;
  customStatus?: string;
  bio?: string;
  role?: string;
  lastActive?: string;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  };
  createdAt: string;
}

export type NotePermission = 'view' | 'edit';

export interface Collaborator {
  userId: string;
  username: string;
  email: string;
  name: string;
  permission: NotePermission;
  sharedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type NoteColor =
  | 'yellow'
  | 'orange'
  | 'coral'
  | 'pink'
  | 'magenta'
  | 'purple'
  | 'blue'
  | 'aqua'
  | 'green'
  | 'lime'
  | 'sand'
  | 'charcoal'
  | 'snow'
  | 'default'
  | 'slate'
  | 'graphite'
  | 'silver';

export interface Note {
  id: string;
  userId: string;
  ownerUsername: string;
  ownerName: string;
  title: string;
  content: string;
  checklist: ChecklistItem[];
  color: NoteColor;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  isTrash: boolean;
  collaborators: Collaborator[];
  reminderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  noteId?: string | null;
  noteTitle?: string;
  title: string;
  description?: string;
  dueDateTime: string; // ISO string
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar?: string;
  recipientId: string; // userId or 'team'
  text: string;
  attachedNoteId?: string;
  attachedNoteTitle?: string;
  attachedNoteColor?: string;
  timestamp: string;
  isRead: boolean;
}

export interface DatabaseSchema {
  users: User[];
  notes: Note[];
  reminders: Reminder[];
  messages: ChatMessage[];
}

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatarUrl?: string;
  status: OnlineStatus;
  customStatus?: string;
  bio?: string;
  role?: string;
  lastActive?: string;
  preferences: User['preferences'];
  createdAt: string;
}
