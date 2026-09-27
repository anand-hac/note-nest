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
import { AuthPage } from './pages/AuthPage';
import { Note, Reminder, AppStats, ReminderPriority, NoteColor } from './types';
import { api } from './utils/api';
import { sound } from './utils/sound';
import { firebaseService } from './services/firebaseService';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
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
    if (firebaseService.isAvailable()) {
      firebaseService.syncNote(savedNote);
    }
    await loadAllData();
    checkRemindersNow();
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteNote(noteId);
      if (firebaseService.isAvailable()) {
        firebaseService.deleteNote(noteId);
      }
      sound.playClick();
      setNotes(prev => prev.filter(n => n.id !== noteId));
      await loadAllData();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const res = await api.updateNote(note.id, { isPinned: !note.isPinned });
      if (firebaseService.isAvailable()) {
        firebaseService.syncNote(res.note);
      }
      setNotes(prev => prev.map(n => (n.id === res.note.id ? res.note : n)));
      await loadAllData();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleOpenShare = (note: Note) => {
    sound.playClick();
    setSharingNote(note);
    setIsShareModalOpen(true);
  };

  const handleNoteUpdatedFromShare = (updatedNote: Note) => {
    setNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
    setSharingNote(updatedNote);
    loadAllData();
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

  const handleSaveReminder = async (payload: {
    title: string;
    description?: string;
    dueDateTime: string;
    priority: ReminderPriority;
    noteId?: string | null;
  }) => {
    let savedReminder: Reminder;
    if (editingReminder) {
      const res = await api.updateReminder(editingReminder.id, payload);
      savedReminder = res.reminder;
      setReminders(prev => prev.map(r => (r.id === res.reminder.id ? res.reminder : r)));
    } else {
      const res = await api.createReminder(payload);
      savedReminder = res.reminder;
      setReminders(prev => [res.reminder, ...prev]);
    }
    if (firebaseService.isAvailable()) {
      firebaseService.syncReminder(savedReminder);
    }
    await loadAllData();
    checkRemindersNow();
  };

  const handleToggleReminder = async (id: string) => {
    try {
      const res = await api.toggleReminder(id);
      if (firebaseService.isAvailable()) {
        firebaseService.syncReminder(res.reminder);
      }
      setReminders(prev => prev.map(r => (r.id === id ? res.reminder : r)));
      await loadAllData();
    } catch (err) {
      console.error('Failed to toggle reminder:', err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await api.deleteReminder(id);
      if (firebaseService.isAvailable()) {
        firebaseService.deleteReminder(id);
      }
      sound.playClick();
      setReminders(prev => prev.filter(r => r.id !== id));
      await loadAllData();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const handleQuickCreateNote = async (title: string, content: string, color?: NoteColor) => {
    const res = await api.createNote({ title, content, color: color || 'yellow' });
    setNotes(prev => [res.note, ...prev]);
    await loadAllData();
  };

  const handleQuickCreateReminder = async (payload: {
    title: string;
    dueDateTime: string;
    priority: ReminderPriority;
    noteId?: string | null;
  }) => {
    const res = await api.createReminder(payload);
    setReminders(prev => [res.reminder, ...prev]);
    await loadAllData();
    checkRemindersNow();
  };

  const handleOpenLinkedNote = (noteId: string) => {
    const found = [...notes, ...sharedNotes].find(n => n.id === noteId);
    if (found) {
      handleEditNote(found);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#141518]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl neu-raised bg-[#191b20] p-1 flex items-center justify-center animate-pulse">
            <img src="/app-icon.png" alt="Note Nest" className="w-12 h-12 rounded-2xl" />
          </div>
          <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
            Loading Note Nest...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#edf2f8] dark:bg-[#141518] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar
        onOpenNewNote={handleOpenNewNote}
        searchQuery={searchQuery}
        onSearchChange={q => {
          setSearchQuery(q);
          if (q.trim() && currentPage !== 'notes') {
            setCurrentPage('notes');
          }
        }}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="max-w-7xl mx-auto flex">
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

      {/* Modals */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        note={editingNote}
        onSave={handleSaveNote}
        onOpenShareModal={handleOpenShare}
        currentUserId={user.id}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        note={sharingNote}
        onNoteUpdated={handleNoteUpdatedFromShare}
      />

      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        reminder={editingReminder}
        onSave={handleSaveReminder}
        availableNotes={notes}
      />

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
