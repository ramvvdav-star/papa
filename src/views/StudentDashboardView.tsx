import React, { useMemo, useState } from 'react';
import { useExam } from '../context/ExamContext';
import {
  TrendingUp,
  Award,
  Clock,
  Target,
  BookOpen,
  Calendar,
  ArrowRight,
  RotateCcw,
  Bookmark,
  Sliders,
  Zap,
  Bell,
  Users,
  GraduationCap,
  ShieldCheck,
  FileText,
  Layers,
} from 'lucide-react';
import { SubjectName } from '../types/exam';

export const StudentDashboardView: React.FC = () => {
  const {
    currentUser,
    authProfile,
    attemptHistory,
    accessibleTests: tests,
    studyMaterials,
    viewAttemptResult,
    setCurrentView,
    setActiveTest,
    bookmarks,
    mistakeQuestions,
    inProgressSession,
    resumeExam,
    discardExamSession,
    startMistakePractice,
    announcements,
  } = useExam();

  const studentCourseType =
    authProfile?.courseType ||
    (authProfile?.examCategory === 'NEET'
      ? 'NEET'
      : authProfile?.examCategory === 'JEE_ADVANCED'
      ? 'JEE_ADVANCED'
      : 'JEE');

  const isNeet = studentCourseType === 'NEET';
  const coursePrefix = isNeet
    ? 'NEET'
    : studentCourseType === 'JEE_ADVANCED'
    ? 'JEE Advanced'
    : 'JEE';

  const allowedSubjects: SubjectName[] = useMemo(
    () =>
      isNeet
        ? ['Physics', 'Chemistry', 'Botany', 'Zoology']
        : ['Physics', 'Chemistry', 'Mathematics'],
    [isNeet]
  );

  const [activeDashboardSection, setActiveDashboardSection] = useState<
    'overview' | 'study-material' | 'syllabus'
  >('overview');

  // Official Course Syllabus Breakdown
  const courseSyllabus = useMemo(() => {
    if (isNeet) {
      return [
        {
          subject: 'Botany (NEET UG)',
          units: [
            'Diversity in Living World & Biological Classification',
            'Structural Organisation in Plants & Cell Biology',
            'Plant Physiology: Photosynthesis, Respiration & Growth',
            'Genetics & Evolution: Mendelian Inheritance & Molecular Basis',
            'Ecology & Environment: Ecosystems & Biodiversity',
          ],
        },
        {
          subject: 'Zoology (NEET UG)',
          units: [
            'Animal Kingdom & Structural Organisation in Animals',
            'Human Physiology: Digestion, Breathing, Circulation, Excretion',
            'Neural Control, Coordination & Chemical Integration',
            'Human Reproduction & Reproductive Health',
            'Biotechnology Principles, Applications & Human Welfare',
          ],
        },
        {
          subject: 'Physics (NEET UG)',
          units: [
            'Mechanics: Kinematics, Laws of Motion, Work, Energy & Rotational Motion',
            'Thermodynamics, Kinetic Theory & Oscillations/Waves',
            'Electrostatics, Current Electricity & Magnetic Effects',
            'Electromagnetic Induction, Optics & Dual Nature of Matter',
            'Atoms, Nuclei & Semiconductor Electronics',
          ],
        },
        {
          subject: 'Chemistry (NEET UG)',
          units: [
            'Physical: Atomic Structure, Equilibrium, Thermodynamics, Electrochemistry, Kinetics',
            'Inorganic: Periodic Table, Chemical Bonding, p/d/f-Block & Coordination Compounds',
            'Organic: GOC, Hydrocarbons, Haloalkanes, Alcohols, Carbonyls, Amines & Biomolecules',
          ],
        },
      ];
    }
    return [
      {
        subject: 'Physics (JEE Main & Advanced)',
        units: [
          'Mechanics: Kinematics, Newtons Laws, Work-Energy, Rotational Dynamics & Gravitation',
          'Thermodynamics, Kinetic Theory of Gases, SHM & Wave Mechanics',
          'Electrodynamics: Electrostatics, Capacitors, Current Electricity, Magnetism & EMI/AC',
          'Geometrical & Wave Optics, Modern Physics, Nuclear Physics & Semiconductors',
        ],
      },
      {
        subject: 'Chemistry (JEE Main & Advanced)',
        units: [
          'Physical Chemistry: Mole Concept, Thermodynamics, Equilibrium, Electrochemistry, Chemical Kinetics',
          'Inorganic Chemistry: Chemical Bonding, Coordination Compounds, p/d/f Block Elements & Metallurgy',
          'Organic Chemistry: Stereochemistry, Reaction Mechanisms, Carbonyls, Carboxylic Acids & Biomolecules',
        ],
      },
      {
        subject: 'Mathematics (JEE Main & Advanced)',
        units: [
          'Algebra: Complex Numbers, Quadratic Equations, Matrices & Determinants, Permutations, Probability',
          'Calculus: Limits, Continuity, Differentiability, AOD, Indefinite & Definite Integration, Differential Equations',
          'Coordinate Geometry & Vectors: Straight Lines, Circles, Conic Sections, Vectors & 3D Geometry',
          'Trigonometry: Trigonometric Identities, Equations & Inverse Trigonometric Functions',
        ],
      },
    ];
  }, [isNeet]);

  // Calculate subject-wise accuracy across past attempts (Course-filtered)
  const subjectStats = useMemo(() => {
    const map: Record<
      string,
      { correct: number; incorrect: number; unattempted: number; time: number }
    > = {};

    attemptHistory.forEach((att) => {
      (att.subjectAnalysis || []).forEach((sub) => {
        if (!allowedSubjects.includes(sub.subject as SubjectName)) return;
        if (!map[sub.subject]) {
          map[sub.subject] = { correct: 0, incorrect: 0, unattempted: 0, time: 0 };
        }
        map[sub.subject].correct += sub.correct;
        map[sub.subject].incorrect += sub.incorrect;
        map[sub.subject].unattempted += sub.unanswered;
        map[sub.subject].time += sub.timeSpentSeconds;
      });
    });

    return Object.entries(map).map(([subject, data]) => {
      const attempted = data.correct + data.incorrect;
      const acc = attempted > 0 ? Math.round((data.correct / attempted) * 100) : 0;
      const avgTime = attempted > 0 ? Math.round(data.time / attempted) : 0;
      return {
        subject: subject as SubjectName,
        correct: data.correct,
        incorrect: data.incorrect,
        unattempted: data.unattempted,
        accuracy: acc,
        avgTimePerQuestion: avgTime,
      };
    });
  }, [attemptHistory, allowedSubjects]);

  // Score progression trend
  const recentScores = useMemo(() => {
    return [...attemptHistory]
      .reverse()
      .slice(-6)
      .map((a, idx) => ({
        label: `T${idx + 1}`,
        title: a.testTitle,
        score: a.totalScore,
        maxScore: a.maxScore,
        percentage: Math.max(5, Math.round((a.totalScore / Math.max(1, a.maxScore)) * 100)),
        accuracy: a.accuracy,
      }));
  }, [attemptHistory]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Course-Locked Candidate Enrollment Banner */}
        {authProfile && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {coursePrefix} Dashboard • Verified Enrollment
                  </span>
                  {authProfile.studentId && (
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-700 font-mono text-xs font-black text-indigo-300">
                      ID: {authProfile.studentId}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 border border-emerald-700 font-mono text-xs font-bold text-emerald-300">
                    Course: {studentCourseType} ({authProfile.enrollmentStatus || 'ACTIVE'})
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {authProfile.fullName} — {coursePrefix} Student Portal
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                  <span>
                    Enrolled Course:{' '}
                    <strong className="text-white">
                      {isNeet
                        ? 'NEET UG 2026 (Medical)'
                        : studentCourseType === 'JEE_ADVANCED'
                        ? 'JEE Main & JEE Advanced 2026'
                        : 'JEE Main 2026 (Engineering)'}
                    </strong>
                  </span>
                  <span>
                    Authorized Subjects:{' '}
                    <strong className="text-emerald-300">{allowedSubjects.join(', ')}</strong>
                  </span>
                  {authProfile.batchName && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      Batch: <strong className="text-white">{authProfile.batchName}</strong>
                    </span>
                  )}
                  {authProfile.teacherName && (
                    <span>
                      Faculty Mentor:{' '}
                      <strong className="text-indigo-300">{authProfile.teacherName}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setCurrentView('tests')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {coursePrefix} Mock Tests ({tests.length})
              </button>
              <button
                onClick={() => setCurrentView('practice-engine')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> {coursePrefix} Practice
              </button>
              <button
                onClick={() => setCurrentView('student-custom-test')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" /> Custom {coursePrefix} Test
              </button>
            </div>
          </div>
        )}

        {/* Course Section Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveDashboardSection('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeDashboardSection === 'overview'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>
              {coursePrefix} Performance, Analytics &amp; Results
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDashboardSection('study-material')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeDashboardSection === 'study-material'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>
              {coursePrefix} Study Material ({studyMaterials.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDashboardSection('syllabus')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeDashboardSection === 'syllabus'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>{coursePrefix} Official 2026 Syllabus</span>
          </button>
        </div>

        {/* Course-Scoped Announcements Strip */}
        {announcements.length > 0 && (
          <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>{coursePrefix} Announcements &amp; Batch Notices</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {announcements.slice(0, 2).map((ann) => (
                <div
                  key={ann.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {ann.priority}
                    </span>
                    <span>By {ann.authorName}</span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {ann.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Unfinished Session Banner */}
        {inProgressSession && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold bg-white/20 rounded">
                  Session Recovery Available
                </span>
                <span className="text-xs text-indigo-200 font-mono">
                  Saved {new Date(inProgressSession.lastSavedTimestamp).toLocaleTimeString()}
                </span>
              </div>
              <h3 className="text-lg font-extrabold">
                You have an unfinished {coursePrefix} examination in progress
              </h3>
              <p className="text-xs text-indigo-100">
                Remaining Time: {Math.floor(inProgressSession.timerSecondsLeft / 60)} minutes • Mode:{' '}
                {inProgressSession.examMode}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={discardExamSession}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={resumeExam}
                className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Resume Exam <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= SECTION: STUDY MATERIAL ================= */}
        {activeDashboardSection === 'study-material' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                  Course-Authorized Learning Resources
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {coursePrefix} Study Material, Formula Sheets &amp; Notes
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Strictly curated {coursePrefix} revision notes and formula handbooks for{' '}
                  {allowedSubjects.join(', ')}.
                </p>
              </div>
            </div>

            {studyMaterials.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No study materials published for {coursePrefix} yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {studyMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {mat.courseType} • {mat.subject}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {mat.materialType.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {mat.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold">
                        Chapter: {mat.chapter}
                      </p>
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {mat.contentBody || mat.content || mat.contentSummary}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <span>Curated by {mat.createdBy || mat.authorName}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentView('practice-engine')}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        Practice {mat.subject} Questions →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= SECTION: SYLLABUS ================= */}
        {activeDashboardSection === 'syllabus' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="text-xs font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
                Official 2026 Regulatory Curriculum
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {coursePrefix} 2026 Prescribed Examination Syllabus
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete unit-by-unit breakdown for your enrolled {coursePrefix} course.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {courseSyllabus.map((item) => (
                <div
                  key={item.subject}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-3"
                >
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {item.subject}
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {item.units.map((u, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SECTION: OVERVIEW, PERFORMANCE & ANALYTICS ================= */}
        {activeDashboardSection === 'overview' && (
          <>
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    My {coursePrefix} Attempts
                  </span>
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {attemptHistory.length}
                </div>
                <p className="text-[11px] text-slate-500">Completed mock &amp; practice papers</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {coursePrefix} Average Score
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {currentUser.averageScore}
                </div>
                <p className="text-[11px] text-slate-500">Best Score: {currentUser.bestScore}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {coursePrefix} Accuracy
                  </span>
                  <Target className="w-4 h-4 text-sky-500" />
                </div>
                <div className="text-3xl font-black text-sky-600 dark:text-sky-400 font-mono">
                  {currentUser.averageAccuracy}%
                </div>
                <p className="text-[11px] text-slate-500">Target &gt; 80% for 99+ %ile</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Saved &amp; Missed Qs
                  </span>
                  <Bookmark className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {bookmarks.length + mistakeQuestions.length}
                </div>
                <p className="text-[11px] text-slate-500">
                  {bookmarks.length} Bookmarked • {mistakeQuestions.length} Mistakes
                </p>
              </div>
            </div>

            {/* Main Grid: Score Progression + Quick Revision Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: Score Progression & Subject Mastery */}
              <div className="lg:col-span-2 space-y-6">
                {/* Score Progression Bar Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        My {coursePrefix} Score &amp; Accuracy Trend
                      </h3>
                      <p className="text-xs text-slate-500">
                        Performance trajectory across your recent {coursePrefix} test attempts
                      </p>
                    </div>
                  </div>

                  {recentScores.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <Award className="w-8 h-8 text-indigo-500 mx-auto" />
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No {coursePrefix} Test Attempts Recorded Yet
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Take your first {coursePrefix} mock test or chapter sprint to unlock visual score progression, percentile estimation, and time-per-question analytics.
                      </p>
                      <button
                        onClick={() => setCurrentView('tests')}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        Browse {coursePrefix} Mock Tests →
                      </button>
                    </div>
                  ) : (
                    <div className="pt-4">
                      <div className="grid grid-cols-6 gap-3 items-end h-44 pt-6 px-2 border-b border-slate-200 dark:border-slate-800">
                        {recentScores.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center gap-2 h-full justify-end group"
                          >
                            <div className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.score}/{item.maxScore}
                            </div>
                            <div
                              className="w-full max-w-[42px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl transition-all group-hover:from-emerald-600 group-hover:to-emerald-400"
                              style={{ height: `${Math.max(12, item.percentage)}%` }}
                              title={`${item.title}: ${item.score}/${item.maxScore} (${item.accuracy}% Accuracy)`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-6 gap-3 pt-2 text-center">
                        {recentScores.map((item, idx) => (
                          <div key={idx} className="truncate">
                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                              {item.label}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{item.title}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subject-Wise Mastery & Speed Breakdown */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {coursePrefix} Subject-Wise Accuracy &amp; Speed Telemetry
                    </h3>
                    <p className="text-xs text-slate-500">
                      Aggregated across all attempted questions in {allowedSubjects.join(', ')}
                    </p>
                  </div>

                  {subjectStats.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                      Subject breakdowns for {allowedSubjects.join(', ')} will populate automatically after your first test submission.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {subjectStats.map((st) => (
                        <div
                          key={st.subject}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {st.subject}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                ({st.correct} Correct • {st.incorrect} Wrong • {st.unattempted}{' '}
                                Skipped)
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {st.avgTimePerQuestion}s / Q
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                  st.accuracy >= 75
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : st.accuracy >= 50
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {st.accuracy}% Accuracy
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                st.accuracy >= 75
                                  ? 'bg-emerald-500'
                                  : st.accuracy >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.max(4, st.accuracy)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Mistake Book, Bookmarks & Recommended Course Tests */}
              <div className="space-y-6">
                {/* Mistake Book Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                      {mistakeQuestions.length} Queued
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {coursePrefix} Mistake Book
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Every {coursePrefix} question you answered incorrectly in past tests is automatically collected here for targeted re-attempts.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => startMistakePractice()}
                      className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Practice Mistakes
                    </button>
                    <button
                      onClick={() => setCurrentView('bookmarks-mistakes')}
                      className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      View Bookmarks ({bookmarks.length})
                    </button>
                  </div>
                </div>

                {/* Recommended Course Tests */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Recommended {coursePrefix} Mocks
                    </h3>
                    <button
                      onClick={() => setCurrentView('tests')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {tests.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setActiveTest(t);
                          setCurrentView('test-details');
                        }}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer space-y-1 bg-slate-50/50 dark:bg-slate-950/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                            {t.examType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {t.durationMinutes} mins • {t.totalMarks} Marks
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {t.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Attempt History Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    My {coursePrefix} Examination Attempt History ({attemptHistory.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click on any past {coursePrefix} attempt to inspect full question-by-question solutions and OMR analytics.
                  </p>
                </div>
              </div>

              {attemptHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No past {coursePrefix} test attempts found.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4">Examination Title</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-center">Score</th>
                        <th className="py-3 px-4 text-center">Accuracy</th>
                        <th className="py-3 px-4 text-center">Est. Percentile</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                      {attemptHistory.map((att) => (
                        <tr
                          key={att.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {att.testTitle}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(att.submittedAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {att.totalScore} / {att.maxScore}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">{att.accuracy}%</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {att.simulatedPercentile}%ile
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => viewAttemptResult(att)}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                            >
                              View Report →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
