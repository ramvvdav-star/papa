import React, { useState } from 'react';
import { useExam } from '../context/ExamContext';
import {
  BookOpen,
  LayoutDashboard,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  Moon,
  Sun,
  Search,
  Zap,
  Bookmark,
  Clock,
  Menu,
  X,
  LogOut,
  GraduationCap,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    authProfile,
    logout,
    theme,
    toggleTheme,
    setIsCommandPaletteOpen,
    inProgressSession,
    resumeExam,
    discardExamSession,
    tests,
  } = useExam();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide navigation during live CBT exam or when unauthenticated
  if (
    !authProfile ||
    currentView === 'cbt-exam' ||
    currentView === 'login' ||
    currentView === 'first-login-reset'
  ) {
    return null;
  }

  const activeTestSession = inProgressSession
    ? tests.find((t) => t.id === inProgressSession.testId)
    : null;

  const homeDashboardView =
    authProfile.role === 'ADMIN'
      ? 'admin-dashboard'
      : authProfile.role === 'TEACHER'
      ? 'teacher-dashboard'
      : 'student-dashboard';

  return (
    <>
      {/* Active Exam Session Resume Banner */}
      {inProgressSession && activeTestSession && (
        <div className="bg-indigo-900 text-white px-4 py-2 border-b border-indigo-700 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2 max-w-2xl truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Clock className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="font-bold">In-Progress Session:</span>
            <span className="truncate text-indigo-200">{activeTestSession.title}</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-emerald-300 font-bold">
              {Math.floor(inProgressSession.timerSecondsLeft / 60)} mins remaining
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={resumeExam}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Resume Test
            </button>
            <button
              type="button"
              onClick={discardExamSession}
              className="text-indigo-300 hover:text-white text-[11px] underline cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo */}
            <div
              onClick={() => setCurrentView(homeDashboardView)}
              className="flex items-center gap-3 cursor-pointer group shrink-0"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-100">
                    NTA<span className="text-indigo-600 dark:text-indigo-400">Pulse</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    · {authProfile.role} PORTAL
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Secure Examination &amp; Assessment Platform
                </p>
              </div>
            </div>

            {/* Global Search Bar (Trigger Ctrl+K) */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium max-w-xs flex-1 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="flex-1 text-left truncate">
                Search tests, topics, or commands...
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                Ctrl K
              </kbd>
            </button>

            {/* Role-Based Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              {authProfile.role === 'ADMIN' && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentView('admin-dashboard')}
                    className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                      currentView.startsWith('admin')
                        ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60'
                        : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Admin Control</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('teacher-dashboard')}
                    className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                      currentView === 'teacher-dashboard'
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                        : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span>Teacher View</span>
                  </button>
                </>
              )}

              {authProfile.role === 'TEACHER' && (
                <button
                  type="button"
                  onClick={() => setCurrentView('teacher-dashboard')}
                  className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'teacher-dashboard'
                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                      : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>Teacher Dashboard</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentView('student-dashboard')}
                className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'student-dashboard'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                <span>
                  {authProfile.role === 'STUDENT' ? 'Dashboard' : 'Student View'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('tests')}
                className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'tests' ||
                  currentView === 'test-details' ||
                  currentView === 'instructions' ||
                  currentView === 'system-check'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Mock Tests</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('practice-engine')}
                className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'practice-engine'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Practice</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('bookmarks-mistakes')}
                className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'bookmarks-mistakes'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Bookmark className="w-4 h-4 text-rose-500" />
                <span>Mistakes</span>
              </button>
            </nav>

            {/* Right Side: Theme, Authenticated Identity & Logout */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600" />
                )}
              </button>

              {/* Authenticated User Profile Info */}
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 max-w-[150px]">
                    {authProfile.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {authProfile.role === 'STUDENT'
                      ? authProfile.studentId
                      : authProfile.role}
                  </div>
                </div>
                <div
                  className={`w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center ${
                    authProfile.role === 'ADMIN'
                      ? 'bg-purple-600'
                      : authProfile.role === 'TEACHER'
                      ? 'bg-emerald-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  {authProfile.fullName.charAt(0)}
                </div>
              </div>

              {/* Secure Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sign out and terminate session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs font-bold">
            {authProfile.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('admin-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50 text-purple-700 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" /> Admin Control Center
              </button>
            )}
            {(authProfile.role === 'TEACHER' || authProfile.role === 'ADMIN') && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('teacher-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 text-emerald-700 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-emerald-600" /> Teacher Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCurrentView('student-dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-600" /> Student Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentView('tests');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-indigo-600" /> Test Library
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentView('practice-engine');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-500" /> Practice Engine
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentView('bookmarks-mistakes');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4 text-rose-500" /> Mistakes &amp; Bookmarks
            </button>
          </div>
        )}
      </header>
    </>
  );
};
