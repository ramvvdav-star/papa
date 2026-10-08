import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import { AuthProfile, CourseType } from '../types/auth';
import { ExamType, SubjectName, Difficulty, QuestionType } from '../types/exam';
import { MathView } from '../components/MathView';
import {
  Users,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  KeyRound,
  Copy,
  Check,
  UserPlus,
  Bell,
  ShieldCheck,
  BookOpen,
  Trash2,
} from 'lucide-react';

export const TeacherDashboardView: React.FC = () => {
  const {
    authProfile,
    managedUsers,
    batches,
    accessibleTests,
    questions,
    allAttempts,
    announcements,
    recoveryRequests,
    studyMaterials,
    createStudent,
    updateUserAccount,
    resetUserPassword,
    createBatch,
    deleteBatch,
    publishAnnouncement,
    removeAnnouncement,
    saveTestAssignment,
    resolveRecovery,
    addQuestion,
    deleteQuestion,
    createStudyMaterial,
    deleteStudyMaterial,
    setCurrentView,
    setActiveTest,
    viewAttemptResult,
  } = useExam();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'students'
    | 'questions'
    | 'study-materials'
    | 'batches'
    | 'tests'
    | 'announcements'
    | 'recovery'
  >('overview');

  // Teacher's assigned courses (Section 15: JEE teacher only accesses JEE; NEET teacher only accesses NEET)
  const teacherAssignedCourses: CourseType[] = useMemo(() => {
    if (!authProfile) return ['JEE'];
    if (authProfile.role === 'ADMIN') return ['JEE', 'JEE_ADVANCED', 'NEET'];
    if (authProfile.assignedCourses && authProfile.assignedCourses.length > 0) {
      return authProfile.assignedCourses;
    }
    return [authProfile.courseType || 'JEE'];
  }, [authProfile]);

  const allowedExamOptions: { value: ExamType; label: string; course: CourseType }[] = useMemo(() => {
    const opts: { value: ExamType; label: string; course: CourseType }[] = [];
    if (teacherAssignedCourses.includes('JEE')) {
      opts.push({ value: 'JEE_MAIN', label: 'Course: JEE (Main)', course: 'JEE' });
    }
    if (teacherAssignedCourses.includes('JEE_ADVANCED')) {
      opts.push({
        value: 'JEE_ADVANCED',
        label: 'Course: JEE Advanced',
        course: 'JEE_ADVANCED',
      });
    }
    if (teacherAssignedCourses.includes('NEET')) {
      opts.push({ value: 'NEET', label: 'Course: NEET UG', course: 'NEET' });
    }
    return opts.length > 0
      ? opts
      : [{ value: 'JEE_MAIN', label: 'Course: JEE (Main)', course: 'JEE' }];
  }, [teacherAssignedCourses]);

  const defaultExam = allowedExamOptions[0].value;
  const defaultCourse = allowedExamOptions[0].course;

  const allowedSubjectsForTeacher: SubjectName[] = useMemo(() => {
    const set = new Set<SubjectName>(['Physics', 'Chemistry']);
    if (
      teacherAssignedCourses.includes('JEE') ||
      teacherAssignedCourses.includes('JEE_ADVANCED')
    ) {
      set.add('Mathematics');
    }
    if (teacherAssignedCourses.includes('NEET')) {
      set.add('Botany');
      set.add('Zoology');
    }
    return Array.from(set);
  }, [teacherAssignedCourses]);

  // Filter batches belonging to teacher's assigned courses
  const myBatches = useMemo(() => {
    if (!authProfile) return [];
    const courseSet = new Set(teacherAssignedCourses);
    return batches.filter((b) => {
      const bCourse =
        b.courseType ||
        (b.examCategory === 'NEET'
          ? 'NEET'
          : b.examCategory === 'JEE_ADVANCED'
          ? 'JEE_ADVANCED'
          : 'JEE');
      if (!courseSet.has(bCourse as CourseType)) return false;
      if (authProfile.role === 'ADMIN' || authProfile.teacherPermissions?.canViewAllStudents) {
        return true;
      }
      return b.teacherId === authProfile.id;
    });
  }, [batches, authProfile, teacherAssignedCourses]);

  // Filter students belonging strictly to teacher's assigned courses
  const myStudents = useMemo(() => {
    const allStudents = managedUsers.filter((u) => u.role === 'STUDENT');
    if (!authProfile) return [];
    const courseSet = new Set(teacherAssignedCourses);
    const courseFiltered = allStudents.filter((s) =>
      (s.assignedCourses || [s.courseType]).some((c) => courseSet.has(c as CourseType))
    );
    if (authProfile.role === 'ADMIN' || authProfile.teacherPermissions?.canViewAllStudents) {
      return courseFiltered;
    }
    const batchIds = new Set(myBatches.map((b) => b.id));
    return courseFiltered.filter(
      (s) => s.teacherId === authProfile.id || (s.batchId && batchIds.has(s.batchId))
    );
  }, [managedUsers, authProfile, myBatches, teacherAssignedCourses]);

  const myStudentIds = useMemo(() => new Set(myStudents.map((s) => s.id)), [myStudents]);

  const myStudentAttempts = useMemo(() => {
    return allAttempts.filter((a) => myStudentIds.has(a.userId));
  }, [allAttempts, myStudentIds]);

  // Create Student Form State (locked to teacher's assigned courses)
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentExam, setStudentExam] = useState<ExamType>(defaultExam);
  const [studentBatchId, setStudentBatchId] = useState<string>('');
  const [studentClass, setStudentClass] = useState('Class 12');
  const [studentIdFormat, setStudentIdFormat] = useState<'SEQUENTIAL' | 'ALPHANUMERIC'>(
    'SEQUENTIAL'
  );
  const [studentInitialPass, setStudentInitialPass] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    studentId: string;
    temporaryPassword: string;
    course: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Student Search
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [resetPassModalUser, setResetPassModalUser] = useState<AuthProfile | null>(null);
  const [newTempPassInput, setNewTempPassInput] = useState('');

  // Controlled Question Creation State (Section 14)
  const [qCourse, setQCourse] = useState<CourseType>(defaultCourse);
  const [qSubject, setQSubject] = useState<SubjectName>('Physics');
  const [qChapter, setQChapter] = useState('Electrostatics');
  const [qTopic, setQTopic] = useState('Electric Field & Potential');
  const [qDifficulty, setQDifficulty] = useState<Difficulty>('MEDIUM');
  const [qType, setQType] = useState<QuestionType>('MCQ');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState([
    { id: 'A' as const, text: 'Option A' },
    { id: 'B' as const, text: 'Option B' },
    { id: 'C' as const, text: 'Option C' },
    { id: 'D' as const, text: 'Option D' },
  ]);
  const [qCorrect, setQCorrect] = useState('A');
  const [qExplanation, setQExplanation] = useState('');
  const [qFeedback, setQFeedback] = useState<string | null>(null);

  // Study Material State
  const [smCourse, setSmCourse] = useState<CourseType>(defaultCourse);
  const [smSubject, setSmSubject] = useState<SubjectName>('Physics');
  const [smChapter, setSmChapter] = useState('Mechanics');
  const [smTitle, setSmTitle] = useState('');
  const [smSummary, setSmSummary] = useState('');
  const [smMsg, setSmMsg] = useState<string | null>(null);

  // Batch Creation State
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [newBatchExam, setNewBatchExam] = useState<ExamType>(defaultExam);
  const [newBatchClass, setNewBatchClass] = useState('Class 12');

  // Test Assignment State
  const [selectedTestForAssign, setSelectedTestForAssign] = useState<string>(
    accessibleTests[0]?.id || ''
  );
  const [assignVisibility, setAssignVisibility] = useState<'PUBLIC' | 'ASSIGNED_ONLY'>(
    'PUBLIC'
  );
  const [assignBatchIds, setAssignBatchIds] = useState<string[]>([]);

  // Announcement State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCourse, setAnnCourse] = useState<CourseType>(defaultCourse);
  const [annPriority, setAnnPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>(
    'IMPORTANT'
  );

  const activeStudentsCount = myStudents.filter((s) => s.status === 'ACTIVE').length;

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
      initialPassword: studentInitialPass.trim() || undefined,
      idFormat: studentIdFormat,
    });

    if (!res.success) {
      setFormMsg({ type: 'error', text: res.error || 'Failed to create student.' });
      return;
    }

    setCreatedCredentials({
      fullName: studentName.trim(),
      studentId: res.generatedStudentId || '',
      temporaryPassword: res.temporaryPassword || '',
      course: studentExam,
    });
    setStudentName('');
    setStudentEmail('');
    setStudentInitialPass('');
    setFormMsg({
      type: 'success',
      text: `Enrolled student with ID ${res.generatedStudentId} in ${studentExam}!`,
    });
  };

  const handleCreateCourseQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !qChapter.trim() || !qTopic.trim()) {
      setQFeedback('Please fill in Question Text, Chapter, and Topic.');
      return;
    }

    const examType: ExamType =
      qCourse === 'NEET'
        ? 'NEET'
        : qCourse === 'JEE_ADVANCED'
        ? 'JEE_ADVANCED'
        : 'JEE_MAIN';

    await addQuestion({
      courseId:
        qCourse === 'NEET'
          ? 'course-neet-ug'
          : qCourse === 'JEE_ADVANCED'
          ? 'course-jee-advanced'
          : 'course-jee-main',
      courseType: qCourse,
      examType,
      subject: qSubject,
      chapter: qChapter.trim(),
      topic: qTopic.trim(),
      difficulty: qDifficulty,
      type: qType,
      questionText: qText.trim(),
      options: qType === 'MCQ' ? qOptions : undefined,
      correctAnswer: qCorrect.trim(),
      explanation: qExplanation.trim() || 'Verified faculty solution.',
      positiveMarks: 4,
      negativeMarks: qType === 'NUMERICAL' ? 0 : 1,
      source: 'ADMIN',
      status: 'APPROVED',
    });

    setQText('');
    setQExplanation('');
    setQFeedback(`Saved verified ${qCourse} (${qSubject}) question to Question Bank!`);
    setTimeout(() => setQFeedback(null), 4000);
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smTitle.trim() || !smSummary.trim()) return;
    const created = await createStudyMaterial({
      courseType: smCourse,
      subject: smSubject,
      chapter: smChapter,
      title: smTitle.trim(),
      description: `${smCourse} ${smSubject} Faculty Notes`,
      resourceType: 'NOTES',
      contentSummary: smSummary.trim(),
    });
    if (created) {
      setSmTitle('');
      setSmSummary('');
      setSmMsg(`Published "${created.title}" to ${created.courseType} students!`);
      setTimeout(() => setSmMsg(null), 4000);
    }
  };

  const filteredStudents = useMemo(() => {
    return myStudents.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchId = s.studentId?.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [myStudents, statusFilter, studentSearch]);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Faculty Command Portal
              </span>
              {teacherAssignedCourses.map((c) => (
                <span
                  key={c}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase ${
                    c === 'NEET'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  Assigned Course: {c}
                </span>
              ))}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Welcome, {authProfile?.fullName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized strictly for{' '}
              <strong className="text-slate-800">{teacherAssignedCourses.join(' & ')}</strong>{' '}
              students, questions, mock tests, study materials, and analytics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('questions')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Course Question
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Enroll Student
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: `${teacherAssignedCourses.join('/')} Overview` },
            { id: 'students', label: `My Course Students (${myStudents.length})` },
            { id: 'questions', label: `Controlled Question Bank (${questions.length})` },
            { id: 'study-materials', label: `Course Study Material (${studyMaterials.length})` },
            { id: 'batches', label: `Course Batches (${myBatches.length})` },
            { id: 'tests', label: `Course Mock Tests (${accessibleTests.length})` },
            { id: 'announcements', label: `Course Announcements (${announcements.length})` },
            {
              id: 'recovery',
              label: `Password Resets (${recoveryRequests.filter((r) => r.status === 'PENDING').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ================= TAB: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Enrolled {teacherAssignedCourses.join('/')} Students
                </div>
                <div className="text-3xl font-black text-slate-900 mt-1">{myStudents.length}</div>
                <div className="text-xs text-emerald-600 mt-0.5">{activeStudentsCount} Active</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Course Mock Tests
                </div>
                <div className="text-3xl font-black text-indigo-600 mt-1">
                  {accessibleTests.length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Authorized for your course</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Course Question Bank
                </div>
                <div className="text-3xl font-black text-emerald-600 mt-1">{questions.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Subjects: {allowedSubjectsForTeacher.join(', ')}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Student Attempts
                </div>
                <div className="text-3xl font-black text-amber-600 mt-1">
                  {myStudentAttempts.length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Evaluated Submissions</div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-base font-black text-slate-900">
                Recent {teacherAssignedCourses.join(' / ')} Student Test Results
              </h3>
              {myStudentAttempts.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No test attempts recorded yet for students in your assigned course.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Test Title</th>
                        <th className="py-3 px-4">Course</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Accuracy</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {myStudentAttempts.slice(0, 10).map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{att.userName}</td>
                          <td className="py-3 px-4 text-slate-700">{att.testTitle}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                            {att.courseType || att.examType}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {att.totalScore} / {att.maxScore}
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                            {att.accuracy}%
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => viewAttemptResult(att)}
                              className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 cursor-pointer"
                            >
                              Inspect Result
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: STUDENTS ================= */}
        {activeTab === 'students' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleCreateStudent}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs"
            >
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Enroll New {teacherAssignedCourses.join('/')} Student
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generates a unique Student ID scoped strictly to your authorized course(s).
                </p>
              </div>

              {formMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    formMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {formMsg.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Aditya Nair"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Enrolled Course (Locked to Your Faculty Scope)
                  </label>
                  <select
                    value={studentExam}
                    onChange={(e) => setStudentExam(e.target.value as ExamType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  >
                    {allowedExamOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Class
                    </label>
                    <select
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      <option value="Class 11">Class 11</option>
                      <option value="Class 12">Class 12</option>
                      <option value="Dropper">Dropper</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Batch
                    </label>
                    <select
                      value={studentBatchId}
                      onChange={(e) => setStudentBatchId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      <option value="">Unassigned</option>
                      {myBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Generate Student ID &amp; Enroll
              </button>

              {createdCredentials && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs font-mono">
                  <div className="text-emerald-400 font-bold">
                    ID: {createdCredentials.studentId}
                  </div>
                  <div>Temp Pass: {createdCredentials.temporaryPassword}</div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Student ID: ${createdCredentials.studentId} | Password: ${createdCredentials.temporaryPassword}`
                      );
                      setCopiedCreds(true);
                      setTimeout(() => setCopiedCreds(false), 2000);
                    }}
                    className="w-full py-1.5 bg-white text-slate-900 rounded-lg font-sans font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCreds ? 'Copied' : 'Copy Credentials'}
                  </button>
                </div>
              )}
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-black text-slate-900">
                  Enrolled {teacherAssignedCourses.join('/')} Students ({filteredStudents.length})
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name or ID..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Reset Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {s.studentId}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                            {(s.assignedCourses || [s.courseType]).join(' + ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={async () => {
                              await resetUserPassword(s.id, 'Welcome@123', true);
                              setFormMsg({
                                type: 'success',
                                text: `Reset ${s.fullName}'s password to Welcome@123`,
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                          >
                            Reset to Welcome@123
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: CONTROLLED QUESTION CREATION WORKFLOW (SECTION 14) ================= */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleCreateCourseQuestion}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs"
            >
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600">
                  Controlled Question Creation Workflow
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Add Question to {qCourse} Bank
                </h3>
              </div>

              {qFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {qFeedback}
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      1. Assign Course
                    </label>
                    <select
                      value={qCourse}
                      onChange={(e) => setQCourse(e.target.value as CourseType)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      {teacherAssignedCourses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      2. Assign Subject
                    </label>
                    <select
                      value={qSubject}
                      onChange={(e) => setQSubject(e.target.value as SubjectName)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      {allowedSubjectsForTeacher.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      3. Assign Chapter
                    </label>
                    <input
                      type="text"
                      required
                      value={qChapter}
                      onChange={(e) => setQChapter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      4. Assign Topic
                    </label>
                    <input
                      type="text"
                      required
                      value={qTopic}
                      onChange={(e) => setQTopic(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      5. Difficulty
                    </label>
                    <select
                      value={qDifficulty}
                      onChange={(e) => setQDifficulty(e.target.value as Difficulty)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      6. Type
                    </label>
                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value as QuestionType)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      <option value="MCQ">MCQ</option>
                      <option value="NUMERICAL">Numerical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Question Text (LaTeX $...$)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Enter question statement..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                {qType === 'MCQ' && (
                  <div className="space-y-1.5">
                    {qOptions.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs">{opt.id}:</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const next = [...qOptions];
                            next[idx].text = e.target.value;
                            setQOptions(next);
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Correct Answer Key
                  </label>
                  <input
                    type="text"
                    required
                    value={qCorrect}
                    onChange={(e) => setQCorrect(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Explanation
                  </label>
                  <textarea
                    rows={2}
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Validate &amp; Save to {qCourse} Question Bank
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="text-base font-black text-slate-900">
                Authorized {teacherAssignedCourses.join(' / ')} Questions ({questions.length})
              </h3>
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {questions.slice(0, 25).map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          {q.questionId || q.id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          {q.courseType || q.examType} • {q.subject}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{q.chapter}</span>
                      </div>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-800">
                      <MathView content={q.questionText} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: STUDY MATERIALS ================= */}
        {activeTab === 'study-materials' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleCreateMaterial}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs"
            >
              <h3 className="text-base font-black text-slate-900">
                Publish {smCourse} Study Material
              </h3>
              {smMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
                  {smMsg}
                </div>
              )}
              <select
                value={smCourse}
                onChange={(e) => setSmCourse(e.target.value as CourseType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              >
                {teacherAssignedCourses.map((c) => (
                  <option key={c} value={c}>
                    Course: {c}
                  </option>
                ))}
              </select>
              <select
                value={smSubject}
                onChange={(e) => setSmSubject(e.target.value as SubjectName)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              >
                {allowedSubjectsForTeacher.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={smChapter}
                onChange={(e) => setSmChapter(e.target.value)}
                placeholder="Chapter Name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                required
                value={smTitle}
                onChange={(e) => setSmTitle(e.target.value)}
                placeholder="Study Material Title"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              />
              <textarea
                rows={3}
                required
                value={smSummary}
                onChange={(e) => setSmSummary(e.target.value)}
                placeholder="Formulas, notes, and revision points (LaTeX supported)..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Publish Study Material
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <h3 className="text-base font-black text-slate-900">
                Course Study Materials ({studyMaterials.length})
              </h3>
              {studyMaterials.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                      {m.courseType} • {m.subject} • {m.chapter}
                    </span>
                    <button
                      onClick={() => deleteStudyMaterial(m.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="font-bold text-sm text-slate-900">{m.title}</div>
                  <div className="text-xs text-slate-600">
                    <MathView content={m.contentBody || m.contentSummary || ''} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB: BATCHES ================= */}
        {activeTab === 'batches' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await createBatch({
                  name: newBatchName,
                  description: newBatchDesc,
                  examCategory: newBatchExam,
                  className: newBatchClass,
                });
                setNewBatchName('');
                setNewBatchDesc('');
              }}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs"
            >
              <h3 className="text-base font-black text-slate-900">Create Course Batch</h3>
              <input
                type="text"
                required
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="Batch Name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <select
                value={newBatchExam}
                onChange={(e) => setNewBatchExam(e.target.value as ExamType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              >
                {allowedExamOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <textarea
                rows={2}
                value={newBatchDesc}
                onChange={(e) => setNewBatchDesc(e.target.value)}
                placeholder="Description..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Create Batch
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <h3 className="text-base font-black text-slate-900">
                My Assigned Batches ({myBatches.length})
              </h3>
              {myBatches.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900">{b.name}</div>
                    <div className="text-xs text-slate-500">
                      Course: {b.courseType || b.examCategory} • {b.description}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteBatch(b.id)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB: TESTS ================= */}
        {activeTab === 'tests' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-black text-slate-900">
              Authorized {teacherAssignedCourses.join(' / ')} Mock Tests ({accessibleTests.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accessibleTests.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">
                      {t.courseType || t.examType}
                    </span>
                    <div className="font-bold text-sm text-slate-900 mt-1">{t.title}</div>
                    <div className="text-xs text-slate-500">
                      {t.questionsCount} Questions • {t.durationMinutes} mins • {t.totalMarks} Marks
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTest(t);
                      setCurrentView('test-details');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0"
                  >
                    Inspect Paper
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB: ANNOUNCEMENTS ================= */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await publishAnnouncement({
                  title: annTitle,
                  content: annContent,
                  courseType: annCourse,
                  targetAudience: 'STUDENTS',
                  priority: annPriority,
                });
                setAnnTitle('');
                setAnnContent('');
              }}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs"
            >
              <h3 className="text-base font-black text-slate-900">
                Publish {annCourse} Announcement
              </h3>
              <select
                value={annCourse}
                onChange={(e) => setAnnCourse(e.target.value as CourseType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              >
                {teacherAssignedCourses.map((c) => (
                  <option key={c} value={c}>
                    Course: {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcement Title"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              />
              <textarea
                rows={3}
                required
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Details for students..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Publish to {annCourse} Students
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
              <h3 className="text-base font-black text-slate-900">
                Course Announcements ({announcements.length})
              </h3>
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">
                      {a.courseType || 'ALL'}
                    </span>
                    <div className="font-bold text-sm text-slate-900 mt-1">{a.title}</div>
                    <p className="text-xs text-slate-600">{a.content}</p>
                  </div>
                  <button
                    onClick={() => removeAnnouncement(a.id)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB: RECOVERY ================= */}
        {activeTab === 'recovery' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-black text-slate-900">
              Student Password Recovery Requests
            </h3>
            {recoveryRequests.length === 0 ? (
              <p className="text-xs text-slate-500">No pending password recovery requests.</p>
            ) : (
              <div className="space-y-3">
                {recoveryRequests.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {r.userName} ({r.identifier})
                      </div>
                      <div className="text-[11px] text-slate-500">{r.reason}</div>
                    </div>
                    {r.status === 'PENDING' ? (
                      <button
                        onClick={() => resolveRecovery(r.id, 'Welcome@123')}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Reset to Welcome@123
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700">RESOLVED</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
