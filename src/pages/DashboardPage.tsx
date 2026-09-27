import React, { useState } from 'react';
import { 
  StickyNote, 
  Clock, 
  Share2, 
  Pin, 
  ArrowRight, 
  Plus, 
  Sparkles,
  Calendar,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { Note, Reminder, AppStats, NoteColor } from '../types';
import { useAuth } from '../context/AuthContext';
import { NoteCard } from '../components/notes/NoteCard';
import { ReminderItem } from '../components/reminders/ReminderItem';
import { NeumorphicButton } from '../components/common/NeumorphicButton';
import { sound } from '../utils/sound';

interface DashboardPageProps {
  notes: Note[];
  sharedNotes: Note[];
  reminders: Reminder[];
  stats: AppStats | null;
  onNavigate: (page: string) => void;
  onOpenNewNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (note: Note) => void;
  onShareNote: (note: Note) => void;
  onToggleReminder: (id: string) => void;
  onEditReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  onQuickCreateNote: (title: string, content: string, color?: NoteColor) => Promise<void>;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  notes,
  sharedNotes,
  reminders,
  stats,
  onNavigate,
  onOpenNewNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onShareNote,
  onToggleReminder,
  onEditReminder,
  onDeleteReminder,
  onQuickCreateNote,
}) => {
  const { user } = useAuth();
  const [quickTitle, setQuickTitle] = useState('');
  const [quickContent, setQuickContent] = useState('');
  const [quickColor, setQuickColor] = useState<NoteColor>('yellow');
  const [isPostingQuick, setIsPostingQuick] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleQuickPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() && !quickContent.trim()) return;
    setIsPostingQuick(true);
    try {
      await onQuickCreateNote(quickTitle.trim(), quickContent.trim(), quickColor);
      setQuickTitle('');
      setQuickContent('');
      sound.playChime();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPostingQuick(false);
    }
  };

  // Due reminders filter
  const todayReminders = reminders.filter(r => !r.isCompleted).slice(0, 4);
  const pinnedNotes = notes.filter(n => n.isPinned);
  const recentNotes = notes.slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 neu-card p-6 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Neumorphic Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {getGreeting()}, {user?.name || user?.username}!
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
            You have <strong className="text-slate-900 dark:text-slate-200">{stats?.activeReminders ?? 0} active reminders</strong> and{' '}
            <strong className="text-slate-900 dark:text-slate-200">{stats?.totalNotes ?? 0} sticky notes</strong> in your nest.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NeumorphicButton
            variant="raised"
            size="md"
            onClick={onOpenNewNote}
            className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Create Note</span>
          </NeumorphicButton>

          <NeumorphicButton
            variant="flat"
            size="md"
            onClick={() => onNavigate('reminders')}
            className="font-semibold"
          >
            <Clock className="w-4 h-4" />
            <span>View Reminders</span>
          </NeumorphicButton>
        </div>
      </div>

      {/* 4 Neumorphic KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Notes */}
        <div
          onClick={() => onNavigate('notes')}
          className="neu-card neu-card-hover p-5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Notes
            </span>
            <div className="p-2 rounded-xl neu-inset bg-slate-900/5 dark:bg-white/5 text-slate-800 dark:text-slate-200">
              <StickyNote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats?.totalNotes ?? 0}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 group-hover:translate-x-1 transition">
              View all <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Pinned Notes */}
        <div
          onClick={() => onNavigate('notes')}
          className="neu-card neu-card-hover p-5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pinned Notes
            </span>
            <div className="p-2 rounded-xl neu-inset bg-amber-500/10 text-amber-500">
              <Pin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats?.pinnedNotes ?? 0}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              Top priority
            </span>
          </div>
        </div>

        {/* Reminders Due */}
        <div
          onClick={() => onNavigate('reminders')}
          className="neu-card neu-card-hover p-5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Due Today
            </span>
            <div className="p-2 rounded-xl neu-inset bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-500">
              {stats?.dueTodayReminders ?? 0}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              {stats?.overdueReminders ? `${stats.overdueReminders} overdue` : 'On schedule'}
            </span>
          </div>
        </div>

        {/* Shared With Me */}
        <div
          onClick={() => onNavigate('shared')}
          className="neu-card neu-card-hover p-5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Shared Notes
            </span>
            <div className="p-2 rounded-xl neu-inset bg-slate-900/5 dark:bg-white/5 text-slate-800 dark:text-slate-200">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats?.sharedWithMe ?? 0}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              Collaborations
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Quick Sticky Composer & Upcoming Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Note Composer (Takes 1 Col) - Post-It Styled with Color Swatches */}
        <div className={`sticky-note-card sticky-color-${quickColor} p-5 flex flex-col justify-between relative shadow-2xl transition-colors duration-200`}>
          <div className="sticky-tape" />
          <div className="sticky-corner-fold" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-sm" />
                <h2 className="font-handwritten text-2xl font-bold">
                  Quick Sticky Pad
                </h2>
              </div>
            </div>

            {/* Quick Color Selector Swatches */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2.5 p-1.5 rounded-lg bg-black/10">
              {[
                { id: 'yellow', dot: 'bg-amber-300' },
                { id: 'orange', dot: 'bg-orange-400' },
                { id: 'coral', dot: 'bg-rose-400' },
                { id: 'pink', dot: 'bg-pink-300' },
                { id: 'magenta', dot: 'bg-fuchsia-400' },
                { id: 'purple', dot: 'bg-purple-300' },
                { id: 'blue', dot: 'bg-sky-300' },
                { id: 'aqua', dot: 'bg-cyan-300' },
                { id: 'green', dot: 'bg-emerald-300' },
                { id: 'lime', dot: 'bg-lime-300' },
                { id: 'sand', dot: 'bg-amber-200' },
                { id: 'charcoal', dot: 'bg-slate-800' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setQuickColor(c.id as NoteColor);
                  }}
                  className={`w-4 h-4 rounded-full border border-black/20 transition-transform ${c.dot} ${
                    quickColor === c.id ? 'scale-125 ring-2 ring-black/60 shadow-sm' : 'hover:scale-110 opacity-80'
                  }`}
                  title={c.id}
                />
              ))}
            </div>

            <form onSubmit={handleQuickPost} className="space-y-2.5">
              <input
                type="text"
                placeholder="Sticky Title..."
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                className="w-full px-3.5 py-1.5 font-handwritten text-2xl font-bold tracking-tight rounded-xl bg-black/5 border border-black/10 placeholder-black/50 focus:outline-none"
              />
              <textarea
                rows={3}
                placeholder="Write your thoughts here..."
                value={quickContent}
                onChange={e => setQuickContent(e.target.value)}
                className="w-full px-3.5 py-2 font-handwritten text-lg font-medium leading-relaxed rounded-xl bg-black/5 border border-black/10 placeholder-black/50 focus:outline-none resize-none"
              />
              <button
                type="submit"
                disabled={isPostingQuick || (!quickTitle.trim() && !quickContent.trim())}
                className="w-full py-2 bg-slate-950 text-white hover:bg-black font-handwritten text-xl font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isPostingQuick ? 'Pinning...' : 'Stick to Board 📌'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Reminders Pulse (Takes 2 Cols) */}
        <div className="lg:col-span-2 neu-card p-6 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl neu-inset bg-amber-500/10 text-amber-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Upcoming Reminders
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Check off tasks or snooze
                  </span>
                </div>
              </div>

              <NeumorphicButton
                size="sm"
                variant="flat"
                onClick={() => onNavigate('reminders')}
                className="text-xs"
              >
                <span>All Reminders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NeumorphicButton>
            </div>

            <div className="space-y-2.5">
              {todayReminders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Calendar className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  <span>No pending reminders right now. You're all caught up!</span>
                </div>
              ) : (
                todayReminders.map(rem => (
                  <ReminderItem
                    key={rem.id}
                    reminder={rem}
                    onToggle={onToggleReminder}
                    onEdit={onEditReminder}
                    onDelete={onDeleteReminder}
                    onOpenLinkedNote={noteId => {
                      const found = notes.find(n => n.id === noteId);
                      if (found) onEditNote(found);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pinned & Recent Sticky Notes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {pinnedNotes.length > 0 ? 'Pinned Notes' : 'Recent Sticky Notes'}
            </h2>
          </div>
          <NeumorphicButton
            size="sm"
            variant="flat"
            onClick={() => onNavigate('notes')}
            className="text-xs"
          >
            <span>View All Notes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NeumorphicButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(pinnedNotes.length > 0 ? pinnedNotes : recentNotes).map(note => (
            <NoteCard
              key={note.id}
              note={note}
              currentUserId={user?.id || ''}
              onEdit={onEditNote}
              onDelete={onDeleteNote}
              onTogglePin={onTogglePin}
              onShare={onShareNote}
            />
          ))}

          {notes.length === 0 && (
            <div className="col-span-full py-12 neu-card p-6 bg-[#edf2f8] dark:bg-[#191b20] text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Your nest is empty
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Start capturing your thoughts, tasks, and ideas with a premium neumorphic note.
              </p>
              <NeumorphicButton
                variant="raised"
                size="md"
                onClick={onOpenNewNote}
                className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
              >
                <Plus className="w-4 h-4" /> Create First Note
              </NeumorphicButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
