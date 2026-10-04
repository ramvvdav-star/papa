import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import { AuthProfile, TeacherPermissions } from '../types/auth';
import { ExamType } from '../types/exam';
import {
  Users,
  UserCheck,
  GraduationCap,
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  LogOut,
  Trash2,
  Layers,
  Bell,
  Settings,
  Check,
  Copy,
  Lock,
  AlertTriangle,
} from 'lucide-react';

export const AdminRbacControlPanel: React.FC = () => {
  const {
    managedUsers,
    batches,
    tests,
    totalQuestionsInBank,
    allAttempts,
    announcements,
    recoveryRequests,
    studentIdConfig,
    createTeacher,
    createStudent,
    updateUserAccount,
    deleteUserAccount,
    resetUserPassword,
    revokeUserSessions,
    createBatch,
    deleteBatch,
    publishAnnouncement,
    removeAnnouncement,
    resolveRecovery,
    saveStudentIdConfig,
  } = useExam();

  const [subTab, setSubTab] = useState<
    'users' | 'teachers' | 'students' | 'batches' | 'id-config' | 'announcements' | 'recovery'
  >('users');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'TEACHER' | 'STUDENT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Create Teacher Form State
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('Teacher@2026!');
  const [teacherExam, setTeacherExam] = useState<ExamType>('JEE_MAIN');
  const [teacherPerms, setTeacherPerms] = useState<TeacherPermissions>({
    canCreateTests: true,
    canCreateQuestions: true,
    canManageBatches: true,
    canResetStudentPasswords: true,
    canViewAllStudents: false,
  });

  // Create Student Form State
  const [stuName, setStuName] = useState('');
  const [stuExam, setStuExam] = useState<ExamType>('JEE_MAIN');
  const [stuTeacherId, setStuTeacherId] = useState('usr-teacher-hcverma');
  const [stuBatchId, setStuBatchId] = useState('batch-jee-main-2027-m');
  const [stuClass, setStuClass] = useState('Class 12');
  const [stuFormat, setStuFormat] = useState<'SEQUENTIAL' | 'ALPHANUMERIC'>('SEQUENTIAL');
  const [stuPass, setStuPass] = useState('');
  const [generatedSlip, setGeneratedSlip] = useState<{
    name: string;
    studentId: string;
    tempPass: string;
  } | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Batch Form State
  const [batchName, setBatchName] = useState('');
  const [batchDesc, setBatchDesc] = useState('');
  const [batchExam, setBatchExam] = useState<ExamType>('JEE_MAIN');
  const [batchTeacherId, setBatchTeacherId] = useState('usr-teacher-hcverma');

  // ID Prefix Config State
  const [jeePrefix, setJeePrefix] = useState(studentIdConfig?.jeeMainPrefix || 'JEE26');
  const [advPrefix, setAdvPrefix] = useState(studentIdConfig?.jeeAdvancedPrefix || 'JADV26');
  const [neetPrefix, setNeetPrefix] = useState(studentIdConfig?.neetPrefix || 'NEET26');
  const [idMode, setIdMode] = useState<'SEQUENTIAL' | 'ALPHANUMERIC'>(
    studentIdConfig?.mode || 'SEQUENTIAL'
  );

  // Announcement State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annAudience, setAnnAudience] = useState<'ALL' | 'TEACHERS' | 'STUDENTS'>('ALL');
  const [annPriority, setAnnPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('URGENT');

  const teachersList = useMemo(
    () => managedUsers.filter((u) => u.role === 'TEACHER'),
    [managedUsers]
  );
  const studentsList = useMemo(
    () => managedUsers.filter((u) => u.role === 'STUDENT'),
    [managedUsers]
  );

  const activeTeachersCount = teachersList.filter((t) => t.status === 'ACTIVE').length;
  const activeStudentsCount = studentsList.filter((s) => s.status === 'ACTIVE').length;

  const filteredUsers = useMemo(() => {
    return managedUsers.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchId = u.studentId?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId) return false;
      }
      return true;
    });
  }, [managedUsers, roleFilter, statusFilter, searchQuery]);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createTeacher({
      fullName: teacherName,
      email: teacherEmail,
      username: teacherUsername || undefined,
      password: teacherPassword,
      examCategory: teacherExam,
      teacherPermissions: teacherPerms,
    });
    if (res.success) {
      setTeacherName('');
      setTeacherEmail('');
      setTeacherUsername('');
      showToast(`Created teacher account for ${teacherName}`);
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createStudent({
      fullName: stuName,
      examCategory: stuExam,
      teacherId: stuTeacherId,
      batchId: stuBatchId || null,
      className: stuClass,
      idFormat: stuFormat,
      initialPassword: stuPass.trim() || undefined,
    });
    if (res.success) {
      setGeneratedSlip({
        name: stuName,
        studentId: res.generatedStudentId || '',
        tempPass: res.temporaryPassword || '',
      });
      setStuName('');
      setStuPass('');
      showToast(`Generated unique Student ID ${res.generatedStudentId}`);
    } else {
      showToast(`Error: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform-Wide Enterprise Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 font-semibold">Total Students</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {studentsList.length}
          </div>
          <div className="text-[10px] text-emerald-600">{activeStudentsCount} Active</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 font-semibold">Total Teachers</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {teachersList.length}
          </div>
          <div className="text-[10px] text-emerald-600">{activeTeachersCount} Active</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 font-semibold">Active Batches</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {batches.length}
          </div>
          <div className="text-[10px] text-indigo-600">JEE &amp; NEET</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 font-semibold">Mock Tests</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {tests.length}
          </div>
          <div className="text-[10px] text-slate-500">Published CBT</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 font-semibold">Question Bank</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {totalQuestionsInBank.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500">PostgreSQL Indexed</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 font-semibold">Total Attempts</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {allAttempts.length}
          </div>
          <div className="text-[10px] text-slate-500">All Candidates</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 font-semibold">Completed Today</div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {
              allAttempts.filter(
                (a) =>
                  new Date(a.submittedAt).toDateString() === new Date().toDateString()
              ).length
            }
          </div>
          <div className="text-[10px] text-slate-500">Live Sessions</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 font-semibold">Reset Tickets</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">
            {recoveryRequests.filter((r) => r.status === 'PENDING').length}
          </div>
          <div className="text-[10px] text-slate-500">Pending Action</div>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 rounded-2xl bg-indigo-950 text-indigo-200 border border-indigo-700 text-xs font-bold flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-indigo-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        {[
          { id: 'users', label: `All Users & Sessions (${managedUsers.length})` },
          { id: 'teachers', label: `Teachers & Permissions (${teachersList.length})` },
          { id: 'students', label: `Student IDs & Enrollment (${studentsList.length})` },
          { id: 'batches', label: `Classes & Batches (${batches.length})` },
          { id: 'id-config', label: 'Student ID Prefix Config' },
          { id: 'announcements', label: `Announcements (${announcements.length})` },
          {
            id: 'recovery',
            label: `Password Recovery (${
              recoveryRequests.filter((r) => r.status === 'PENDING').length
            })`,
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubTab(item.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === item.id
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Generated Student Credential Slip */}
      {generatedSlip && (
        <div className="p-5 rounded-3xl bg-indigo-950 text-white border-2 border-indigo-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-indigo-300 uppercase">
              New Student ID Provisioned
            </div>
            <div className="text-base font-black mt-0.5">
              {generatedSlip.name} · ID:{' '}
              <span className="font-mono text-emerald-400">{generatedSlip.studentId}</span> ·
              Temp Password:{' '}
              <span className="font-mono text-amber-300">{generatedSlip.tempPass}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `Student ID: ${generatedSlip.studentId}\nTemporary Password: ${generatedSlip.tempPass}`
                );
                setCopiedSlip(true);
                setTimeout(() => setCopiedSlip(false), 2000);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSlip ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSlip ? 'Copied' : 'Copy Credentials'}</span>
            </button>
            <button
              type="button"
              onClick={() => setGeneratedSlip(null)}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 1: ALL REGISTERED USERS, STATUS & SESSION REVOCATION */}
      {subTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Platform User Directory &amp; Session Control
              </h3>
              <p className="text-xs text-slate-500">
                Search, filter, suspend/reactivate accounts, reset credentials, or force-logout active sessions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, Student ID, email..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admins</option>
                <option value="TEACHER">Teachers</option>
                <option value="STUDENT">Students</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="DEACTIVATED">DEACTIVATED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                      [{user.role}]
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {user.fullName}
                    </span>
                    {user.studentId && (
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        · ID: {user.studentId}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      · Status: <strong>{user.status}</strong>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {user.email} · {user.examCategory.replace('_', ' ')}
                    {user.teacherName && ` · Mentor: ${user.teacherName}`}
                    {user.batchName && ` · Batch: ${user.batchName}`}
                    {` · Active Sessions: ${user.activeSessionsCount || 0}`}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={user.status}
                    onChange={async (e) => {
                      await updateUserAccount(user.id, { status: e.target.value });
                      showToast(`Updated ${user.fullName} status to ${e.target.value}`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="DEACTIVATED">DEACTIVATED</option>
                    <option value="PENDING">PENDING</option>
                  </select>

                  <button
                    type="button"
                    onClick={async () => {
                      const newTmp = `Reset@${Math.floor(1000 + Math.random() * 9000)}`;
                      await resetUserPassword(user.id, newTmp, true);
                      setGeneratedSlip({
                        name: user.fullName,
                        studentId: user.studentId || user.email || '',
                        tempPass: newTmp,
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-xs font-semibold cursor-pointer"
                  >
                    Reset Credentials
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await revokeUserSessions(user.id);
                      showToast(
                        `Force-logged out ${user.fullName} (${res.revokedCount || 0} sessions revoked)`
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Force Logout</span>
                  </button>

                  {user.role !== 'ADMIN' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteUserAccount(user.id);
                        showToast(`Deleted user ${user.fullName}`);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: CREATE & MANAGE TEACHERS & PERMISSIONS */}
      {subTab === 'teachers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateTeacher}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Create / Invite Teacher Account
              </h3>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Faculty Full Name *
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Prof. S.K. Mishra (HOD Mathematics)"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="skmishra@ntapulse.edu.in"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={teacherUsername}
                    onChange={(e) => setTeacherUsername(e.target.value)}
                    placeholder="skmishra"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Primary Exam Wing
                  </label>
                  <select
                    value={teacherExam}
                    onChange={(e) => setTeacherExam(e.target.value as ExamType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="JEE_MAIN">JEE Main</option>
                    <option value="JEE_ADVANCED">JEE Advanced</option>
                    <option value="NEET">NEET UG</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Teacher Role Permissions
                </div>
                {[
                  { key: 'canCreateTests', label: 'Can Create & Assign Mock Tests' },
                  { key: 'canCreateQuestions', label: 'Can Add/Edit Question Bank' },
                  { key: 'canManageBatches', label: 'Can Create & Manage Batches' },
                  { key: 'canResetStudentPasswords', label: 'Can Reset Student Passwords' },
                  {
                    key: 'canViewAllStudents',
                    label: 'Elevated Access: View All Platform Students',
                  },
                ].map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(teacherPerms as any)[perm.key]}
                      onChange={(e) =>
                        setTeacherPerms((p) => ({ ...p, [perm.key]: e.target.checked }))
                      }
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Provision Teacher Account
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {teachersList.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {teacher.fullName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Email: {teacher.email} · Username: {teacher.username} · Wing:{' '}
                      {teacher.examCategory} · Status: {teacher.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateUserAccount(teacher.id, {
                        teacherPermissions: {
                          ...teacher.teacherPermissions,
                          canViewAllStudents: !teacher.teacherPermissions.canViewAllStudents,
                        },
                      })
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                  >
                    {teacher.teacherPermissions.canViewAllStudents
                      ? 'Scope: All Students (Elevated)'
                      : 'Scope: Assigned Students Only'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: ADMIN STUDENT ENROLLMENT & TEACHER/BATCH ASSIGNMENT */}
      {subTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateStudent}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Create Student &amp; Assign Faculty / Batch
              </h3>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  value={stuName}
                  onChange={(e) => setStuName(e.target.value)}
                  placeholder="e.g. Kriti Sanon"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Exam Category
                  </label>
                  <select
                    value={stuExam}
                    onChange={(e) => setStuExam(e.target.value as ExamType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="JEE_MAIN">JEE Main</option>
                    <option value="JEE_ADVANCED">JEE Advanced</option>
                    <option value="NEET">NEET UG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    ID Format
                  </label>
                  <select
                    value={stuFormat}
                    onChange={(e) => setStuFormat(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="SEQUENTIAL">Sequential (JEE26-10004)</option>
                    <option value="ALPHANUMERIC">Alphanumeric (JEE26-7F42K)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Assign Teacher Mentor
                </label>
                <select
                  value={stuTeacherId}
                  onChange={(e) => setStuTeacherId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Assign Class / Batch
                </label>
                <select
                  value={stuBatchId}
                  onChange={(e) => setStuBatchId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="">-- No Batch --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Create Student &amp; Generate Unique Student ID
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Student-to-Teacher &amp; Batch Assignment Matrix
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {studentsList.map((s) => (
                <div
                  key={s.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-2">
                        {s.studentId}
                      </span>
                      {s.fullName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {s.examCategory} · {s.status}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={s.teacherId || ''}
                      onChange={(e) =>
                        updateUserAccount(s.id, { teacherId: e.target.value || null })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    >
                      <option value="">-- Unassigned Teacher --</option>
                      {teachersList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName.split('(')[0]}
                        </option>
                      ))}
                    </select>

                    <select
                      value={s.batchId || ''}
                      onChange={(e) =>
                        updateUserAccount(s.id, { batchId: e.target.value || null })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    >
                      <option value="">-- Unassigned Batch --</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: BATCHES */}
      {subTab === 'batches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await createBatch({
                  name: batchName,
                  description: batchDesc,
                  examCategory: batchExam,
                  className: 'Class 12',
                  teacherId: batchTeacherId,
                });
                setBatchName('');
                setBatchDesc('');
                showToast('Batch created');
              }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Create Platform Batch
              </h3>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. JEE Main 2027 Evening Batch"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <select
                value={batchTeacherId}
                onChange={(e) => setBatchTeacherId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
              <textarea
                rows={3}
                value={batchDesc}
                onChange={(e) => setBatchDesc(e.target.value)}
                placeholder="Batch description..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Create Batch
              </button>
            </form>
          </div>
          <div className="lg:col-span-7 space-y-3">
            {batches.map((b) => (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {b.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Faculty: {b.teacherName} · {b.examCategory} · {b.studentIds.length}{' '}
                    students
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteBatch(b.id)}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: STUDENT ID PREFIX CONFIGURATION (Section 9) */}
      {subTab === 'id-config' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await saveStudentIdConfig({
              jeeMainPrefix: jeePrefix,
              jeeAdvancedPrefix: advPrefix,
              neetPrefix: neetPrefix,
              mode: idMode,
            });
            showToast('Updated Student ID Generator prefixes in PostgreSQL');
          }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 max-w-2xl space-y-4"
        >
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Student ID Generator Prefix &amp; Sequence Configuration
          </h3>
          <p className="text-xs text-slate-500">
            Configure the institutional prefixes used when generating globally unique Student IDs (e.g. JEE26-10001, NEET26-10001). Existing Student IDs remain immutable.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                JEE Main Prefix
              </label>
              <input
                type="text"
                value={jeePrefix}
                onChange={(e) => setJeePrefix(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                JEE Advanced Prefix
              </label>
              <input
                type="text"
                value={advPrefix}
                onChange={(e) => setAdvPrefix(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                NEET UG Prefix
              </label>
              <input
                type="text"
                value={neetPrefix}
                onChange={(e) => setNeetPrefix(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
              Default Generation Mode
            </label>
            <select
              value={idMode}
              onChange={(e) => setIdMode(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="SEQUENTIAL">Sequential Counter (JEE26-10004)</option>
              <option value="ALPHANUMERIC">Random Alphanumeric (JEE26-7F42K)</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            Save Student ID Configuration
          </button>
        </form>
      )}

      {/* SUBTAB 6: ANNOUNCEMENTS */}
      {subTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await publishAnnouncement({
                  title: annTitle,
                  content: annContent,
                  targetAudience: annAudience,
                  priority: annPriority,
                });
                setAnnTitle('');
                setAnnContent('');
                showToast('Platform announcement published');
              }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Broadcast Platform Announcement
              </h3>
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcement headline..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <textarea
                rows={4}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Detailed bulletin..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Publish Bulletin
              </button>
            </form>
          </div>
          <div className="lg:col-span-7 space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {a.priority} · Audience: {a.targetAudience} · By {a.authorName}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAnnouncement(a.id)}
                    className="text-rose-500 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {a.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 7: PASSWORD RECOVERY */}
      {subTab === 'recovery' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Platform Password Recovery Queue
          </h3>
          {recoveryRequests.length === 0 ? (
            <p className="text-xs text-slate-500">No password recovery requests logged.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recoveryRequests.map((r) => (
                <div
                  key={r.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {r.userName} ({r.identifier}) · [{r.userRole}]
                    </div>
                    <div className="text-xs text-slate-500">
                      Ticket: {r.recoveryCode} · {r.reason} · Status: {r.status}
                    </div>
                  </div>
                  {r.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tmp = `Reset@${Math.floor(1000 + Math.random() * 9000)}`;
                        resolveRecovery(r.id, tmp);
                        setGeneratedSlip({
                          name: r.userName,
                          studentId: r.identifier,
                          tempPass: tmp,
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Approve &amp; Issue Temp Password
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
