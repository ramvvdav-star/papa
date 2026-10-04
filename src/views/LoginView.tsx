import React, { useState } from 'react';
import { useExam } from '../context/ExamContext';
import { UserRole } from '../types/auth';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Award,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  HelpCircle,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Terminal,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    loginWithCredentials,
    requestPasswordRecovery,
    redirectTarget,
    theme,
    toggleTheme,
  } = useExam();

  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accountStatusAlert, setAccountStatusAlert] = useState<string | null>(null);

  // Forgot password recovery modal state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState('');
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);

  // Quick verification drawer for testing roles
  const [showQuickTester, setShowQuickTester] = useState(true);

  const handleRoleSwitch = (role: UserRole) => {
    setSelectedRole(role);
    setIdentifier('');
    setPassword('');
    setErrorMsg(null);
    setAccountStatusAlert(null);
    setIsForgotMode(false);
    setRecoverySuccessMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAccountStatusAlert(null);

    if (!identifier.trim() || !password) {
      setErrorMsg(
        selectedRole === 'STUDENT'
          ? 'Please enter your assigned Student ID and password.'
          : selectedRole === 'TEACHER'
          ? 'Please enter your Faculty Email/Username and password.'
          : 'Please enter your Administrator Email and password.'
      );
      return;
    }

    setIsLoading(true);
    const res = await loginWithCredentials({
      role: selectedRole,
      identifier: identifier.trim(),
      password,
      rememberMe,
    });
    setIsLoading(false);

    if (!res.success) {
      if (res.accountStatus) {
        setAccountStatusAlert(res.error || `Account is ${res.accountStatus}.`);
      } else {
        setErrorMsg(res.error || 'Invalid credentials.');
      }
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRecoverySuccessMsg(null);

    if (!identifier.trim()) {
      setErrorMsg(
        selectedRole === 'STUDENT'
          ? 'Please enter your Student ID (e.g. JEE26-10001) to request a credential reset.'
          : 'Please enter your registered account email.'
      );
      return;
    }

    setIsLoading(true);
    const res = await requestPasswordRecovery({
      role: selectedRole,
      identifier: identifier.trim(),
      reason: recoveryReason.trim() || 'Requested password recovery from login gate',
    });
    setIsLoading(false);

    if (res.success) {
      setRecoverySuccessMsg(res.message);
    } else {
      setErrorMsg(res.message);
    }
  };

  const fillDemoAccount = (
    role: UserRole,
    idVal: string,
    passVal: string
  ) => {
    setSelectedRole(role);
    setIdentifier(idVal);
    setPassword(passVal);
    setErrorMsg(null);
    setAccountStatusAlert(null);
    setIsForgotMode(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Subtle Scientific / Mathematical Background Layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-indigo-600/15 blur-[130px]" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-sky-500/10 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[140px]" />

        {/* Subtle Mathematical & Scientific Watermarks */}
        <div className="hidden lg:block absolute top-24 left-12 font-mono text-xs text-slate-700/50 tracking-widest">
          ∇ × E = −∂B / ∂t · ε₀Φ_E = q_enc
        </div>
        <div className="hidden lg:block absolute bottom-28 left-16 font-mono text-xs text-slate-700/50 tracking-widest">
          ∫₀^∞ e^(−x²) dx = √π / 2 · ΔG° = −RT ln K_eq
        </div>
        <div className="hidden lg:block absolute top-32 right-16 font-mono text-xs text-slate-700/50 tracking-widest">
          iℏ ∂Ψ/∂t = [−(ℏ²/2m)∇² + V(r)]Ψ
        </div>
      </div>

      {/* Top Institutional Security Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-950 border border-indigo-400/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-black text-xl tracking-tight text-white">
                  NTA <span className="text-indigo-400">PULSE</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  · National Competitive Examination Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Secure Examination &amp; Assessment Platform · JEE Main · JEE Advanced · NEET UG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>256-Bit Encrypted Session Gate</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
              title="Toggle appearance"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Split Layout */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Platform Authority & Role Overview */}
          <div className="lg:col-span-5 space-y-6 lg:pt-4">
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase tracking-widest text-indigo-400">
                Authenticated Examination Environment
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                National Computer-Based Test &amp; Analytics Control Center
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Access to mock examinations, 50,000+ verified question banks, batch assignments, and percentile analytics is strictly restricted to registered candidates, faculty mentors, and examination controllers.
              </p>
            </div>

            {/* Redirect Alert if visitor tried to access a protected URL directly */}
            {redirectTarget && redirectTarget !== '/login' && (
              <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-700/60 text-amber-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-2 text-amber-300">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Protected Route Authentication Required</span>
                </div>
                <p className="text-amber-200/90">
                  You attempted to open <code className="font-mono text-white px-1.5 py-0.5 bg-amber-900/60 rounded">{redirectTarget}</code>. Please sign in with an authorized account to continue to your destination.
                </p>
              </div>
            )}

            {/* Institutional Architecture Highlights */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Student ID Examination Credentials
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Candidates sign in exclusively with their faculty-issued Student ID (e.g. <span className="font-mono text-slate-200">JEE26-10001</span> or <span className="font-mono text-slate-200">NEET26-10001</span>). Public self-registration is disabled.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Faculty Batch &amp; Cohort Supervision
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Teachers generate Student IDs, organize JEE &amp; NEET batches, assign mock tests, and monitor student accuracy and time management.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Official 2026 NTA &amp; JAB Exam Schemes
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Full-length CBT simulations for JEE Main (75 Qs / 300 Marks), JEE Advanced Paper 1 &amp; 2, and NEET UG (180 Compulsory Qs / 720 Marks).
                  </p>
                </div>
              </div>
            </div>

            {/* Quick-Fill Demo Credentials Panel for Testing */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowQuickTester((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Quick-Fill Verification Accounts (Click to Populate)
                  </span>
                </div>
                {showQuickTester ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showQuickTester && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('STUDENT', 'JEE26-10001', 'Student@2026!')
                      }
                      className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 text-left transition-all cursor-pointer"
                    >
                      <div className="font-bold text-sky-400">Student (Active JEE)</div>
                      <div className="font-mono text-[11px] text-slate-300">
                        ID: JEE26-10001
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Pass: Student@2026!
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('STUDENT', 'JEE26-7F42K', 'Temp@7F42K')
                      }
                      className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer"
                    >
                      <div className="font-bold text-amber-400">
                        Student (1st Login Temp Pass)
                      </div>
                      <div className="font-mono text-[11px] text-slate-300">
                        ID: JEE26-7F42K
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Temp: Temp@7F42K
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('STUDENT', 'NEET26-10001', 'Student@2026!')
                      }
                      className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer"
                    >
                      <div className="font-bold text-emerald-400">
                        Student (Active NEET)
                      </div>
                      <div className="font-mono text-[11px] text-slate-300">
                        ID: NEET26-10001
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Pass: Student@2026!
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount('STUDENT', 'JEE26-10003', 'Student@2026!')
                      }
                      className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/50 text-left transition-all cursor-pointer"
                    >
                      <div className="font-bold text-rose-400">
                        Student (Suspended Demo)
                      </div>
                      <div className="font-mono text-[11px] text-slate-300">
                        ID: JEE26-10003
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Tests Status Gate
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount(
                          'TEACHER',
                          'hcverma@ntapulse.edu.in',
                          'Teacher@2026!'
                        )
                      }
                      className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 text-left transition-all cursor-pointer"
                    >
                      <div className="font-bold text-indigo-300">
                        Teacher (Prof. H.C. Verma)
                      </div>
                      <div className="font-mono text-[11px] text-slate-300 truncate">
                        hcverma@ntapulse.edu.in
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Pass: Teacher@2026!
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        fillDemoAccount(
                          'ADMIN',
                          'admin@ntapulse.edu.in',
                          'Admin@2026!'
                        )
                      }
                      className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-purple-950/50 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer"
                    >
                      <div className="font-bold text-purple-300">
                        Administrator Control
                      </div>
                      <div className="font-mono text-[11px] text-slate-300 truncate">
                        admin@ntapulse.edu.in
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Pass: Admin@2026!
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Role-Selected Examination Login Card */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
              {/* Role Selection Tabs (Section 8) */}
              <div className="p-4 sm:p-6 bg-slate-950/60 border-b border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Select Portal Account Type
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('STUDENT')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedRole === 'STUDENT'
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <GraduationCap
                        className={`w-5 h-5 ${
                          selectedRole === 'STUDENT' ? 'text-indigo-400' : 'text-slate-500'
                        }`}
                      />
                      {selectedRole === 'STUDENT' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      )}
                    </div>
                    <div className="font-extrabold text-sm">Student</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      Login using your Student ID
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('TEACHER')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedRole === 'TEACHER'
                        ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <UserCheck
                        className={`w-5 h-5 ${
                          selectedRole === 'TEACHER' ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      {selectedRole === 'TEACHER' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className="font-extrabold text-sm">Teacher</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      Login using your Teacher account
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('ADMIN')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedRole === 'ADMIN'
                        ? 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-950/50'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <ShieldCheck
                        className={`w-5 h-5 ${
                          selectedRole === 'ADMIN' ? 'text-purple-400' : 'text-slate-500'
                        }`}
                      />
                      {selectedRole === 'ADMIN' && (
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                      )}
                    </div>
                    <div className="font-extrabold text-sm">Admin</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      Administrator Login
                    </div>
                  </button>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-white">
                    {selectedRole === 'STUDENT' && 'Candidate Examination Sign In'}
                    {selectedRole === 'TEACHER' && 'Faculty & Mentor Portal Sign In'}
                    {selectedRole === 'ADMIN' && 'Examination Controller Sign In'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedRole === 'STUDENT' &&
                      'Enter the unique Student ID and password issued by your assigned faculty mentor.'}
                    {selectedRole === 'TEACHER' &&
                      'Sign in with your institutional faculty email or username to manage batches, students, and tests.'}
                    {selectedRole === 'ADMIN' &&
                      'Authorized platform administrators only. All administrative actions are recorded in the security audit log.'}
                  </p>
                </div>

                {/* Account Status Alert (SUSPENDED / DEACTIVATED / PENDING) */}
                {accountStatusAlert && (
                  <div className="mb-6 p-4 rounded-2xl bg-rose-950/70 border border-rose-700 text-rose-100 space-y-1.5">
                    <div className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Account Access Restricted</span>
                    </div>
                    <p className="text-xs leading-relaxed text-rose-200">
                      {accountStatusAlert}
                    </p>
                  </div>
                )}

                {/* Standard Error Alert */}
                {errorMsg && (
                  <div className="mb-6 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs font-medium flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Recovery Success Alert */}
                {recoverySuccessMsg && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Credential Recovery Request Logged</span>
                    </div>
                    <p>{recoverySuccessMsg}</p>
                  </div>
                )}

                {!isForgotMode ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-5">
                    {/* Role-Specific Identifier Field */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        {selectedRole === 'STUDENT'
                          ? 'Student ID'
                          : selectedRole === 'TEACHER'
                          ? 'Email / Username'
                          : 'Admin Email'}
                      </label>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={
                          selectedRole === 'STUDENT'
                            ? 'e.g. JEE26-10001 or NEET26-10001'
                            : selectedRole === 'TEACHER'
                            ? 'e.g. hcverma@ntapulse.edu.in or hcverma'
                            : 'e.g. admin@ntapulse.edu.in'
                        }
                        autoComplete="username"
                        required
                        className={`w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors ${
                          selectedRole === 'STUDENT' ? 'font-mono uppercase tracking-wider' : ''
                        }`}
                      />
                    </div>

                    {/* Password Field with Show/Hide Toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotMode(true);
                            setErrorMsg(null);
                            setRecoverySuccessMsg(null);
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                          className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me & Session Indicator */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Remember session on this workstation</span>
                      </label>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Role: {selectedRole}
                      </span>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedRole === 'STUDENT'
                          ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/60'
                          : selectedRole === 'TEACHER'
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/60'
                          : 'bg-purple-600 hover:bg-purple-500 shadow-purple-950/60'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>
                        {isLoading
                          ? 'Verifying Credentials & Session...'
                          : selectedRole === 'STUDENT'
                          ? 'Sign In to Student Examination Portal'
                          : selectedRole === 'TEACHER'
                          ? 'Sign In to Teacher Control Panel'
                          : 'Sign In to Administrator Console'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  /* Password Recovery Form (Section 18) */
                  <form onSubmit={handleRecoverySubmit} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {selectedRole === 'STUDENT'
                        ? 'Enter your assigned Student ID below. A password reset ticket will be routed directly to your assigned Batch Faculty Mentor and Examination Controller.'
                        : 'Enter your registered faculty/admin email or username to request a credential reset from the Platform Administrator.'}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        {selectedRole === 'STUDENT'
                          ? 'Your Student ID'
                          : 'Your Registered Email / Username'}
                      </label>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={
                          selectedRole === 'STUDENT'
                            ? 'e.g. JEE26-10001'
                            : 'e.g. hcverma@ntapulse.edu.in'
                        }
                        required
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Verification Note / Batch Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={recoveryReason}
                        onChange={(e) => setRecoveryReason(e.target.value)}
                        placeholder="e.g. Lost temporary password slip, Morning Batch"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        {isLoading ? 'Submitting Request...' : 'Submit Recovery Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(false);
                          setErrorMsg(null);
                          setRecoverySuccessMsg(null);
                        }}
                        className="py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                )}

                {/* Role-Specific Footer Notice */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  {selectedRole === 'STUDENT' ? (
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>
                        Don&apos;t have a Student ID? Contact your Batch Teacher to get enrolled.
                      </span>
                    </div>
                  ) : selectedRole === 'TEACHER' ? (
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Teacher accounts are provisioned by the Examination Administrator.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>
                        Protected by Role-Based Access Control &amp; Session Auditing.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Institutional Bar */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/90 px-6 py-3 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            NTA PULSE · National Competitive Examination Simulator · JEE Main · JEE Advanced · NEET UG
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            PostgreSQL RBAC · Scrypt Salted Hashing · Protected Routes Active
          </div>
        </div>
      </footer>
    </div>
  );
};
