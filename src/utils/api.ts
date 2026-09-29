import { Note, Reminder, User, AppStats, ChatMessage, OnlineStatus, MediaPost, UniversalSearchResults } from '../types';

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
    if (response.status === 401) {
      if (endpoint.startsWith('/auth/me') || data.error?.includes('Invalid or expired')) {
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notenest_unauthorized', { detail: data.error }));
        }
      }
    }
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

  async updateProfile(updates: Partial<User>) {
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

  // Media Posts (Photos & Videos)
  async getMediaPosts(params?: { search?: string; type?: 'photo' | 'video'; userId?: string; onlyConnections?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.onlyConnections) searchParams.set('onlyConnections', 'true');
    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<{ posts: MediaPost[] }>(`/media${queryStr}`);
  },

  async createMediaPost(payload: {
    title: string;
    caption?: string;
    type: 'photo' | 'video';
    mediaUrl: string;
    thumbnailUrl?: string;
    tags?: string[];
    visibility?: 'public' | 'connections';
  }) {
    return request<{ post: MediaPost }>('/media', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteMediaPost(id: string) {
    return request<{ success: boolean; message: string }>(`/media/${id}`, {
      method: 'DELETE',
    });
  },

  async likeMediaPost(id: string) {
    return request<{ post: MediaPost; isLiked: boolean }>(`/media/${id}/like`, {
      method: 'POST',
    });
  },

  async commentMediaPost(id: string, text: string) {
    return request<{ post: MediaPost }>(`/media/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  // Community Users & Connect Network
  async getAllUsers(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ users: User[] }>(`/users${q}`);
  },

  async getUserProfile(id: string) {
    return request<{ user: User; media: MediaPost[]; isConnected: boolean; connectionsCount: number }>(`/users/${id}`);
  },

  async toggleConnect(userId: string) {
    return request<{ isConnected: boolean; connectionsCount: number }>(`/users/${userId}/connect`, {
      method: 'POST',
    });
  },

  // Universal Search (Content, Photos, Videos, Profiles, Work History)
  async universalSearch(query: string) {
    return request<UniversalSearchResults>(`/search?q=${encodeURIComponent(query)}`);
  },
};
