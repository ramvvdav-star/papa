import React from 'react';
import { useExam } from '../context/ExamContext';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

export const AccessDeniedView: React.FC = () => {
  const { accessDeniedMessage, clearAccessDenied, authProfile } = useExam();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/70 rounded-3xl p-8 text-center shadow-xl space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-rose-600 dark:text-rose-400">
            HTTP 403 · Role-Based Security Gate
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {accessDeniedMessage || 'Access Denied — Administrator privileges required.'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your current session is authenticated as{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              {authProfile?.fullName}
            </span>{' '}
            with role <span className="font-mono font-bold">{authProfile?.role}</span>. You do not have permission to view or modify resources on this route.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={clearAccessDenied}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              Return to {authProfile?.role === 'TEACHER' ? 'Teacher' : 'Student'} Dashboard
            </span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <Lock className="w-3.5 h-3.5" />
          <span>RBAC Policy Enforced by Client &amp; PostgreSQL Backend</span>
        </div>
      </div>
    </div>
  );
};
