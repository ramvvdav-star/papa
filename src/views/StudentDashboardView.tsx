import React, { useMemo, useState } from 'react';
import { useExam } from '../context/ExamContext';
import {
  Award,
  Flame,
  Target,
  Clock,
  TrendingUp,
  BookOpen,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Zap,
  Bell,
  User,
  GraduationCap,
  Layers,
  BarChart3,
} from 'lucide-react';

export const StudentDashboardView: React.FC = () => {
  const {
    authProfile,
    currentUser,
    attemptHistory,
    accessibleTests,
    batches,
    announcements,
    setCurrentView,
    viewAttemptResult,
    setActiveTest,
  } = useExam();

  const [showProfileCard, setShowProfileCard] = useState(false);

  const studentName = authProfile?.fullName || currentUser.name;
  const firstName = studentName.split(' ')[0];
  const examCat = authProfile?.examCategory || currentUser.targetExam || 'JEE_MAIN';
  const isNeet = examCat === 'NEET';

  // Find student's assigned batch
  const myBatch = useMemo(() => {
    if (!authProfile?.batchId) return null;
    return batches.find((b) => b.id === authProfile.batchId) || null;
  }, [batches, authProfile]);

  // Assigned tests from batch + direct student testAccess
  const assignedTestsList = useMemo(() => {
    const ids = new Set<string>([
      ...(myBatch?.assignedTestIds || []),
      ...(authProfile?.testAccess || []),
    ]);
    const list = accessibleTests.filter((t) => ids.has(t.id));
    if (list.length > 0) return list;
    return accessibleTests.filter((t) => t.examType === examCat).slice(0, 4);
  }, [accessibleTests, myBatch, authProfile, examCat]);

  const upcomingTestsList = useMemo(() => {
    const attemptedIds = new Set(attemptHistory.map((a) => a.testId));
    return accessibleTests
      .filter((t) => t.examType === examCat && !attemptedIds.has(t.id))
      .slice(0, 4);
  }, [accessibleTests, attemptHistory, examCat]);

  // Relevant announcements for this student
  const myAnnouncements = useMemo(() => {
    return announcements.filter(
      (a) =>
        a.targetAudience === 'ALL' ||
        a.targetAudience === 'STUDENTS' ||
        (a.targetAudience === 'BATCH' && a.targetBatchId === authProfile?.batchId)
    );
  }, [announcements, authProfile]);

  // Statistics
  const totalAttemptCount = attemptHistory.length;
  const avgScore =
    totalAttemptCount > 0
      ? Math.round(
          attemptHistory.reduce((sum, a) => sum + a.totalScore, 0) / totalAttemptCount
        )
      : isNeet
      ? 542
      : 186;
  const bestScore =
    totalAttemptCount > 0
      ? Math.max(...attemptHistory.map((a) => a.totalScore))
      : isNeet
      ? 615
      : 228;
  const avgAccuracy =
    totalAttemptCount > 0
      ? Math.round(
          attemptHistory.reduce((sum, a) => sum + a.accuracy, 0) / totalAttemptCount
        )
      : 81;
  const bestRank =
    totalAttemptCount > 0
      ? Math.min(...attemptHistory.map((a) => a.practiceRank || 142))
      : 142;
  const bestPercentile =
    totalAttemptCount > 0
      ? Math.max(...attemptHistory.map((a) => a.simulatedPercentile || 98.4))
      : 98.4;

  const progressionScores =
    attemptHistory.length > 0
      ? attemptHistory
          .slice()
          .reverse()
          .map((a) => a.totalScore)
      : isNeet
      ? [460, 488, 512, 535, 560, 584, 615]
      : [135, 148, 162, 178, 195, 212, 228];

  const subjectPerformance = isNeet
    ? [
        { name: 'Physics', mastery: 76, scoreText: '136 / 180', color: 'bg-indigo-600' },
        { name: 'Chemistry', mastery: 82, scoreText: '148 / 180', color: 'bg-emerald-600' },
        { name: 'Botany', mastery: 88, scoreText: '160 / 180', color: 'bg-sky-600' },
        { name: 'Zoology', mastery: 85, scoreText: '154 / 180', color: 'bg-purple-600' },
      ]
    : [
        { name: 'Physics', mastery: 78, scoreText: '78 / 100', color: 'bg-indigo-600' },
        { name: 'Chemistry', mastery: 84, scoreText: '84 / 100', color: 'bg-emerald-600' },
        { name: 'Mathematics', mastery: 68, scoreText: '66 / 100', color: 'bg-sky-600' },
      ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome & Candidate Identity Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-indigo-300">
              <span>STUDENT ID: {authProfile?.studentId || 'JEE26-10001'}</span>
              <span>·</span>
              <span>EXAM: {examCat.replace('_', ' ')}</span>
              <span>·</span>
              <span>BATCH: {myBatch?.name || authProfile?.batchName || 'Morning Cohort'}</span>
              {authProfile?.teacherName && (
                <>
                  <span>·</span>
                  <span>MENTOR: {authProfile.teacherName.split('(')[0]}</span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Review your faculty-assigned mock examinations, subject accuracy metrics, and recent CBT performance analytics.
            </p>
          </div>

          {/* Quick Actions (Section 13) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentView('tests')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Start Test</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (attemptHistory.length > 0) {
                  viewAttemptResult(attemptHistory[0]);
                } else {
                  setCurrentView('tests');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              View Results
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('bookmarks-mistakes')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              View Performance
            </button>

            <button
              type="button"
              onClick={() => setShowProfileCard((p) => !p)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Profile</span>
            </button>
          </div>
        </div>

        {/* Collapsible Student Official Profile Card */}
        {showProfileCard && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-slate-500 font-semibold">Candidate Name &amp; ID</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {studentName}
              </div>
              <div className="font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                {authProfile?.studentId || 'JEE26-10001'}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-slate-500 font-semibold">Assigned Batch &amp; Class</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {myBatch?.name || authProfile?.batchName || 'JEE Main 2027 Morning Batch'}
              </div>
              <div className="text-slate-500 mt-0.5">
                {authProfile?.className || 'Class 12'} · Target {authProfile?.targetYear || 2026}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-slate-500 font-semibold">Assigned Faculty Mentor</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {authProfile?.teacherName || 'Prof. H.C. Verma'}
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                Account Status: {authProfile?.status || 'ACTIVE'}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-slate-500 font-semibold">Authorized Subjects</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                {(authProfile?.subjectAccess || ['Physics', 'Chemistry', 'Mathematics']).join(
                  ', '
                )}
              </div>
              <div className="text-slate-500 mt-0.5">Full CBT Simulation Access</div>
            </div>
          </div>
        )}

        {/* 8 Statistics Cards Required by Section 13 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Tests Attempted
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {totalAttemptCount}
            </div>
            <div className="text-[10px] text-slate-500">Total Sessions</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Tests Completed
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
              {totalAttemptCount}
            </div>
            <div className="text-[10px] text-emerald-600">100% Completion</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Average Score
            </div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
              {avgScore}
            </div>
            <div className="text-[10px] text-slate-500">
              Out of {isNeet ? 720 : 300}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">Best Score</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {bestScore}
            </div>
            <div className="text-[10px] text-slate-500">Personal Peak</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">Accuracy</div>
            <div className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono mt-1">
              {avgAccuracy}%
            </div>
            <div className="text-[10px] text-slate-500">Hit Ratio</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">AIR Rank</div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
              #{bestRank}
            </div>
            <div className="text-[10px] text-slate-500">Simulated AIR</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">Percentile</div>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
              {bestPercentile.toFixed(1)}%ile
            </div>
            <div className="text-[10px] text-slate-500">NTA Normalized</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Average Time
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
              1m 42s
            </div>
            <div className="text-[10px] text-slate-500">Per Question</div>
          </div>
        </div>

        {/* Assigned Tests & Upcoming Tests Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assigned Tests by Teacher / Batch */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Batch Curriculum
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Assigned Tests ({assignedTestsList.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('tests')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                All Papers →
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {assignedTestsList.slice(0, 4).map((test) => (
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
                      {test.totalMarks} Marks · {test.durationMinutes} Mins
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTest(test);
                      setCurrentView('test-details');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Start Exam
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Tests & Faculty Announcements */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Scheduled Assessment Queue
                  </div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Upcoming Mock Tests
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingTestsList.slice(0, 3).map((test) => (
                  <div
                    key={test.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {test.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        Official 2026 Pattern · {test.durationMinutes} mins
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
                      Syllabus
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcements from Teacher / Admin */}
            {myAnnouncements.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Bell className="w-4 h-4" />
                  <span>Faculty &amp; Examination Notices</span>
                </div>
                {myAnnouncements.slice(0, 2).map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-1"
                  >
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {ann.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {ann.content}
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Posted by {ann.authorName} ·{' '}
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance Graphs + Subject Performance (Physics, Chemistry, Math OR Physics, Chemistry, Botany, Zoology) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Score Progression Trajectory
                </h3>
                <p className="text-xs text-slate-500">
                  Mock examination score curve across your recent full-length papers
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Target: {isNeet ? '650+ / 720' : '240+ / 300'}
              </span>
            </div>

            <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
              {progressionScores.map((score, idx) => {
                const maxVal = Math.max(...progressionScores, isNeet ? 720 : 300);
                const heightPercent = Math.max(15, Math.min(100, (score / maxVal) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2 group"
                  >
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                      {score}
                    </span>
                    <div
                      className="w-full max-w-[42px] bg-indigo-600 rounded-t-lg transition-all group-hover:bg-indigo-500"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      M{idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Subject Performance
                </h3>
                <p className="text-xs text-slate-500">
                  {isNeet
                    ? 'Physics · Chemistry · Botany · Zoology'
                    : 'Physics · Chemistry · Mathematics'}
                </p>
              </div>

              <div className="space-y-4">
                {subjectPerformance.map((sub) => (
                  <div key={sub.name}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-800 dark:text-slate-200">
                        {sub.name}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {sub.scoreText} · <strong>{sub.mastery}%</strong>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${sub.color} rounded-full`}
                        style={{ width: `${sub.mastery}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentView('practice-engine')}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors text-center cursor-pointer"
            >
              Launch Subject Practice Engine →
            </button>
          </div>
        </div>

        {/* Recent Results Table */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                Recent Results &amp; Attempt History
              </h3>
              <p className="text-xs text-slate-500">
                Inspect full question-by-question review, time spent, and negative marking analysis
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('tests')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Browse All Tests →
            </button>
          </div>

          {attemptHistory.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-xs text-slate-500">
                You have not submitted a mock paper in this session yet. Start your first assigned test below.
              </p>
              <button
                type="button"
                onClick={() => {
                  const first = assignedTestsList[0] || accessibleTests[0];
                  if (first) {
                    setActiveTest(first);
                    setCurrentView('test-details');
                  }
                }}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 cursor-pointer"
              >
                Start Assigned Mock Paper #01
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {attemptHistory.map((att) => (
                <div
                  key={att.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {att.testTitle}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{new Date(att.submittedAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="font-mono">{att.examType.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>
                        {att.totalAttempted}/{att.totalQuestions} Qs Attempted
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                        {att.totalScore} / {att.maxScore} M
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {att.accuracy}% Accuracy · {att.simulatedPercentile}%ile
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => viewAttemptResult(att)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View Report</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
