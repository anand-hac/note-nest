import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { api, getAuthToken } from '../utils/api';
import { sound } from '../utils/sound';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (name: string, username: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: (payload: { email: string; name: string; avatarUrl?: string; googleId?: string }) => Promise<{ user: User; isBrandNew?: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserPreferences: (prefs: Partial<User['preferences']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('notenest_cached_user');
      const token = getAuthToken();
      if (token && cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => !user && !!getAuthToken());

  const saveUserSession = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      try {
        localStorage.setItem('notenest_cached_user', JSON.stringify(newUser));
      } catch (e) {}
    } else {
      localStorage.removeItem('notenest_cached_user');
    }
  };

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      saveUserSession(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data && data.user) {
        saveUserSession(data.user);
        if (data.user.preferences) {
          sound.enabled = data.user.preferences.soundEnabled ?? true;
        }
      }
    } catch (err: any) {
      console.warn('Background profile refresh notice:', err.message);
      // Only sign off if the server explicitly confirmed the token was expired or invalid
      if (err.message && (err.message.includes('Invalid or expired') || err.message.includes('401'))) {
        api.logout();
        saveUserSession(null);
      }
      // If network glitch or temporary backend restart, keep user logged in with cached session!
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => {
      saveUserSession(null);
    };
    window.addEventListener('notenest_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('notenest_unauthorized', handleUnauthorized);
  }, []);

  const login = async (identifier: string, pass: string) => {
    const data = await api.login(identifier, pass);
    saveUserSession(data.user);
    if (data.user.preferences) {
      sound.enabled = data.user.preferences.soundEnabled ?? true;
    }
    sound.playClick();
  };

  const register = async (name: string, username: string, email: string, pass: string) => {
    const data = await api.register(name, username, email, pass);
    saveUserSession(data.user);
    if (data.user.preferences) {
      sound.enabled = data.user.preferences.soundEnabled ?? true;
    }
    sound.playChime();
  };

  const loginWithGoogle = async (payload: { email: string; name: string; avatarUrl?: string; googleId?: string }) => {
    const data = await api.loginWithGoogle(payload);
    saveUserSession(data.user);
    if (data.user.preferences) {
      sound.enabled = data.user.preferences.soundEnabled ?? true;
    }
    sound.playChime();
    return { user: data.user, isBrandNew: data.isBrandNew };
  };

  const logout = () => {
    api.logout();
    saveUserSession(null);
    sound.playClick();
  };

  const updateUserPreferences = async (prefs: Partial<User['preferences']>) => {
    if (!user) return;
    try {
      const updated = await api.updateProfile({
        preferences: {
          ...user.preferences,
          ...prefs,
        },
      });
      setUser(updated.user);
      if (updated.user.preferences?.soundEnabled !== undefined) {
        sound.enabled = updated.user.preferences.soundEnabled;
      }
    } catch (err) {
      console.error('Failed to update preferences:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        updateUserPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
