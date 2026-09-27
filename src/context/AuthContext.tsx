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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
      if (data.user.preferences) {
        sound.enabled = data.user.preferences.soundEnabled ?? true;
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      api.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, pass: string) => {
    const data = await api.login(identifier, pass);
    setUser(data.user);
    if (data.user.preferences) {
      sound.enabled = data.user.preferences.soundEnabled ?? true;
    }
    sound.playClick();
  };

  const register = async (name: string, username: string, email: string, pass: string) => {
    const data = await api.register(name, username, email, pass);
    setUser(data.user);
    if (data.user.preferences) {
      sound.enabled = data.user.preferences.soundEnabled ?? true;
    }
    sound.playChime();
  };

  const loginWithGoogle = async (payload: { email: string; name: string; avatarUrl?: string; googleId?: string }) => {
    const data = await api.loginWithGoogle(payload);
    setUser(data.user);
    if (data.user.preferences) {
      sound.enabled = data.user.preferences.soundEnabled ?? true;
    }
    sound.playChime();
    return { user: data.user, isBrandNew: data.isBrandNew };
  };

  const logout = () => {
    api.logout();
    setUser(null);
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
