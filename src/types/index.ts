export type ThemeMode = 'dark' | 'light';

export type OnlineStatus = 'online' | 'idle' | 'offline';

export interface UserPreferences {
  theme: ThemeMode;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatarUrl?: string;
  status?: OnlineStatus;
  customStatus?: string;
  bio?: string;
  role?: string;
  lastActive?: string;
  preferences: UserPreferences;
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

export type ReminderPriority = 'low' | 'medium' | 'high';

export interface Reminder {
  id: string;
  userId: string;
  noteId?: string | null;
  noteTitle?: string;
  title: string;
  description?: string;
  dueDateTime: string;
  priority: ReminderPriority;
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

export interface AppStats {
  totalNotes: number;
  pinnedNotes: number;
  sharedWithMe: number;
  totalReminders: number;
  activeReminders: number;
  completedReminders: number;
  dueTodayReminders: number;
  overdueReminders: number;
  unreadMessages?: number;
}
