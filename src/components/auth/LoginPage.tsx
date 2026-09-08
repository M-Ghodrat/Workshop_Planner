import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('developer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      success('Welcome to Workshop Planner', 'Signed in via Google successfully.');
    } catch (err: any) {
      error('Sign in failed', err.message || 'Could not authenticate with Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Validation Error', 'Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        success('Welcome back', 'Signed in successfully.');
      } else {
        if (!displayName) {
          error('Validation Error', 'Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        await signUpWithEmail(email, password, displayName, role);
        success('Account created', `Welcome, ${displayName}!`);
      }
    } catch (err: any) {
      error(
        mode === 'signin' ? 'Sign In Failed' : 'Registration Failed',
        err.message || 'Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#002B49] to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* University Canada West Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-xl mb-4 text-[#002B49] ring-4 ring-white/10">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Workshop Planner
          </h1>
          <p className="text-sm text-sky-200 mt-1 font-medium flex items-center justify-center gap-1.5">
            <Building className="w-4 h-4 text-amber-400" />
            <span>University Canada West (UCW)</span>
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8">
          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold shadow-xs transition-colors cursor-pointer mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Or email sign in
            </span>
          </div>

          {/* Tabs: Sign In / Register */}
          <div className="flex border-b border-slate-200 mb-5">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'border-[#002B49] text-[#002B49]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'border-[#002B49] text-[#002B49]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Register Faculty Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name & Academic Title
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jane Smith"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="faculty@ucw.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requested Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49]"
                >
                  <option value="developer">Developer (Create & Edit Workshops)</option>
                  <option value="administrator">Administrator (Full Platform Control)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>
                {isSubmitting
                  ? 'Authenticating...'
                  : mode === 'signin'
                  ? 'Sign In'
                  : 'Complete Registration'}
              </span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-sky-200/70">
          <p>© {new Date().getFullYear()} University Canada West • Academic Affairs</p>
          <p className="mt-1 text-[11px] text-sky-300/50">
            Secure Role-Based Workshop Management Architecture
          </p>
        </div>
      </div>
    </div>
  );
};
