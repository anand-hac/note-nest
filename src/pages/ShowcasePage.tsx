import React, { useState, useEffect, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Plus, 
  Heart, 
  MessageSquare, 
  Trash2, 
  Share2, 
  UserPlus, 
  UserCheck, 
  Upload, 
  X, 
  Play, 
  Search, 
  Filter, 
  Maximize2,
  ExternalLink,
  Send,
  Sparkles
} from 'lucide-react';
import { MediaPost, User } from '../types';
import { api } from '../utils/api';
import { sound } from '../utils/sound';
import { firebaseService } from '../services/firebaseService';
import { NeumorphicButton } from '../components/common/NeumorphicButton';
import { UserProfileModal } from '../components/profile/UserProfileModal';

interface ShowcasePageProps {
  currentUser: User;
  onOpenChatWithUser?: (user: User) => void;
}

export const ShowcasePage: React.FC<ShowcasePageProps> = ({
  currentUser,
  onOpenChatWithUser,
}) => {
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video' | 'mine' | 'connections'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadMediaUrl, setUploadMediaUrl] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<'public' | 'connections'>('public');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savingPost, setSavingPost] = useState(false);

  // Active User Profile Modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Lightbox Image Zoom
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Active Comment Drawer
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Connection status map for instant optimistic UI
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    (currentUser.connections || []).forEach(id => {
      map[id] = true;
    });
    return map;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await api.getMediaPosts({
        search: searchQuery || undefined,
        type: (filterType === 'photo' || filterType === 'video') ? filterType : undefined,
        userId: filterType === 'mine' ? currentUser.id : undefined,
        onlyConnections: filterType === 'connections' ? true : undefined,
      });
      setPosts(res.posts);
    } catch (err) {
      console.error('Failed to load media posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [filterType, searchQuery]);

  // Real-time Firebase Firestore Sync for Media Feed if available
  useEffect(() => {
    if (firebaseService.isAvailable()) {
      const unsub = firebaseService.subscribeMediaPosts((firebasePosts) => {
        if (firebasePosts && firebasePosts.length > 0) {
          setPosts(prev => {
            // merge or prefer latest
            const existingIds = new Set(prev.map(p => p.id));
            const newOnes = firebasePosts.filter(fp => !existingIds.has(fp.id));
            return [...newOnes, ...prev];
          });
        }
      });
      return () => {
        if (unsub) unsub();
      };
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    sound.playClick();
    try {
      const url = await firebaseService.uploadMediaFile(file, mediaType === 'video' ? 'videos' : 'photos');
      setUploadMediaUrl(url);
      sound.playChime();
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadMediaUrl.trim()) return;

    setSavingPost(true);
    sound.playClick();
    try {
      const tags = uploadTags
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await api.createMediaPost({
        title: uploadTitle.trim(),
        caption: uploadCaption.trim(),
        type: mediaType,
        mediaUrl: uploadMediaUrl.trim(),
        tags,
        visibility: uploadVisibility,
      });

      // Also mirror to Firebase Firestore
      if (firebaseService.isAvailable()) {
        await firebaseService.syncMediaPost(res.post);
      }

      setPosts(prev => [res.post, ...prev]);
      sound.playChime();
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadCaption('');
      setUploadMediaUrl('');
      setUploadTags('');
    } catch (err) {
      console.error('Failed to create media post:', err);
    } finally {
      setSavingPost(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    sound.playClick();
    try {
      const res = await api.likeMediaPost(postId);
      setPosts(prev => prev.map(p => (p.id === postId ? res.post : p)));
      if (firebaseService.isAvailable()) {
        await firebaseService.likeMediaPost(postId, currentUser.id, res.isLiked);
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    sound.playClick();
    try {
      const res = await api.commentMediaPost(postId, commentText.trim());
      setPosts(prev => prev.map(p => (p.id === postId ? res.post : p)));
      setCommentText('');
      sound.playChime();
    } catch (err) {
      console.error('Failed to comment on post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this media post?')) return;
    sound.playClick();
    try {
      await api.deleteMediaPost(postId);
      if (firebaseService.isAvailable()) {
        await firebaseService.deleteMediaPost(postId);
      }
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Failed to delete media post:', err);
    }
  };

  const handleConnectUser = async (userId: string) => {
    sound.playClick();
    try {
      const res = await api.toggleConnect(userId);
      setConnectedMap(prev => ({
        ...prev,
        [userId]: res.isConnected,
      }));
      if (res.isConnected) sound.playChime();
    } catch (err) {
      console.error('Connect toggle error:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl neu-inset bg-[#e5ebf3] dark:bg-[#181a1f] text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Community Showcase & Media
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Share design prototypes, video walkthroughs, system blueprints, and photos publicly. Connect and collaborate with creators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NeumorphicButton
            variant="raised"
            size="md"
            onClick={() => {
              sound.playClick();
              setIsUploadOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Share New Media</span>
          </NeumorphicButton>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 neu-card p-3 rounded-2xl bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Media' },
            { id: 'photo', label: 'Photos' },
            { id: 'video', label: 'Videos' },
            { id: 'mine', label: 'My Uploads' },
            { id: 'connections', label: 'From Connections' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setFilterType(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === tab.id
                  ? 'neu-inset text-indigo-600 dark:text-indigo-400 bg-[#e4eaf2] dark:bg-[#15171b]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search within media */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter media or tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Media Posts Grid */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 font-medium">
          Loading community media...
        </div>
      ) : posts.length === 0 ? (
        <div className="neu-inset p-12 rounded-3xl text-center space-y-3 bg-[#e4eaf2] dark:bg-[#16181d]">
          <div className="w-12 h-12 rounded-2xl mx-auto neu-raised-sm flex items-center justify-center text-slate-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-700 dark:text-slate-200">
            No media found in this filter
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Be the first to upload a video demo, project walkthrough, or design photo to the showcase!
          </p>
          <NeumorphicButton
            size="sm"
            variant="raised"
            onClick={() => setIsUploadOpen(true)}
            className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400"
          >
            Upload Media Now
          </NeumorphicButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => {
            const isLiked = post.likes.includes(currentUser.id);
            const isAuthor = post.userId === currentUser.id;
            const isConnected = connectedMap[post.userId] || false;

            return (
              <div
                key={post.id}
                className="neu-card rounded-3xl overflow-hidden bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex flex-col justify-between transition hover:-translate-y-1 duration-200"
              >
                {/* Creator Header */}
                <div className="p-4 flex items-center justify-between border-b border-black/5 dark:border-white/5">
                  <div 
                    onClick={() => setSelectedUserId(post.userId)}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <img
                      src={post.userAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.userUsername}`}
                      alt={post.userName}
                      className="w-9 h-9 rounded-2xl object-cover neu-raised-sm group-hover:scale-105 transition"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition leading-tight">
                        {post.userName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        @{post.userUsername} {post.userRole ? `• ${post.userRole}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Connect / Connected Button on Card */}
                  {!isAuthor && (
                    <button
                      onClick={() => handleConnectUser(post.userId)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                        isConnected
                          ? 'neu-inset text-emerald-600 dark:text-emerald-400 bg-[#e4eaf2] dark:bg-[#16181d]'
                          : 'neu-btn text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                      }`}
                    >
                      {isConnected ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Connected</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  )}

                  {isAuthor && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer transition"
                      title="Delete post"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Media Container (Video or Photo) */}
                <div className="relative aspect-video bg-black/10 overflow-hidden">
                  {post.type === 'video' ? (
                    <video
                      src={post.mediaUrl}
                      poster={post.thumbnailUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      onClick={() => setZoomedImage(post.mediaUrl)}
                      className="w-full h-full cursor-zoom-in relative group"
                    >
                      <img
                        src={post.mediaUrl}
                        alt={post.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="p-2 rounded-full bg-black/50 text-white backdrop-blur-xs">
                          <Maximize2 className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Media Type Badge */}
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/60 text-white text-[10px] font-bold uppercase backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
                    {post.type === 'video' ? <VideoIcon className="w-3 h-3 text-red-400" /> : <ImageIcon className="w-3 h-3 text-sky-400" />}
                    <span>{post.type}</span>
                  </span>
                </div>

                {/* Post Info & Captions */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {post.title}
                    </h3>
                    {post.caption && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {post.caption}
                      </p>
                    )}

                    {/* Tag Badges */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {post.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            onClick={() => setSearchQuery(tag)}
                            className="text-[10px] px-2 py-0.5 rounded-lg neu-inset bg-[#e5ebf3] dark:bg-[#15171b] text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:opacity-80"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions & Comment Drawer Toggle */}
                  <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Like button */}
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1 text-xs font-bold transition cursor-pointer ${
                          isLiked ? 'text-red-500 scale-105' : 'text-slate-500 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        <span>{post.likes.length}</span>
                      </button>

                      {/* Comment toggle */}
                      <button
                        onClick={() => {
                          sound.playClick();
                          setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.comments.length}</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Expandable Comments Section */}
                  {activeCommentPostId === post.id && (
                    <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2 animate-fade-in">
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                        {post.comments.length > 0 ? (
                          post.comments.map(c => (
                            <div key={c.id} className="text-xs p-2 rounded-xl neu-inset bg-[#e6ecf4] dark:bg-[#15171b] space-y-0.5">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {c.userName}
                              </span>
                              <p className="text-slate-600 dark:text-slate-300">
                                {c.text}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-slate-400 text-center py-2">
                            No comments yet. Write the first one!
                          </p>
                        )}
                      </div>

                      {/* Comment Input */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Media Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg bg-[#edf2f8] dark:bg-[#191b20] rounded-3xl neu-card overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl neu-inset text-indigo-600 dark:text-indigo-400">
                  <Upload className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Share Media to Showcase
                </h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePost} className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Media Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Media Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMediaType('photo');
                      setUploadMediaUrl('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      mediaType === 'photo'
                        ? 'neu-inset text-indigo-600 dark:text-indigo-400 bg-[#e4eaf2] dark:bg-[#16181d]'
                        : 'neu-btn text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Photo / Screenshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMediaType('video');
                      setUploadMediaUrl('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      mediaType === 'video'
                        ? 'neu-inset text-indigo-600 dark:text-indigo-400 bg-[#e4eaf2] dark:bg-[#16181d]'
                        : 'neu-btn text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <VideoIcon className="w-4 h-4" />
                    <span>Video Walkthrough</span>
                  </button>
                </div>
              </div>

              {/* Upload File / Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Choose File or Paste Link
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaType === 'video' ? 'video/mp4,video/webm' : 'image/*'}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl neu-inset bg-[#e5ebf3] dark:bg-[#15171b] border border-dashed border-slate-300 dark:border-slate-700 text-center cursor-pointer hover:border-indigo-500 transition space-y-1"
                >
                  <Upload className="w-6 h-6 mx-auto text-indigo-500" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {uploadingFile ? 'Uploading file...' : `Click to browse ${mediaType}`}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Supports PNG, JPG, GIF, WebP, MP4, WebM (auto-synced to cloud storage)
                  </p>
                </div>

                <div className="pt-1">
                  <input
                    type="text"
                    placeholder={`Or paste direct ${mediaType} URL (https://...)`}
                    value={uploadMediaUrl}
                    onChange={e => setUploadMediaUrl(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Preview if URL available */}
              {uploadMediaUrl && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400">Preview:</span>
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/10">
                    {mediaType === 'video' ? (
                      <video src={uploadMediaUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={uploadMediaUrl} alt="Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              )}

              {/* Title & Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design token exploration, Video demo of realtime sync"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Caption / Explanation
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide context, design goals, or ask for feedback..."
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl neu-input text-slate-800 dark:text-white resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="design, ui, video, architecture, frontend"
                  value={uploadTags}
                  onChange={e => setUploadTags(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <NeumorphicButton
                  type="submit"
                  variant="raised"
                  size="md"
                  disabled={savingPost || !uploadTitle.trim() || !uploadMediaUrl.trim()}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs px-5"
                >
                  {savingPost ? 'Publishing...' : 'Publish to Showcase'}
                </NeumorphicButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal for Photos */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={zoomedImage}
              alt="Zoomed Photo"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive User Profile Modal */}
      <UserProfileModal
        userId={selectedUserId}
        currentUserId={currentUser.id}
        isOpen={Boolean(selectedUserId)}
        onClose={() => setSelectedUserId(null)}
        onOpenChatWithUser={onOpenChatWithUser}
      />
    </div>
  );
};
