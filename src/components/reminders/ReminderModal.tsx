import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, AlertCircle, StickyNote, Save } from 'lucide-react';
import { Reminder, ReminderPriority, Note } from '../../types';
import { sound } from '../../utils/sound';
import { NeumorphicButton } from '../common/NeumorphicButton';
import { format, parseISO } from 'date-fns';

interface ReminderModalProps {
  reminder: Reminder | null; // null if create mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; description?: string; dueDateTime: string; priority: ReminderPriority; noteId?: string | null }) => Promise<void>;
  availableNotes: Note[];
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  reminder,
  isOpen,
  onClose,
  onSave,
  availableNotes,
}) => {
  const isEditing = Boolean(reminder);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('10:00');
  const [priority, setPriority] = useState<ReminderPriority>('medium');
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setDescription(reminder.description || '');
      setPriority(reminder.priority || 'medium');
      setSelectedNoteId(reminder.noteId || '');
      try {
        const d = parseISO(reminder.dueDateTime);
        setDueDate(format(d, 'yyyy-MM-dd'));
        setDueTime(format(d, 'HH:mm'));
      } catch {
        setDueDate(new Date().toISOString().slice(0, 10));
        setDueTime('10:00');
      }
    } else {
      setTitle('');
      setDescription('');
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setDueDate(format(tomorrow, 'yyyy-MM-dd'));
      setDueTime('09:00');
      setPriority('medium');
      setSelectedNoteId('');
    }
    setError(null);
  }, [reminder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      setError('Please provide a reminder title and due date.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const combinedDateTime = new Date(`${dueDate}T${dueTime || '09:00'}:00`).toISOString();
      await onSave({
        title: title.trim(),
        description: description.trim(),
        dueDateTime: combinedDateTime,
        priority,
        noteId: selectedNoteId || null,
      });
      sound.playChime();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl neu-inset bg-amber-500/10 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Reminder' : 'Set New Reminder'}
              </h2>
              <p className="text-xs text-slate-400">Never miss a deadline or review</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl neu-inset bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Reminder Title
            </label>
            <input
              type="text"
              placeholder="e.g. Follow up on design handoff"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl neu-input text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any context or notes..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none resize-none"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as ReminderPriority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setPriority(p);
                  }}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                    priority === p
                      ? 'neu-inset text-slate-900 dark:text-white bg-[#e2e9f3] dark:bg-[#14161a] border border-black/10 dark:border-white/10'
                      : 'neu-btn text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Link to Note (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <StickyNote className="w-3 h-3" /> Link to Sticky Note (Optional)
            </label>
            <select
              value={selectedNoteId}
              onChange={e => setSelectedNoteId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 focus:outline-none bg-transparent"
            >
              <option value="" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">
                -- No linked note --
              </option>
              {availableNotes.map(n => (
                <option
                  key={n.id}
                  value={n.id}
                  className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white"
                >
                  {n.title || 'Untitled Note'}
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-2.5">
            <NeumorphicButton
              type="button"
              variant="flat"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </NeumorphicButton>

            <NeumorphicButton
              type="submit"
              variant="raised"
              disabled={saving}
              className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : isEditing ? 'Update Reminder' : 'Set Reminder'}</span>
            </NeumorphicButton>
          </div>
        </form>
      </div>
    </div>
  );
};
