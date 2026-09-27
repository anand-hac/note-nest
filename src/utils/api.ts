import { Note, Reminder, User, AppStats, ChatMessage, OnlineStatus } from '../types';

const TOKEN_KEY = 'notenest_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async getDemoUsers() {
    return request<{ demoUsers: Array<{ username: string; email: string; name: string; role: string }>; defaultPassword: string }>('/auth/demo-users');
  },

  async login(identifier: string, password: string) {
    const data = await request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async register(name: string, username: string, email: string, password: string) {
    const data = await request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async loginWithGoogle(payload: { email: string; name: string; avatarUrl?: string; googleId?: string }) {
    const data = await request<{ user: User; token: string; isBrandNew?: boolean }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(data.token);
    return data;
  },

  async getMe() {
    return request<{ user: User }>('/auth/me');
  },

  async updateProfile(updates: { name?: string; avatarUrl?: string; preferences?: User['preferences'] }) {
    return request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async deleteAccount(password: string) {
    const data = await request<{ message: string }>('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    setAuthToken(null);
    return data;
  },

  logout() {
    setAuthToken(null);
  },

  // Users search & invite
  async searchUsers(query: string = '') {
    return request<{ users: User[] }>(`/users/search?q=${encodeURIComponent(query)}`);
  },

  async inviteMember(identifier: string, name?: string, role?: string) {
    return request<{ user: User; isNew: boolean; message: string }>('/users/invite', {
      method: 'POST',
      body: JSON.stringify({ identifier, name, role }),
    });
  },

  // Notes
  async getNotes() {
    return request<{ owned: Note[]; shared: Note[] }>('/notes');
  },

  async getNote(id: string) {
    return request<{ note: Note; permission: 'owner' | 'view' | 'edit' }>(`/notes/${id}`);
  },

  async createNote(payload: Partial<Note> & { reminder?: { title: string; dueDateTime: string; priority: string } }) {
    return request<{ note: Note }>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateNote(id: string, updates: Partial<Note>) {
    return request<{ note: Note }>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteNote(id: string) {
    return request<{ message: string }>(`/notes/${id}`, {
      method: 'DELETE',
    });
  },

  async shareNote(noteId: string, usernameOrEmail: string, permission: 'view' | 'edit') {
    return request<{ note: Note; message: string }>(`/notes/${noteId}/share`, {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, permission }),
    });
  },

  async removeCollaborator(noteId: string, collaboratorUserId: string) {
    return request<{ note: Note; message: string }>(`/notes/${noteId}/share/${collaboratorUserId}`, {
      method: 'DELETE',
    });
  },

  // Reminders
  async getReminders() {
    return request<{ reminders: Reminder[] }>('/reminders');
  },

  async createReminder(payload: { title: string; description?: string; dueDateTime: string; priority?: string; noteId?: string | null }) {
    return request<{ reminder: Reminder }>('/reminders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateReminder(id: string, payload: Partial<Reminder>) {
    return request<{ reminder: Reminder }>(`/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async toggleReminder(id: string) {
    return request<{ reminder: Reminder }>(`/reminders/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  async deleteReminder(id: string) {
    return request<{ message: string }>(`/reminders/${id}`, {
      method: 'DELETE',
    });
  },

  // Stats & Export
  async getStats() {
    return request<AppStats>('/stats');
  },

  async exportBackup() {
    const token = getAuthToken();
    const res = await fetch('/api/export', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to export data');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notenest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Team Chat & Online Presence
  async getTeamMembers() {
    return request<{ team: User[] }>('/chat/team');
  },

  async getChatMessages(recipientId: string = 'team') {
    return request<{ messages: ChatMessage[] }>(`/chat/messages?recipientId=${encodeURIComponent(recipientId)}`);
  },

  async sendChatMessage(payload: {
    text: string;
    recipientId?: string;
    attachedNoteId?: string;
    attachedNoteTitle?: string;
    attachedNoteColor?: string;
  }) {
    return request<{ message: ChatMessage }>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async markChatRead(senderId: string) {
    return request<{ success: boolean }>(`/chat/read/${senderId}`, {
      method: 'PATCH',
    });
  },

  async updatePresence(payload: { status: OnlineStatus; customStatus?: string; bio?: string }) {
    return request<{ user: User }>('/chat/presence', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
