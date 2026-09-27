import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Reminder } from '../types';
import { api } from '../utils/api';
import { sound } from '../utils/sound';
import { useAuth } from './AuthContext';

export interface DueAlert {
  id: string;
  reminderId: string;
  title: string;
  dueDateTime: string;
  timestamp: number;
}

interface NotificationContextType {
  alerts: DueAlert[];
  dismissAlert: (id: string) => void;
  markCompletedFromAlert: (reminderId: string, alertId: string) => Promise<void>;
  snoozeAlert: (reminderId: string, alertId: string, minutes?: number) => Promise<void>;
  requestBrowserPermission: () => Promise<void>;
  browserPermission: NotificationPermission | 'unsupported';
  checkRemindersNow: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<DueAlert[]>([]);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission('unsupported');
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setBrowserPermission(res);
        if (res === 'granted') {
          sound.playChime();
        }
      } catch (err) {
        console.error('Permission request failed:', err);
      }
    }
  };

  const checkRemindersNow = useCallback(async () => {
    if (!user) return;
    try {
      const { reminders } = await api.getReminders();
      const now = Date.now();

      reminders.forEach(reminder => {
        if (reminder.isCompleted) return;
        const dueTime = new Date(reminder.dueDateTime).getTime();

        // If it's overdue or due within the last 12 hours and hasn't been notified yet in this session
        if (dueTime <= now && !notifiedIdsRef.current.has(reminder.id)) {
          notifiedIdsRef.current.add(reminder.id);

          const newAlert: DueAlert = {
            id: `alert_${Date.now()}_${reminder.id}`,
            reminderId: reminder.id,
            title: reminder.title,
            dueDateTime: reminder.dueDateTime,
            timestamp: Date.now(),
          };

          setAlerts(prev => [newAlert, ...prev]);

          // Sound alarm
          sound.playAlarm();

          // Native browser notification if allowed
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Note Nest Reminder Due!', {
                body: `${reminder.title} is due now.`,
                icon: '/app-icon.png',
              });
            } catch (err) {
              console.error('Browser notification error:', err);
            }
          }
        }
      });
    } catch (err) {
      console.error('Error checking reminders:', err);
    }
  }, [user]);

  // Periodic poll every 15 seconds
  useEffect(() => {
    if (!user) return;
    checkRemindersNow();
    const interval = setInterval(checkRemindersNow, 15000);
    return () => clearInterval(interval);
  }, [user, checkRemindersNow]);

  const dismissAlert = (id: string) => {
    sound.playClick();
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const markCompletedFromAlert = async (reminderId: string, alertId: string) => {
    sound.playChime();
    dismissAlert(alertId);
    try {
      await api.toggleReminder(reminderId);
    } catch (err) {
      console.error('Failed to complete reminder:', err);
    }
  };

  const snoozeAlert = async (reminderId: string, alertId: string, minutes: number = 10) => {
    sound.playClick();
    dismissAlert(alertId);
    try {
      const newDue = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await api.updateReminder(reminderId, { dueDateTime: newDue });
      notifiedIdsRef.current.delete(reminderId);
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        alerts,
        dismissAlert,
        markCompletedFromAlert,
        snoozeAlert,
        requestBrowserPermission,
        browserPermission,
        checkRemindersNow,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
