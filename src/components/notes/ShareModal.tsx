import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Eye, 
  Edit3, 
  Trash2, 
  Search, 
  Check, 
  Lock
} from 'lucide-react';
import { Note, NotePermission, User } from '../../types';
import { api } from '../../utils/api';
import { sound } from '../../utils/sound';
import { NeumorphicButton } from '../common/NeumorphicButton';

interface ShareModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onNoteUpdated: (updatedNote: Note) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  note,
  isOpen,
  onClose,
  onNoteUpdated,
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [permission, setPermission] = useState<NotePermission>('view');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User search suggestion
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUsernameOrEmail('');
      setError(null);
      setSuccess(null);
      setSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!usernameOrEmail.trim() || usernameOrEmail.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { users } = await api.searchUsers(usernameOrEmail);
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [usernameOrEmail]);

  if (!isOpen || !note) return null;

  const handleShare = async (targetIdentifier?: string) => {
    const target = (targetIdentifier || usernameOrEmail).trim();
    if (!target) {
      setError('Please provide a username or email to share with.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.shareNote(note.id, target, permission);
      sound.playChime();
      setSuccess(`Successfully granted ${permission === 'edit' ? 'Can Edit' : 'View Only'} access to @${target}!`);
      setUsernameOrEmail('');
      setSearchResults([]);
      onNoteUpdated(res.note);
    } catch (err: any) {
      setError(err.message || 'Failed to share note.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorUserId: string, collaboratorUsername: string) => {
    sound.playClick();
    if (!window.confirm(`Revoke note access for @${collaboratorUsername}?`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.removeCollaborator(note.id, collaboratorUserId);
      setSuccess(`Revoked access for @${collaboratorUsername}`);
      onNoteUpdated(res.note);
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/10 dark:border-white/10 p-6 rounded-3xl shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl neu-inset bg-slate-900/5 dark:bg-white/5 text-slate-800 dark:text-slate-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Share Note
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                "{note.title || 'Untitled Note'}"
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3 rounded-xl neu-inset bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 rounded-xl neu-inset bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Invite Form */}
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Invite collaborator by username or email
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. sarah, david, alex@notenest.com"
                value={usernameOrEmail}
                onChange={e => setUsernameOrEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl neu-input text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />

              {/* Autocomplete dropdown suggestions */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/10 dark:border-white/10 p-2 shadow-2xl z-20 rounded-2xl max-h-48 overflow-y-auto space-y-1">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setUsernameOrEmail(user.username);
                        setSearchResults([]);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <img
                          src={user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
                          alt={user.name}
                          className="w-6 h-6 rounded-lg bg-slate-300 dark:bg-slate-700"
                        />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {user.name}
                          </p>
                          <p className="text-[11px] text-slate-400">@{user.username} • {user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Permission Selector */}
            <div className="flex rounded-xl neu-inset p-1 bg-[#e5ebf3] dark:bg-[#14161a] shrink-0">
              <button
                type="button"
                onClick={() => setPermission('view')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  permission === 'view'
                    ? 'neu-btn text-slate-900 dark:text-white bg-[#edf2f8] dark:bg-[#1f2229]'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                View Only
              </button>
              <button
                type="button"
                onClick={() => setPermission('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  permission === 'edit'
                    ? 'neu-btn text-slate-900 dark:text-white bg-[#edf2f8] dark:bg-[#1f2229]'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Can Edit
              </button>
            </div>
          </div>

          <NeumorphicButton
            variant="raised"
            size="md"
            onClick={() => handleShare()}
            disabled={loading || !usernameOrEmail.trim()}
            className="w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Granting Access...' : 'Share Note'}</span>
          </NeumorphicButton>
        </div>

        {/* Existing Collaborators List */}
        <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Who has access
            </span>
            <span className="text-xs text-slate-400">
              {note.collaborators.length + 1} {note.collaborators.length === 0 ? 'person' : 'people'}
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {/* Owner Row */}
            <div className="flex items-center justify-between p-3 rounded-2xl neu-inset bg-[#e5ebf3] dark:bg-[#15171b]">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl neu-raised-sm bg-[#edf2f8] dark:bg-[#1e2128] flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-100">
                  {note.ownerUsername.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {note.ownerName || `@${note.ownerUsername}`}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full neu-inset bg-amber-500/10 text-amber-500">
                      Owner
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">@{note.ownerUsername}</span>
                </div>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Full Access
              </span>
            </div>

            {/* Collaborators List */}
            {note.collaborators.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>This note is private. Only you can view and edit it.</span>
              </div>
            ) : (
              note.collaborators.map(c => (
                <div
                  key={c.userId}
                  className="flex items-center justify-between p-3 rounded-2xl neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-xl neu-inset bg-black/5 dark:bg-white/5 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                      {c.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {c.name || c.username}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">@{c.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase neu-inset ${
                        c.permission === 'edit'
                          ? 'text-emerald-500 bg-emerald-500/10'
                          : 'text-slate-400 bg-slate-500/10'
                      }`}
                    >
                      {c.permission === 'edit' ? 'Can Edit' : 'View Only'}
                    </span>
                    <button
                      onClick={() => handleRemoveCollaborator(c.userId, c.username)}
                      title="Revoke access"
                      className="p-1.5 rounded-lg neu-btn text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
