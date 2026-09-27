import React, { useState, useEffect } from 'react';
import { 
  X, 
  Pin, 
  Share2, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Clock, 
  Palette, 
  Tag as TagIcon, 
  Lock, 
  Eye, 
  Save
} from 'lucide-react';
import { Note, ChecklistItem, NoteColor } from '../../types';
import { sound } from '../../utils/sound';
import { NeumorphicButton } from '../common/NeumorphicButton';
import { v4 as uuidv4 } from 'uuid';

interface NoteModalProps {
  note: Note | null; // If null, create mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Partial<Note> & { reminder?: { title: string; dueDateTime: string; priority: string } }) => Promise<void>;
  onOpenShareModal: (note: Note) => void;
  currentUserId: string;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  note,
  isOpen,
  onClose,
  onSave,
  onOpenShareModal,
  currentUserId,
}) => {
  const isEditing = Boolean(note);
  const isOwner = !note || note.userId === currentUserId;
  const collaborator = note?.collaborators.find(c => c.userId === currentUserId);
  const canEdit = !note || isOwner || collaborator?.permission === 'edit';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [color, setColor] = useState<NoteColor>('yellow');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  // Reminder attachment
  const [includeReminder, setIncludeReminder] = useState(false);
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [reminderDueTime, setReminderDueTime] = useState('12:00');
  const [reminderPriority, setReminderPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setChecklist(note.checklist || []);
      setColor(note.color || 'default');
      setTags(note.tags || []);
      setIsPinned(Boolean(note.isPinned));
      setIncludeReminder(false);
    } else {
      // Default new note
      setTitle('');
      setContent('');
      setChecklist([]);
      setColor('yellow');
      setTags([]);
      setIsPinned(false);
      setIncludeReminder(false);

      // Default tomorrow for reminder
      const tmrw = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setReminderDueDate(tmrw.toISOString().slice(0, 10));
      setReminderDueTime('10:00');
    }
    setError(null);
  }, [note, isOpen]);

  if (!isOpen) return null;

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    sound.playClick();
    setChecklist([
      ...checklist,
      { id: `c_${uuidv4().slice(0, 6)}`, text: newChecklistText.trim(), completed: false },
    ]);
    setNewChecklistText('');
  };

  const handleToggleChecklistItem = (id: string) => {
    if (!canEdit) return;
    sound.playClick();
    setChecklist(checklist.map(item => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const handleDeleteChecklistItem = (id: string) => {
    sound.playClick();
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleAddTag = () => {
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      sound.playClick();
      setTags([...tags, clean]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    sound.playClick();
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      onClose();
      return;
    }
    if (!title.trim() && !content.trim() && checklist.length === 0) {
      setError('Please add a title, note content, or checklist item.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let reminderPayload;
      if (includeReminder && reminderDueDate) {
        const combined = new Date(`${reminderDueDate}T${reminderDueTime || '12:00'}:00`).toISOString();
        reminderPayload = {
          title: `Reminder: ${title.trim() || 'Untitled Note'}`,
          dueDateTime: combined,
          priority: reminderPriority,
        };
      }

      await onSave({
        title: title.trim(),
        content: content.trim(),
        checklist,
        color,
        tags,
        isPinned,
        reminder: reminderPayload,
      });

      sound.playChime();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const stickyColors: Array<{ id: NoteColor; label: string; bgStyle: string; colorDot: string }> = [
    { id: 'yellow', label: 'Canary Yellow', bgStyle: 'sticky-color-yellow', colorDot: 'bg-amber-300' },
    { id: 'orange', label: 'Sunset Orange', bgStyle: 'sticky-color-orange', colorDot: 'bg-orange-400' },
    { id: 'coral', label: 'Coral Red', bgStyle: 'sticky-color-coral', colorDot: 'bg-rose-400' },
    { id: 'pink', label: 'Pastel Pink', bgStyle: 'sticky-color-pink', colorDot: 'bg-pink-300' },
    { id: 'magenta', label: 'Fuchsia Magenta', bgStyle: 'sticky-color-magenta', colorDot: 'bg-fuchsia-400' },
    { id: 'purple', label: 'Lavender Lilac', bgStyle: 'sticky-color-purple', colorDot: 'bg-purple-300' },
    { id: 'blue', label: 'Sky Blue', bgStyle: 'sticky-color-blue', colorDot: 'bg-sky-300' },
    { id: 'aqua', label: 'Electric Aqua', bgStyle: 'sticky-color-aqua', colorDot: 'bg-cyan-300' },
    { id: 'green', label: 'Mint Green', bgStyle: 'sticky-color-green', colorDot: 'bg-emerald-300' },
    { id: 'lime', label: 'Bright Lime', bgStyle: 'sticky-color-lime', colorDot: 'bg-lime-300' },
    { id: 'sand', label: 'Warm Sand', bgStyle: 'sticky-color-sand', colorDot: 'bg-amber-200' },
    { id: 'charcoal', label: 'Charcoal Slate', bgStyle: 'sticky-color-charcoal', colorDot: 'bg-slate-700' },
    { id: 'snow', label: 'Pure White', bgStyle: 'sticky-color-snow', colorDot: 'bg-white' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {isEditing ? (canEdit ? 'Edit Sticky Note' : 'View Note') : 'New Sticky Note'}
            </span>
            {!canEdit && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full neu-inset text-slate-400 flex items-center gap-1">
                <Eye className="w-3 h-3" /> View Only
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Share action button if existing note and owner */}
            {note && isOwner && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onOpenShareModal(note);
                }}
                className="p-2 rounded-xl neu-btn text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white flex items-center gap-1.5 text-xs font-semibold"
                title="Manage note sharing"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            {/* Pin Toggle */}
            {canEdit && isOwner && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsPinned(!isPinned);
                }}
                className={`p-2 rounded-xl transition ${
                  isPinned
                    ? 'neu-inset text-amber-500 bg-amber-500/10'
                    : 'neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={isPinned ? 'Unpin' : 'Pin to top'}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500' : ''}`} />
              </button>
            )}

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
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl neu-inset bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Sticky Note Pad Simulation */}
          <div className="p-4 sm:p-5 rounded-2xl neu-inset bg-black/5 dark:bg-black/25 space-y-3">
            {/* Title input with handwritten font */}
            <div>
              <input
                type="text"
                placeholder="Sticky Note Title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-2.5 font-handwritten text-3xl font-bold tracking-tight rounded-xl neu-input text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Content textarea with handwritten font */}
            <div>
              <textarea
                rows={5}
                placeholder="Write your note thoughts in handwritten style..."
                value={content}
                onChange={e => setContent(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 font-handwritten text-xl font-medium leading-relaxed rounded-xl neu-input text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Checklist Builder */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <CheckSquare className="w-3.5 h-3.5" />
              Checklist Tasks ({checklist.filter(c => c.completed).length}/{checklist.length})
            </label>

            <div className="space-y-1.5">
              {checklist.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl neu-inset bg-[#e6ecf4] dark:bg-[#15171b] gap-2.5 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className="flex items-center gap-2.5 flex-1 text-left cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center transition ${
                        item.completed
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'neu-btn text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                    <span
                      className={`font-medium ${
                        item.completed
                          ? 'line-through text-slate-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {canEdit && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a task checklist item..."
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                  />
                  <NeumorphicButton
                    type="button"
                    size="sm"
                    variant="raised"
                    onClick={handleAddChecklistItem}
                    className="shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </NeumorphicButton>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Note Color Palette */}
          {canEdit && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Palette className="w-3.5 h-3.5" />
                Sticky Note Color Paper
              </label>
              <div className="flex flex-wrap gap-2.5">
                {stickyColors.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setColor(c.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                      color === c.id
                        ? 'ring-2 ring-slate-800 dark:ring-white neu-inset font-bold bg-[#e3e9f2] dark:bg-[#14161a]'
                        : 'neu-btn opacity-85 hover:opacity-100'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border border-black/20 shadow-sm ${c.colorDot}`} />
                    <span className="text-slate-800 dark:text-slate-200">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags / Labels */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <TagIcon className="w-3.5 h-3.5" />
              Tags & Categories
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold neu-inset bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200"
                >
                  #{tag}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-red-500 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}

              {canEdit && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="+ Tag (press Enter)"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="px-2.5 py-1 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-200 placeholder-slate-400 w-28 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-1 rounded-lg neu-btn text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Direct Reminder Option (when creating new note) */}
          {!isEditing && canEdit && (
            <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="attachReminder"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Attach a Reminder for this Note
                </label>
                <input
                  type="checkbox"
                  id="attachReminder"
                  checked={includeReminder}
                  onChange={e => setIncludeReminder(e.target.checked)}
                  className="rounded neu-inset cursor-pointer w-4 h-4 accent-slate-800 dark:accent-white"
                />
              </div>

              {includeReminder && (
                <div className="p-3 rounded-2xl neu-inset bg-[#e5ebf3] dark:bg-[#15171b] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={reminderDueDate}
                      onChange={e => setReminderDueDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg neu-input text-slate-800 dark:text-slate-100 focus:outline-none"
                      required={includeReminder}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                      Due Time
                    </label>
                    <input
                      type="time"
                      value={reminderDueTime}
                      onChange={e => setReminderDueTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg neu-input text-slate-800 dark:text-slate-100 focus:outline-none"
                      required={includeReminder}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                      Priority
                    </label>
                    <select
                      value={reminderPriority}
                      onChange={e => setReminderPriority(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg neu-input text-slate-800 dark:text-slate-100 focus:outline-none bg-transparent"
                    >
                      <option value="low" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">Low</option>
                      <option value="medium" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">Medium</option>
                      <option value="high" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">High</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-3">
            <NeumorphicButton
              type="button"
              variant="flat"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </NeumorphicButton>

            {canEdit ? (
              <NeumorphicButton
                type="submit"
                variant="raised"
                disabled={saving}
                className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving Note...' : isEditing ? 'Save Changes' : 'Create Note'}</span>
              </NeumorphicButton>
            ) : (
              <NeumorphicButton
                type="button"
                variant="raised"
                onClick={onClose}
                className="text-xs"
              >
                Close
              </NeumorphicButton>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
