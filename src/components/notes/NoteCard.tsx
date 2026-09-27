import React from 'react';
import { 
  Pin, 
  Share2, 
  Trash2, 
  Clock, 
  Users, 
  CheckSquare, 
  Lock,
  Edit3
} from 'lucide-react';
import { Note, NotePermission } from '../../types';
import { sound } from '../../utils/sound';

interface NoteCardProps {
  note: Note;
  currentUserId: string;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (note: Note) => void;
  onShare: (note: Note) => void;
  tiltAngle?: number;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  currentUserId,
  onEdit,
  onDelete,
  onTogglePin,
  onShare,
}) => {
  const isOwner = note.userId === currentUserId;
  const collaborator = note.collaborators.find(c => c.userId === currentUserId);
  const userPermission: 'owner' | NotePermission = isOwner ? 'owner' : collaborator?.permission || 'view';
  const canEdit = isOwner || userPermission === 'edit';

  const completedChecklistCount = note.checklist.filter(c => c.completed).length;
  const totalChecklistCount = note.checklist.length;
  const checklistProgress = totalChecklistCount > 0 ? (completedChecklistCount / totalChecklistCount) * 100 : 0;

  // Compute slight organic angle based on note ID
  const hash = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const angles = [-1.2, 0.8, -0.6, 1.1, -1.0, 0.6];
  const tilt = angles[hash % angles.length];

  // Authentic Post-It Color classes
  const colorMap: Record<string, { bgClass: string; isDark: boolean }> = {
    yellow: { bgClass: 'sticky-color-yellow', isDark: false },
    orange: { bgClass: 'sticky-color-orange', isDark: false },
    coral: { bgClass: 'sticky-color-coral', isDark: false },
    pink: { bgClass: 'sticky-color-pink', isDark: false },
    magenta: { bgClass: 'sticky-color-magenta', isDark: false },
    purple: { bgClass: 'sticky-color-purple', isDark: false },
    blue: { bgClass: 'sticky-color-blue', isDark: false },
    aqua: { bgClass: 'sticky-color-aqua', isDark: false },
    green: { bgClass: 'sticky-color-green', isDark: false },
    lime: { bgClass: 'sticky-color-lime', isDark: false },
    sand: { bgClass: 'sticky-color-sand', isDark: false },
    charcoal: { bgClass: 'sticky-color-charcoal', isDark: true },
    snow: { bgClass: 'sticky-color-snow', isDark: false },
    default: { bgClass: 'sticky-color-yellow', isDark: false },
    slate: { bgClass: 'sticky-color-charcoal', isDark: true },
    graphite: { bgClass: 'sticky-color-charcoal', isDark: true },
    silver: { bgClass: 'sticky-color-snow', isDark: false },
  };

  const selectedTheme = colorMap[note.color] || colorMap.yellow;

  return (
    <div
      onClick={() => onEdit(note)}
      style={{ transform: `rotate(${tilt}deg)` }}
      className={`group relative sticky-note-card ${selectedTheme.bgClass} p-5 pt-6 flex flex-col justify-between cursor-pointer min-h-[230px] select-none`}
    >
      {/* Translucent top tape strip */}
      <div className="sticky-tape" />

      {/* Curled bottom-right corner illusion */}
      <div className="sticky-corner-fold" />

      {/* Realistic Pin at Top Center if Pinned */}
      {note.isPinned && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none drop-shadow-md"
          title="Pinned sticky note"
        >
          <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-red-700 shadow-lg flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-red-300" />
          </div>
          <div className="w-0.5 h-2 bg-slate-400" />
        </div>
      )}

      {/* Note Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 pr-1">
            {/* Title with authentic handwriting font */}
            <h3 className={`font-handwritten text-2xl font-bold tracking-tight leading-tight line-clamp-2 ${
              selectedTheme.isDark ? 'text-white' : 'text-slate-950'
            }`}>
              {note.title || 'Untitled Note'}
            </h3>

            {/* Shared By Badge */}
            {!isOwner && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-0.5 ${
                selectedTheme.isDark ? 'text-slate-400' : 'text-slate-700'
              }`}>
                <Users className="w-3 h-3" />
                Shared by @{note.ownerUsername}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 z-10" onClick={e => e.stopPropagation()}>
            {/* Role Badge if Shared */}
            {!isOwner && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  userPermission === 'edit'
                    ? 'text-emerald-800 bg-emerald-300/40 border border-emerald-600/30'
                    : 'text-slate-700 bg-black/10'
                }`}
              >
                {userPermission === 'edit' ? 'Can Edit' : 'View Only'}
              </span>
            )}

            {/* Pin Toggle Button */}
            {isOwner && (
              <button
                onClick={() => {
                  sound.playClick();
                  onTogglePin(note);
                }}
                title={note.isPinned ? 'Unpin sticky note' : 'Pin sticky note to board'}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  note.isPinned
                    ? 'bg-black/15 text-red-600'
                    : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/10'
                }`}
              >
                <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-red-600' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Note Body Text with Handwritten Font */}
        {note.content && (
          <p className={`font-handwritten text-lg whitespace-pre-line line-clamp-5 leading-snug my-2 ${
            selectedTheme.isDark ? 'text-slate-200' : 'text-slate-900'
          }`}>
            {note.content}
          </p>
        )}

        {/* Checklist preview */}
        {totalChecklistCount > 0 && (
          <div className="my-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 space-y-1.5">
            <div className={`flex items-center justify-between font-handwritten text-sm font-bold ${
              selectedTheme.isDark ? 'text-slate-300' : 'text-slate-800'
            }`}>
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" />
                Tasks
              </span>
              <span>{completedChecklistCount}/{totalChecklistCount}</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-black/70 dark:bg-white/80 rounded-full transition-all duration-300"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tags Chips */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-black/80 dark:text-white/90"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Metadata and Action Buttons */}
      <div className="mt-4 pt-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {/* Privacy status */}
          {note.collaborators.length === 0 ? (
            <span className="flex items-center gap-1 text-[11px] opacity-60 font-semibold" title="Private note">
              <Lock className="w-3 h-3" />
              Private
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-400" title={`Shared with ${note.collaborators.length} collaborator(s)`}>
              <Users className="w-3 h-3" />
              {note.collaborators.length} {note.collaborators.length === 1 ? 'peer' : 'peers'}
            </span>
          )}

          {/* Linked Reminder indicator */}
          {note.reminderId && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400" title="Has linked reminder">
              <Clock className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 z-10" onClick={e => e.stopPropagation()}>
          {/* Share button (Owner only) */}
          {isOwner && (
            <button
              onClick={() => {
                sound.playClick();
                onShare(note);
              }}
              title="Share sticky note"
              className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/10 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Edit button */}
          {canEdit && (
            <button
              onClick={() => {
                sound.playClick();
                onEdit(note);
              }}
              title="Edit sticky note"
              className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/10 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete button (Owner only) */}
          {isOwner && (
            <button
              onClick={() => {
                sound.playClick();
                if (window.confirm('Delete this sticky note?')) {
                  onDelete(note.id);
                }
              }}
              title="Delete sticky note"
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-500/20 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
