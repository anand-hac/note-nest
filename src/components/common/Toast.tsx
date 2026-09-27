import React from 'react';
import { Bell, CheckCircle2, Clock, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { NeumorphicButton } from './NeumorphicButton';
import confetti from 'canvas-confetti';

export const ToastContainer: React.FC = () => {
  const { alerts, dismissAlert, markCompletedFromAlert, snoozeAlert } = useNotifications();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className="pointer-events-auto neu-card p-4 bg-[#edf2f8] dark:bg-[#191b20] border border-black/10 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 rounded-2xl flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl neu-inset bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">
                  Reminder Due
                </span>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                  {alert.title}
                </h4>
              </div>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
            <NeumorphicButton
              size="sm"
              variant="flat"
              onClick={() => snoozeAlert(alert.reminderId, alert.id, 10)}
              className="text-xs"
            >
              <Clock className="w-3.5 h-3.5" />
              Snooze 10m
            </NeumorphicButton>

            <NeumorphicButton
              size="sm"
              variant="raised"
              onClick={() => {
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
                markCompletedFromAlert(alert.reminderId, alert.id);
              }}
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs border border-emerald-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Complete
            </NeumorphicButton>
          </div>
        </div>
      ))}
    </div>
  );
};
