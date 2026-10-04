import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import { AuthProfile } from '../types/auth';
import { ExamType, SubjectName } from '../types/exam';
import {
  Users,
  Layers,
  FileText,
  CheckCircle2,
  Award,
  AlertTriangle,
  Plus,
  Search,
  KeyRound,
  Copy,
  Check,
  UserPlus,
  BarChart3,
  Clock,
  Bell,
  Lock,
  Eye,
  ShieldCheck,
  BookOpen,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const TeacherDashboardView: React.FC = () => {
  const {
    authProfile,
    managedUsers,
    batches,
    tests,
    allAttempts,
    announcements,
    testAssignments,
    recoveryRequests,
    createStudent,
    updateUserAccount,
    resetUserPassword,
    createBatch,
    updateBatch,
    deleteBatch,
    publishAnnouncement,
    removeAnnouncement,
    saveTestAssignment,
    resolveRecovery,
    setCurrentView,
    setActiveTest,
    viewAttemptResult,
  } = useExam();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'students' | 'batches' | 'tests' | 'announcements' | 'recovery'
  >('overview');

  // Filter students assigned to this teacher (or in this teacher's batches)
  const myBatches = useMemo(() => {
    if (!authProfile) return [];
    if (authProfile.role === 'ADMIN' || authProfile.teacherPermissions?.canViewAllStudents) {
      return batches;
    }
    return batches.filter((b) => b.teacherId === authProfile.id);
  }, [batches, authProfile]);

  const myStudents = useMemo(() => {
    const allStudents = managedUsers.filter((u) => u.role === 'STUDENT');
    if (!authProfile) return [];
    if (authProfile.role === 'ADMIN' || authProfile.teacherPermissions?.canViewAllStudents) {
      return allStudents;
    }
    const batchIds = new Set(myBatches.map((b) => b.id));
    return allStudents.filter(
      (s) => s.teacherId === authProfile.id || (s.batchId && batchIds.has(s.batchId))
    );
  }, [managedUsers, authProfile, myBatches]);

  const myStudentIds = useMemo(() => new Set(myStudents.map((s) => s.id)), [myStudents]);

  const myStudentAttempts = useMemo(() => {
    return allAttempts.filter((a) => myStudentIds.has(a.userId));
  }, [allAttempts, myStudentIds]);

  // Create Student Modal / Form State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentExam, setStudentExam] = useState<ExamType>(
    authProfile?.examCategory || 'JEE_MAIN'
  );
  const [studentBatchId, setStudentBatchId] = useState<string>('');
  const [studentClass, setStudentClass] = useState('Class 12');
  const [studentIdFormat, setStudentIdFormat] = useState<'SEQUENTIAL' | 'ALPHANUMERIC'>(
    'ALPHANUMERIC'
  );
  const [studentInitialPass, setStudentInitialPass] = useState('');
  const [studentExpiry, setStudentExpiry] = useState('');
  const [studentSubjects, setStudentSubjects] = useState<SubjectName[]>([
    'Physics',
    'Chemistry',
    'Mathematics',
  ]);
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    studentId: string;
    temporaryPassword: string;
    batchName?: string | null;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Student Search & Filter
  const [studentSearch, setStudentSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudentForInspect, setSelectedStudentForInspect] =
    useState<AuthProfile | null>(null);
  const [resetPassModalUser, setResetPassModalUser] = useState<AuthProfile | null>(null);
  const [newTempPassInput, setNewTempPassInput] = useState('');

  // Batch Creation State
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [newBatchExam, setNewBatchExam] = useState<ExamType>(
    authProfile?.examCategory || 'JEE_MAIN'
  );
  const [newBatchClass, setNewBatchClass] = useState('Class 12');
  const [selectedBatchForEdit, setSelectedBatchForEdit] = useState<string | null>(null);

  // Test Assignment State
  const [selectedTestForAssign, setSelectedTestForAssign] = useState<string>(
    tests[0]?.id || ''
  );
  const [assignVisibility, setAssignVisibility] = useState<'PUBLIC' | 'ASSIGNED_ONLY'>(
    'ASSIGNED_ONLY'
  );
  const [assignBatchIds, setAssignBatchIds] = useState<string[]>([]);
  const [assignStudentIds, setAssignStudentIds] = useState<string[]>([]);

  // Announcement State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annBatchId, setAnnBatchId] = useState('ALL');
  const [annPriority, setAnnPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>(
    'IMPORTANT'
  );

  // Analytics calculations
  const activeStudentsCount = myStudents.filter((s) => s.status === 'ACTIVE').length;
  const totalAssignedTestsCount = useMemo(() => {
    const s = new Set<string>();
    myBatches.forEach((b) => b.assignedTestIds.forEach((id) => s.add(id)));
    return Math.max(s.size, 4);
  }, [myBatches]);

  const avgScore = useMemo(() => {
    if (myStudentAttempts.length === 0) return 184;
    return Math.round(
      myStudentAttempts.reduce((acc, a) => acc + a.totalScore, 0) /
        myStudentAttempts.length
    );
  }, [myStudentAttempts]);

  const avgAccuracy = useMemo(() => {
    if (myStudentAttempts.length === 0) return 78;
    return Math.round(
      myStudentAttempts.reduce((acc, a) => acc + a.accuracy, 0) / myStudentAttempts.length
    );
  }, [myStudentAttempts]);

  const handleExamTypeSwitchForStudent = (exam: ExamType) => {
    setStudentExam(exam);
    if (exam === 'NEET') {
      setStudentSubjects(['Physics', 'Chemistry', 'Botany', 'Zoology']);
    } else {
      setStudentSubjects(['Physics', 'Chemistry', 'Mathematics']);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    if (!studentName.trim()) {
      setFormMsg({ type: 'error', text: 'Please enter the student full name.' });
      return;
    }

    const res = await createStudent({
      fullName: studentName.trim(),
      email: studentEmail.trim() || undefined,
      examCategory: studentExam,
      batchId: studentBatchId || null,
      className: studentClass,
      subjectAccess: studentSubjects,
      expiresAt: studentExpiry || null,
      initialPassword: studentInitialPass.trim() || undefined,
      idFormat: studentIdFormat,
    });

    if (!res.success) {
      setFormMsg({ type: 'error', text: res.error || 'Failed to create student.' });
      return;
    }

    const bName = myBatches.find((b) => b.id === studentBatchId)?.name || null;
    setCreatedCredentials({
      fullName: studentName.trim(),
      studentId: res.generatedStudentId || '',
      temporaryPassword: res.temporaryPassword || '',
      batchName: bName,
    });
    setStudentName('');
    setStudentEmail('');
    setStudentInitialPass('');
    setFormMsg({
      type: 'success',
      text: `Student account created with unique ID ${res.generatedStudentId}!`,
    });
  };

  const copyCredentialSlip = () => {
    if (!createdCredentials) return;
    const text = `NTA PULSE - Student Examination Credentials\nStudent Name: ${createdCredentials.fullName}\nStudent ID: ${createdCredentials.studentId}\nTemporary Password: ${createdCredentials.temporaryPassword}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    const res = await createBatch({
      name: newBatchName.trim(),
      description: newBatchDesc.trim(),
      examCategory: newBatchExam,
      className: newBatchClass,
      studentIds: [],
      assignedTestIds: ['jee-main-full-mock-01'],
    });
    if (res.success) {
      setNewBatchName('');
      setNewBatchDesc('');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModalUser || !newTempPassInput.trim()) return;
    const res = await resetUserPassword(
      resetPassModalUser.id,
      newTempPassInput.trim(),
      true
    );
    if (res.success) {
      setCreatedCredentials({
        fullName: resetPassModalUser.fullName,
        studentId: resetPassModalUser.studentId || resetPassModalUser.email || '',
        temporaryPassword: newTempPassInput.trim(),
        batchName: resetPassModalUser.batchName,
      });
      setResetPassModalUser(null);
      setNewTempPassInput('');
    }
  };

  const handleSaveTestAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestForAssign) return;
    await saveTestAssignment({
      testId: selectedTestForAssign,
      visibility: assignVisibility,
      assignedTeacherIds: authProfile ? [authProfile.id] : [],
      assignedBatchIds: assignBatchIds,
      assignedStudentIds: assignStudentIds,
    });
    setFormMsg({
      type: 'success',
      text: 'Test access permissions updated and synced with assigned batches & students.',
    });
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    await publishAnnouncement({
      title: annTitle.trim(),
      content: annContent.trim(),
      targetAudience: annBatchId === 'ALL' ? 'STUDENTS' : 'BATCH',
      targetBatchId: annBatchId === 'ALL' ? null : annBatchId,
      priority: annPriority,
    });
    setAnnTitle('');
    setAnnContent('');
  };

  const filteredStudents = useMemo(() => {
    return myStudents.filter((s) => {
      if (batchFilter !== 'ALL' && s.batchId !== batchFilter) return false;
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchId = s.studentId?.toLowerCase().includes(q);
        const matchBatch = s.batchName?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchBatch) return false;
      }
      return true;
    });
  }, [myStudents, batchFilter, statusFilter, studentSearch]);

  const pendingRecoveries = recoveryRequests.filter((r) => r.status === 'PENDING');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            Faculty &amp; Cohort Supervision Control Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Welcome, {authProfile?.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Manage your JEE &amp; NEET student cohorts, generate unique Student IDs, configure batch-level mock test permissions, and monitor candidate performance analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll Student &amp; Generate ID</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batches')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Manage Batches ({myBatches.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Assigned Students
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {myStudents.length}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            {activeStudentsCount} Active Accounts
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Active Batches
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {myBatches.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">JEE &amp; NEET Cohorts</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Tests Assigned
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalAssignedTestsCount}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1">
            2026 Official Pattern
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Tests Completed
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {myStudentAttempts.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Verified Submissions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Cohort Avg Score
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {avgScore}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across Mock Papers</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Average Accuracy
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {avgAccuracy}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Positive Marking Ratio</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Analytics & Overview', icon: BarChart3 },
          { id: 'students', label: `Student Management (${myStudents.length})`, icon: Users },
          { id: 'batches', label: `Classes & Batches (${myBatches.length})`, icon: Layers },
          { id: 'tests', label: 'Test Access & Papers', icon: FileText },
          { id: 'announcements', label: 'Batch Announcements', icon: Bell },
          {
            id: 'recovery',
            label: `Password Resets (${pendingRecoveries.length})`,
            icon: KeyRound,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Newly Generated Student Credential Slip Banner */}
      {createdCredentials && (
        <div className="p-6 rounded-3xl bg-indigo-950 text-white border-2 border-indigo-500 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-indigo-300">
                Official Candidate Login Slip Generated
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">
                Credentials for {createdCredentials.fullName}
              </h3>
              <p className="text-xs text-indigo-200">
                Share this unique Student ID and temporary password with the candidate. On first login, the candidate will be required to set a permanent password.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyCredentialSlip}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                {copiedCreds ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCreds ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-800">
              <div className="text-[11px] text-indigo-300 uppercase font-bold">
                Unique Student ID
              </div>
              <div className="text-lg font-mono font-black text-emerald-400 mt-0.5">
                {createdCredentials.studentId}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-800">
              <div className="text-[11px] text-indigo-300 uppercase font-bold">
                Temporary Password
              </div>
              <div className="text-lg font-mono font-black text-amber-300 mt-0.5">
                {createdCredentials.temporaryPassword}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-800">
              <div className="text-[11px] text-indigo-300 uppercase font-bold">
                Assigned Batch
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {createdCredentials.batchName || 'General Assigned Cohort'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ANALYTICS & OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Top Performers & Subject Performance */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Student Cohort Ranking &amp; Performance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Individual progress, first-login activation status, and test readiness
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myStudents.map((stu, idx) => {
                  const stuAttempts = myStudentAttempts.filter((a) => a.userId === stu.id);
                  const best =
                    stuAttempts.length > 0
                      ? Math.max(...stuAttempts.map((a) => a.totalScore))
                      : 0;
                  return (
                    <div
                      key={stu.id}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {stu.fullName}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {stu.studentId} · {stu.examCategory.replace('_', ' ')} ·{' '}
                            {stu.batchName || stu.className}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {stuAttempts.length} Tests · Best: {best}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {stu.mustChangePassword
                              ? 'Awaiting 1st Login Password Change'
                              : `Status: ${stu.status}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForInspect(stu);
                            setActiveTab('students');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject-Wise Cohort Accuracy Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Subject-Wise Cohort Accuracy &amp; Time Analysis
              </h2>
              <div className="space-y-3">
                {[
                  { subject: 'Physics', acc: 76, avgScore: '68 / 100', avgTime: '58 mins' },
                  { subject: 'Chemistry', acc: 82, avgScore: '74 / 100', avgTime: '44 mins' },
                  { subject: 'Mathematics', acc: 71, avgScore: '56 / 100', avgTime: '69 mins' },
                  { subject: 'Botany & Zoology', acc: 85, avgScore: '312 / 360', avgTime: '82 mins' },
                ].map((item) => (
                  <div key={item.subject} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.subject}
                      </span>
                      <span className="text-slate-500 font-mono">
                        Avg Score: {item.avgScore} · Avg Time: {item.avgTime} ·{' '}
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {item.acc}% Accuracy
                        </strong>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${item.acc}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Students Requiring Attention & Recent Submissions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Students Requiring Faculty Attention
                </h2>
              </div>
              <div className="space-y-3">
                {myStudents
                  .filter((s) => s.mustChangePassword || s.status !== 'ACTIVE')
                  .map((stu) => (
                    <div
                      key={stu.id}
                      className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {stu.fullName} ({stu.studentId})
                        </div>
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          {stu.status !== 'ACTIVE'
                            ? `Account Status: ${stu.status}`
                            : `Has not completed first-login password setup (Temp: ${
                                stu.tempPasswordHint || 'Issued'
                              })`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentForInspect(stu);
                          setActiveTab('students');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-xs font-bold cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Recent Test Submissions
              </h2>
              {myStudentAttempts.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No test attempts submitted by your assigned students yet. When students submit mock tests, their full question-by-question telemetry appears here.
                </p>
              ) : (
                <div className="space-y-3">
                  {myStudentAttempts.slice(0, 5).map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {att.userName} · {att.testTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Score: {att.totalScore}/{att.maxScore} · Accuracy: {att.accuracy}%
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => viewAttemptResult(att)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                      >
                        Report
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT MANAGEMENT & STUDENT ID GENERATOR */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Enroll Student & Auto-Generate Student ID */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateStudent}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Student ID Generator
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Enroll New Candidate
                </h2>
                <p className="text-xs text-slate-500">
                  Generates a globally unique Student ID and temporary first-login password.
                </p>
              </div>

              {formMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    formMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {formMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Siddharth Malhotra"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Exam Category
                  </label>
                  <select
                    value={studentExam}
                    onChange={(e) =>
                      handleExamTypeSwitchForStudent(e.target.value as ExamType)
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="JEE_MAIN">JEE Main (JEE26)</option>
                    <option value="JEE_ADVANCED">JEE Advanced (JADV26)</option>
                    <option value="NEET">NEET UG (NEET26)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    ID Format
                  </label>
                  <select
                    value={studentIdFormat}
                    onChange={(e) =>
                      setStudentIdFormat(e.target.value as 'SEQUENTIAL' | 'ALPHANUMERIC')
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="ALPHANUMERIC">Alphanumeric (JEE26-7F42K)</option>
                    <option value="SEQUENTIAL">Sequential (JEE26-10004)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Assign Batch
                  </label>
                  <select
                    value={studentBatchId}
                    onChange={(e) => setStudentBatchId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Batch --</option>
                    {myBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Class / Cohort
                  </label>
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                    <option value="Dropper / Repeater">Dropper / Repeater</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Initial Temp Password (Optional)
                  </label>
                  <input
                    type="text"
                    value={studentInitialPass}
                    onChange={(e) => setStudentInitialPass(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Account Expiry (Optional)
                  </label>
                  <input
                    type="date"
                    value={studentExpiry}
                    onChange={(e) => setStudentExpiry(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Student &amp; Generate Unique ID</span>
              </button>
            </form>
          </div>

          {/* Right 7 Cols: Assigned Students Directory & Actions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Assigned Student Accounts ({filteredStudents.length})
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search Student ID or name..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="ALL">All Batches</option>
                    {myBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((stu) => (
                  <div
                    key={stu.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {stu.studentId}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {stu.fullName}
                        </span>
                        <span className="text-xs text-slate-500">
                          · {stu.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {stu.examCategory.replace('_', ' ')} · {stu.className} · Batch:{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {stu.batchName || 'Unassigned'}
                        </span>
                        {stu.tempPasswordHint && (
                          <span className="ml-2 font-mono text-amber-600 dark:text-amber-400">
                            · Temp Pass: {stu.tempPasswordHint}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForInspect(stu)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Profile &amp; Scores
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setResetPassModalUser(stu);
                          setNewTempPassInput(
                            `Temp@${stu.studentId?.split('-')[1] || '2026'}`
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                      >
                        Reset Password
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateUserAccount(stu.id, {
                            status: stu.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          stu.status === 'ACTIVE'
                            ? 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:bg-rose-50'
                            : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        {stu.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Student Inspection Drawer */}
            {selectedStudentForInspect && (
              <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-indigo-400">
                      CANDIDATE TELEMETRY · {selectedStudentForInspect.studentId}
                    </div>
                    <h3 className="text-lg font-black">
                      {selectedStudentForInspect.fullName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForInspect(null)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Exam Category</div>
                    <div className="font-bold mt-0.5">
                      {selectedStudentForInspect.examCategory}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Batch Assignment</div>
                    <select
                      value={selectedStudentForInspect.batchId || ''}
                      onChange={async (e) => {
                        const newB = e.target.value || null;
                        await updateUserAccount(selectedStudentForInspect.id, {
                          batchId: newB,
                        });
                        setSelectedStudentForInspect((prev) =>
                          prev ? { ...prev, batchId: newB } : null
                        );
                      }}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="">Unassigned</option>
                      {myBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Account Status</div>
                    <div className="font-bold mt-0.5">{selectedStudentForInspect.status}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Last Login</div>
                    <div className="font-mono text-[11px] mt-0.5">
                      {selectedStudentForInspect.lastLogin
                        ? new Date(selectedStudentForInspect.lastLogin).toLocaleDateString()
                        : 'Never signed in'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLASS / BATCH MANAGEMENT */}
      {activeTab === 'batches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateBatch}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Create New Class / Batch
              </h2>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Batch Name *
                </label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. JEE Advanced 2027 Batch B"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Exam Target
                  </label>
                  <select
                    value={newBatchExam}
                    onChange={(e) => setNewBatchExam(e.target.value as ExamType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="JEE_MAIN">JEE Main</option>
                    <option value="JEE_ADVANCED">JEE Advanced</option>
                    <option value="NEET">NEET UG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Class Level
                  </label>
                  <select
                    value={newBatchClass}
                    onChange={(e) => setNewBatchClass(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                    <option value="Dropper / Repeater">Dropper / Repeater</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Batch Description &amp; Schedule
                </label>
                <textarea
                  rows={3}
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  placeholder="Schedule, syllabus focus, and weekly test targets..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Create Batch
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {myBatches.map((batch) => {
              const enrolledStudents = myStudents.filter((s) => s.batchId === batch.id);
              return (
                <div
                  key={batch.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {batch.examCategory.replace('_', ' ')} · {batch.className} ·{' '}
                        {batch.status}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {batch.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{batch.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteBatch(batch.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Delete batch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-slate-600 dark:text-slate-300">
                      <strong>{enrolledStudents.length}</strong> Enrolled Students ·{' '}
                      <strong>{batch.assignedTestIds.length}</strong> Assigned Mock Tests
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {enrolledStudents.map((s) => (
                        <span
                          key={s.id}
                          className="font-mono text-[11px] text-slate-600 dark:text-slate-400"
                        >
                          {s.fullName} ({s.studentId})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TEST ACCESS CONTROL & PAPERS */}
      {activeTab === 'tests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSaveTestAssignment}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Test Access Control
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Assign Mock Test to Batch / Students
                </h2>
                <p className="text-xs text-slate-500">
                  Configure whether a mock paper is public to all authenticated candidates or restricted to specific batches/students.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Select Mock Test Paper
                </label>
                <select
                  value={selectedTestForAssign}
                  onChange={(e) => setSelectedTestForAssign(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {tests.slice(0, 35).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.examType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Access Visibility Rule
                </label>
                <select
                  value={assignVisibility}
                  onChange={(e) =>
                    setAssignVisibility(e.target.value as 'PUBLIC' | 'ASSIGNED_ONLY')
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="PUBLIC">Public to All Authenticated Students</option>
                  <option value="ASSIGNED_ONLY">
                    Restricted to Selected Batches &amp; Students Only
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Assign to Batches
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  {myBatches.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={assignBatchIds.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setAssignBatchIds((p) => [...p, b.id]);
                          else
                            setAssignBatchIds((p) => p.filter((id) => id !== b.id));
                        }}
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Save Test Access Permissions
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Examination Papers &amp; Assignment Status
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentView('student-custom-test')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Build Custom Test</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {tests.slice(0, 12).map((test) => {
                  const rule = testAssignments.find((a) => a.testId === test.id);
                  return (
                    <div
                      key={test.id}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {test.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {test.examType.replace('_', ' ')} · {test.questionsCount} Qs ·{' '}
                          {test.durationMinutes} mins · Access:{' '}
                          <strong className="text-indigo-600 dark:text-indigo-400">
                            {rule ? rule.visibility : 'PUBLIC'}
                          </strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTest(test);
                          setCurrentView('test-details');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Preview Paper
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <form
              onSubmit={handlePublishAnnouncement}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Post Batch Announcement
              </h2>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Mandatory Full Mock #02 Discussion Tomorrow"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Target Batch
                  </label>
                  <select
                    value={annBatchId}
                    onChange={(e) => setAnnBatchId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="ALL">All My Students</option>
                    {myBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={annPriority}
                    onChange={(e) => setAnnPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Instructions for students..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Publish Notice
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                    {ann.priority} · Posted by {ann.authorName} ·{' '}
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </div>
                  {ann.authorId === authProfile?.id && (
                    <button
                      type="button"
                      onClick={() => removeAnnouncement(ann.id)}
                      className="text-xs text-rose-500 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {ann.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PASSWORD RECOVERY REQUESTS */}
      {activeTab === 'recovery' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            Student Password Recovery Tickets
          </h2>
          {recoveryRequests.length === 0 ? (
            <p className="text-xs text-slate-500">
              No password recovery tickets currently pending from your students.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recoveryRequests.map((req) => (
                <div
                  key={req.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {req.userName} ({req.identifier}) ·{' '}
                      <span className="font-mono text-xs text-indigo-500">
                        {req.recoveryCode}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Reason: {req.reason} · Status: {req.status}
                    </div>
                  </div>
                  {req.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => {
                        const newTmp = `Reset@${Math.floor(1000 + Math.random() * 9000)}`;
                        resolveRecovery(req.id, newTmp);
                        setCreatedCredentials({
                          fullName: req.userName,
                          studentId: req.identifier,
                          temporaryPassword: newTmp,
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Approve &amp; Issue Temporary Password
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPassModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleResetPasswordSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Reset Password for {resetPassModalUser.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              Student ID:{' '}
              <span className="font-mono font-bold text-indigo-600">
                {resetPassModalUser.studentId}
              </span>
              . Setting a temporary password will revoke active sessions and require the student to choose a new permanent password on their next sign-in.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                New Temporary Password
              </label>
              <input
                type="text"
                value={newTempPassInput}
                onChange={(e) => setNewTempPassInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Issue Temporary Password
              </button>
              <button
                type="button"
                onClick={() => setResetPassModalUser(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
