import React, { useState } from 'react';
import { 
  Settings, 
  User as UserIcon, 
  Shield, 
  Key, 
  Download, 
  Trash2, 
  Sun, 
  Moon, 
  Volume2, 
  Bell, 
  Check, 
  AlertTriangle,
  Lock,
  Flame,
  Cloud,
  Database,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { NeumorphicButton } from '../components/common/NeumorphicButton';
import { api } from '../utils/api';
import { sound } from '../utils/sound';
import { 
  getActiveFirebaseConfig, 
  saveCustomFirebaseConfig, 
  clearCustomFirebaseConfig, 
  isFirebaseConfigured 
} from '../config/firebase';
import { firebaseService } from '../services/firebaseService';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, updateUserPreferences, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { browserPermission, requestBrowserPermission } = useNotifications();

  // Profile edit
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Export
  const [exporting, setExporting] = useState(false);

  // Firebase Configuration State
  const initialFb = getActiveFirebaseConfig();
  const [fbApiKey, setFbApiKey] = useState(initialFb.apiKey || '');
  const [fbAuthDomain, setFbAuthDomain] = useState(initialFb.authDomain || '');
  const [fbProjectId, setFbProjectId] = useState(initialFb.projectId || '');
  const [fbStorageBucket, setFbStorageBucket] = useState(initialFb.storageBucket || '');
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState(initialFb.messagingSenderId || '');
  const [fbAppId, setFbAppId] = useState(initialFb.appId || '');
  const [fbTesting, setFbTesting] = useState(false);
  const [fbFeedback, setFbFeedback] = useState<{ isSuccess: boolean; text: string } | null>(null);
  const [isFbConfiguredState, setIsFbConfiguredState] = useState(isFirebaseConfigured());

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setFbFeedback(null);
    const success = saveCustomFirebaseConfig({
      apiKey: fbApiKey.trim(),
      authDomain: fbAuthDomain.trim(),
      projectId: fbProjectId.trim(),
      storageBucket: fbStorageBucket.trim(),
      messagingSenderId: fbMessagingSenderId.trim(),
      appId: fbAppId.trim(),
    });
    if (success) {
      sound.playChime();
      const isNowConfigured = Boolean(fbApiKey.trim() && fbProjectId.trim());
      setIsFbConfiguredState(isNowConfigured);
      setFbFeedback({
        isSuccess: true,
        text: isNowConfigured 
          ? 'Firebase Cloud configuration saved successfully!' 
          : 'Firebase configuration updated.',
      });
    } else {
      setFbFeedback({ isSuccess: false, text: 'Failed to save Firebase config.' });
    }
  };

  const handleTestFirebaseConnection = async () => {
    setFbTesting(true);
    setFbFeedback(null);
    sound.playClick();
    try {
      // Ensure current values are saved first
      saveCustomFirebaseConfig({
        apiKey: fbApiKey.trim(),
        authDomain: fbAuthDomain.trim(),
        projectId: fbProjectId.trim(),
        storageBucket: fbStorageBucket.trim(),
        messagingSenderId: fbMessagingSenderId.trim(),
        appId: fbAppId.trim(),
      });
      const result = await firebaseService.testConnection();
      if (result.success) sound.playChime();
      setFbFeedback({ isSuccess: result.success, text: result.message });
      setIsFbConfiguredState(result.success);
    } catch (err: any) {
      setFbFeedback({ isSuccess: false, text: err.message || 'Firebase connection test failed.' });
    } finally {
      setFbTesting(false);
    }
  };

  const handleClearFirebaseConfig = () => {
    sound.playClick();
    clearCustomFirebaseConfig();
    setFbApiKey('');
    setFbAuthDomain('');
    setFbProjectId('');
    setFbStorageBucket('');
    setFbMessagingSenderId('');
    setFbAppId('');
    setIsFbConfiguredState(false);
    setFbFeedback({ isSuccess: true, text: 'Firebase configuration cleared. Note Nest is in offline-first local mode.' });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await api.updateProfile({ name, avatarUrl });
      await refreshUser();
      sound.playChime();
      setProfileMsg('Profile successfully updated!');
    } catch (err: any) {
      setProfileMsg(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'Password must be at least 6 characters.', isError: true });
      return;
    }

    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      sound.playChime();
      setPasswordMsg({ text: res.message, isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to change password.', isError: true });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      await api.exportBackup();
      sound.playChime();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      setDeleteError('Please type your password to confirm deletion.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(deleteConfirmPassword);
      sound.playClick();
      logout();
    } catch (err: any) {
      setDeleteError(err.message || 'Account deletion failed.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6" />
          Profile & Security Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your account profile, preferences, credentials, and data privacy
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="neu-card p-6 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-6">
        <div className="flex items-center gap-4">
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
            alt={user?.name}
            className="w-16 h-16 rounded-2xl object-cover neu-raised bg-slate-300 dark:bg-slate-700"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {user?.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              @{user?.username} • <span className="font-mono">{user?.email}</span>
            </p>
            <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full neu-inset text-emerald-500 bg-emerald-500/10">
              Active Session
            </span>
          </div>
        </div>

        {profileMsg && (
          <div className="p-3 rounded-xl neu-inset bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{profileMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl neu-input text-slate-900 dark:text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Avatar Image URL (Optional)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 text-xs rounded-xl neu-input text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <NeumorphicButton
              type="submit"
              variant="raised"
              size="md"
              disabled={profileSaving}
              className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
            >
              <span>{profileSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </NeumorphicButton>
          </div>
        </form>
      </div>

      {/* App Preferences & UI Aesthetics */}
      <div className="neu-card p-6 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sun className="w-4 h-4" />
          Interface & Sensory Preferences
        </h2>

        <div className="space-y-4 divide-y divide-black/5 dark:divide-white/5">
          {/* Theme Selector */}
          <div className="flex items-center justify-between pt-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Neumorphic Theme
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose between dark charcoal neumorphism or clean porcelain light mode
              </p>
            </div>
            <div className="flex rounded-xl neu-inset p-1 bg-[#e5ebf3] dark:bg-[#14161a]">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  theme === 'dark'
                    ? 'neu-btn text-white bg-[#191b20]'
                    : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  theme === 'light'
                    ? 'neu-btn text-slate-900 bg-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Light
              </button>
            </div>
          </div>

          {/* Sound Effects */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tactile Audio Chimes
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Synthesized sound cues when completing tasks or pinning notes
              </p>
            </div>
            <NeumorphicButton
              size="sm"
              variant={user?.preferences?.soundEnabled ? 'inset' : 'raised'}
              onClick={async () => {
                const current = user?.preferences?.soundEnabled ?? true;
                await updateUserPreferences({ soundEnabled: !current });
                sound.enabled = !current;
                if (!current) sound.playChime();
              }}
              className="text-xs"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{user?.preferences?.soundEnabled ? 'Enabled' : 'Muted'}</span>
            </NeumorphicButton>
          </div>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Browser Reminder Notifications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive desktop notifications even when Note Nest is in the background
              </p>
            </div>
            <NeumorphicButton
              size="sm"
              variant={browserPermission === 'granted' ? 'inset' : 'raised'}
              onClick={requestBrowserPermission}
              disabled={browserPermission === 'granted'}
              className="text-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{browserPermission === 'granted' ? 'Allowed' : 'Enable Alerts'}</span>
            </NeumorphicButton>
          </div>
        </div>
      </div>

      {/* Security & Password */}
      <div className="neu-card p-6 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Key className="w-4 h-4" />
          Security & Password Change
        </h2>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl neu-inset text-xs flex items-center gap-2 ${
              passwordMsg.isError
                ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl neu-input text-slate-900 dark:text-white focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl neu-input text-slate-900 dark:text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl neu-input text-slate-900 dark:text-white focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <NeumorphicButton
              type="submit"
              variant="raised"
              size="md"
              disabled={passwordSaving || !currentPassword || !newPassword}
              className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs"
            >
              <span>{passwordSaving ? 'Updating...' : 'Change Password'}</span>
            </NeumorphicButton>
          </div>
        </form>
      </div>

      {/* Firebase Cloud Sync & Configuration */}
      <div className="neu-card p-6 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl neu-inset bg-amber-500/10 text-amber-500">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Firebase Cloud Sync
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                    isFbConfiguredState
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isFbConfiguredState ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {isFbConfiguredState ? 'Cloud Sync Ready' : 'Local Offline Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Connect your Google Firebase project to enable real-time Cloud Firestore synchronization and Google Sign-In.
              </p>
            </div>
          </div>

          <a
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 transition"
          >
            <span>Firebase Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {fbFeedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
              fbFeedback.isSuccess
                ? 'neu-inset bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : 'neu-inset bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
            }`}
          >
            {fbFeedback.isSuccess ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            )}
            <span className="font-medium">{fbFeedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveFirebaseConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                API Key (VITE_FIREBASE_API_KEY)
              </label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={fbApiKey}
                onChange={e => setFbApiKey(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Project ID (VITE_FIREBASE_PROJECT_ID)
              </label>
              <input
                type="text"
                placeholder="note-nest-app"
                value={fbProjectId}
                onChange={e => setFbProjectId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Auth Domain (Optional)
              </label>
              <input
                type="text"
                placeholder="note-nest-app.firebaseapp.com"
                value={fbAuthDomain}
                onChange={e => setFbAuthDomain(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Storage Bucket (Optional)
              </label>
              <input
                type="text"
                placeholder="note-nest-app.appspot.com"
                value={fbStorageBucket}
                onChange={e => setFbStorageBucket(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Messaging Sender ID (Optional)
              </label>
              <input
                type="text"
                placeholder="1029384756"
                value={fbMessagingSenderId}
                onChange={e => setFbMessagingSenderId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                App ID (Optional)
              </label>
              <input
                type="text"
                placeholder="1:1029384756:web:abcd123"
                value={fbAppId}
                onChange={e => setFbAppId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <NeumorphicButton
                type="submit"
                variant="raised"
                size="sm"
                className="bg-amber-500 text-white dark:bg-amber-500 dark:text-slate-950 font-bold text-xs"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Save Firebase Config</span>
              </NeumorphicButton>

              <NeumorphicButton
                type="button"
                variant="raised"
                size="sm"
                onClick={handleTestFirebaseConnection}
                disabled={fbTesting || !fbApiKey || !fbProjectId}
                className="text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fbTesting ? 'animate-spin' : ''}`} />
                <span>{fbTesting ? 'Testing...' : 'Test Connection'}</span>
              </NeumorphicButton>
            </div>

            {isFbConfiguredState && (
              <button
                type="button"
                onClick={handleClearFirebaseConfig}
                className="text-xs text-slate-400 hover:text-red-500 transition underline cursor-pointer"
              >
                Disconnect & Use Local Storage Only
              </button>
            )}
          </div>
        </form>

        <div className="p-3 rounded-2xl neu-inset bg-black/5 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
          <Cloud className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
          <span>
            <strong>Hybrid Architecture:</strong> Note Nest works with or without Firebase. If configured, changes are mirrored in real-time to Google Cloud Firestore. If not configured, everything runs seamlessly on your persistent local database.
          </span>
        </div>
      </div>

      {/* Data Export & Backup */}
      <div className="neu-card p-6 bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export My Data Backup
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            Download a portable, comprehensive JSON archive containing all your sticky notes, checklists, tags, and reminders.
          </p>
        </div>

        <NeumorphicButton
          variant="raised"
          size="md"
          onClick={handleExportData}
          disabled={exporting}
          className="font-bold text-xs shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{exporting ? 'Generating...' : 'Download Backup'}</span>
        </NeumorphicButton>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="neu-card p-6 bg-red-500/5 dark:bg-red-950/15 border border-red-500/20 rounded-3xl space-y-4">
        <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-bold">Danger Zone: Delete Account</h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
          Permanently delete your account, your profile, all personal sticky notes, and reminders. This action is irreversible.
        </p>

        <div>
          <NeumorphicButton
            variant="danger"
            size="md"
            onClick={() => setShowDeleteModal(true)}
            className="font-bold text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Note Nest Account</span>
          </NeumorphicButton>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-red-500/30 p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Confirm Account Deletion</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              This will permanently erase your user record, remove your notes from collaborators, and purge your data. Enter your password to confirm:
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl neu-inset bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                {deleteError}
              </div>
            )}

            <input
              type="password"
              placeholder="Confirm your password..."
              value={deleteConfirmPassword}
              onChange={e => setDeleteConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl neu-input text-slate-900 dark:text-white focus:outline-none"
            />

            <div className="flex justify-end gap-2.5 pt-2">
              <NeumorphicButton
                variant="flat"
                size="sm"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmPassword('');
                  setDeleteError(null);
                }}
                className="text-xs"
              >
                Cancel
              </NeumorphicButton>

              <NeumorphicButton
                variant="danger"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={deleting || !deleteConfirmPassword}
                className="font-bold text-xs"
              >
                <span>{deleting ? 'Deleting...' : 'Yes, Delete Everything'}</span>
              </NeumorphicButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
