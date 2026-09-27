import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  StickyNote, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  User as UserIcon, 
  Briefcase, 
  MapPin, 
  ArrowRight,
  ExternalLink,
  Tag,
  Calendar,
  Sparkles
} from 'lucide-react';
import { UniversalSearchResults, Note, MediaPost, User, WorkExperience } from '../../types';
import { api } from '../../utils/api';
import { sound } from '../../utils/sound';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectNote: (note: Note) => void;
  onSelectUser: (userId: string) => void;
  onSelectMedia: (media: MediaPost) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectNote,
  onSelectUser,
  onSelectMedia,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'media' | 'users' | 'work' | 'notes'>('all');
  const [results, setResults] = useState<UniversalSearchResults>({
    notes: [],
    media: [],
    users: [],
    workExperiences: [],
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ notes: [], media: [], users: [], workExperiences: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.universalSearch(query.trim());
        setResults(res);
      } catch (err) {
        console.error('Universal search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalCount =
    results.notes.length +
    results.media.length +
    results.users.length +
    results.workExperiences.length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-[#edf2f8] dark:bg-[#191b20] rounded-3xl neu-card overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes, photos, videos, people, and work history..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-bold rounded-lg neu-btn text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            ESC
          </button>
        </div>

        {/* Tab Filters */}
        <div className="px-5 py-2.5 bg-[#e8eef6] dark:bg-[#15171b] border-b border-black/5 dark:border-white/5 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'media', label: `Photos & Videos (${results.media.length})` },
            { id: 'users', label: `Profiles (${results.users.length})` },
            { id: 'work', label: `Work History (${results.workExperiences.length})` },
            { id: 'notes', label: `Sticky Notes (${results.notes.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setActiveTab(tab.id as any);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                activeTab === tab.id
                  ? 'neu-inset text-indigo-600 dark:text-indigo-400 bg-[#dfe5ee] dark:bg-[#181a1f]'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="py-12 text-center text-xs text-slate-400">
              Searching across workspace & community...
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="py-16 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Universal Knowledge Search
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Type any keyword to search notes, video walkthroughs, design photos, creator profiles, or company work history (e.g. "Figma", "Stripe", "CRDTs", "Design").
              </p>
            </div>
          )}

          {!loading && query.trim() && totalCount === 0 && (
            <div className="py-16 text-center text-xs text-slate-400">
              No results found for <span className="font-bold text-slate-700 dark:text-slate-200">"{query}"</span>.
            </div>
          )}

          {/* Section: Photos & Videos */}
          {(activeTab === 'all' || activeTab === 'media') && results.media.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                <span>Photos & Video Demos</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.media.map(media => (
                  <div
                    key={media.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectMedia(media);
                      onClose();
                    }}
                    className="neu-card p-3 rounded-2xl bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex gap-3 cursor-pointer group hover:scale-[1.01] transition"
                  >
                    <div className="w-20 h-16 rounded-xl overflow-hidden bg-black/10 shrink-0 relative">
                      {media.type === 'video' ? (
                        <video src={media.mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={media.mediaUrl} alt={media.title} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[9px] font-bold text-white uppercase">
                        {media.type}
                      </span>
                    </div>
                    <div className="space-y-0.5 overflow-hidden flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-500 transition">
                        {media.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        By {media.userName} • @{media.userUsername}
                      </p>
                      {media.caption && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {media.caption}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: User Profiles */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Profiles & Creators</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.users.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectUser(u.id);
                      onClose();
                    }}
                    className="neu-card p-3 rounded-2xl bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 cursor-pointer group hover:scale-[1.01] transition"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img
                        src={u.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                        alt={u.name}
                        className="w-10 h-10 rounded-2xl object-cover neu-raised-sm shrink-0"
                      />
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-500 transition">
                          {u.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          @{u.username} {u.role ? `• ${u.role}` : ''}
                        </p>
                        {u.location && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {u.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Work History */}
          {(activeTab === 'all' || activeTab === 'work') && results.workExperiences.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                <span>Work History & Career Experience</span>
              </div>
              <div className="space-y-2">
                {results.workExperiences.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      sound.playClick();
                      onSelectUser(item.user.id);
                      onClose();
                    }}
                    className="neu-card p-3.5 rounded-2xl bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex items-start justify-between gap-4 cursor-pointer group hover:scale-[1.01] transition"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition">
                          {item.experience.title}
                        </span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          @{item.experience.company}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({item.experience.startDate} - {item.experience.current ? 'Present' : item.experience.endDate})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {item.experience.description}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                        <span>Profile: {item.user.name} (@{item.user.username})</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Sticky Notes & Content */}
          {(activeTab === 'all' || activeTab === 'notes') && results.notes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span>Sticky Notes & Content</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.notes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectNote(note);
                      onClose();
                    }}
                    className="neu-card p-3 rounded-2xl bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-1.5 cursor-pointer group hover:scale-[1.01] transition"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-500 transition">
                        {note.title || 'Untitled Note'}
                      </h4>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 font-handwritten">
                      {note.content}
                    </p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {note.tags.map((t, tidx) => (
                          <span
                            key={tidx}
                            className="text-[9px] px-1.5 py-0.5 rounded-md neu-inset text-slate-500"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
