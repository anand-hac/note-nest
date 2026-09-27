import React from 'react';
import { 
  LayoutDashboard, 
  StickyNote, 
  Clock, 
  Share2, 
  MessageSquare,
  Settings, 
  Plus, 
  CheckCircle2
} from 'lucide-react';
import { AppStats } from '../../types';
import { NeumorphicButton } from '../common/NeumorphicButton';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenNewNote: () => void;
  stats: AppStats | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  onOpenNewNote,
  stats,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'notes',
      label: 'My Notes',
      icon: StickyNote,
      badge: stats ? stats.totalNotes : null,
    },
    {
      id: 'reminders',
      label: 'Reminders',
      icon: Clock,
      badge: stats && stats.activeReminders > 0 ? stats.activeReminders : null,
      badgeColor: 'bg-amber-500/20 text-amber-500',
    },
    {
      id: 'shared',
      label: 'Shared With Me',
      icon: Share2,
      badge: stats && stats.sharedWithMe > 0 ? stats.sharedWithMe : null,
    },
    {
      id: 'chat',
      label: 'Team Chat',
      icon: MessageSquare,
      badge: stats && (stats.unreadMessages ?? 0) > 0 ? stats.unreadMessages : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-500 animate-pulse',
    },
    {
      id: 'settings',
      label: 'Profile & Security',
      icon: Settings,
      badge: null,
    },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 md:top-18 left-0 z-40 h-full md:h-[calc(100vh-4.5rem)] w-68 bg-[#edf2f8] dark:bg-[#141518] p-5 flex flex-col justify-between border-r border-black/5 dark:border-white/5 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Mobile brand header */}
          <div className="flex md:hidden items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <img src="/app-icon.png" alt="Note Nest" className="w-8 h-8 rounded-xl" />
              <span className="font-bold text-slate-900 dark:text-white">Note Nest</span>
            </div>
          </div>

          {/* Quick Create CTA in sidebar */}
          <NeumorphicButton
            variant="raised"
            size="lg"
            onClick={() => {
              onOpenNewNote();
              onCloseMobile();
            }}
            className="w-full bg-[#181a20] text-white dark:bg-white dark:text-slate-900 shadow-md font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Note</span>
          </NeumorphicButton>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Workspace
            </p>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'neu-inset text-slate-900 dark:text-white bg-[#e3e9f2] dark:bg-[#181a1f] font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        item.badgeColor || 'neu-inset text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Neumorphic Summary Card at Bottom */}
        <div className="neu-card p-3.5 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">Quick Pulse</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-xl neu-inset bg-[#e6ecf4] dark:bg-[#14161a]">
              <span className="text-base font-bold text-slate-800 dark:text-slate-100 block">
                {stats?.pinnedNotes ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Pinned</span>
            </div>
            <div className="p-2 rounded-xl neu-inset bg-[#e6ecf4] dark:bg-[#14161a]">
              <span className="text-base font-bold text-amber-500 block">
                {stats?.dueTodayReminders ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Due Today</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
