import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Sun, 
  Moon, 
  Bell, 
  MessageSquare, 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Volume2, 
  VolumeX, 
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { NeumorphicButton } from '../common/NeumorphicButton';
import { sound } from '../../utils/sound';

interface NavbarProps {
  onOpenNewNote: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
  onOpenGlobalSearch?: () => void;
  onOpenMyProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewNote,
  searchQuery,
  onSearchChange,
  onNavigate,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onOpenGlobalSearch,
  onOpenMyProfile,
}) => {
  const { user, logout, updateUserPreferences } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { alerts, dismissAlert, requestBrowserPermission, browserPermission } = useNotifications();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotificationsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global hotkey: Ctrl+K or Cmd+K opens universal search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenGlobalSearch?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenGlobalSearch]);

  const toggleSound = async () => {
    if (!user) return;
    const current = user.preferences?.soundEnabled ?? true;
    await updateUserPreferences({ soundEnabled: !current });
    sound.enabled = !current;
    if (!current) sound.playClick();
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#edf2f8]/85 dark:bg-[#141518]/85 border-b border-black/5 dark:border-white/5 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl neu-btn text-slate-600 dark:text-slate-300"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl overflow-hidden neu-raised-sm p-0.5 bg-[#edf2f8] dark:bg-[#191b20] transition group-hover:scale-105">
              <img
                src="/app-icon.png"
                alt="Note Nest"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Note Nest
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md neu-inset text-slate-500 dark:text-slate-400">
                  Pro
                </span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Neumorphic Workspace
              </p>
            </div>
          </button>
        </div>

        {/* Center: Universal Knowledge Search Bar */}
        <div className="flex-1 max-w-lg mx-2 sm:mx-6">
          <div 
            onClick={() => {
              sound.playClick();
              onOpenGlobalSearch?.();
            }}
            className="relative flex items-center cursor-pointer group"
          >
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 group-hover:text-indigo-500 transition pointer-events-none" />
            <input
              type="text"
              readOnly
              placeholder="Search content, photos, videos, people, work history..."
              value={searchQuery}
              className="w-full pl-10 pr-14 py-2 text-xs sm:text-sm rounded-xl neu-input text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none cursor-pointer group-hover:border-indigo-500/40 transition"
            />
            <div className="absolute right-2.5 hidden sm:flex items-center gap-1 pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-bold rounded-md neu-inset text-slate-400 dark:text-slate-500">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Actions, Theme, Notifications & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Create Button */}
          <NeumorphicButton
            size="md"
            variant="raised"
            onClick={onOpenNewNote}
            className="hidden sm:inline-flex bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </NeumorphicButton>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={user?.preferences?.soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
            className="p-2.5 rounded-xl neu-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            {user?.preferences?.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-2.5 rounded-xl neu-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Team Chat Quick Shortcut */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('chat');
            }}
            title="Team Chat & Online Profiles"
            className="p-2.5 rounded-xl neu-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                sound.playClick();
                setShowNotificationsMenu(!showNotificationsMenu);
              }}
              title="Notifications"
              className="p-2.5 rounded-xl neu-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white relative"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            {/* Notifications Menu */}
            {showNotificationsMenu && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/10 dark:border-white/10 p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                    Due & Upcoming Alerts
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full neu-inset text-amber-500 font-bold">
                    {alerts.length}
                  </span>
                </div>

                {browserPermission !== 'granted' && (
                  <div className="mt-3 p-2.5 rounded-xl neu-inset bg-[#e5ebf3] dark:bg-[#16181d] text-center space-y-1.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Enable desktop alerts for background sound & banner notices
                    </p>
                    <button
                      onClick={requestBrowserPermission}
                      className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700"
                    >
                      Enable Desktop Alerts
                    </button>
                  </div>
                )}

                <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No pending reminder alarms.
                    </p>
                  ) : (
                    alerts.map(a => (
                      <div
                        key={a.id}
                        className="p-2.5 rounded-xl neu-inset bg-[#e6ecf4] dark:bg-[#15171b] flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {a.title}
                          </p>
                          <p className="text-[10px] text-amber-500 font-semibold">
                            {new Date(a.dueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => dismissAlert(a.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                sound.playClick();
                setShowProfileMenu(!showProfileMenu);
              }}
              className="flex items-center gap-2 p-1.5 rounded-2xl neu-btn text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
                alt={user?.name || 'User'}
                className="w-7 h-7 rounded-xl object-cover bg-slate-300 dark:bg-slate-700"
              />
              <span className="text-xs font-semibold hidden md:inline-block pr-1 max-w-[100px] truncate">
                {user?.name || user?.username}
              </span>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-56 rounded-2xl neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/10 dark:border-white/10 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-black/5 dark:border-white/5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">@{user?.username}</p>
                </div>

                <div className="py-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenMyProfile?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>View Public Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Settings & Cloud Sync</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-black/5 dark:border-white/5">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
