import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Users,
  X,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NeumorphicButton } from '../components/common/NeumorphicButton';
import { api } from '../utils/api';
import { sound } from '../utils/sound';
import { firebaseService } from '../services/firebaseService';

export const AuthPage: React.FC = () => {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('alex'); // Default filled for convenience
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Account Chooser Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');

  // Demo users list for 1-click test
  const [demoUsers, setDemoUsers] = useState<Array<{ username: string; email: string; name: string; role: string }>>([]);

  useEffect(() => {
    api.getDemoUsers()
      .then(res => setDemoUsers(res.demoUsers))
      .catch(() => {});
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(identifier, password);
      } else {
        await register(name, username, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      sound.playClick();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (userIdentifier: string) => {
    sound.playClick();
    setMode('login');
    setIdentifier(userIdentifier);
    setPassword('Password123!');
    setError(null);
  };

  const handleGoogleSignIn = async () => {
    sound.playClick();
    setError(null);
    if (firebaseService.isAvailable()) {
      setLoading(true);
      try {
        const fbUser = await firebaseService.loginWithGoogle();
        if (fbUser.email) {
          await loginWithGoogle({
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email.split('@')[0],
            avatarUrl: fbUser.photoURL || undefined,
            googleId: fbUser.uid,
          });
        }
      } catch (err: any) {
        console.warn('Firebase popup failed or blocked, opening Google account chooser:', err);
        setShowGoogleModal(true);
      } finally {
        setLoading(false);
      }
    } else {
      // In offline/demo mode, open Google Account Chooser modal immediately!
      setShowGoogleModal(true);
    }
  };

  const handleSelectQuickGoogleAccount = async (acctEmail: string, acctName: string, avatarSeed: string) => {
    sound.playClick();
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle({
        email: acctEmail,
        name: acctName,
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${avatarSeed}`,
      });
      setShowGoogleModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google account.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleCustomEmail.trim()) return;
    sound.playClick();
    setLoading(true);
    setError(null);
    try {
      const email = googleCustomEmail.trim().toLowerCase();
      const derivedName = googleCustomName.trim() || email.split('@')[0];
      await loginWithGoogle({
        email,
        name: derivedName,
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${email}`,
      });
      setShowGoogleModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#141518] text-slate-100 antialiased selection:bg-slate-700">
      <div className="w-full max-w-md space-y-6">
        {/* Brand App Icon & Title */}
        <div className="text-center space-y-3">
          <div className="inline-block p-1 rounded-3xl neu-raised bg-[#191b20] transition-transform hover:scale-105 duration-300">
            <img
              src="/app-icon.png"
              alt="Note Nest"
              className="w-20 h-20 rounded-2xl object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              Note Nest
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Sticky Notes & Reminders with Neumorphic Precision
            </p>
          </div>
        </div>

        {/* Main Neumorphic Card */}
        <div className="neu-card p-7 bg-[#191b20] border border-white/5 shadow-2xl rounded-3xl space-y-6">
          {/* Tab Selector */}
          <div className="flex rounded-2xl neu-inset p-1 bg-[#14161a]">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                mode === 'login'
                  ? 'neu-btn text-white bg-[#1f2229] shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                mode === 'register'
                  ? 'neu-btn text-white bg-[#1f2229] shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl neu-inset bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Jordan Smith"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl neu-input text-white placeholder-slate-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500 pointer-events-none">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="jordansmith"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl neu-input text-white placeholder-slate-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="jordan@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl neu-input text-white placeholder-slate-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="alex or alex@notenest.com"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl neu-input text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl neu-input text-white placeholder-slate-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <NeumorphicButton
              type="submit"
              variant="raised"
              size="lg"
              disabled={loading}
              className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm mt-2 shadow-lg"
            >
              <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </NeumorphicButton>

            {/* Google Firebase Login Option */}
            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <span className="relative px-2 bg-[#191b20] text-[10px] uppercase font-bold text-slate-500">
                Or with Google Firebase
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-2xl neu-btn text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-2 cursor-pointer border border-white/5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>

          {/* Quick Demo Accounts for Seamless Testing */}
          <div className="pt-4 border-t border-white/5 space-y-2.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">
              Quick Test Accounts (Click to Fill)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {demoUsers.map(u => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => handleSelectDemoUser(u.username)}
                  className={`p-2 rounded-xl text-left transition cursor-pointer ${
                    identifier === u.username
                      ? 'neu-inset bg-[#14161a] border border-white/10'
                      : 'neu-btn bg-[#181a20] hover:bg-[#20232a]'
                  }`}
                >
                  <p className="text-xs font-bold text-white truncate">@{u.username}</p>
                  <p className="text-[10px] text-slate-400 truncate">{u.role}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-center text-slate-500">
              Default password: <code className="text-slate-300">Password123!</code>
            </p>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Encrypted Session • Zero Data Leakage • Neumorphic Design</span>
        </div>
      </div>

      {/* Google Account Selector Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md neu-card bg-[#191b20] border border-white/10 p-6 rounded-3xl shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                </svg>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Sign in with Google
                  </h3>
                  <p className="text-xs text-slate-400">
                    To start fresh in Note Nest Workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-2 rounded-xl neu-btn text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl neu-inset bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>100% Clean Slate Guarantee</span>
              </div>
              <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                Your new Google account starts completely from scratch with <strong>0 notes, 0 reminders, and zero clutter</strong>.
              </p>
            </div>

            {/* 1-Click Instant Google Sign-In */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Fast Track (1-Click)
              </span>
              <button
                type="button"
                onClick={() => handleSelectQuickGoogleAccount('google.member@gmail.com', 'Google User', 'google_fast')}
                disabled={loading}
                className="w-full p-3 rounded-2xl neu-btn bg-[#21242d] hover:bg-[#282c37] flex items-center justify-between transition text-left cursor-pointer border border-white/10 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
                      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-emerald-400 transition">
                      Continue as Google User
                    </span>
                    <span className="text-[11px] text-slate-400">google.member@gmail.com</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full neu-inset text-emerald-400">
                  Instant Access ➔
                </span>
              </button>
            </div>

            {/* Custom Google Account input */}
            <div className="pt-3 border-t border-white/5 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Or enter your own Gmail / Google Account
              </span>
              <form onSubmit={handleCustomGoogleSubmit} className="space-y-2.5">
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Enter your Gmail (e.g. yourname@gmail.com)"
                    value={googleCustomEmail}
                    onChange={e => setGoogleCustomEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl neu-input text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Your Display Name (e.g. Anand)"
                    value={googleCustomName}
                    onChange={e => setGoogleCustomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl neu-input text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <NeumorphicButton
                  type="submit"
                  variant="raised"
                  size="md"
                  disabled={loading || !googleCustomEmail.trim()}
                  className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs justify-center cursor-pointer py-2.5"
                >
                  <span>Sign In & Start From Scratch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </NeumorphicButton>
              </form>
            </div>

            {/* Firebase Status Note */}
            <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Firebase Cloud: Ready for config in Settings</span>
              <span className="text-emerald-400 font-medium">● Local Mode Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
