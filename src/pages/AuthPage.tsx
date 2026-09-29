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
    </div>
  );
};
