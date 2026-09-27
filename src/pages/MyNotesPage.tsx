import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  Pin, 
  StickyNote, 
  X,
  FolderOpen
} from 'lucide-react';
import { Note } from '../types';
import { useAuth } from '../context/AuthContext';
import { NoteCard } from '../components/notes/NoteCard';
import { NeumorphicButton } from '../components/common/NeumorphicButton';
import { sound } from '../utils/sound';

interface MyNotesPageProps {
  notes: Note[];
  onOpenNewNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (note: Note) => void;
  onShareNote: (note: Note) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const MyNotesPage: React.FC<MyNotesPageProps> = ({
  notes,
  onOpenNewNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onShareNote,
  searchQuery,
  onSearchChange,
}) => {
  const { user } = useAuth();
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'pinned' | 'newest' | 'oldest' | 'title'>('pinned');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => {
      n.tags?.forEach(t => set.add(t));
    });
    return Array.from(set);
  }, [notes]);

  // Filter & Sort
  const filteredNotes = useMemo(() => {
    let result = notes.filter(n => !n.isTrash);

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        n =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Tag filter
    if (selectedTag !== 'all') {
      result = result.filter(n => n.tags && n.tags.includes(selectedTag));
    }

    // Color filter
    if (selectedColor !== 'all') {
      result = result.filter(n => {
        const c = n.color || 'yellow';
        return c === selectedColor || (selectedColor === 'yellow' && c === 'default');
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'pinned') {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [notes, searchQuery, selectedTag, sortBy]);

  const pinnedCount = notes.filter(n => n.isPinned).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <StickyNote className="w-6 h-6" />
            My Sticky Notes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {notes.length} total notes • {pinnedCount} pinned to top
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle (Grid / List) */}
          <div className="flex rounded-xl neu-inset p-1 bg-[#e5ebf3] dark:bg-[#14161a]">
            <button
              onClick={() => {
                sound.playClick();
                setViewMode('grid');
              }}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'neu-btn text-slate-900 dark:text-white bg-[#edf2f8] dark:bg-[#1f2229]'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setViewMode('list');
              }}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'neu-btn text-slate-900 dark:text-white bg-[#edf2f8] dark:bg-[#1f2229]'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* New Note CTA */}
          <NeumorphicButton
            variant="raised"
            size="md"
            onClick={onOpenNewNote}
            className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Note</span>
          </NeumorphicButton>
        </div>
      </div>

      {/* Filter and Tag Pills Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 neu-card p-4 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5">
        {/* Categories / Tags filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => {
              sound.playClick();
              setSelectedTag('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedTag === 'all'
                ? 'neu-inset text-slate-900 dark:text-white bg-[#e3e9f2] dark:bg-[#14161a]'
                : 'neu-btn text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Notes ({notes.length})
          </button>

          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => {
                sound.playClick();
                setSelectedTag(tag);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                selectedTag === tag
                  ? 'neu-inset text-slate-900 dark:text-white bg-[#e3e9f2] dark:bg-[#14161a]'
                  : 'neu-btn text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium neu-input text-slate-800 dark:text-slate-200 focus:outline-none bg-transparent"
          >
            <option value="pinned" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pinned First</option>
            <option value="newest" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Newest First</option>
            <option value="oldest" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Oldest First</option>
            <option value="title" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Color Filter Swatches Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none p-2 rounded-2xl neu-inset bg-[#e6ecf4] dark:bg-[#14161a]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1 shrink-0">
          Color:
        </span>
        <button
          onClick={() => {
            sound.playClick();
            setSelectedColor('all');
          }}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer ${
            selectedColor === 'all'
              ? 'neu-btn text-slate-900 dark:text-white bg-[#edf2f8] dark:bg-[#1f2229] font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All Colors
        </button>

        {[
          { id: 'yellow', label: 'Yellow', dot: 'bg-amber-300' },
          { id: 'orange', label: 'Orange', dot: 'bg-orange-400' },
          { id: 'coral', label: 'Coral', dot: 'bg-rose-400' },
          { id: 'pink', label: 'Pink', dot: 'bg-pink-300' },
          { id: 'magenta', label: 'Magenta', dot: 'bg-fuchsia-400' },
          { id: 'purple', label: 'Purple', dot: 'bg-purple-300' },
          { id: 'blue', label: 'Blue', dot: 'bg-sky-300' },
          { id: 'aqua', label: 'Aqua', dot: 'bg-cyan-300' },
          { id: 'green', label: 'Green', dot: 'bg-emerald-300' },
          { id: 'lime', label: 'Lime', dot: 'bg-lime-300' },
          { id: 'sand', label: 'Sand', dot: 'bg-amber-200' },
          { id: 'charcoal', label: 'Charcoal', dot: 'bg-slate-800' },
          { id: 'snow', label: 'White', dot: 'bg-white' },
        ].map(c => (
          <button
            key={c.id}
            onClick={() => {
              sound.playClick();
              setSelectedColor(c.id);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer ${
              selectedColor === c.id
                ? 'neu-btn text-slate-900 dark:text-white bg-[#edf2f8] dark:bg-[#1f2229] font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border border-black/20 ${c.dot}`} />
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Active Search / Filter Banner if filtering */}
      {(searchQuery || selectedTag !== 'all' || selectedColor !== 'all') && (
        <div className="flex items-center justify-between p-3 rounded-2xl neu-inset bg-[#e5ebf3] dark:bg-[#15171b] text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Showing {filteredNotes.length} result(s)
              {searchQuery && <> for "<strong>{searchQuery}</strong>"</>}
              {selectedTag !== 'all' && <> tagged <strong>#{selectedTag}</strong></>}
              {selectedColor !== 'all' && <> in <strong>{selectedColor}</strong> color</>}
            </span>
          </div>

          <button
            onClick={() => {
              onSearchChange('');
              setSelectedTag('all');
              setSelectedColor('all');
            }}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 shrink-0"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        </div>
      )}

      {/* Notes Grid / List */}
      {filteredNotes.length === 0 ? (
        <div className="py-16 neu-card p-8 bg-[#edf2f8] dark:bg-[#191b20] text-center space-y-3">
          <FolderOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No sticky notes found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedTag !== 'all'
              ? 'Try adjusting your search query or tag filter.'
              : 'Create your first sticky note to keep your ideas organized.'}
          </p>
          <NeumorphicButton
            variant="raised"
            size="md"
            onClick={onOpenNewNote}
            className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
          >
            <Plus className="w-4 h-4" /> Create Note
          </NeumorphicButton>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          {filteredNotes.map(note => (
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
