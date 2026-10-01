import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/common/Toast';
import { NoteModal } from './components/notes/NoteModal';
import { ShareModal } from './components/notes/ShareModal';
import { ReminderModal } from './components/reminders/ReminderModal';
import { DashboardPage } from './pages/DashboardPage';
import { MyNotesPage } from './pages/MyNotesPage';
import { RemindersPage } from './pages/RemindersPage';
import { SharedPage } from './pages/SharedPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShowcasePage } from './pages/ShowcasePage';
import { AuthPage } from './pages/AuthPage';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { EditProfileModal } from './components/profile/EditProfileModal';
import { Note, Reminder, AppStats, User, MediaPost } from './types';
import { api, getAuthToken } from './utils/api';
import { sound } from './utils/sound';

// Local storage helpers for offline-first resilience & hosted refresh preservation
const getStoredNotes = (userId: string): Note[] => {
  try {
    const raw = localStorage.getItem(`notenest_notes_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredNotes = (userId: string, notes: Note[]) => {
  try {
    localStorage.setItem(`notenest_notes_${userId}`, JSON.stringify(notes));
  } catch {}
};

const getStoredSharedNotes = (userId: string): Note[] => {
  try {
    const raw = localStorage.getItem(`notenest_shared_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredSharedNotes = (userId: string, notes: Note[]) => {
  try {
    localStorage.setItem(`notenest_shared_${userId}`, JSON.stringify(notes));
  } catch {}
};

const getStoredReminders = (userId: string): Reminder[] => {
  try {
    const raw = localStorage.getItem(`notenest_reminders_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredReminders = (userId: string, reminders: Reminder[]) => {
  try {
    localStorage.setItem(`notenest_reminders_${userId}`, JSON.stringify(reminders));
  } catch {}
};

const MainApp: React.FC = () => {
  const { user, loading, refreshUser } = useAuth();
  const { checkRemindersNow } = useNotifications();

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states initialized immediately from localStorage so refresh never blanks out
  const [notes, setNotes] = useState<Note[]>(() => (user ? getStoredNotes(user.id) : []));
  const [sharedNotes, setSharedNotes] = useState<Note[]>(() => (user ? getStoredSharedNotes(user.id) : []));
  const [reminders, setReminders] = useState<Reminder[]>(() => (user ? getStoredReminders(user.id) : []));
  const [stats, setStats] = useState<AppStats | null>(null);

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Search, Profile & Media Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!user) return;
    try {
      const [notesRes, remRes, statsRes] = await Promise.all([
        api.getNotes(),
        api.getReminders(),
        api.getStats(),
      ]);

      const localNotes = getStoredNotes(user.id);
      const localReminders = getStoredReminders(user.id);

      // Guard against ephemeral serverless cold starts resetting user data:
      if (notesRes.owned.length === 0 && localNotes.length > 0) {
        setNotes(localNotes);
        api.syncAll({ notes: localNotes, reminders: localReminders }).catch(console.error);
      } else {
        setNotes(notesRes.owned);
        setStoredNotes(user.id, notesRes.owned);
      }

      setSharedNotes(notesRes.shared);
      setStoredSharedNotes(user.id, notesRes.shared);

      if (remRes.reminders.length === 0 && localReminders.length > 0) {
        setReminders(localReminders);
      } else {
        setReminders(remRes.reminders);
        setStoredReminders(user.id, remRes.reminders);
      }

      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load workspace data from API:', err);
      // Fallback seamlessly to local cache
      const localNotes = getStoredNotes(user.id);
      const localShared = getStoredSharedNotes(user.id);
      const localReminders = getStoredReminders(user.id);
      if (localNotes.length > 0) setNotes(localNotes);
      if (localShared.length > 0) setSharedNotes(localShared);
      if (localReminders.length > 0) setReminders(localReminders);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Derived dynamic stats to guarantee zero-delay, always-accurate KPI counters
  const effectiveStats: AppStats = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const activeReminders = reminders.filter(r => !r.isCompleted).length;
    const dueTodayReminders = reminders.filter(r => {
      if (r.isCompleted) return false;
      const t = new Date(r.dueDateTime).getTime();
      return t >= todayStart && t <= todayEnd;
    }).length;
    const overdueReminders = reminders.filter(r => {
      if (r.isCompleted) return false;
      return new Date(r.dueDateTime).getTime() < now;
    }).length;

    return {
      totalNotes: notes.length,
      pinnedNotes: notes.filter(n => n.isPinned).length,
      sharedWithMe: sharedNotes.length,
      totalReminders: reminders.length,
      activeReminders,
      completedReminders: reminders.filter(r => r.isCompleted).length,
      dueTodayReminders,
      overdueReminders,
      unreadMessages: stats?.unreadMessages ?? 0,
    };
  }, [notes, sharedNotes, reminders, stats]);

  // Note actions
  const handleOpenNewNote = () => {
    sound.playClick();
    setEditingNote(null);
    setIsNoteModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    sound.playClick();
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (
    noteData: Partial<Note> & { reminder?: { title: string; dueDateTime: string; priority: string } }
  ) => {
    if (editingNote) {
      const res = await api.updateNote(editingNote.id, noteData);
      setNotes(prev => {
        const next = prev.map(n => (n.id === res.note.id ? res.note : n));
        if (user) setStoredNotes(user.id, next);
        return next;
      });
      setSharedNotes(prev => {
        const next = prev.map(n => (n.id === res.note.id ? res.note : n));
        if (user) setStoredSharedNotes(user.id, next);
        return next;
      });
    } else {
      const res = await api.createNote(noteData);
      setNotes(prev => {
        const next = [res.note, ...prev];
        if (user) setStoredNotes(user.id, next);
        return next;
      });
    }

    // If an associated reminder was created/updated
    if (noteData.reminder && noteData.reminder.dueDateTime) {
      const remRes = await api.getReminders();
      setReminders(remRes.reminders);
      if (user) setStoredReminders(user.id, remRes.reminders);
      checkRemindersNow();
    }

    sound.playChime();
    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = async (id: string) => {
    sound.playClick();
    await api.deleteNote(id);
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      if (user) setStoredNotes(user.id, next);
      return next;
    });
    setSharedNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      if (user) setStoredSharedNotes(user.id, next);
      return next;
    });
    setReminders(prev => {
      const next = prev.filter(r => r.noteId !== id);
      if (user) setStoredReminders(user.id, next);
      return next;
    });
  };

  const handleTogglePin = async (note: Note) => {
    sound.playClick();
    const res = await api.updateNote(note.id, { isPinned: !note.isPinned });
    setNotes(prev => {
      const next = prev.map(n => (n.id === res.note.id ? res.note : n));
      if (user) setStoredNotes(user.id, next);
      return next;
    });
    setSharedNotes(prev => {
      const next = prev.map(n => (n.id === res.note.id ? res.note : n));
      if (user) setStoredSharedNotes(user.id, next);
      return next;
    });
  };

  const handleOpenShare = (note: Note) => {
    sound.playClick();
    setSharingNote(note);
    setIsShareModalOpen(true);
  };

  const handleNoteUpdatedFromShare = (updatedNote: Note) => {
    setNotes(prev => {
      const next = prev.map(n => (n.id === updatedNote.id ? updatedNote : n));
      if (user) setStoredNotes(user.id, next);
      return next;
    });
    setSharedNotes(prev => {
      const next = prev.map(n => (n.id === updatedNote.id ? updatedNote : n));
      if (user) setStoredSharedNotes(user.id, next);
      return next;
    });
  };

  // Reminder actions
  const handleOpenNewReminder = () => {
    sound.playClick();
    setEditingReminder(null);
    setIsReminderModalOpen(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    sound.playClick();
    setEditingReminder(reminder);
    setIsReminderModalOpen(true);
  };

  const handleSaveReminder = async (remData: Partial<Reminder>) => {
    if (editingReminder) {
      const res = await api.updateReminder(editingReminder.id, remData);
      setReminders(prev => {
        const next = prev.map(r => (r.id === res.reminder.id ? res.reminder : r));
        if (user) setStoredReminders(user.id, next);
        return next;
      });
    } else {
      const res = await api.createReminder(remData as any);
      setReminders(prev => {
        const next = [...prev, res.reminder];
        if (user) setStoredReminders(user.id, next);
        return next;
      });
    }

    sound.playChime();
    setIsReminderModalOpen(false);
    checkRemindersNow();
  };

  const handleToggleReminder = async (id: string) => {
    sound.playClick();
    const res = await api.toggleReminder(id);
    setReminders(prev => {
      const next = prev.map(r => (r.id === id ? res.reminder : r));
      if (user) setStoredReminders(user.id, next);
      return next;
    });
    checkRemindersNow();
  };

  const handleDeleteReminder = async (id: string) => {
    sound.playClick();
    await api.deleteReminder(id);
    setReminders(prev => {
      const next = prev.filter(r => r.id !== id);
      if (user) setStoredReminders(user.id, next);
      return next;
    });
  };

  const handleQuickCreateNote = async (title: string, content: string = '', color: any = 'yellow') => {
    const res = await api.createNote({
      title: title.trim() || 'Sticky Note',
      content: content.trim() || '',
      color: color || 'yellow',
      tags: ['sticky'],
    });
    setNotes(prev => {
      const next = [res.note, ...prev];
      if (user) setStoredNotes(user.id, next);
      return next;
    });
    sound.playChime();
  };

  const handleQuickCreateReminder = async (payload: {
    title: string;
    dueDateTime: string;
    priority: any;
    noteId?: string | null;
  }) => {
    const res = await api.createReminder(payload);
    setReminders(prev => {
      const next = [...prev, res.reminder];
      if (user) setStoredReminders(user.id, next);
      return next;
    });
    sound.playChime();
    checkRemindersNow();
  };

  const handleOpenLinkedNote = (noteId: string) => {
    const found = [...notes, ...sharedNotes].find(n => n.id === noteId);
    if (found) {
      handleEditNote(found);
    } else {
      setCurrentPage('notes');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edf2f8] dark:bg-[#141518]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-raised flex items-center justify-center animate-pulse">
            <img src="/app-icon.png" alt="Note Nest" className="w-8 h-8 rounded-xl" />
          </div>
          <p className="text-xs uppercase tracking-widest font-bold text-slate-500">
            Initializing Note Nest...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !getAuthToken()) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#edf2f8] dark:bg-[#141518] text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Neumorphic Navigation */}
      <Navbar
        onOpenNewNote={handleOpenNewNote}
        searchQuery={searchQuery}
        onSearchChange={q => {
          setSearchQuery(q);
        }}
        onOpenGlobalSearch={() => setIsSearchModalOpen(true)}
        onOpenMyProfile={() => setViewProfileUserId(user.id)}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="max-w-7xl mx-auto flex w-full">
        {/* Responsive Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onOpenNewNote={handleOpenNewNote}
          stats={effectiveStats}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {currentPage === 'dashboard' && (
            <DashboardPage
              notes={notes}
              sharedNotes={sharedNotes}
              reminders={reminders}
              stats={effectiveStats}
              onNavigate={setCurrentPage}
              onOpenNewNote={handleOpenNewNote}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              onTogglePin={handleTogglePin}
              onShareNote={handleOpenShare}
              onToggleReminder={handleToggleReminder}
              onEditReminder={handleEditReminder}
              onDeleteReminder={handleDeleteReminder}
              onQuickCreateNote={handleQuickCreateNote}
            />
          )}

          {currentPage === 'notes' && (
            <MyNotesPage
              notes={notes}
              onOpenNewNote={handleOpenNewNote}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              onTogglePin={handleTogglePin}
              onShareNote={handleOpenShare}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}

          {currentPage === 'showcase' && (
            <ShowcasePage
              currentUser={user}
              onOpenChatWithUser={(_targetUser) => {
                setCurrentPage('chat');
              }}
            />
          )}

          {currentPage === 'reminders' && (
            <RemindersPage
              reminders={reminders}
              availableNotes={notes}
              onToggleReminder={handleToggleReminder}
              onEditReminder={handleEditReminder}
              onDeleteReminder={handleDeleteReminder}
              onOpenNewReminderModal={handleOpenNewReminder}
              onQuickCreateReminder={handleQuickCreateReminder}
              onOpenLinkedNote={handleOpenLinkedNote}
            />
          )}

          {currentPage === 'shared' && (
            <SharedPage
              sharedNotes={sharedNotes}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              onTogglePin={handleTogglePin}
              onShareNote={handleOpenShare}
            />
          )}

          {currentPage === 'chat' && (
            <ChatPage
              availableNotes={[...notes, ...sharedNotes]}
              onOpenNote={handleOpenLinkedNote}
            />
          )}

          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Note Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        note={editingNote}
        onSave={handleSaveNote}
        onOpenShareModal={handleOpenShare}
        currentUserId={user.id}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        note={sharingNote}
        onNoteUpdated={handleNoteUpdatedFromShare}
      />

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        reminder={editingReminder}
        onSave={handleSaveReminder}
        availableNotes={notes}
      />

      {/* Universal Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        initialQuery={searchQuery}
        onSelectNote={(note) => {
          handleEditNote(note);
        }}
        onSelectUser={(userId) => {
          setViewProfileUserId(userId);
        }}
        onSelectMedia={(_media) => {
          setCurrentPage('showcase');
        }}
      />

      {/* User Profile & Work History Modal */}
      <UserProfileModal
        userId={viewProfileUserId}
        currentUser={user}
        currentUserId={user.id}
        isOpen={Boolean(viewProfileUserId)}
        onClose={() => setViewProfileUserId(null)}
        onOpenChatWithUser={(_chatTarget) => {
          setCurrentPage('chat');
        }}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
      />

      {/* Edit Profile & Work History Modal */}
      {isEditProfileOpen && (
        <EditProfileModal
          user={user}
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          onProfileUpdated={async (_updated) => {
            await refreshUser();
          }}
        />
      )}

      {/* Floating Alert Toasts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
