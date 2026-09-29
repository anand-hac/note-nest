import React, { useState, useEffect, useCallback } from 'react';
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
import { api } from './utils/api';
import { sound } from './utils/sound';

const MainApp: React.FC = () => {
  const { user, loading, refreshUser } = useAuth();
  const { checkRemindersNow } = useNotifications();

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data states
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [fetchingData, setFetchingData] = useState(false);

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
    setFetchingData(true);
    try {
      const [notesRes, remRes, statsRes] = await Promise.all([
        api.getNotes(),
        api.getReminders(),
        api.getStats(),
      ]);

      setNotes(notesRes.owned);
      setSharedNotes(notesRes.shared);
      setReminders(remRes.reminders);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setFetchingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

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
    let savedNote: Note;
    if (editingNote) {
      const res = await api.updateNote(editingNote.id, noteData);
      savedNote = res.note;
      setNotes(prev => prev.map(n => (n.id === res.note.id ? res.note : n)));
      setSharedNotes(prev => prev.map(n => (n.id === res.note.id ? res.note : n)));
    } else {
      const res = await api.createNote(noteData);
      savedNote = res.note;
      setNotes(prev => [res.note, ...prev]);
    }

    // If an associated reminder was created/updated
    if (noteData.reminder && noteData.reminder.dueDateTime) {
      const remRes = await api.getReminders();
      setReminders(remRes.reminders);
      checkRemindersNow();
    }

    sound.playChime();
    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = async (id: string) => {
    sound.playClick();
    await api.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    setSharedNotes(prev => prev.filter(n => n.id !== id));
    // Also remove any linked reminders from state
    setReminders(prev => prev.filter(r => r.noteId !== id));
  };

  const handleTogglePin = async (note: Note) => {
    sound.playClick();
    const res = await api.updateNote(note.id, { isPinned: !note.isPinned });
    setNotes(prev => prev.map(n => (n.id === note.id ? res.note : n)));
    setSharedNotes(prev => prev.map(n => (n.id === note.id ? res.note : n)));
  };

  const handleOpenShare = (note: Note) => {
    sound.playClick();
    setSharingNote(note);
    setIsShareModalOpen(true);
  };

  const handleNoteUpdatedFromShare = (updatedNote: Note) => {
    setNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
    setSharedNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
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
      setReminders(prev => prev.map(r => (r.id === res.reminder.id ? res.reminder : r)));
    } else {
      const res = await api.createReminder(remData as any);
      setReminders(prev => [...prev, res.reminder]);
    }

    sound.playChime();
    setIsReminderModalOpen(false);
    checkRemindersNow();
  };

  const handleToggleReminder = async (id: string) => {
    sound.playClick();
    const res = await api.toggleReminder(id);
    setReminders(prev => prev.map(r => (r.id === id ? res.reminder : r)));
    checkRemindersNow();
  };

  const handleDeleteReminder = async (id: string) => {
    sound.playClick();
    await api.deleteReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const handleQuickCreateNote = async (title: string, color: any) => {
    const res = await api.createNote({
      title,
      color,
      content: '',
      tags: [],
    });
    setNotes(prev => [res.note, ...prev]);
    sound.playChime();
  };

  const handleQuickCreateReminder = async (payload: {
    title: string;
    dueDateTime: string;
    priority: any;
    noteId?: string | null;
  }) => {
    const res = await api.createReminder(payload);
    setReminders(prev => [...prev, res.reminder]);
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

  if (!user) {
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
          stats={stats}
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
              stats={stats}
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
              onOpenChatWithUser={(targetUser) => {
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
        onSelectMedia={(media) => {
          setCurrentPage('showcase');
        }}
      />

      {/* User Profile & Work History Modal */}
      <UserProfileModal
        userId={viewProfileUserId}
        currentUserId={user.id}
        isOpen={Boolean(viewProfileUserId)}
        onClose={() => setViewProfileUserId(null)}
        onOpenChatWithUser={(chatTarget) => {
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
          onProfileUpdated={async (updated) => {
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
