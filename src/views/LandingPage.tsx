import React from 'react';
import { useExam } from '../context/ExamContext';
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  PieChart, 
  Target, 
  Layers, 
  Flame, 
  BookOpen, 
  BrainCircuit, 
  Zap, 
  ShieldCheck, 
  Award, 
  FileText
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView, setActiveTest, tests } = useExam();

  const handleStartQuickMock = (examType: 'JEE_MAIN' | 'NEET') => {
    const target = tests.find(t => t.examType === examType && t.testType === 'FULL_MOCK') || tests[0];
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
        {/* Glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/3 right-10 w-[300px] h-[250px] bg-sky-500/15 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Computer-Based Testing Engine for 2026 Aspirants
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white">
            Practice Like It&apos;s the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-pink-400">
              Real Exam.
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed">
            Experience realistic JEE &amp; NEET computer-based mock tests, track every minute, 
            understand every mistake, and improve with data.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => handleStartQuickMock('JEE_MAIN')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-base rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 group"
            >
              <Zap className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
              Start Free JEE Main Mock
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => handleStartQuickMock('NEET')}
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/15 text-white font-bold text-base rounded-xl border border-white/20 hover:border-white/30 backdrop-blur-md transition-all flex items-center justify-center gap-3 group"
            >
              <Award className="w-5 h-5 text-emerald-400" />
              Start Free NEET UG Mock
            </button>

            <button
              onClick={() => setCurrentView('tests')}
              className="w-full sm:w-auto px-6 py-4 text-slate-300 hover:text-white font-semibold text-sm transition-colors"
            >
              Explore All Tests →
            </button>
          </div>

          {/* Realistic CBT Mockup Banner Snippet */}
          <div className="pt-10">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-md max-w-4xl mx-auto text-left">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                  <span className="ml-2 font-mono text-slate-300 font-semibold">CBT Live Examination Window (Simulated)</span>
                </div>
                <div className="font-mono text-amber-300 bg-amber-950/60 px-3 py-1 rounded-md border border-amber-500/30">
                  Time Left: 02:45:18
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="md:col-span-3 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                    <span>Question 04</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">Physics: Rotational Dynamics</span>
                    <span className="ml-auto px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">+4.00, -1.00</span>
                  </div>
                  <p className="text-slate-200 font-serif leading-relaxed">
                    A solid cylinder of mass M and radius R rolls without slipping down an inclined plane of inclination θ = 30°...
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-2 rounded-lg bg-indigo-600/30 border border-indigo-500 text-indigo-200 font-mono">
                      (A) 3.33 m/s² [Selected]
                    </div>
                    <div className="p-2 rounded-lg bg-slate-700/50 text-slate-300 font-mono">
                      (B) 5.00 m/s²
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Palette Status</div>
                  <div className="grid grid-cols-5 gap-1 font-mono text-center">
                    <span className="p-1 rounded bg-emerald-600 text-white font-bold">1</span>
                    <span className="p-1 rounded bg-emerald-600 text-white font-bold">2</span>
                    <span className="p-1 rounded bg-emerald-600 text-white font-bold">3</span>
                    <span className="p-1 rounded bg-indigo-500 text-white font-bold ring-2 ring-white">4</span>
                    <span className="p-1 rounded bg-red-600 text-white font-bold">5</span>
                    <span className="p-1 rounded bg-purple-600 text-white font-bold">6</span>
                    <span className="p-1 rounded bg-slate-600 text-slate-300 font-bold">7</span>
                    <span className="p-1 rounded bg-slate-600 text-slate-300 font-bold">8</span>
                    <span className="p-1 rounded bg-slate-600 text-slate-300 font-bold">9</span>
                    <span className="p-1 rounded bg-slate-600 text-slate-300 font-bold">10</span>
                  </div>
                  <div className="mt-3 text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-saved response
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Key Statistics */}
      <section className="bg-white border-y border-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">50,000+</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">Master Bank Questions</div>
            <p className="text-xs text-slate-400">Phy, Chem, Math, Bio &amp; 2010–2024 PYQ Archive</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">{tests.length}+</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">Full-Length Mock Papers</div>
            <p className="text-xs text-slate-400">40 JEE Main, 20 JEE Adv, 40 NEET-UG &amp; PYQs</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">99.4%</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">Realistic CBT Interface</div>
            <p className="text-xs text-slate-400">Authentic palette &amp; countdown timer</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-purple-600">Instant</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">Deep Analytics</div>
            <p className="text-xs text-slate-400">Chapter, time &amp; mistake diagnosis</p>
          </div>
        </div>
      </section>

      {/* Target Exams Breakdown: JEE & NEET */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Engineered for India&apos;s Most Competitive Exams
          </h2>
          <p className="text-base text-slate-600">
            Tailored section patterns, negative marking rules, and topic weightages for JEE Main and NEET UG.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* JEE Preparation Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                  Engineering Entrance
                </span>
                <span className="text-sm font-mono font-semibold text-slate-500">300 Marks • 180 Min</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900">JEE Main &amp; Advanced Practice</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Section A (MCQs) and Section B (Numerical value questions with tolerances). 
                Detailed step-by-step calculus, electrodynamics, and coordination mechanisms.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="font-bold text-sm text-slate-800">Physics</div>
                  <div className="text-[11px] text-slate-500">Mechanics, Thermo, Modern</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="font-bold text-sm text-slate-800">Chemistry</div>
                  <div className="text-[11px] text-slate-500">Physical, Organic, Inorganic</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="font-bold text-sm text-slate-800">Mathematics</div>
                  <div className="text-[11px] text-slate-500">Calculus, Vectors, Matrices</div>
                </div>
              </div>
            </div>
            <div className="pt-8">
              <button
                onClick={() => handleStartQuickMock('JEE_MAIN')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Launch JEE Main Demo Mock <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* NEET Preparation Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  Medical Entrance
                </span>
                <span className="text-sm font-mono font-semibold text-slate-500">720 Marks • 200 Min</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900">NEET UG Comprehensive Practice</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Strict 4-subject allocation. Focus on NCERT fidelity, human physiology, 
                plant physiology, genetics, and organic transformations with speed drills.
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="font-bold text-xs text-slate-800">Physics</div>
                  <div className="text-[10px] text-slate-500">Formula Drills</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="font-bold text-xs text-slate-800">Chemistry</div>
                  <div className="text-[10px] text-slate-500">NCERT line-by-line</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="font-bold text-xs text-slate-800">Botany</div>
                  <div className="text-[10px] text-slate-500">C4, Genetics</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="font-bold text-xs text-slate-800">Zoology</div>
                  <div className="text-[10px] text-slate-500">Physiology, Biotech</div>
                </div>
              </div>
            </div>
            <div className="pt-8">
              <button
                onClick={() => handleStartQuickMock('NEET')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Launch NEET Diagnostic Mock <ArrowRight className="w-4 h-4" />
              </button>
            </div>
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
              Not another flashcard quiz. Every feature is engineered around real exam pressure and psychological endurance.
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
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Gemini 3.8 AI Paper Generator</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Administrators and students can generate custom question papers with balanced difficulty splits, syllabus constraints, and LaTeX equations.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Chapter-Wise Accuracy Meters</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Break scores down into specific chapters (Rotational Motion, Coordination, Definite Integrals) to prioritize revision efficiently.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Hardware &amp; System Readiness Check</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Live pre-exam check for screen resolution, browser capabilities, keyboard, mouse, and fullscreen mode prior to test launch.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Paper PDF &amp; Solutions Export</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Download or print formatted question papers, answer keys, and step-by-step solution sheets for offline revision.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white text-center space-y-6 shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-black">
            Ready to test your readiness under real exam pressure?
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base">
            No credit card, no sign-up delays. Launch a full simulation immediately or generate your custom chapter sprint test.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setCurrentView('tests')}
              className="px-8 py-3.5 bg-white text-indigo-900 hover:bg-slate-100 font-bold text-sm rounded-xl transition-all shadow-md"
            >
              Browse Test Library
            </button>
            <button
              onClick={() => setCurrentView('student-custom-test')}
              className="px-8 py-3.5 bg-indigo-700/60 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl border border-indigo-400/30 transition-all"
            >
              Build Custom Sprint Test
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
