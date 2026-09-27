import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Briefcase, 
  Calendar, 
  UserPlus, 
  UserCheck, 
  MessageSquare, 
  Globe, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  ExternalLink,
  Edit3
} from 'lucide-react';
import { User, MediaPost, WorkExperience } from '../../types';
import { api } from '../../utils/api';
import { sound } from '../../utils/sound';
import { NeumorphicButton } from '../common/NeumorphicButton';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.53 1.53 0 1 0 0-3.06 1.53 1.53 0 0 0 0 3.06m1.39 9.74v-8.37H5.07v8.37h2.78z" />
  </svg>
);

interface UserProfileModalProps {
  userId: string | null;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenChatWithUser?: (user: User) => void;
  onOpenEditProfile?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  currentUserId,
  isOpen,
  onClose,
  onOpenChatWithUser,
  onOpenEditProfile,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [media, setMedia] = useState<MediaPost[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'experience' | 'media'>('experience');

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    api.getUserProfile(userId)
      .then(res => {
        setUser(res.user);
        setMedia(res.media);
        setIsConnected(res.isConnected);
        setConnectionsCount(res.connectionsCount);
      })
      .catch(err => console.error('Failed to load profile:', err))
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const isMe = currentUserId === userId;

  const handleToggleConnect = async () => {
    if (!userId || isMe || connecting) return;
    setConnecting(true);
    sound.playClick();
    try {
      const res = await api.toggleConnect(userId);
      setIsConnected(res.isConnected);
      setConnectionsCount(res.connectionsCount);
      if (res.isConnected) sound.playChime();
    } catch (err) {
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  const handleStartChat = () => {
    if (!user || !onOpenChatWithUser) return;
    sound.playClick();
    onOpenChatWithUser(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#edf2f8] dark:bg-[#191b20] rounded-3xl neu-card overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Cover Banner */}
        <div className="relative h-36 sm:h-44 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 overflow-hidden">
          {user?.coverUrl ? (
            <img 
              src={user.coverUrl} 
              alt="Profile Cover" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full opacity-40 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition cursor-pointer backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Loading user profile...</div>
          ) : user ? (
            <>
              {/* Profile Top Row (Avatar & Primary Actions) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
                <div className="relative">
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
                    alt={user.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-[#edf2f8] dark:ring-[#191b20] neu-raised-sm bg-[#edf2f8] dark:bg-[#191b20]"
                  />
                  <span
                    className={`absolute bottom-2 right-2 w-4 h-4 rounded-full ring-2 ring-white dark:ring-black ${
                      user.status === 'online' ? 'bg-emerald-500' : user.status === 'idle' ? 'bg-amber-400' : 'bg-slate-400'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {isMe ? (
                    <NeumorphicButton
                      size="sm"
                      variant="raised"
                      onClick={() => {
                        onClose();
                        if (onOpenEditProfile) onOpenEditProfile();
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-white"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </NeumorphicButton>
                  ) : (
                    <>
                      <NeumorphicButton
                        size="sm"
                        variant={isConnected ? 'inset' : 'raised'}
                        onClick={handleToggleConnect}
                        disabled={connecting}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 font-semibold text-xs transition ${
                          isConnected 
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isConnected ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>Connected</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Connect</span>
                          </>
                        )}
                      </NeumorphicButton>

                      {onOpenChatWithUser && (
                        <NeumorphicButton
                          size="sm"
                          variant="raised"
                          onClick={handleStartChat}
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Message</span>
                        </NeumorphicButton>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Identity & Bio */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {user.name}
                  </h2>
                  <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                    @{user.username}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full neu-inset text-indigo-600 dark:text-indigo-400 font-medium">
                    {user.role || 'Member'}
                  </span>
                </div>

                {user.bio && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {user.bio}
                  </p>
                )}

                {/* Metadata & Social Row */}
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
                  {user.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{user.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <span>{connectionsCount}</span>
                    <span className="text-slate-400 font-normal">connections</span>
                  </div>

                  {user.githubUrl && (
                    <a
                      href={user.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-500 transition flex items-center gap-1"
                    >
                      <GithubIcon className="w-3.5 h-3.5" />
                      <span>GitHub</span>
                    </a>
                  )}

                  {user.linkedinUrl && (
                    <a
                      href={user.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-500 transition flex items-center gap-1"
                    >
                      <LinkedinIcon className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                    </a>
                  )}

                  {user.websiteUrl && (
                    <a
                      href={user.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-500 transition flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Website</span>
                    </a>
                  )}
                </div>

                {/* Skills tags */}
                {user.skills && user.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {user.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-1 rounded-xl neu-inset bg-[#e5ebf3] dark:bg-[#16181d] text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs: Work History vs Shared Media */}
              <div className="border-t border-black/5 dark:border-white/5 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab('experience')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'experience'
                        ? 'neu-inset text-indigo-600 dark:text-indigo-400 bg-[#e4eaf2] dark:bg-[#17191d]'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Work History & Experience</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('media')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'media'
                        ? 'neu-inset text-indigo-600 dark:text-indigo-400 bg-[#e4eaf2] dark:bg-[#17191d]'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Public Media ({media.length})</span>
                  </button>
                </div>

                {/* Tab Content: Work History Timeline */}
                {activeTab === 'experience' && (
                  <div className="space-y-4">
                    {user.workHistory && user.workHistory.length > 0 ? (
                      user.workHistory.map((item: WorkExperience) => (
                        <div
                          key={item.id}
                          className="neu-card p-4 rounded-2xl bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-2 relative"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {item.title}
                              </h4>
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                {item.company}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {item.startDate} - {item.current ? 'Present' : item.endDate || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {item.location && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </p>
                          )}

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                            {item.description}
                          </p>

                          {item.skills && item.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.skills.map((sk, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[10px] px-2 py-0.5 rounded-lg neu-inset bg-[#e5ebf3] dark:bg-[#15171b] text-slate-600 dark:text-slate-400"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-400 neu-inset rounded-2xl p-6">
                        No work history added yet.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content: Shared Media Gallery */}
                {activeTab === 'media' && (
                  <div>
                    {media.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {media.map(post => (
                          <div
                            key={post.id}
                            className="neu-card rounded-2xl overflow-hidden bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 group"
                          >
                            <div className="relative aspect-video bg-black/10 overflow-hidden">
                              {post.type === 'video' ? (
                                <video
                                  src={post.mediaUrl}
                                  poster={post.thumbnailUrl}
                                  controls
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src={post.mediaUrl}
                                  alt={post.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              )}
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-bold text-white uppercase backdrop-blur-xs flex items-center gap-1">
                                {post.type === 'video' ? <VideoIcon className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                {post.type}
                              </span>
                            </div>
                            <div className="p-3">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {post.title}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {post.caption}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-400 neu-inset rounded-2xl p-6">
                        This user hasn't posted any media yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-400">User not found</div>
          )}
        </div>
      </div>
    </div>
  );
};
