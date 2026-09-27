import React from 'react';
import { Share2, Users, ShieldCheck, Lock, Eye, Edit3, FolderOpen } from 'lucide-react';
import { Note } from '../types';
import { useAuth } from '../context/AuthContext';
import { NoteCard } from '../components/notes/NoteCard';
import { NeumorphicButton } from '../components/common/NeumorphicButton';

interface SharedPageProps {
  sharedNotes: Note[];
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (note: Note) => void;
  onShareNote: (note: Note) => void;
}

export const SharedPage: React.FC<SharedPageProps> = ({
  sharedNotes,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onShareNote,
}) => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-slate-900 dark:text-white" />
            Shared With Me
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sticky notes and checklists shared with you by other Note Nest users
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl neu-inset text-slate-600 dark:text-slate-300">
            {sharedNotes.length} Shared Document{sharedNotes.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Security & Permissions Info Banner */}
      <div className="neu-card p-5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 rounded-2xl neu-inset bg-emerald-500/10 text-emerald-500 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1 text-xs">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">
            Granular Access & Permission Control
          </h4>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Every note is cryptographically bounded. Notes marked <strong className="text-emerald-500 font-semibold">Can Edit</strong> allow you to collaborate and modify checklists in real time. Notes marked <strong className="text-slate-400 font-semibold">View Only</strong> cannot be modified by non-owners.
          </p>
        </div>
      </div>

      {/* Grid of Shared Notes */}
      {sharedNotes.length === 0 ? (
        <div className="py-20 neu-card p-8 bg-[#edf2f8] dark:bg-[#191b20] text-center space-y-3">
          <Users className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No shared notes yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When colleagues or friends share a sticky note with your username (<code className="text-slate-800 dark:text-slate-200">@{user?.username}</code>) or email, it will securely appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sharedNotes.map(note => (
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
        </div>
      )}
    </div>
  );
};
