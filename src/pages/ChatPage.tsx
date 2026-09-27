import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  User as UserIcon, 
  Circle, 
  Clock, 
  StickyNote, 
  Search, 
  Paperclip, 
  Smile, 
  ShieldCheck, 
  Sparkles,
  Edit2,
  Check,
  ChevronRight,
  UserPlus,
  X,
  Mail,
  Plus,
  Loader2
} from 'lucide-react';
import { User, ChatMessage, Note, OnlineStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { sound } from '../utils/sound';
import { NeumorphicButton } from '../components/common/NeumorphicButton';
import { formatDistanceToNow, format, parseISO } from 'date-fns';

interface ChatPageProps {
  availableNotes: Note[];
  onOpenNote: (noteId: string) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  availableNotes,
  onOpenNote,
}) => {
  const { user } = useAuth();
  const [team, setTeam] = useState<User[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string>('team');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchMember, setSearchMember] = useState('');

  // Add Member search bar and modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Collaborator');

  // Selected note attachment
  const [selectedNoteToAttach, setSelectedNoteToAttach] = useState<Note | null>(null);
  const [showNotePicker, setShowNotePicker] = useState(false);

  // User presence & profile edit
  const [myStatus, setMyStatus] = useState<OnlineStatus>(user?.status || 'online');
  const [myCustomStatus, setMyCustomStatus] = useState(user?.customStatus || '');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  // Profile sidebar/drawer visibility on mobile/desktop
  const [showProfileCard, setShowProfileCard] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch team members
  const fetchTeam = async () => {
    try {
      const res = await api.getTeamMembers();
      setTeam(res.team);
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async () => {
    try {
      const res = await api.getChatMessages(activeRecipientId);
      setMessages(res.messages);
      if (activeRecipientId !== 'team') {
        await api.markChatRead(activeRecipientId);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages();
      fetchTeam();
    }, 5000); // Polling chat every 5s
    return () => clearInterval(interval);
  }, [activeRecipientId]);

  // User search effect when Add Member modal is open
  useEffect(() => {
    if (!isAddMemberOpen) {
      setMemberSearchQuery('');
      setSearchedUsers([]);
      setInviteFeedback(null);
      return;
    }

    const search = async () => {
      setIsSearchingUsers(true);
      try {
        const res = await api.searchUsers(memberSearchQuery);
        setSearchedUsers(res.users);
      } catch (err) {
        console.error('Failed to search workspace users:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    const timer = setTimeout(search, 150);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, isAddMemberOpen]);

  const handleSelectMemberFromSearch = (selectedUser: User) => {
    sound.playClick();
    setTeam(prev => {
      if (prev.some(u => u.id === selectedUser.id)) return prev;
      return [...prev, selectedUser];
    });
    setActiveRecipientId(selectedUser.id);
    setIsAddMemberOpen(false);
  };

  const handleInviteNewMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const identifier = memberSearchQuery.trim();
    if (!identifier) return;

    setInviting(true);
    setInviteFeedback(null);
    try {
      const res = await api.inviteMember(identifier, inviteName, inviteRole);
      sound.playChime();
      setInviteFeedback({ type: 'success', text: res.message });
      setTeam(prev => {
        if (prev.some(u => u.id === res.user.id)) return prev;
        return [...prev, res.user];
      });
      setActiveRecipientId(res.user.id);
      setTimeout(() => {
        setIsAddMemberOpen(false);
        setInviteName('');
        setInviteRole('Collaborator');
      }, 700);
    } catch (err: any) {
      setInviteFeedback({ type: 'error', text: err.message || 'Failed to add member.' });
    } finally {
      setInviting(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeContact = activeRecipientId === 'team' 
    ? null 
    : team.find(t => t.id === activeRecipientId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedNoteToAttach) return;

    setSending(true);
    try {
      const res = await api.sendChatMessage({
        text: inputText.trim() || `Shared a sticky note: "${selectedNoteToAttach?.title}"`,
        recipientId: activeRecipientId,
        attachedNoteId: selectedNoteToAttach?.id,
        attachedNoteTitle: selectedNoteToAttach?.title,
        attachedNoteColor: selectedNoteToAttach?.color,
      });

      sound.playClick();
      setMessages(prev => [...prev, res.message]);
      setInputText('');
      setSelectedNoteToAttach(null);
      setShowNotePicker(false);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSaveMyStatus = async () => {
    setStatusSaving(true);
    try {
      await api.updatePresence({
        status: myStatus,
        customStatus: myCustomStatus,
      });
      sound.playChime();
      setIsEditingStatus(false);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusSaving(false);
    }
  };

  const getStatusDot = (status?: OnlineStatus) => {
    switch (status) {
      case 'online':
        return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />;
      case 'idle':
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />;
      case 'offline':
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />;
    }
  };

  const filteredTeam = team.filter(m =>
    m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.username.toLowerCase().includes(searchMember.toLowerCase()) ||
    (m.customStatus && m.customStatus.toLowerCase().includes(searchMember.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-5 animate-in fade-in duration-300">
      {/* Left Column: Team & Online Presences */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0">
        {/* Current User Online Profile Card */}
        <div className="neu-card p-4 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={user?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
                  alt={user?.name}
                  className="w-10 h-10 rounded-xl object-cover neu-raised-sm bg-slate-300 dark:bg-slate-700"
                />
                <div className="absolute -bottom-1 -right-1">
                  {getStatusDot(myStatus)}
                </div>
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">@{user?.username}</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingStatus(!isEditingStatus)}
              className="p-1.5 rounded-lg neu-btn text-slate-400 hover:text-slate-800 dark:hover:text-white"
              title="Edit online presence status"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Custom Status Display / Editor */}
          {isEditingStatus ? (
            <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
              <div className="flex gap-1.5">
                {(['online', 'idle', 'offline'] as OnlineStatus[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMyStatus(s)}
                    className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-lg capitalize transition ${
                      myStatus === s
                        ? 'neu-inset text-slate-900 dark:text-white bg-[#e0e7f1] dark:bg-[#14161a]'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="What's your current focus? (e.g. In deep work 🎯)"
                value={myCustomStatus}
                onChange={e => setMyCustomStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingStatus(false)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <NeumorphicButton
                  size="sm"
                  variant="raised"
                  onClick={handleSaveMyStatus}
                  disabled={statusSaving}
                  className="text-xs"
                >
                  <Check className="w-3 h-3" />
                  Save
                </NeumorphicButton>
              </div>
            </div>
          ) : (
            myCustomStatus && (
              <p className="text-xs text-slate-600 dark:text-slate-300 italic px-2 py-1 rounded-lg neu-inset bg-black/5 dark:bg-white/5 truncate">
                "{myCustomStatus}"
              </p>
            )
          )}
        </div>

        {/* Team Members List */}
        <div className="flex-1 neu-card p-4 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Online Team ({team.filter(t => t.status === 'online').length + (myStatus === 'online' ? 1 : 0)})
            </span>
            <button
              onClick={() => {
                sound.playClick();
                setIsAddMemberOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-xl neu-btn text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer"
              title="Search and add new members"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Search team member */}
          <div className="relative my-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter conversations..."
              value={searchMember}
              onChange={e => setSearchMember(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {searchMember && (
              <button
                onClick={() => setSearchMember('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {filteredTeam.length === 0 && searchMember.trim() && (
            <div className="p-3 mb-2 text-center rounded-2xl neu-inset bg-black/5 dark:bg-white/5 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No active chat matching "{searchMember}"
              </p>
              <button
                onClick={() => {
                  sound.playClick();
                  setMemberSearchQuery(searchMember);
                  setIsAddMemberOpen(true);
                }}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Search workspace for "{searchMember}"</span>
              </button>
            </div>
          )}

          {/* Channels / Contacts List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {/* Team Room Button */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveRecipientId('team');
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer text-left ${
                activeRecipientId === 'team'
                  ? 'neu-inset text-slate-900 dark:text-white bg-[#e3e9f2] dark:bg-[#14161a] font-bold'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-lg neu-btn bg-[#edf2f8] dark:bg-[#191b20] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold block truncate"># Team Space</span>
                  <span className="text-[10px] text-slate-400 font-normal">All workspace members</span>
                </div>
              </div>
            </button>

            <div className="pt-2 pb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 pl-2">
                Direct Chats
              </span>
            </div>

            {/* Individual Members */}
            {filteredTeam.map(member => {
              const isActive = activeRecipientId === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    sound.playClick();
                    setActiveRecipientId(member.id);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer text-left ${
                    isActive
                      ? 'neu-inset text-slate-900 dark:text-white bg-[#e3e9f2] dark:bg-[#14161a] font-bold'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={member.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${member.username}`}
                        alt={member.name}
                        className="w-7 h-7 rounded-lg object-cover bg-slate-300 dark:bg-slate-700"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5">
                        {getStatusDot(member.status)}
                      </div>
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate">{member.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {member.customStatus || `@${member.username}`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center Column: Chat Stream & Message Input */}
      <div className="flex-1 neu-card p-5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex flex-col justify-between overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            {activeContact ? (
              <div className="relative">
                <img
                  src={activeContact.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeContact.username}`}
                  alt={activeContact.name}
                  className="w-10 h-10 rounded-xl object-cover bg-slate-300 dark:bg-slate-700 neu-raised-sm"
                />
                <div className="absolute -bottom-1 -right-1">
                  {getStatusDot(activeContact.status)}
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl neu-raised-sm bg-[#edf2f8] dark:bg-[#191b20] flex items-center justify-center text-slate-700 dark:text-slate-300">
                <Users className="w-5 h-5" />
              </div>
            )}

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {activeContact ? activeContact.name : '# Team Space'}
                {activeContact && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize neu-inset text-slate-400">
                    {activeContact.status || 'offline'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                {activeContact ? (activeContact.customStatus || activeContact.role || `@${activeContact.username}`) : 'Collaborative team chat and sticky note discussion'}
              </p>
            </div>
          </div>

          {activeContact && (
            <button
              onClick={() => setShowProfileCard(!showProfileCard)}
              className="p-2 rounded-xl neu-btn text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
          {messages.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <span>No messages yet. Say hello or discuss a sticky note!</span>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                    {!isMine && (
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {msg.senderName}
                      </span>
                    )}
                    <span>
                      {format(parseISO(msg.timestamp), 'h:mm a')}
                    </span>
                  </div>

                  <div
                    className={`max-w-md p-3.5 rounded-2xl ${
                      isMine
                        ? 'neu-raised text-white bg-slate-900 dark:bg-slate-800 rounded-tr-xs'
                        : 'neu-inset text-slate-800 dark:text-slate-100 bg-[#e7edf5] dark:bg-[#15171b] rounded-tl-xs'
                    }`}
                  >
                    <p className="text-xs leading-relaxed whitespace-pre-line">{msg.text}</p>

                    {/* Attached Sticky Note Card Preview */}
                    {msg.attachedNoteId && (
                      <div
                        onClick={() => onOpenNote(msg.attachedNoteId!)}
                        className={`mt-2.5 p-2.5 rounded-xl border border-black/10 cursor-pointer transition hover:scale-[1.02] flex items-center justify-between gap-2.5 ${
                          msg.attachedNoteColor ? `sticky-color-${msg.attachedNoteColor}` : 'bg-amber-300 text-slate-950'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <StickyNote className="w-4 h-4 shrink-0 text-slate-900" />
                          <span className="font-handwritten text-base font-bold text-slate-950 truncate">
                            {msg.attachedNoteTitle || 'Sticky Note'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/15 text-slate-950 uppercase shrink-0">
                          Open Note 📌
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Note Attachment Dropdown */}
        {showNotePicker && (
          <div className="mb-3 p-3 rounded-2xl neu-inset bg-[#e3e9f2] dark:bg-[#14161a] space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Select Sticky Note to Discuss:
              </span>
              <button
                type="button"
                onClick={() => setShowNotePicker(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {availableNotes.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedNoteToAttach(n);
                    setShowNotePicker(false);
                  }}
                  className={`p-2 rounded-xl text-left truncate transition ${
                    selectedNoteToAttach?.id === n.id
                      ? 'ring-2 ring-slate-800 dark:ring-white font-bold'
                      : 'neu-btn bg-[#edf2f8] dark:bg-[#191b20]'
                  }`}
                >
                  <p className="font-handwritten text-sm font-bold truncate text-slate-900 dark:text-white">
                    {n.title || 'Untitled Note'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{n.content || 'Checklist tasks'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Attached Note Pill */}
        {selectedNoteToAttach && (
          <div className="mb-2 flex items-center justify-between p-2 rounded-xl bg-amber-400/20 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-2 truncate">
              <StickyNote className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                Attached: {selectedNoteToAttach.title || 'Sticky Note'}
              </span>
            </div>
            <button
              onClick={() => setSelectedNoteToAttach(null)}
              className="text-slate-400 hover:text-red-500 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
          {/* Note attachment button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowNotePicker(!showNotePicker);
            }}
            title="Attach a Sticky Note"
            className={`p-2.5 rounded-xl transition ${
              showNotePicker || selectedNoteToAttach
                ? 'neu-inset text-amber-500 bg-amber-500/10'
                : 'neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder={
              activeContact
                ? `Message @${activeContact.username}...`
                : 'Message #team space...'
            }
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs rounded-xl neu-input text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />

          <NeumorphicButton
            type="submit"
            variant="raised"
            size="md"
            disabled={sending || (!inputText.trim() && !selectedNoteToAttach)}
            className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </NeumorphicButton>
        </form>
      </div>

      {/* Right Column: Collaborator Profile Drawer (When a direct user is chosen) */}
      {activeContact && showProfileCard && (
        <div className="w-full md:w-72 neu-card p-5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-4 shrink-0 flex flex-col justify-between animate-in fade-in duration-200">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="relative inline-block">
                <img
                  src={activeContact.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeContact.username}`}
                  alt={activeContact.name}
                  className="w-20 h-20 rounded-2xl object-cover neu-raised bg-slate-300 dark:bg-slate-700 mx-auto"
                />
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#edf2f8] dark:bg-[#191b20]">
                  {getStatusDot(activeContact.status)}
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeContact.name}
                </h3>
                <p className="text-xs text-slate-400">@{activeContact.username}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full neu-inset text-emerald-500 bg-emerald-500/10">
                  {activeContact.status === 'online' ? 'Active Now' : activeContact.status === 'idle' ? 'Away' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Custom Status Quote */}
            {activeContact.customStatus && (
              <div className="p-3 rounded-xl neu-inset bg-black/5 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Current Status
                </span>
                <p className="italic">"{activeContact.customStatus}"</p>
              </div>
            )}

            {/* Bio & Role */}
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Role</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{activeContact.role || 'Team Member'}</span>
              </div>

              {activeContact.bio && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Bio</span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{activeContact.bio}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email</span>
                <span className="font-mono text-slate-500">{activeContact.email}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-black/5 dark:border-white/5 text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Verified Collaborator
            </span>
          </div>
        </div>
      )}

      {/* Add New Member Search Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/10 dark:border-white/10 p-6 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl neu-inset bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Add Team Member
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Search by username, full name, or email across Note Nest
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setIsAddMemberOpen(false);
                }}
                className="p-2 rounded-xl neu-btn text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent Search Bar */}
            <div className="pt-4 pb-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type username (e.g. sarah, david), name, or email..."
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl neu-input text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
                {memberSearchQuery ? (
                  <button
                    onClick={() => setMemberSearchQuery('')}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : isSearchingUsers ? (
                  <Loader2 className="w-4 h-4 absolute right-3.5 text-slate-400 animate-spin" />
                ) : null}
              </div>
              <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-slate-400">
                <span>
                  {memberSearchQuery.trim()
                    ? `Results for "${memberSearchQuery}" (${searchedUsers.length})`
                    : `Workspace members available to chat (${searchedUsers.length})`}
                </span>
                {isSearchingUsers && <span>Searching...</span>}
              </div>
            </div>

            {/* Feedback message */}
            {inviteFeedback && (
              <div
                className={`p-3 my-2 rounded-xl text-xs flex items-center gap-2 ${
                  inviteFeedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {inviteFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <X className="w-4 h-4 shrink-0" />
                )}
                <span>{inviteFeedback.text}</span>
              </div>
            )}

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 max-h-72">
              {searchedUsers.length > 0 ? (
                searchedUsers.map(u => {
                  const isInTeam = team.some(t => t.id === u.id);
                  const isCurrent = activeRecipientId === u.id;
                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-2xl neu-inset bg-[#e6ecf4] dark:bg-[#15171b] flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                            alt={u.name}
                            className="w-10 h-10 rounded-xl object-cover neu-raised-sm bg-slate-300 dark:bg-slate-700"
                          />
                          <div className="absolute -bottom-1 -right-1">
                            {getStatusDot(u.status)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {u.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md neu-inset text-slate-500 font-medium">
                              {u.role || 'Member'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                            <span>@{u.username}</span>
                            <span>•</span>
                            <span className="truncate">{u.email}</span>
                          </div>
                          {u.customStatus && (
                            <p className="text-[11px] text-slate-500 italic truncate mt-0.5">
                              "{u.customStatus}"
                            </p>
                          )}
                        </div>
                      </div>

                      <NeumorphicButton
                        size="sm"
                        variant={isCurrent ? 'inset' : 'raised'}
                        onClick={() => handleSelectMemberFromSearch(u)}
                        className={`text-xs shrink-0 cursor-pointer ${
                          isCurrent
                            ? 'neu-inset text-slate-500'
                            : 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-900 font-semibold'
                        }`}
                      >
                        {isCurrent ? (
                          'Active Chat'
                        ) : isInTeam ? (
                          <>
                            <MessageSquare className="w-3 h-3" />
                            <span>Chat</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Add to Chat</span>
                          </>
                        )}
                      </NeumorphicButton>
                    </div>
                  );
                })
              ) : memberSearchQuery.trim() ? (
                /* No matching member found -> offer Instant Invite & Add */
                <div className="p-4 rounded-2xl neu-inset bg-[#e6ecf4] dark:bg-[#15171b] text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-2xl neu-card bg-[#edf2f8] dark:bg-[#191b20] flex items-center justify-center text-slate-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      No member found for "{memberSearchQuery}"
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Would you like to invite and add them to your Note Nest workspace?
                    </p>
                  </div>

                  <form onSubmit={handleInviteNewMember} className="space-y-2 pt-2 text-left">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Display Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Alex Morgan"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Collaborator, Designer, Developer"
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl neu-input text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <NeumorphicButton
                        type="submit"
                        size="md"
                        variant="raised"
                        disabled={inviting}
                        className="w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs justify-center cursor-pointer"
                      >
                        {inviting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                        <span>Invite & Add "@{memberSearchQuery}"</span>
                      </NeumorphicButton>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No other members registered in workspace yet.
                </div>
              )}
            </div>

            {/* Bottom info */}
            <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Shared securely in workspace
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsAddMemberOpen(false);
                }}
                className="hover:underline text-slate-500 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
