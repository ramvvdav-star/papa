import React from 'react';
import { useExam } from '../context/ExamContext';
import {
  CheckCircle2,
  ArrowRight,
  Clock,
  PieChart,
  Target,
  Layers,
  Zap,
  ShieldCheck,
  Award,
  FileText,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView, setActiveTest, accessibleTests, authProfile } = useExam();

  const isStudent = authProfile?.role === 'STUDENT';
  const enrolledCourses = authProfile?.assignedCourses || [authProfile?.courseType || 'JEE'];
  const isNeetStudent =
    isStudent && enrolledCourses.includes('NEET') && !enrolledCourses.includes('JEE');
  const isJeeStudent = isStudent && !isNeetStudent;

  const handleStartQuickMock = (examType: 'JEE_MAIN' | 'NEET') => {
    const target =
      accessibleTests.find((t) => t.examType === examType && t.testType === 'FULL_MOCK') ||
      accessibleTests[0];
    if (target) {
      setActiveTest(target);
      setCurrentView('test-details');
    } else {
      setCurrentView('tests');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/3 right-10 w-[300px] h-[250px] bg-sky-500/15 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            {isNeetStudent
              ? 'Enrolled Course: NEET UG Medical Examination Portal'
              : isJeeStudent
              ? `Enrolled Course: ${enrolledCourses.join(' + ')} Engineering Portal`
              : 'Computer-Based Testing Engine for 2026 Aspirants'}
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white">
            Practice Like It&apos;s the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-pink-400">
              Real {isNeetStudent ? 'NEET UG' : isJeeStudent ? 'JEE' : ''} Exam.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed">
            {isNeetStudent
              ? 'Experience realistic NEET UG computer-based mock tests across Physics, Chemistry, Botany, and Zoology with NCERT line-by-line analytics.'
              : isJeeStudent
              ? 'Experience realistic JEE Main & Advanced computer-based mock tests across Physics, Chemistry, and Mathematics with deep analytics.'
              : 'Experience realistic computer-based mock tests, track every minute, understand every mistake, and improve with data.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {!isNeetStudent && (
              <button
                onClick={() => handleStartQuickMock('JEE_MAIN')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-base rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 group cursor-pointer"
              >
                <Zap className="w-5 h-5 text-amber-300" />
                Launch JEE Main Mock Test
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {!isJeeStudent && (
              <button
                onClick={() => handleStartQuickMock('NEET')}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 group cursor-pointer"
              >
                <Award className="w-5 h-5 text-white" />
                Launch NEET UG Mock Test
              </button>
            )}

            <button
              onClick={() => setCurrentView('student-dashboard')}
              className="w-full sm:w-auto px-6 py-4 text-slate-300 hover:text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Return to My Course Dashboard →
            </button>
          </div>
        </div>
      </section>

      {/* Key Statistics */}
      <section className="bg-white border-y border-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">50,000+</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Controlled Course Questions
            </div>
            <p className="text-xs text-slate-400">
              {isNeetStudent
                ? 'Physics, Chemistry, Botany & Zoology'
                : 'Physics, Chemistry & Mathematics'}
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">
              {accessibleTests.length}+
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Authorized Course Papers
            </div>
            <p className="text-xs text-slate-400">Zero Duplicate Questions Per Paper</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">99.4%</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Realistic CBT Interface
            </div>
            <p className="text-xs text-slate-400">Authentic palette &amp; countdown timer</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-purple-600">Instant</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Deep Course Analytics
            </div>
            <p className="text-xs text-slate-400">Chapter, time &amp; mistake diagnosis</p>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="bg-slate-100 py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Designed for Serious Performance Gains
            </h2>
            <p className="text-slate-600 text-sm">
              Every feature is engineered around real exam pressure, course isolation, and psychological endurance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Per-Question Time Tracking</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Log the exact seconds spent on every problem. Identify &quot;time traps&quot; where you burned 4+ minutes and still got the question incorrect.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Mistake Diagnostic Engine</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Categorize marks lost into conceptual misunderstandings, calculation slips, time rush, and blind guesses.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                Controlled Question Bank Engine
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Strict course-isolated question bank with fingerprint deduplication ensuring zero duplicate questions within any test.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Chapter-Wise Accuracy Meters</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Break scores down into specific chapters to prioritize revision efficiently.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                Hardware &amp; System Readiness Check
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Live pre-exam check for screen resolution, browser capabilities, keyboard, mouse, and fullscreen mode prior to test launch.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Course Study Material Vault</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Access course-verified formula sheets, NCERT line-by-line summaries, and chapter revision notes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
