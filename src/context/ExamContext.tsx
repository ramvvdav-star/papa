import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  TestDefinition,
  Question,
  TestAttemptResult,
  UserProfile,
  UserExamResponse,
  PaletteStatus,
  ExamType,
  ExamMode,
  ExamIntegrityEvent,
  QuestionBookmark,
  QuestionReport,
  AuditLog,
  SystemSettings,
  ActiveExamSession,
  ExamBlueprint,
} from '../types/exam';
import {
  AuthProfile,
  UserRole,
  BatchRecord,
  TestAssignmentRecord,
  AnnouncementRecord,
  PasswordRecoveryRecord,
  StudentIdConfig,
} from '../types/auth';
import { SEED_TESTS } from '../data/seedTests';
import { getCentralizedQuestionBank } from '../data/fullLengthPapersGenerator';
import { OFFICIAL_EXAM_BLUEPRINTS } from '../data/officialExamPatterns';
import {
  computeQuestionFingerprint,
  enrichQuestionRecord,
  formatCanonicalQuestionId,
  selectQuestionsForBlueprint,
  createOrResolveAttemptSnapshot,
} from '../data/questionBankEngine';

export type AppView =
  | 'login'
  | 'first-login-reset'
  | 'access-denied'
  | 'landing'
  | 'tests'
  | 'test-details'
  | 'instructions'
  | 'system-check'
  | 'cbt-exam'
  | 'result'
  | 'admin-dashboard'
  | 'admin-questions'
  | 'admin-ai-generator'
  | 'admin-paper-builder'
  | 'teacher-dashboard'
  | 'student-custom-test'
  | 'student-dashboard'
  | 'practice-engine'
  | 'bookmarks-mistakes'
  | 'profile';

// URL Path <-> AppView helpers
function viewToPath(view: AppView): string {
  switch (view) {
    case 'login':
      return '/login';
    case 'first-login-reset':
      return '/student/first-login';
    case 'access-denied':
      return '/access-denied';
    case 'student-dashboard':
      return '/student/dashboard';
    case 'teacher-dashboard':
      return '/teacher/dashboard';
    case 'admin-dashboard':
    case 'admin-questions':
    case 'admin-ai-generator':
    case 'admin-paper-builder':
      return '/admin/dashboard';
    case 'tests':
      return '/tests';
    case 'test-details':
      return '/tests/details';
    case 'instructions':
      return '/tests/instructions';
    case 'system-check':
      return '/tests/system-check';
    case 'cbt-exam':
      return '/exam/live';
    case 'result':
      return '/results';
    case 'student-custom-test':
      return '/student/custom-test';
    case 'practice-engine':
      return '/student/practice';
    case 'bookmarks-mistakes':
      return '/student/bookmarks';
    case 'profile':
      return '/profile';
    case 'landing':
    default:
      return '/portal';
  }
}

function pathToView(pathname: string): AppView {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (clean === '/login') return 'login';
  if (clean === '/student/first-login') return 'first-login-reset';
  if (clean.startsWith('/admin')) return 'admin-dashboard';
  if (clean.startsWith('/teacher')) return 'teacher-dashboard';
  if (clean === '/student' || clean === '/student/dashboard' || clean === '/dashboard') {
    return 'student-dashboard';
  }
  if (clean === '/student/custom-test') return 'student-custom-test';
  if (clean === '/student/practice') return 'practice-engine';
  if (clean === '/student/bookmarks') return 'bookmarks-mistakes';
  if (clean === '/tests' || clean === '/mock-tests') return 'tests';
  if (clean === '/tests/details') return 'test-details';
  if (clean === '/tests/instructions') return 'instructions';
  if (clean === '/tests/system-check') return 'system-check';
  if (clean === '/exam/live') return 'cbt-exam';
  if (clean === '/results' || clean === '/result') return 'result';
  if (clean === '/profile') return 'student-dashboard';
  if (clean === '/portal') return 'landing';
  return 'student-dashboard';
}

