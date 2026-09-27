import React from 'react';
import { 
  Calendar, 
  Trash2, 
  Edit3, 
  StickyNote, 
  AlertCircle,
  Check
} from 'lucide-react';
import { Reminder, Note } from '../../types';
import { sound } from '../../utils/sound';
import confetti from 'canvas-confetti';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';

interface ReminderItemProps {
  reminder: Reminder;
  onToggle: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onOpenLinkedNote?: (noteId: string) => void;
  availableNotes?: Note[];
}

export const ReminderItem: React.FC<ReminderItemProps> = ({
  reminder,
  onToggle,
  onEdit,
  onDelete,
  onOpenLinkedNote,
}) => {
  const dueDate = parseISO(reminder.dueDateTime);
  const isOverdue = !reminder.isCompleted && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = !reminder.isCompleted && isToday(dueDate);

  const getDueLabel = () => {
    try {
      if (isToday(dueDate)) return `Today at ${format(dueDate, 'h:mm a')}`;
      if (isTomorrow(dueDate)) return `Tomorrow at ${format(dueDate, 'h:mm a')}`;
      return format(dueDate, 'MMM d, yyyy • h:mm a');
    } catch {
      return reminder.dueDateTime;
    }
  };

  const priorityStyles = {
    high: 'text-red-500 bg-red-500/10 border-red-500/20',
    medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  }[reminder.priority];

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reminder.isCompleted) {
      sound.playChime();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    } else {
      sound.playClick();
    }
    onToggle(reminder.id);
  };

  return (
    <div
      className={`group neu-card p-4 transition-all duration-200 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 ${
        reminder.isCompleted
          ? 'opacity-60 bg-[#e7edf5] dark:bg-[#15171b]'
          : isOverdue
          ? 'bg-red-500/5 dark:bg-red-950/10 border-red-500/20'
          : 'bg-[#edf2f8] dark:bg-[#191b20]'
      }`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {/* Custom Neumorphic Checkbox */}
        <button
          type="button"
          onClick={handleToggleClick}
          className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            reminder.isCompleted
              ? 'neu-inset bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
              : 'neu-btn bg-[#edf2f8] dark:bg-[#1a1d23] text-transparent hover:text-slate-400'
          }`}
          title={reminder.isCompleted ? 'Mark active' : 'Mark completed'}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm font-semibold truncate ${
                reminder.isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {reminder.title}
            </h4>

            {/* Priority Badge */}
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityStyles}`}
            >
              {reminder.priority}
            </span>

            {/* Linked Note Button */}
            {reminder.noteId && (
              <button
                type="button"
                onClick={() => onOpenLinkedNote && onOpenLinkedNote(reminder.noteId!)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded-md neu-inset bg-black/5 dark:bg-white/5 truncate max-w-[140px]"
                title={`Open note: ${reminder.noteTitle || 'Linked Note'}`}
              >
                <StickyNote className="w-3 h-3 text-slate-400" />
                <span className="truncate">{reminder.noteTitle || 'Note'}</span>
              </button>
            )}
          </div>

          {/* Description snippet */}
          {reminder.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {reminder.description}
            </p>
          )}

          {/* Timing details */}
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span
              className={`flex items-center gap-1 font-medium ${
                isOverdue
                  ? 'text-red-500 font-bold'
                  : isDueToday
                  ? 'text-amber-500 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {isOverdue ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Calendar className="w-3.5 h-3.5" />
              )}
              {getDueLabel()}
            </span>

            {reminder.isCompleted && reminder.completedAt && (
              <span className="text-[11px] text-slate-400">
                • Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onEdit(reminder);
          }}
          title="Edit Reminder"
          className="p-2 rounded-xl neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            sound.playClick();
            if (window.confirm('Delete this reminder?')) {
              onDelete(reminder.id);
            }
          }}
          title="Delete Reminder"
          className="p-2 rounded-xl neu-btn text-red-400 hover:text-red-600 dark:hover:text-red-300"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
