import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { Reminder, ReminderPriority, Note } from '../types';
import { ReminderItem } from '../components/reminders/ReminderItem';
import { NeumorphicButton } from '../components/common/NeumorphicButton';
import { sound } from '../utils/sound';
import { isPast, isToday, isTomorrow, parseISO } from 'date-fns';

interface RemindersPageProps {
  reminders: Reminder[];
  availableNotes: Note[];
  onToggleReminder: (id: string) => void;
  onEditReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  onOpenNewReminderModal: () => void;
  onQuickCreateReminder: (payload: { title: string; dueDateTime: string; priority: ReminderPriority; noteId?: string | null }) => Promise<void>;
  onOpenLinkedNote: (noteId: string) => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({
  reminders,
  availableNotes,
  onToggleReminder,
  onEditReminder,
  onDeleteReminder,
  onOpenNewReminderModal,
  onQuickCreateReminder,
  onOpenLinkedNote,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'today' | 'upcoming' | 'overdue' | 'completed'>('active');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quickTime, setQuickTime] = useState('17:00');
  const [quickPriority, setQuickPriority] = useState<ReminderPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickDate) return;
    setIsSubmitting(true);
    try {
      const combined = new Date(`${quickDate}T${quickTime || '12:00'}:00`).toISOString();
      await onQuickCreateReminder({
        title: quickTitle.trim(),
        dueDateTime: combined,
        priority: quickPriority,
      });
      setQuickTitle('');
      sound.playChime();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Groupings
  const overdueReminders = useMemo(() => {
    return reminders.filter(r => !r.isCompleted && isPast(parseISO(r.dueDateTime)) && !isToday(parseISO(r.dueDateTime)));
  }, [reminders]);

  const todayReminders = useMemo(() => {
    return reminders.filter(r => !r.isCompleted && isToday(parseISO(r.dueDateTime)));
  }, [reminders]);

  const upcomingReminders = useMemo(() => {
    return reminders.filter(r => !r.isCompleted && !isPast(parseISO(r.dueDateTime)) && !isToday(parseISO(r.dueDateTime)));
  }, [reminders]);

  const completedReminders = useMemo(() => {
    return reminders.filter(r => r.isCompleted);
  }, [reminders]);

  const displayedReminders = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return todayReminders;
      case 'upcoming':
        return upcomingReminders;
      case 'overdue':
        return overdueReminders;
      case 'completed':
        return completedReminders;
      case 'active':
      default:
        return [...overdueReminders, ...todayReminders, ...upcomingReminders];
    }
  }, [activeTab, overdueReminders, todayReminders, upcomingReminders, completedReminders]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-amber-500" />
            Reminders & Tasks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Stay on top of critical deadlines, follow-ups, and commitments
          </p>
        </div>

        <NeumorphicButton
          variant="raised"
          size="md"
          onClick={onOpenNewReminderModal}
          className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Reminder</span>
        </NeumorphicButton>
      </div>

      {/* Quick Add Bar */}
      <div className="neu-card p-4 sm:p-5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5">
        <form onSubmit={handleQuickSubmit} className="flex flex-col md:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Quick reminder title..."
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            className="w-full md:flex-1 px-4 py-2.5 text-xs rounded-xl neu-input text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            required
          />

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={quickDate}
              onChange={e => setQuickDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 focus:outline-none flex-1 md:flex-none"
              required
            />
            <input
              type="time"
              value={quickTime}
              onChange={e => setQuickTime(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <select
              value={quickPriority}
              onChange={e => setQuickPriority(e.target.value as any)}
              className="px-2.5 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 focus:outline-none bg-transparent"
            >
              <option value="low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Low</option>
              <option value="medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Medium</option>
              <option value="high" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">High</option>
            </select>

            <NeumorphicButton
              type="submit"
              variant="raised"
              size="md"
              disabled={isSubmitting || !quickTitle.trim()}
              className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </NeumorphicButton>
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl neu-inset p-1.5 bg-[#e5ebf3] dark:bg-[#14161a] overflow-x-auto scrollbar-none gap-1">
        {[
          { id: 'active', label: 'All Active', count: overdueReminders.length + todayReminders.length + upcomingReminders.length },
          { id: 'today', label: 'Due Today', count: todayReminders.length },
          { id: 'overdue', label: 'Overdue', count: overdueReminders.length, alert: overdueReminders.length > 0 },
          { id: 'upcoming', label: 'Upcoming', count: upcomingReminders.length },
          { id: 'completed', label: 'Completed', count: completedReminders.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              sound.playClick();
              setActiveTab(tab.id as any);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'neu-btn text-slate-900 dark:text-white bg-[#edf2f8] dark:bg-[#1f2229] shadow-md'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                tab.alert
                  ? 'bg-red-500 text-white'
                  : 'neu-inset text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {displayedReminders.length === 0 ? (
          <div className="py-16 neu-card p-8 bg-[#edf2f8] dark:bg-[#191b20] text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No reminders in this view
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === 'completed'
                ? 'Completed reminders will appear here when you check them off.'
                : 'You have no pending reminders scheduled for this view.'}
            </p>
          </div>
        ) : (
          displayedReminders.map(rem => (
            <ReminderItem
              key={rem.id}
              reminder={rem}
              onToggle={onToggleReminder}
              onEdit={onEditReminder}
              onDelete={onDeleteReminder}
              onOpenLinkedNote={onOpenLinkedNote}
            />
          ))
        )}
      </div>
    </div>
  );
};