interface ExamContextType {
  // Navigation & User
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  currentUser: UserProfile;
  toggleUserRole: () => void;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (data: { name: string; email: string; targetExam: ExamType; targetYear: number }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;

  // Enterprise RBAC Authentication State
  authProfile: AuthProfile | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  accessDeniedMessage: string | null;
  clearAccessDenied: () => void;
  redirectTarget: string | null;
  loginWithCredentials: (params: {
    role: UserRole;
    identifier: string;
    password: string;
    rememberMe?: boolean;
  }) => Promise<{ success: boolean; error?: string; accountStatus?: string }>;
  completeFirstLoginPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordRecovery: (params: {
    role: UserRole;
    identifier: string;
    reason?: string;
  }) => Promise<{ success: boolean; message: string }>;

  // RBAC Managed Entities (Users, Teachers, Students, Batches, Assignments, Announcements)
  managedUsers: AuthProfile[];
  batches: BatchRecord[];
  announcements: AnnouncementRecord[];
  testAssignments: TestAssignmentRecord[];
  recoveryRequests: PasswordRecoveryRecord[];
  studentIdConfig: StudentIdConfig | null;
  allAttempts: TestAttemptResult[];
  refreshRbacData: () => Promise<void>;
  createTeacher: (data: any) => Promise<{ success: boolean; error?: string; profile?: AuthProfile }>;
  createStudent: (data: any) => Promise<{
    success: boolean;
    error?: string;
    profile?: AuthProfile;
    generatedStudentId?: string;
    temporaryPassword?: string;
  }>;
  updateUserAccount: (userId: string, patch: any) => Promise<{ success: boolean; error?: string }>;
  deleteUserAccount: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (
    userId: string,
    newTemporaryPassword: string,
    forceChange?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  revokeUserSessions: (userId: string) => Promise<{ success: boolean; revokedCount?: number }>;
  createBatch: (data: any) => Promise<{ success: boolean; error?: string }>;
  updateBatch: (batchId: string, patch: any) => Promise<{ success: boolean; error?: string }>;
  deleteBatch: (batchId: string) => Promise<boolean>;
  publishAnnouncement: (data: any) => Promise<boolean>;
  removeAnnouncement: (id: string) => Promise<void>;
  saveTestAssignment: (data: any) => Promise<boolean>;
  resolveRecovery: (
    requestId: string,
    newTemporaryPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  saveStudentIdConfig: (patch: Partial<StudentIdConfig>) => Promise<void>;
  updateTestDefinition: (testId: string, patch: Partial<TestDefinition>) => Promise<void>;
  deleteTestDefinition: (testId: string) => Promise<void>;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Command Palette
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;

  // Network & Integrity
  isOnline: boolean;
  integrityEvents: ExamIntegrityEvent[];
  logIntegrityEvent: (type: ExamIntegrityEvent['type'], details: string) => void;

  // Tests & Question Bank
  tests: TestDefinition[];
  accessibleTests: TestDefinition[];
  questions: Question[];
  activeTest: TestDefinition | null;
  setActiveTest: (test: TestDefinition | null) => void;
  loadTests: () => Promise<void>;
  totalQuestionsInBank: number;
  questionBankPage: number;
  questionBankTotalPages: number;
  loadQuestions: (params?: {
    page?: number;
    limit?: number;
    subject?: string;
    difficulty?: string;
    search?: string;
  }) => Promise<void>;
  addQuestion: (q: Partial<Question>) => Promise<Question>;
  deleteQuestion: (id: string) => Promise<void>;
  updateQuestion: (id: string, q: Partial<Question>) => Promise<void>;
  publishTest: (newTest: Partial<TestDefinition>) => Promise<TestDefinition>;

  // Configurable Official Exam Blueprints & Snapshot Generator
  examBlueprints: Record<string, ExamBlueprint>;
  updateExamBlueprint: (key: string, blueprint: ExamBlueprint) => void;
  generateBlueprintMockTest: (blueprintKey: string, customTitle?: string) => Promise<TestDefinition>;

  // CBT Exam Execution State
  currentQuestionIdx: number;
  setCurrentQuestionIdx: (idx: number) => void;
  responses: Record<string, UserExamResponse>;
  timerSecondsLeft: number;
  isExamRunning: boolean;
  examMode: ExamMode;
  setExamMode: (mode: ExamMode) => void;
  hasAutoSubmitted: boolean;
  startCbtExam: (test: TestDefinition, mode?: ExamMode, attemptNumber?: number) => void;
  recordAnswer: (questionId: string, option?: string, numerical?: string) => void;
  markForReview: (questionId: string) => void;
  saveAndMarkForReview: (questionId: string) => void;
  clearResponse: (questionId: string) => void;
  saveAndNext: () => void;
  submitExam: () => Promise<TestAttemptResult | null>;
  lastSavedText: string;

  // Session Recovery & Resume
  inProgressSession: ActiveExamSession | null;
  resumeExam: () => void;
  discardExamSession: () => void;

  // Attempts & Results
  currentAttemptResult: TestAttemptResult | null;
  setCurrentAttemptResult: (res: TestAttemptResult | null) => void;
  attemptHistory: TestAttemptResult[];
  loadAttempts: () => Promise<void>;
  viewAttemptResult: (attempt: TestAttemptResult) => void;

  // Bookmarks
  bookmarks: QuestionBookmark[];
  addBookmark: (questionId: string, collection?: string, note?: string) => void;
  removeBookmark: (questionId: string) => void;
  isBookmarked: (questionId: string) => boolean;

  // Mistake Book & Practice
  mistakeQuestions: Question[];
  startMistakePractice: (subjectFilter?: string) => void;
  startCustomPractice: (questionsList: Question[], title: string, durationMinutes?: number) => void;

  // Reports
  reports: QuestionReport[];
  reportQuestion: (
    questionId: string,
    reason: QuestionReport['reason'],
    description: string,
    testId?: string
  ) => void;
  resolveReport: (reportId: string, status: 'RESOLVED' | 'DISMISSED') => void;

  // Audit Logs & Settings
  auditLogs: AuditLog[];
  logAdminAction: (action: string, target: string, details?: string) => void;
  systemSettings: SystemSettings;
  updateSystemSettings: (newSettings: Partial<SystemSettings>) => void;
}

const defaultUser: UserProfile = {
  id: 'usr-student-rahul',
  name: 'Rahul Verma',
  email: 'rahul.verma@student.ntapulse.edu.in',
  role: 'student',
  targetExam: 'JEE_MAIN',
  targetYear: 2026,
  totalTestsAttempted: 0,
  averageScore: 0,
  bestScore: 0,
  averageAccuracy: 0,
  practiceStreakDays: 1,
};

const defaultSettings: SystemSettings = {
  defaultNegativeMarking: true,
  enableLeaderboard: true,
  maintenanceMode: false,
  allowRegistration: false, // Controlled by Admin/Teacher only
  strictIntegrityLogging: true,
  autoSubmitOnTimeout: true,
};

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    actor: 'Dr. Rajeshwar Rao (Chief Controller)',
    action: 'PUBLISHED_PATTERN',
    target: 'JEE Main 2026 Information Bulletin Scheme',
    timestamp: '2026-02-15T10:00:00Z',
    details: 'Verified Section A (20 MCQ) + Section B (5 Numerical) regulation',
  },
];

const INITIAL_REPORTS: QuestionReport[] = [
  {
    id: 'rep-01',
    questionId: 'phy-001',
    studentName: 'Rahul Verma',
    reason: 'TYPO',
    description: 'LaTeX subscript missing in the dielectric capacitor formula description.',
    status: 'PENDING',
    createdAt: '2026-02-28T09:15:00Z',
    questionSnippet: 'A parallel-plate capacitor with plate area A and separation d...',
  },
];

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const ExamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Authentication & Session State
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return (
        localStorage.getItem('ntapulse_session_token') ||
        sessionStorage.getItem('ntapulse_session_token')
      );
    } catch {
      return null;
    }
  });
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('redirect');
      if (r) return r;
      const p = window.location.pathname;
      if (p && p !== '/' && p !== '/login') return p;
    } catch {}
    return null;
  });

  const [currentView, setCurrentViewInternal] = useState<AppView>('login');
  const [currentUser, setCurrentUser] = useState<UserProfile>(defaultUser);

  // RBAC Managed Collections
  const [managedUsers, setManagedUsers] = useState<AuthProfile[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [testAssignments, setTestAssignments] = useState<TestAssignmentRecord[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<PasswordRecoveryRecord[]>([]);
  const [studentIdConfig, setStudentIdConfig] = useState<StudentIdConfig | null>(null);
  const [allAttempts, setAllAttempts] = useState<TestAttemptResult[]>([]);

  // Sync legacy currentUser whenever authProfile or attempts change
  useEffect(() => {
    if (!authProfile) return;
    const myAttempts = allAttempts.filter((a) => a.userId === authProfile.id);
    const totalAttempted = myAttempts.length;
    const avgScore =
      totalAttempted > 0
        ? Math.round(myAttempts.reduce((s, a) => s + a.totalScore, 0) / totalAttempted)
        : 0;
    const bestScore =
      totalAttempted > 0 ? Math.max(...myAttempts.map((a) => a.totalScore)) : 0;
    const avgAcc =
      totalAttempted > 0
        ? Math.round(myAttempts.reduce((s, a) => s + a.accuracy, 0) / totalAttempted)
        : 0;

    setCurrentUser({
      id: authProfile.id,
      name: authProfile.fullName,
      email: authProfile.email || authProfile.studentId || '',
      role: authProfile.role === 'ADMIN' ? 'admin' : 'student',
      targetExam: authProfile.examCategory || 'JEE_MAIN',
      targetYear: authProfile.targetYear || 2026,
      totalTestsAttempted: totalAttempted,
      averageScore: avgScore,
      bestScore: bestScore,
      averageAccuracy: avgAcc,
      practiceStreakDays: Math.max(1, totalAttempted * 2),
    });
  }, [authProfile, allAttempts]);

  // Role-checked view navigation with URL synchronization
  const setCurrentView = useCallback(
    (targetView: AppView) => {
      if (!authProfile) {
        const requestedPath = viewToPath(targetView);
        if (requestedPath !== '/login') {
          setRedirectTarget(requestedPath);
          try {
            window.history.replaceState(
              {},
              '',
              `/login?redirect=${encodeURIComponent(requestedPath)}`
            );
          } catch {}
        }
        setCurrentViewInternal('login');
        return;
      }

      // Enforce First-Login Password Creation Gate
      if (authProfile.mustChangePassword && targetView !== 'first-login-reset') {
        setCurrentViewInternal('first-login-reset');
        try {
          window.history.replaceState({}, '', '/student/first-login');
        } catch {}
        return;
      }

      // Enforce Role-Based Routing (Section 6)
      if (targetView.startsWith('admin') && authProfile.role !== 'ADMIN') {
        setAccessDeniedMessage('Access Denied — Administrator privileges required.');
        setCurrentViewInternal('access-denied');
        try {
          window.history.pushState({}, '', '/admin');
        } catch {}
        return;
      }

      if (targetView === 'teacher-dashboard' && authProfile.role === 'STUDENT') {
        setAccessDeniedMessage('Access Denied — Faculty / Teacher privileges required.');
        setCurrentViewInternal('access-denied');
        try {
          window.history.pushState({}, '', '/teacher/dashboard');
        } catch {}
        return;
      }

      setAccessDeniedMessage(null);
      setCurrentViewInternal(targetView);
      try {
        const nextPath = viewToPath(targetView);
        if (window.location.pathname !== nextPath) {
          window.history.pushState({}, '', nextPath);
        }
      } catch {}
    },
    [authProfile]
  );

  const clearAccessDenied = useCallback(() => {
    setAccessDeniedMessage(null);
    if (!authProfile) {
      setCurrentViewInternal('login');
      return;
    }
    if (authProfile.role === 'ADMIN') setCurrentView('admin-dashboard');
    else if (authProfile.role === 'TEACHER') setCurrentView('teacher-dashboard');
    else setCurrentView('student-dashboard');
  }, [authProfile, setCurrentView]);

  // Handle browser Back/Forward buttons and direct URL entry
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (!authProfile) {
        if (path !== '/login') {
          setRedirectTarget(path);
          try {
            window.history.replaceState({}, '', `/login?redirect=${encodeURIComponent(path)}`);
          } catch {}
        }
        setCurrentViewInternal('login');
        return;
      }
      const targetView = pathToView(path);
      setCurrentView(targetView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authProfile, setCurrentView]);

  // Fetch RBAC Data (Users, Batches, Announcements, Test Assignments, Recovery Requests, Audit Logs)
  const refreshRbacData = useCallback(async () => {
    if (!sessionToken) return;
    const headers = { Authorization: `Bearer ${sessionToken}` };
    try {
      const [batchesRes, annRes, assignRes, attRes] = await Promise.all([
        fetch('/api/auth/batches', { headers }),
        fetch('/api/auth/announcements', { headers }),
        fetch('/api/auth/test-assignments', { headers }),
        fetch('/api/attempts'),
      ]);

      if (batchesRes.ok) setBatches(await batchesRes.json());
      if (annRes.ok) setAnnouncements(await annRes.json());
      if (assignRes.ok) setTestAssignments(await assignRes.json());
      if (attRes.ok) {
        const allAtt: TestAttemptResult[] = await attRes.json();
        setAllAttempts(allAtt);
        if (authProfile) {
          const mine = allAtt.filter((a) => a.userId === authProfile.id);
          setAttemptHistory(mine);
        }
      }

      if (authProfile && (authProfile.role === 'ADMIN' || authProfile.role === 'TEACHER')) {
        const [usersRes, recRes, idCfgRes] = await Promise.all([
          fetch('/api/auth/users', { headers }),
          fetch('/api/auth/recovery-requests', { headers }),
          fetch('/api/auth/student-id-config', { headers }),
        ]);
        if (usersRes.ok) setManagedUsers(await usersRes.json());
        if (recRes.ok) setRecoveryRequests(await recRes.json());
        if (idCfgRes.ok) setStudentIdConfig(await idCfgRes.json());
      }

      if (authProfile && authProfile.role === 'ADMIN') {
        const auditRes = await fetch('/api/auth/audit-logs', { headers });
        if (auditRes.ok) {
          const dbLogs = await auditRes.json();
          setAuditLogs(
            dbLogs.map((l: any) => ({
              id: l.id,
              actor: `${l.actorName} (${l.actorRole})`,
              action: l.action,
              target: l.target,
              timestamp: l.createdAt,
              details: l.details,
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Error refreshing RBAC data:', err);
    }
  }, [sessionToken, authProfile]);

  // Verify stored session token on initial mount
  useEffect(() => {
    let mounted = true;
    async function verifyBootSession() {
      const initialPath = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const queryRedirect = searchParams.get('redirect');
      const desiredPath =
        queryRedirect || (initialPath !== '/' && initialPath !== '/login' ? initialPath : null);

      if (!sessionToken) {
        if (mounted) {
          setAuthProfile(null);
          setIsAuthLoading(false);
          setCurrentViewInternal('login');
          try {
            if (desiredPath) {
              setRedirectTarget(desiredPath);
              window.history.replaceState(
                {},
                '',
                `/login?redirect=${encodeURIComponent(desiredPath)}`
              );
            } else if (window.location.pathname !== '/login') {
              window.history.replaceState({}, '', '/login');
            }
          } catch {}
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok) {
          localStorage.removeItem('ntapulse_session_token');
          sessionStorage.removeItem('ntapulse_session_token');
          if (mounted) {
            setSessionToken(null);
            setAuthProfile(null);
            setIsAuthLoading(false);
            setCurrentViewInternal('login');
            try {
              window.history.replaceState({}, '', '/login');
            } catch {}
          }
          return;
        }

        const data = await res.json();
        const profile: AuthProfile = data.profile;
        if (mounted) {
          setAuthProfile(profile);
          setIsAuthLoading(false);

          if (profile.mustChangePassword) {
            setCurrentViewInternal('first-login-reset');
            try {
              window.history.replaceState({}, '', '/student/first-login');
            } catch {}
            return;
          }

          if (desiredPath) {
            const mapped = pathToView(desiredPath);
            if (mapped.startsWith('admin') && profile.role !== 'ADMIN') {
              setAccessDeniedMessage('Access Denied — Administrator privileges required.');
              setCurrentViewInternal('access-denied');
              return;
            }
            if (mapped === 'teacher-dashboard' && profile.role === 'STUDENT') {
              setAccessDeniedMessage('Access Denied — Faculty / Teacher privileges required.');
              setCurrentViewInternal('access-denied');
              return;
            }
            setCurrentViewInternal(mapped);
            try {
              window.history.replaceState({}, '', viewToPath(mapped));
            } catch {}
          } else {
            const defaultView: AppView =
              profile.role === 'ADMIN'
                ? 'admin-dashboard'
                : profile.role === 'TEACHER'
                ? 'teacher-dashboard'
                : 'student-dashboard';
            setCurrentViewInternal(defaultView);
            try {
              window.history.replaceState({}, '', viewToPath(defaultView));
            } catch {}
          }
        }
      } catch {
        if (mounted) {
          setIsAuthLoading(false);
          setCurrentViewInternal('login');
        }
      }
    }

    verifyBootSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (authProfile && sessionToken) {
      refreshRbacData();
    }
  }, [authProfile, sessionToken, refreshRbacData]);

  // Login with Role (STUDENT / TEACHER / ADMIN)
  const loginWithCredentials = async (params: {
    role: UserRole;
    identifier: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<{ success: boolean; error?: string; accountStatus?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Authentication failed.',
          accountStatus: data.accountStatus,
        };
      }

      const token: string = data.token;
      const profile: AuthProfile = data.profile;

      try {
        if (params.rememberMe) {
          localStorage.setItem('ntapulse_session_token', token);
        } else {
          sessionStorage.setItem('ntapulse_session_token', token);
          localStorage.setItem('ntapulse_session_token', token);
        }
      } catch {}

      setSessionToken(token);
      setAuthProfile(profile);
      setAccessDeniedMessage(null);

      // Check First Login Password Change requirement (Section 4)
      if (profile.mustChangePassword) {
        setCurrentViewInternal('first-login-reset');
        try {
          window.history.pushState({}, '', '/student/first-login');
        } catch {}
        return { success: true };
      }

      // Check redirect target (Section 5 & 6)
      if (redirectTarget && redirectTarget !== '/' && redirectTarget !== '/login') {
        const targetView = pathToView(redirectTarget);
        setRedirectTarget(null);
        if (targetView.startsWith('admin') && profile.role !== 'ADMIN') {
          setAccessDeniedMessage('Access Denied — Administrator privileges required.');
          setCurrentViewInternal('access-denied');
          try {
            window.history.pushState({}, '', '/admin');
          } catch {}
          return { success: true };
        }
        if (targetView === 'teacher-dashboard' && profile.role === 'STUDENT') {
          setAccessDeniedMessage('Access Denied — Faculty / Teacher privileges required.');
          setCurrentViewInternal('access-denied');
          try {
            window.history.pushState({}, '', '/teacher/dashboard');
          } catch {}
          return { success: true };
        }
        setCurrentViewInternal(targetView);
        try {
          window.history.pushState({}, '', viewToPath(targetView));
        } catch {}
        return { success: true };
      }

      // Default role landing route
      const nextView: AppView =
        profile.role === 'ADMIN'
          ? 'admin-dashboard'
          : profile.role === 'TEACHER'
          ? 'teacher-dashboard'
          : 'student-dashboard';
      setCurrentViewInternal(nextView);
      try {
        window.history.pushState({}, '', viewToPath(nextView));
      } catch {}
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while signing in.' };
    }
  };

  // Complete First Login Password Creation
  const completeFirstLoginPassword = async (
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!sessionToken) return { success: false, error: 'Not authenticated.' };
    try {
      const res = await fetch('/api/auth/first-login-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update password.' };
      }
      setAuthProfile(data.profile);
      setCurrentViewInternal('student-dashboard');
      try {
        window.history.pushState({}, '', '/student/dashboard');
      } catch {}
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to save new password.' };
    }
  };

  const requestPasswordRecovery = async (params: {
    role: UserRole;
    identifier: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return {
        success: res.ok,
        message: data.message || data.error || 'Password recovery request logged.',
      };
    } catch {
      return { success: false, message: 'Failed to submit recovery request.' };
    }
  };

  const logout = useCallback(async () => {
    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      } catch {}
    }
    try {
      localStorage.removeItem('ntapulse_session_token');
      sessionStorage.removeItem('ntapulse_session_token');
    } catch {}
    setSessionToken(null);
    setAuthProfile(null);
    setAccessDeniedMessage(null);
    setRedirectTarget(null);
    setCurrentViewInternal('login');
    try {
      window.history.pushState({}, '', '/login');
    } catch {}
  }, [sessionToken]);

  // Staff RBAC Mutations
  const createTeacher = async (data: any) => {
    if (!sessionToken) return { success: false, error: 'Not authenticated' };
    const res = await fetch('/api/auth/teachers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(data),
    });
    const out = await res.json();
    if (!res.ok) return { success: false, error: out.error };
    await refreshRbacData();
    return { success: true, profile: out.profile };
  };

  const createStudent = async (data: any) => {
    if (!sessionToken) return { success: false, error: 'Not authenticated' };
    const res = await fetch('/api/auth/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(data),
    });
    const out = await res.json();
    if (!res.ok) return { success: false, error: out.error };
    await refreshRbacData();
    return {
      success: true,
      profile: out.profile,
      generatedStudentId: out.generatedStudentId,
      temporaryPassword: out.temporaryPassword,
    };
  };

  const updateUserAccount = async (userId: string, patch: any) => {
    if (!sessionToken) return { success: false, error: 'Not authenticated' };
    const res = await fetch(`/api/auth/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(patch),
    });
    const out = await res.json();
    if (!res.ok) return { success: false, error: out.error };
    await refreshRbacData();
    return { success: true };
  };

  const deleteUserAccount = async (userId: string) => {
    if (!sessionToken) return { success: false, error: 'Not authenticated' };
    const res = await fetch(`/api/auth/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const out = await res.json();
    if (!res.ok) return { success: false, error: out.error };
    await refreshRbacData();
    return { success: true };
  };

  const resetUserPassword = async (
    userId: string,
    newTemporaryPassword: string,
    forceChange = true
  ) => {
    if (!sessionToken) return { success: false, error: 'Not authenticated' };
    const res = await fetch(`/api/auth/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        newTemporaryPassword,
        forceChangeOnNextLogin: forceChange,
      }),
    });
    const out = await res.json();
    if (!res.ok) return { success: false, error: out.error };
    await refreshRbacData();
    return { success: true };
  };

  const revokeUserSessions = async (userId: string) => {
    if (!sessionToken) return { success: false };
    const res = await fetch(`/api/auth/users/${userId}/revoke-sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const out = await res.json();
    await refreshRbacData();
    return { success: res.ok, revokedCount: out.revokedCount };
  };

  const createBatch = async (data: any) => {
    if (!sessionToken) return { success: false, error: 'Not authenticated' };
    const res = await fetch('/api/auth/batches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(data),
    });
    const out = await res.json();
    if (!res.ok) return { success: false, error: out.error };
    await refreshRbacData();
    return { success: true };
  };

  const updateBatch = async (batchId: string, patch: any) => {
    if (!sessionToken) return { success: false, error: 'Not authenticated' };
    const res = await fetch(`/api/auth/batches/${batchId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(patch),
    });
    const out = await res.json();
    if (!res.ok) return { success: false, error: out.error };
    await refreshRbacData();
    return { success: true };
  };

  const deleteBatch = async (batchId: string) => {
    if (!sessionToken) return false;
    await fetch(`/api/auth/batches/${batchId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    await refreshRbacData();
    return true;
  };

  const publishAnnouncement = async (data: any) => {
    if (!sessionToken) return false;
    const res = await fetch('/api/auth/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(data),
    });
    if (res.ok) await refreshRbacData();
    return res.ok;
  };

  const removeAnnouncement = async (id: string) => {
    if (!sessionToken) return;
    await fetch(`/api/auth/announcements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    await refreshRbacData();
  };

  const saveTestAssignment = async (data: any) => {
    if (!sessionToken) return false;
    const res = await fetch('/api/auth/test-assignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(data),
    });
    if (res.ok) await refreshRbacData();
    return res.ok;
  };

  const resolveRecovery = async (requestId: string, newTemporaryPassword: string) => {
    if (!sessionToken) return { success: false, error: 'Not authenticated' };
    const res = await fetch(`/api/auth/recovery-requests/${requestId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ newTemporaryPassword }),
    });
    const out = await res.json();
    if (!res.ok) return { success: false, error: out.error };
    await refreshRbacData();
    return { success: true };
  };

  const saveStudentIdConfig = async (patch: Partial<StudentIdConfig>) => {
    if (!sessionToken) return;
    const res = await fetch('/api/auth/student-id-config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setStudentIdConfig(await res.json());
      await refreshRbacData();
    }
  };

  const [tests, setTests] = useState<TestDefinition[]>(SEED_TESTS);
  const [questions, setQuestions] = useState<Question[]>(() => getCentralizedQuestionBank());
  const [activeTest, setActiveTest] = useState<TestDefinition | null>(null);
  const [examBlueprints, setExamBlueprints] = useState<Record<string, ExamBlueprint>>(() => {
    try {
      const saved = localStorage.getItem('ntapulse_exam_blueprints');
      return saved ? JSON.parse(saved) : OFFICIAL_EXAM_BLUEPRINTS;
    } catch {
      return OFFICIAL_EXAM_BLUEPRINTS;
    }
  });

  const updateExamBlueprint = (key: string, blueprint: ExamBlueprint) => {
    setExamBlueprints((prev) => {
      const next = { ...prev, [key]: blueprint };
      try {
        localStorage.setItem('ntapulse_exam_blueprints', JSON.stringify(next));
      } catch {}
      return next;
    });
    logAdminAction('UPDATE_BLUEPRINT', blueprint.name, `Updated ${blueprint.exam} pattern (${blueprint.totalQuestions} Qs, ${blueprint.totalMarks} Marks)`);
  };

  const generateBlueprintMockTest = async (
    blueprintKey: string,
    customTitle?: string
  ): Promise<TestDefinition> => {
    const bp = examBlueprints[blueprintKey] || OFFICIAL_EXAM_BLUEPRINTS.JEE_MAIN_2026;
    const testId = `${bp.exam.toLowerCase().replace('_', '-')}-mock-${Date.now().toString().slice(-5)}`;
    const selectedQuestions = selectQuestionsForBlueprint(questions, bp, testId);
    const snapshotIds = selectedQuestions.map((q) => q.questionId || q.id);

    const newTestPayload: Partial<TestDefinition> = {
      id: testId,
      title:
        customTitle ||
        `${bp.exam.replace('_', ' ')} Official Blueprint Mock (${new Date().toLocaleDateString()})`,
      subtitle: `${bp.totalQuestions} Compulsory Questions • ${bp.totalMarks} Marks • ${bp.durationMinutes} Minutes`,
      examType: bp.exam,
      testType: 'FULL_MOCK',
      patternYear: 2026,
      blueprintId: bp.id,
      patternSource: bp.sourceDocument,
      durationMinutes: bp.durationMinutes,
      totalMarks: bp.totalMarks,
      positiveMarks: bp.markingScheme.mcq.positive,
      negativeMarks: bp.markingScheme.mcq.negative,
      subjects: bp.subjects,
      questionsCount: selectedQuestions.length,
      difficulty: 'MEDIUM',
      syllabus: bp.sections.map(
        (s) => `${s.subject} — ${s.sectionName}: ${s.totalQuestions} Questions (+${s.positiveMarks}, -${s.negativeMarks})`
      ),
      description: `Generated via 10-step intelligent question rotation engine using ${bp.name}. Saved snapshot with zero duplicate questions.`,
      published: true,
      sections: bp.sections,
      questions: selectedQuestions,
      snapshotQuestionIds: snapshotIds,
      attemptSnapshots: [
        {
          attemptNumber: 1,
          setLabel: 'Set A',
          questionIds: snapshotIds,
          createdAt: new Date().toISOString(),
        },
      ],
      activeAttemptSet: 'Set A',
    };

    return await publishTest(newTestPayload);
  };

  const updateTestDefinition = async (testId: string, patch: Partial<TestDefinition>) => {
    try {
      await fetch(`/api/tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
    setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, ...patch } : t)));
  };

  const deleteTestDefinition = async (testId: string) => {
    try {
      await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
    } catch {}
    setTests((prev) => prev.filter((t) => t.id !== testId));
  };

  // Compute accessible tests based on Section 12 (Test Access Control)
  const accessibleTests = React.useMemo(() => {
    if (!authProfile) return [];
    if (authProfile.role === 'ADMIN' || authProfile.role === 'TEACHER') {
      return tests;
    }

    // Student filtering: check testAssignments + batch assigned tests + direct student testAccess
    const assignmentMap = new Map<string, TestAssignmentRecord>();
    testAssignments.forEach((a) => assignmentMap.set(a.testId, a));

    return tests.filter((test) => {
      if (!test.published) return false;
      const rule = assignmentMap.get(test.id);
      if (!rule || rule.visibility === 'PUBLIC') {
        return true;
      }
      // Visibility is ASSIGNED_ONLY
      if (rule.assignedStudentIds.includes(authProfile.id)) return true;
      if (authProfile.batchId && rule.assignedBatchIds.includes(authProfile.batchId)) return true;
      if (authProfile.teacherId && rule.assignedTeacherIds.includes(authProfile.teacherId)) return true;
      if (authProfile.testAccess.includes(test.id)) return true;
      return false;
    });
  }, [tests, authProfile, testAssignments]);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('ntapulse_theme');
      return saved === 'dark' || saved === 'light' ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ntapulse_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Command palette
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global keydown for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (authProfile) {
          setIsCommandPaletteOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authProfile]);

  // Network online/offline tracking
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine ?? true);

  // CBT Exam State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [responses, setResponses] = useState<Record<string, UserExamResponse>>({});
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(180 * 60);
  const [isExamRunning, setIsExamRunning] = useState<boolean>(false);
  const [examMode, setExamMode] = useState<ExamMode>('SIMULATION');
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState<boolean>(false);
  const [lastSavedText, setLastSavedText] = useState<string>('All responses saved');
  const [examStartTime, setExamStartTime] = useState<number>(0);
  const [integrityEvents, setIntegrityEvents] = useState<ExamIntegrityEvent[]>([]);

  const logIntegrityEvent = useCallback((type: ExamIntegrityEvent['type'], details: string) => {
    const event: ExamIntegrityEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp: new Date().toISOString(),
      details,
    };
    setIntegrityEvents((prev) => [...prev, event]);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logIntegrityEvent('NETWORK_RECONNECTED', 'Client restored network connection to server');
    };
    const handleOffline = () => {
      setIsOnline(false);
      logIntegrityEvent('NETWORK_OFFLINE', 'Client network connection dropped');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [logIntegrityEvent]);

  // Results & History
  const [currentAttemptResult, setCurrentAttemptResult] = useState<TestAttemptResult | null>(null);
  const [attemptHistory, setAttemptHistory] = useState<TestAttemptResult[]>(() => {
    try {
      const saved = localStorage.getItem('ntapulse_attempt_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<QuestionBookmark[]>(() => {
    try {
      const saved = localStorage.getItem('ntapulse_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ntapulse_bookmarks', JSON.stringify(bookmarks));
    } catch {}
  }, [bookmarks]);

  // Reports
  const [reports, setReports] = useState<QuestionReport[]>(() => {
    try {
      const saved = localStorage.getItem('ntapulse_reports');
      return saved ? JSON.parse(saved) : INITIAL_REPORTS;
    } catch {
      return INITIAL_REPORTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ntapulse_reports', JSON.stringify(reports));
    } catch {}
  }, [reports]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // System Settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('ntapulse_settings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const logAdminAction = (action: string, target: string, details?: string) => {
    const entry: AuditLog = {
      id: `audit-${Date.now()}`,
      actor: authProfile ? `${authProfile.fullName} (${authProfile.role})` : currentUser.name,
      action,
      target,
      timestamp: new Date().toISOString(),
      details,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const updateSystemSettings = (newSettings: Partial<SystemSettings>) => {
    setSystemSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('ntapulse_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    logAdminAction('UPDATE_SETTINGS', 'System Configuration', JSON.stringify(newSettings));
  };

  // Active Session Persistence
  const [inProgressSession, setInProgressSession] = useState<ActiveExamSession | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ntapulse_active_session');
      if (saved) {
        const parsed: ActiveExamSession = JSON.parse(saved);
        if (parsed && parsed.testId && parsed.timerSecondsLeft > 0) {
          setInProgressSession(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isExamRunning || !activeTest) return;

    try {
      const sessionData: ActiveExamSession = {
        testId: activeTest.id,
        responses,
        timerSecondsLeft,
        examStartTime,
        currentQuestionIdx,
        examMode,
        integrityEvents,
        lastSavedTimestamp: Date.now(),
      };
      localStorage.setItem('ntapulse_active_session', JSON.stringify(sessionData));
    } catch {}
  }, [
    isExamRunning,
    activeTest,
    responses,
    timerSecondsLeft,
    currentQuestionIdx,
    examMode,
    integrityEvents,
    examStartTime,
  ]);

  useEffect(() => {
    if (!isExamRunning) return;

    const handleVisibility = () => {
      if (document.hidden) {
        logIntegrityEvent('TAB_HIDDEN', 'Candidate navigated away or minimized test browser tab');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isExamRunning, logIntegrityEvent]);

  const loadTests = useCallback(async () => {
    try {
      const res = await fetch('/api/tests?customOnly=true');
      if (res.ok) {
        const customTests: TestDefinition[] = await res.json();
        if (Array.isArray(customTests) && customTests.length > 0) {
          const customIds = new Set(customTests.map((t) => t.id));
          setTests([...customTests, ...SEED_TESTS.filter((t) => !customIds.has(t.id))]);
        }
      }
    } catch {}
  }, []);

  const [totalQuestionsInBank, setTotalQuestionsInBank] = useState<number>(50000);
  const [questionBankPage, setQuestionBankPage] = useState<number>(1);
  const [questionBankTotalPages, setQuestionBankTotalPages] = useState<number>(1000);

  const loadQuestions = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      subject?: string;
      difficulty?: string;
      search?: string;
    }) => {
      try {
        const qPage = params?.page || 1;
        const qLimit = params?.limit || 50;
        let url = `/api/questions?page=${qPage}&limit=${qLimit}`;
        if (params?.subject && params.subject !== 'ALL')
          url += `&subject=${encodeURIComponent(params.subject)}`;
        if (params?.difficulty && params.difficulty !== 'ALL')
          url += `&difficulty=${encodeURIComponent(params.difficulty)}`;
        if (params?.search) url += `&search=${encodeURIComponent(params.search)}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.items && Array.isArray(data.items)) {
            const central = getCentralizedQuestionBank();
            const map = new Map<string, Question>();
            data.items.forEach((q: Question) => map.set(q.questionId || q.id, enrichQuestionRecord(q)));
            central.forEach((q) => {
              const key = q.questionId || q.id;
              if (!map.has(key)) map.set(key, q);
            });
            setQuestions(Array.from(map.values()));
            setTotalQuestionsInBank(Math.max(data.total || 50000, map.size));
            setQuestionBankPage(data.page || 1);
            setQuestionBankTotalPages(data.totalPages || 1000);
          } else if (Array.isArray(data) && data.length > 0) {
            const central = getCentralizedQuestionBank();
            const map = new Map<string, Question>();
            data.forEach((q: Question) => map.set(q.questionId || q.id, enrichQuestionRecord(q)));
            central.forEach((q) => {
              const key = q.questionId || q.id;
              if (!map.has(key)) map.set(key, q);
            });
            setQuestions(Array.from(map.values()));
            setTotalQuestionsInBank(Math.max(50000, map.size));
          }
        }
      } catch {}
    },
    []
  );

  const loadAttempts = useCallback(async () => {
    try {
      const res = await fetch('/api/attempts');
      if (res.ok) {
        const data: TestAttemptResult[] = await res.json();
        if (Array.isArray(data)) {
          setAllAttempts(data);
          if (authProfile) {
            const mine = data.filter((a) => a.userId === authProfile.id);
            setAttemptHistory(mine);
          }
        }
      }
    } catch {}
  }, [authProfile]);

  useEffect(() => {
    loadTests();
    loadQuestions();
    loadAttempts();
  }, [loadTests, loadQuestions, loadAttempts]);

  // Legacy shims
  const login = async (_email: string): Promise<boolean> => {
    setIsAuthModalOpen(false);
    return true;
  };

  const register = async (): Promise<boolean> => {
    setIsAuthModalOpen(false);
    return true;
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...profile }));
  };

  const toggleUserRole = () => {
    // Role switching is strictly controlled by real login credentials now
  };

  // Add Question with Normalized Fingerprint Duplicate Detection (Part 1 & Part 2)
  const addQuestion = async (q: Partial<Question>): Promise<Question> => {
    const candidateText = q.questionText || '';
    const candidateSubj = q.subject || 'Physics';
    const candidateType = q.type || 'MCQ';
    const candidateExam = q.examType || 'JEE_MAIN';
    const fp = computeQuestionFingerprint(candidateText, candidateSubj, candidateType);

    // Check if an identical fingerprint already exists in the centralized question bank
    const existingDuplicate = questions.find(
      (item) =>
        (item.fingerprint ||
          computeQuestionFingerprint(item.questionText, item.subject, item.type)) === fp
    );
    if (existingDuplicate) {
      return existingDuplicate;
    }

    const canonicalId =
      q.questionId ||
      formatCanonicalQuestionId(candidateExam, candidateSubj, questions.length + 1);

    const enrichedPayload = enrichQuestionRecord(
      {
        id: canonicalId,
        questionId: canonicalId,
        examType: candidateExam,
        subject: candidateSubj,
        chapter: q.chapter || 'General',
        topic: q.topic || 'General Topic',
        difficulty: q.difficulty || 'MEDIUM',
        type: candidateType,
        questionText: candidateText,
        latex: q.latex,
        diagramSvg: q.diagramSvg,
        image: q.image,
        hasImage: Boolean(q.hasImage || q.diagramSvg || q.image),
        options: q.options || [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
          { id: 'C', text: 'Option C' },
          { id: 'D', text: 'Option D' },
        ],
        correctAnswer: q.correctAnswer || 'A',
        explanation: q.explanation || '',
        positiveMarks: q.positiveMarks || 4,
        negativeMarks: q.negativeMarks || 1,
        source: q.source || 'ADMIN',
        status: q.status || 'PUBLISHED',
        createdAt: new Date().toISOString(),
        fingerprint: fp,
      },
      questions.length + 1
    );

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedPayload),
      });
      if (res.ok) {
        const created = enrichQuestionRecord(await res.json(), questions.length + 1);
        setQuestions((prev) => [created, ...prev]);
        logAdminAction('CREATE_QUESTION', created.id, `${created.subject} - ${created.chapter}`);
        return created;
      }
    } catch {}

    setQuestions((prev) => [enrichedPayload, ...prev]);
    return enrichedPayload;
  };

  const deleteQuestion = async (id: string): Promise<void> => {
    try {
      await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    } catch {}
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    logAdminAction('DELETE_QUESTION', id);
  };

  const updateQuestion = async (id: string, q: Partial<Question>): Promise<void> => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...q } : item)));
    logAdminAction('UPDATE_QUESTION', id);
  };

  const publishTest = async (newTest: Partial<TestDefinition>): Promise<TestDefinition> => {
    // Deduplicate questions inside newTest before saving snapshot
    const usedQuestionIds = new Set<string>();
    const usedFingerprints = new Set<string>();
    const deduplicatedQuestions: Question[] = [];

    for (const q of newTest.questions || []) {
      const qid = q.questionId || q.id;
      const fp = q.fingerprint || computeQuestionFingerprint(q.questionText, q.subject, q.type);
      if (!usedQuestionIds.has(qid) && !usedFingerprints.has(fp)) {
        usedQuestionIds.add(qid);
        usedFingerprints.add(fp);
        deduplicatedQuestions.push(enrichQuestionRecord(q));
      }
    }

    const snapshotIds = deduplicatedQuestions.map((q) => q.questionId || q.id);

    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTest,
          questions: deduplicatedQuestions,
          questionsCount: deduplicatedQuestions.length,
          snapshotQuestionIds: snapshotIds,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const enrichedTest: TestDefinition = {
          ...created,
          questions: deduplicatedQuestions,
          questionsCount: deduplicatedQuestions.length,
          snapshotQuestionIds: snapshotIds,
          attemptSnapshots: [
            {
              attemptNumber: 1,
              setLabel: 'Set A',
              questionIds: snapshotIds,
              createdAt: created.createdAt || new Date().toISOString(),
            },
          ],
          activeAttemptSet: 'Set A',
        };
        setTests((prev) => [enrichedTest, ...prev]);
        logAdminAction('PUBLISH_TEST', enrichedTest.id, enrichedTest.title);
        return enrichedTest;
      }
    } catch {}
    const localTest: TestDefinition = {
      id: newTest.id || `test-loc-${Date.now()}`,
      title: newTest.title || 'New Practice Test',
      subtitle: newTest.subtitle || 'Comprehensive Mock',
      examType: newTest.examType || 'JEE_MAIN',
      testType: newTest.testType || 'CUSTOM',
      patternYear: newTest.patternYear || 2026,
      blueprintId: newTest.blueprintId,
      patternSource: newTest.patternSource || 'NTA/JAB Official 2026 Bulletin',
      durationMinutes: newTest.durationMinutes || 60,
      totalMarks: newTest.totalMarks || deduplicatedQuestions.length * 4,
      positiveMarks: newTest.positiveMarks || 4,
      negativeMarks: newTest.negativeMarks || 1,
      subjects: newTest.subjects || ['Physics'],
      questionsCount: deduplicatedQuestions.length,
      difficulty: newTest.difficulty || 'MEDIUM',
      syllabus: newTest.syllabus || [],
      description: newTest.description || '',
      published: true,
      sections: newTest.sections,
      questions: deduplicatedQuestions,
      snapshotQuestionIds: snapshotIds,
      attemptSnapshots: [
        {
          attemptNumber: 1,
          setLabel: 'Set A',
          questionIds: snapshotIds,
          createdAt: new Date().toISOString(),
        },
      ],
      activeAttemptSet: 'Set A',
      createdAt: new Date().toISOString(),
    };
    setTests((prev) => [localTest, ...prev]);
    return localTest;
  };

  // Start CBT Exam with Saved Snapshot & Multi-Attempt Set Support (Part 5)
  const startCbtExam = (
    test: TestDefinition,
    mode: ExamMode = 'SIMULATION',
    attemptNumber?: number
  ) => {
    // Count how many times the current student has already attempted this test
    const myPriorAttemptsCount = attemptHistory.filter((a) => a.testId === test.id).length;
    const effectiveAttemptNum = attemptNumber ?? (myPriorAttemptsCount + 1);

    const resolvedSnapshot = createOrResolveAttemptSnapshot(
      test,
      questions,
      effectiveAttemptNum
    );

    const snapshotBoundTest: TestDefinition = {
      ...test,
      questions: resolvedSnapshot.questions,
      questionsCount: resolvedSnapshot.questions.length,
      snapshotQuestionIds: resolvedSnapshot.snapshotQuestionIds,
      attemptSnapshots: resolvedSnapshot.updatedSnapshots,
      activeAttemptSet: resolvedSnapshot.setLabel,
    };

    // Persist updated attemptSnapshots on the test definition in state
    setTests((prev) =>
      prev.map((t) =>
        t.id === test.id
          ? {
              ...t,
              attemptSnapshots: resolvedSnapshot.updatedSnapshots,
            }
          : t
      )
    );

    setActiveTest(snapshotBoundTest);
    setCurrentQuestionIdx(0);
    setExamMode(mode);
    setIntegrityEvents([]);

    const initialResponses: Record<string, UserExamResponse> = {};
    snapshotBoundTest.questions.forEach((q, idx) => {
      initialResponses[q.id] = {
        questionId: q.id,
        status: idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED',
        timeSpentSeconds: 0,
      };
    });
    setResponses(initialResponses);
    const totalSecs = (snapshotBoundTest.durationMinutes || 180) * 60;
    setTimerSecondsLeft(totalSecs);
    setExamStartTime(Date.now());
    setIsExamRunning(true);
    setHasAutoSubmitted(false);
    setInProgressSession(null);
    setCurrentView('cbt-exam');
  };

  const resumeExam = () => {
    if (!inProgressSession) return;
    const foundTest = tests.find((t) => t.id === inProgressSession.testId);
    if (!foundTest) {
      discardExamSession();
      return;
    }

    setActiveTest(foundTest);
    setResponses(inProgressSession.responses || {});
    setTimerSecondsLeft(inProgressSession.timerSecondsLeft || 3600);
    setExamStartTime(inProgressSession.examStartTime || Date.now());
    setCurrentQuestionIdx(inProgressSession.currentQuestionIdx || 0);
    setExamMode(inProgressSession.examMode || 'SIMULATION');
    setIntegrityEvents(inProgressSession.integrityEvents || []);
    setIsExamRunning(true);
    setHasAutoSubmitted(false);
    setInProgressSession(null);
    setCurrentView('cbt-exam');
  };

  const discardExamSession = () => {
    setInProgressSession(null);
    try {
      localStorage.removeItem('ntapulse_active_session');
    } catch {}
  };

  // Timer Tick
  useEffect(() => {
    if (!isExamRunning) return;

    const interval = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setHasAutoSubmitted(true);
          return 0;
        }
        return prev - 1;
      });

      if (activeTest && activeTest.questions[currentQuestionIdx]) {
        const qId = activeTest.questions[currentQuestionIdx].id;
        setResponses((prev) => {
          const existing = prev[qId];
          if (!existing) return prev;
          return {
            ...prev,
            [qId]: {
              ...existing,
              timeSpentSeconds: existing.timeSpentSeconds + 1,
            },
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isExamRunning, activeTest, currentQuestionIdx]);

  // Helper to change question index
  const changeQuestionIdx = (newIdx: number) => {
    if (!activeTest || newIdx < 0 || newIdx >= activeTest.questions.length) return;
    const targetQ = activeTest.questions[newIdx];
    setCurrentQuestionIdx(newIdx);

    setResponses((prev) => {
      const existing = prev[targetQ.id];
      if (!existing || existing.status === 'NOT_VISITED') {
        return {
          ...prev,
          [targetQ.id]: {
            questionId: targetQ.id,
            status: 'NOT_ANSWERED',
            timeSpentSeconds: existing ? existing.timeSpentSeconds : 0,
          },
        };
      }
      return prev;
    });
  };

  const recordAnswer = (questionId: string, option?: string, numerical?: string) => {
    setResponses((prev) => {
      const existing = prev[questionId] || {
        questionId,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };
      const isCurrentlyMarked =
        existing.status === 'MARKED_FOR_REVIEW' || existing.status === 'ANSWERED_AND_MARKED';
      const newStatus: PaletteStatus = isCurrentlyMarked ? 'ANSWERED_AND_MARKED' : 'ANSWERED';

      return {
        ...prev,
        [questionId]: {
          ...existing,
          selectedOption: option !== undefined ? option : existing.selectedOption,
          numericalValue: numerical !== undefined ? numerical : existing.numericalValue,
          status: newStatus,
        },
      };
    });
    setLastSavedText('Auto-saved just now');
  };

  const markForReview = (questionId: string) => {
    setResponses((prev) => {
      const existing = prev[questionId] || {
        questionId,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };
      const hasAnswer = !!(existing.selectedOption || existing.numericalValue?.trim());
      const newStatus: PaletteStatus = hasAnswer ? 'ANSWERED_AND_MARKED' : 'MARKED_FOR_REVIEW';

      return {
        ...prev,
        [questionId]: {
          ...existing,
          status: newStatus,
        },
      };
    });

    if (activeTest && currentQuestionIdx < activeTest.questions.length - 1) {
      changeQuestionIdx(currentQuestionIdx + 1);
    }
    setLastSavedText('Marked for review & moved next');
  };

  const saveAndMarkForReview = (questionId: string) => {
    setResponses((prev) => {
      const existing = prev[questionId] || {
        questionId,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };
      const hasAnswer = !!(existing.selectedOption || existing.numericalValue?.trim());
      const newStatus: PaletteStatus = hasAnswer ? 'ANSWERED_AND_MARKED' : 'MARKED_FOR_REVIEW';

      return {
        ...prev,
        [questionId]: {
          ...existing,
          status: newStatus,
        },
      };
    });

    if (activeTest && currentQuestionIdx < activeTest.questions.length - 1) {
      changeQuestionIdx(currentQuestionIdx + 1);
    }
    setLastSavedText('Saved & Marked for Review (Will be evaluated)');
  };

  const clearResponse = (questionId: string) => {
    setResponses((prev) => {
      const existing = prev[questionId] || {
        questionId,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };
      return {
        ...prev,
        [questionId]: {
          ...existing,
          selectedOption: undefined,
          numericalValue: undefined,
          status: 'NOT_ANSWERED',
        },
      };
    });
    setLastSavedText('Response cleared');
  };

  const saveAndNext = () => {
    if (!activeTest) return;
    const currentQ = activeTest.questions[currentQuestionIdx];
    setResponses((prev) => {
      const existing = prev[currentQ.id];
      if (!existing) return prev;
      const hasAnswer = !!(existing.selectedOption || existing.numericalValue?.trim());
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          status: hasAnswer ? 'ANSWERED' : 'NOT_ANSWERED',
        },
      };
    });

    if (currentQuestionIdx < activeTest.questions.length - 1) {
      changeQuestionIdx(currentQuestionIdx + 1);
    }
    setLastSavedText('Response saved');
  };

  // Submit Exam
  const submitExam = async (): Promise<TestAttemptResult | null> => {
    if (!activeTest) return null;
    setIsExamRunning(false);

    try {
      localStorage.removeItem('ntapulse_active_session');
    } catch {}

    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - examStartTime) / 1000));
    const uid = authProfile?.id || currentUser.id;
    const uname = authProfile?.fullName || currentUser.name;

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: activeTest.id,
          testDefinition: activeTest,
          responses,
          timeTakenSeconds,
          userId: uid,
          userName: uname,
          startedAt: new Date(examStartTime).toISOString(),
        }),
      });

      if (res.ok) {
        const attemptResult: TestAttemptResult = await res.json();
        setCurrentAttemptResult(attemptResult);
        setAllAttempts((prev) => [attemptResult, ...prev]);
        setAttemptHistory((prev) => {
          const updated = [attemptResult, ...prev];
          try {
            localStorage.setItem('ntapulse_attempt_history', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        setCurrentView('result');
        return attemptResult;
      }
    } catch {}

    const { evaluateTestAttempt } = await import('../utils/evaluationEngine');
    const localResult = evaluateTestAttempt(
      activeTest,
      responses,
      (activeTest.durationMinutes || 180) * 60,
      timeTakenSeconds,
      uid,
      uname
    );
    setCurrentAttemptResult(localResult);
    setAllAttempts((prev) => [localResult, ...prev]);
    setAttemptHistory((prev) => [localResult, ...prev]);
    setCurrentView('result');
    return localResult;
  };

  // Auto-submit when time reaches zero
  useEffect(() => {
    if (timerSecondsLeft === 0 && isExamRunning && !hasAutoSubmitted) {
      setHasAutoSubmitted(true);
      logIntegrityEvent('TIMEOUT', 'Timer elapsed to 0:00:00. Auto-submitting paper.');
      submitExam();
    }
  }, [timerSecondsLeft, isExamRunning, hasAutoSubmitted]);

  const viewAttemptResult = (attempt: TestAttemptResult) => {
    setCurrentAttemptResult(attempt);
    setCurrentView('result');
  };

  // Bookmarks
  const addBookmark = (
    questionId: string,
    collection: string = 'General Revision',
    note?: string
  ) => {
    const qObj =
      questions.find((q) => q.id === questionId) ||
      activeTest?.questions.find((q) => q.id === questionId);
    setBookmarks((prev) => {
      if (prev.some((b) => b.questionId === questionId)) {
        return prev.map((b) =>
          b.questionId === questionId ? { ...b, collection, note } : b
        );
      }
      return [
        {
          id: `bm-${Date.now()}`,
          questionId,
          collection,
          note,
          createdAt: new Date().toISOString(),
          question: qObj,
        },
        ...prev,
      ];
    });
  };

  const removeBookmark = (questionId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.questionId !== questionId));
  };

  const isBookmarked = (questionId: string) => {
    return bookmarks.some((b) => b.questionId === questionId);
  };

  // Mistake Book
  const mistakeQuestions = React.useMemo(() => {
    const missedMap = new Map<string, Question>();
    attemptHistory.forEach((att) => {
      att.questionReviews?.forEach((rev) => {
        if (!rev.isCorrect && rev.isAttempted) {
          missedMap.set(rev.question.id, rev.question);
        }
      });
    });
    return Array.from(missedMap.values());
  }, [attemptHistory]);

  const startMistakePractice = (subjectFilter?: string) => {
    let targetQuestions = mistakeQuestions;
    if (subjectFilter && subjectFilter !== 'ALL') {
      targetQuestions = targetQuestions.filter((q) => q.subject === subjectFilter);
    }

    if (targetQuestions.length === 0) {
      targetQuestions = questions.slice(0, 15);
    }

    const test: TestDefinition = {
      id: `mistake-practice-${Date.now()}`,
      title: 'Mistake Book Revision Sprint',
      subtitle: `Targeted review of ${targetQuestions.length} previously missed questions`,
      examType: authProfile?.examCategory || 'JEE_MAIN',
      testType: 'CUSTOM',
      patternYear: 2026,
      durationMinutes: Math.max(15, Math.round(targetQuestions.length * 2.5)),
      totalMarks: targetQuestions.length * 4,
      positiveMarks: 4,
      negativeMarks: 1,
      subjects: Array.from(new Set(targetQuestions.map((q) => q.subject))),
      questionsCount: targetQuestions.length,
      difficulty: 'HARD',
      syllabus: ['Revision of challenging & previously incorrect questions'],
      description: 'Strengthen weak areas with step-by-step solutions and instant feedback.',
      published: true,
      questions: targetQuestions,
      createdAt: new Date().toISOString(),
    };

    startCbtExam(test, 'PRACTICE');
  };

  const startCustomPractice = (
    questionsList: Question[],
    title: string,
    durationMinutes: number = 30
  ) => {
    const test: TestDefinition = {
      id: `practice-drill-${Date.now()}`,
      title,
      subtitle: `${questionsList.length} Questions Instant Practice Drill`,
      examType: questionsList[0]?.examType || authProfile?.examCategory || 'JEE_MAIN',
      testType: 'CUSTOM',
      patternYear: 2026,
      durationMinutes,
      totalMarks: questionsList.length * 4,
      positiveMarks: 4,
      negativeMarks: 1,
      subjects: Array.from(new Set(questionsList.map((q) => q.subject))),
      questionsCount: questionsList.length,
      difficulty: 'MEDIUM',
      syllabus: ['Practice Mode Drill'],
      description: 'Interactive practice mode with instant solution verification.',
      published: true,
      questions: questionsList,
      createdAt: new Date().toISOString(),
    };

    startCbtExam(test, 'PRACTICE');
  };

  const reportQuestion = (
    questionId: string,
    reason: QuestionReport['reason'],
    description: string,
    testId?: string
  ) => {
    const qObj =
      questions.find((q) => q.id === questionId) ||
      activeTest?.questions.find((q) => q.id === questionId);
    const newReport: QuestionReport = {
      id: `rep-${Date.now()}`,
      questionId,
      testId,
      studentName: authProfile?.fullName || currentUser.name,
      reason,
      description,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      questionSnippet: qObj?.questionText?.slice(0, 80),
    };
    setReports((prev) => [newReport, ...prev]);
  };

  const resolveReport = (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    logAdminAction('RESOLVE_REPORT', reportId, `Status set to ${status}`);
  };

  return (
    <ExamContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentUser,
        toggleUserRole,
        setCurrentUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        login,
        register,
        logout,
        updateProfile,

        authProfile,
        sessionToken,
        isAuthenticated: Boolean(authProfile && sessionToken),
        isAuthLoading,
        accessDeniedMessage,
        clearAccessDenied,
        redirectTarget,
        loginWithCredentials,
        completeFirstLoginPassword,
        requestPasswordRecovery,

        managedUsers,
        batches,
        announcements,
        testAssignments,
        recoveryRequests,
        studentIdConfig,
        allAttempts,
        refreshRbacData,
        createTeacher,
        createStudent,
        updateUserAccount,
        deleteUserAccount,
        resetUserPassword,
        revokeUserSessions,
        createBatch,
        updateBatch,
        deleteBatch,
        publishAnnouncement,
        removeAnnouncement,
        saveTestAssignment,
        resolveRecovery,
        saveStudentIdConfig,
        updateTestDefinition,
        deleteTestDefinition,

        theme,
        toggleTheme,

        isCommandPaletteOpen,
        setIsCommandPaletteOpen,

        isOnline,
        integrityEvents,
        logIntegrityEvent,

        tests,
        accessibleTests,
        questions,
        activeTest,
        setActiveTest,
        loadTests,
        totalQuestionsInBank,
        questionBankPage,
        questionBankTotalPages,
        loadQuestions,
        addQuestion,
        deleteQuestion,
        updateQuestion,
        publishTest,
        examBlueprints,
        updateExamBlueprint,
        generateBlueprintMockTest,

        currentQuestionIdx,
        setCurrentQuestionIdx: changeQuestionIdx,
        responses,
        timerSecondsLeft,
        isExamRunning,
        examMode,
        setExamMode,
        hasAutoSubmitted,
        startCbtExam,
        recordAnswer,
        markForReview,
        saveAndMarkForReview,
        clearResponse,
        saveAndNext,
        submitExam,
        lastSavedText,

        inProgressSession,
        resumeExam,
        discardExamSession,

        currentAttemptResult,
        setCurrentAttemptResult,
        attemptHistory,
        loadAttempts,
        viewAttemptResult,

        bookmarks,
        addBookmark,
        removeBookmark,
        isBookmarked,

        mistakeQuestions,
        startMistakePractice,
        startCustomPractice,

        reports,
        reportQuestion,
        resolveReport,

        auditLogs,
        logAdminAction,
        systemSettings,
        updateSystemSettings,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = (): ExamContextType => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
};
