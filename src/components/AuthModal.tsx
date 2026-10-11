import React, { useState } from 'react';
import { useExam } from '../context/ExamContext';
import {
  User,
  Lock,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';


export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginWithCredentials,
    requestPasswordRecovery,
  } = useExam();

  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your Student ID or academic email address.');
      return;
    }

    setIsLoading(true);

    if (mode === 'signin') {
      const res = await loginWithCredentials({
        role,
        identifier: identifier.trim(),
        password,
        rememberMe: true,
      });
      if (res.success) {
        setIsAuthModalOpen(false);
      } else {
        setErrorMsg(res.error || 'Sign-in failed. Please verify your credentials.');
      }
    } else {
      const res = await requestPasswordRecovery({
        role,
        identifier: identifier.trim(),
      });
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
              NTA
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Student Examination Portal</h2>
              <p className="text-xs text-slate-400">Authenticated CBT Practice &amp; Performance Records</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Selector */}
        <div className="p-1 bg-slate-100 dark:bg-slate-800/60 m-4 rounded-xl flex">
          {(['STUDENT', 'TEACHER', 'ADMIN'] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                role === r
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              {r === 'STUDENT' ? 'Student' : r === 'TEACHER' ? 'Faculty' : 'Admin'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              {role === 'STUDENT' ? 'Student ID or Email' : 'Official Email Address'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'STUDENT' ? 'STU20260001 or student@ntapulse.in' : 'faculty@ntapulse.in'}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading
                ? 'Processing...'
                : mode === 'signin'
                ? 'Sign In to Portal'
                : 'Submit Recovery Request'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Role-verified session · Managed institutional access</span>
          </div>
        </form>
      </div>
    </div>
  );
};
