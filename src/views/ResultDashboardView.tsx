import React, { useState, useEffect } from 'react';
import { useExam } from '../context/ExamContext';
import { MathView } from '../components/MathView';
import confetti from 'canvas-confetti';
import { 
  Award, 
  Target, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  AlertTriangle, 
  ArrowLeft, 
  BookOpen, 
  TrendingUp, 
  Filter, 
  Zap, 
  BrainCircuit, 
  Printer, 
  ChevronRight,
  ShieldAlert,
  Flame,
  BarChart3
} from 'lucide-react';
import { QuestionResultReview } from '../types/exam';

export const ResultDashboardView: React.FC = () => {
  const { currentAttemptResult, setCurrentView } = useExam();
  const [activeTab, setActiveTab] = useState<'overview' | 'subject' | 'chapter' | 'time' | 'mistake' | 'review' | 'recommendations'>('overview');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED' | 'MARKED'>('ALL');

  useEffect(() => {
    // Fire festive celebration confetti if score is solid
    if (currentAttemptResult && currentAttemptResult.accuracy >= 50) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [currentAttemptResult]);

  if (!currentAttemptResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-slate-600 font-semibold">No recent attempt result available.</p>
          <button
            onClick={() => setCurrentView('tests')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Go to Test Library
          </button>
        </div>
      </div>
    );
  }

  const res = currentAttemptResult;

  // Format time taken HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Filtered reviews
  const filteredReviews = res.questionReviews.filter((item) => {
    if (reviewFilter === 'CORRECT') return item.isCorrect;
    if (reviewFilter === 'INCORRECT') return item.isAttempted && !item.isCorrect;
    if (reviewFilter === 'UNATTEMPTED') return !item.isAttempted;
    if (reviewFilter === 'MARKED') return item.isMarked;
    return true;
  });

  // Calculate fastest & slowest questions
  const attemptedTimes = res.questionReviews.filter(q => q.timeSpentSeconds > 0);
  const fastestQ = attemptedTimes.length > 0 ? [...attemptedTimes].sort((a, b) => a.timeSpentSeconds - b.timeSpentSeconds)[0] : null;
  const slowestQ = attemptedTimes.length > 0 ? [...attemptedTimes].sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds)[0] : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation & Print Actions */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => setCurrentView('tests')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Test Library
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-500" /> Print / Save Scorecard PDF
            </button>
            <button
              onClick={() => setCurrentView('student-custom-test')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-amber-300" /> Retake Weak Chapters
            </button>
          </div>
        </div>

        {/* ================= 1. SCORE BANNER & SIMULATED PERCENTILE ================= */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {res.examType.replace('_', ' ')} Official Evaluation
                </span>
                <span className="text-xs text-slate-400 font-mono">Attempt #{res.id.slice(-6)}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {res.testTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Submitted on {new Date(res.submittedAt).toLocaleDateString()} at {new Date(res.submittedAt).toLocaleTimeString()}
              </p>
            </div>

            {/* Big Score Box */}
            <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center min-w-[220px]">
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-indigo-200">
                Total Score
              </div>
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white mt-1">
                {res.totalScore}
                <span className="text-xl font-normal text-slate-300"> / {res.maxScore}</span>
              </div>
              <div className="text-xs text-emerald-300 font-semibold mt-1">
                {res.percentage}% Score Realization
              </div>
            </div>
          </div>

          {/* Simulated Percentile & Practice Rank Banner */}
          <div className="p-4 bg-indigo-900/40 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-white">
                    Simulated Percentile: {res.simulatedPercentile}%ile
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs font-mono font-bold text-amber-300">
                    Practice Rank: ~{res.practiceRank.toLocaleString()} of {res.totalParticipantsSimulated.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Calculated against benchmark test cohort performance models.
                </p>
              </div>
            </div>

            <div className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[10px] text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Internal platform simulation (not an official NTA result).</span>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Accuracy</div>
              <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">{res.accuracy}%</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Attempted</div>
              <div className="text-xl font-black font-mono text-white mt-0.5">{res.totalAttempted} / {res.totalQuestions}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Correct</div>
              <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">+{res.totalCorrect}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Incorrect</div>
              <div className="text-xl font-black font-mono text-rose-400 mt-0.5">-{res.totalIncorrect}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Negative Lost</div>
              <div className="text-xl font-black font-mono text-rose-400 mt-0.5">-{res.negativeMarksLost} M</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Time Used</div>
              <div className="text-xs font-black font-mono text-sky-300 mt-1">{formatTime(res.timeTakenSeconds)}</div>
            </div>
          </div>
        </div>

        {/* ================= 2. ANALYTICS NAVIGATION TABS ================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto print:hidden">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Overview &amp; Scorecard
          </button>
          <button
            onClick={() => setActiveTab('subject')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'subject' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Subject Performance
          </button>
          <button
            onClick={() => setActiveTab('chapter')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'chapter' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Chapter Breakdown
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'time' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Time Analysis
          </button>
          <button
            onClick={() => setActiveTab('mistake')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'mistake' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Where You Lost Marks
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'review' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Question Review &amp; Solutions
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'recommendations' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Action Recommendations
          </button>
        </div>

        {/* ================= 3. TAB CONTENT SECTIONS ================= */}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
              <h3 className="font-extrabold text-lg text-slate-900">
                Examination Performance Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase">Attempt Conversion Rate</div>
                  <div className="text-2xl font-black text-slate-800 font-mono">
                    {res.attemptRate}%
                  </div>
                  <p className="text-xs text-slate-500">
                    You attempted {res.totalAttempted} out of {res.totalQuestions} questions.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase">Hit Accuracy Ratio</div>
                  <div className="text-2xl font-black text-emerald-600 font-mono">
                    {res.accuracy}%
                  </div>
                  <p className="text-xs text-slate-500">
                    {res.totalCorrect} questions answered correctly from {res.totalAttempted} attempts.
                  </p>
                </div>
              </div>

              {/* Subject quick breakdown */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Subject-Wise Scoring Breakdown
                </div>
                <div className="space-y-3">
                  {res.subjectAnalysis.map((s) => (
                    <div key={s.subject} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">{s.subject}</span>
                        <span className="font-mono text-indigo-600">{s.score} / {s.maxScore} M ({s.accuracy}% Acc)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, s.accuracy))}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Attempted: {s.attempted}/{s.totalQuestions}</span>
                        <span>Correct: {s.correct}</span>
                        <span>Incorrect: {s.incorrect}</span>
                        <span>Avg Time: {Math.round(s.avgTimePerQuestion)}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Recommendations Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-lg text-slate-900">Priority Next Steps</h3>
                </div>
                <div className="space-y-3">
                  {res.recommendations.map((rec) => (
                    <div key={rec.id} className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900">{rec.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{rec.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveTab('review')}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  Review Every Question &amp; Solution <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBJECT ANALYSIS */}
        {activeTab === 'subject' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <h3 className="text-xl font-black text-slate-900">
              Detailed Subject Performance Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {res.subjectAnalysis.map((s) => (
                <div key={s.subject} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-base text-slate-900">{s.subject}</h4>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-100 text-indigo-700">
                      {s.score} Marks
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Accuracy:</span>
                      <span className="font-bold font-mono text-slate-900">{s.accuracy}%</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Questions Attempted:</span>
                      <span className="font-mono text-slate-900">{s.attempted} / {s.totalQuestions}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Correct Answers:</span>
                      <span className="font-mono text-emerald-600 font-bold">{s.correct}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Incorrect Answers:</span>
                      <span className="font-mono text-rose-600 font-bold">{s.incorrect}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Unanswered:</span>
                      <span className="font-mono text-slate-500">{s.unanswered}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                      <span>Average Time / Question:</span>
                      <span className="font-mono text-slate-800 font-semibold">{s.avgTimePerQuestion} seconds</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CHAPTER BREAKDOWN */}
        {activeTab === 'chapter' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Chapter-Wise Accuracy &amp; Weak Areas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Directly derived from your performance in each chapter.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {res.chapterAnalysis.map((c) => (
                <div 
                  key={c.chapter} 
                  className={`p-5 rounded-2xl border transition-all ${
                    c.isWeak ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{c.chapter}</span>
                      <span className="text-xs text-slate-500">({c.subject})</span>
                      {c.isWeak && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700">
                          Focus Needed
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      Accuracy: {c.accuracy}% ({c.correct}/{c.totalQuestions} Correct)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${c.isWeak ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.max(0, Math.min(100, c.accuracy))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TIME ANALYSIS */}
        {activeTab === 'time' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <h3 className="text-xl font-black text-slate-900">
              Per-Question Time Consumption Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Exam pacing directly determines rank. Examine where you paced quickly vs where you got stuck.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fastestQ && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                  <div className="text-xs font-bold text-emerald-800 uppercase">Fastest Solved Question</div>
                  <div className="text-lg font-black text-emerald-950 font-mono">
                    {fastestQ.timeSpentSeconds} seconds
                  </div>
                  <p className="text-xs text-emerald-700">
                    {fastestQ.question.chapter}: {fastestQ.question.topic}
                  </p>
                </div>
              )}
              {slowestQ && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                  <div className="text-xs font-bold text-amber-800 uppercase">Most Time Spent on Single Question</div>
                  <div className="text-lg font-black text-amber-950 font-mono">
                    {Math.floor(slowestQ.timeSpentSeconds / 60)}m {slowestQ.timeSpentSeconds % 60}s
                  </div>
                  <p className="text-xs text-amber-700">
                    {slowestQ.question.chapter} ({slowestQ.isCorrect ? 'Answered Correctly' : 'Resulted in Mistake - Time Trap'})
                  </p>
                </div>
              )}
            </div>

            {/* List of Time Spent on Every Question */}
            <div className="space-y-3 pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Timeline by Question
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {res.questionReviews.map((qr, idx) => (
                  <div key={qr.question.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        qr.isCorrect ? 'bg-emerald-100 text-emerald-700' : qr.isAttempted ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-700 line-clamp-1">{qr.question.subject}</span>
                    </div>
                    <span className="font-mono text-slate-600 font-bold">
                      {qr.timeSpentSeconds}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MISTAKE ANALYSIS */}
        {activeTab === 'mistake' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <h3 className="text-xl font-black text-slate-900">
              Where You Lost Marks (Mistake Diagnostic)
            </h3>
            <p className="text-xs text-slate-500">
              Negative marking is the biggest score killer. Understanding why marks were lost allows you to refine your test strategy.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
                <div className="text-xs font-bold text-rose-800 uppercase">Conceptual Gaps</div>
                <div className="text-3xl font-black text-rose-900 font-mono">
                  {res.mistakeAnalysis.conceptual}
                </div>
                <p className="text-xs text-rose-700">Questions missed due to fundamental principle ambiguity.</p>
              </div>

              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-800 uppercase">Calculation Slips</div>
                <div className="text-3xl font-black text-amber-900 font-mono">
                  {res.mistakeAnalysis.calculation}
                </div>
                <p className="text-xs text-amber-700">Questions with numerical or sign errors.</p>
              </div>

              <div className="p-5 bg-sky-50 rounded-2xl border border-sky-200 space-y-2">
                <div className="text-xs font-bold text-sky-800 uppercase">Time Pressure Errors</div>
                <div className="text-3xl font-black text-sky-900 font-mono">
                  {res.mistakeAnalysis.timePressure}
                </div>
                <p className="text-xs text-sky-700">Answered in the final rush under 45 seconds.</p>
              </div>

              <div className="p-5 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                <div className="text-xs font-bold text-purple-800 uppercase">Negative Marks Incurred</div>
                <div className="text-3xl font-black text-purple-900 font-mono">
                  -{res.negativeMarksLost} M
                </div>
                <p className="text-xs text-purple-700">Total marks subtracted directly from your score.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: QUESTION REVIEW & STEP-BY-STEP SOLUTIONS */}
        {activeTab === 'review' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Detailed Step-by-Step Question Review &amp; Solutions
                </h3>
                <p className="text-xs text-slate-500">
                  Review every question with exact candidate answer versus official answer key and LaTeX solutions.
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ALL', 'CORRECT', 'INCORRECT', 'UNATTEMPTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setReviewFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      reviewFilter === filter
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {filteredReviews.map((item, idx) => {
                const q = item.question;
                return (
                  <div key={q.id} className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          Q.{idx + 1}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs font-bold text-indigo-700">{q.subject}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-600">{q.chapter}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">
                          Time: {item.timeSpentSeconds}s
                        </span>
                        {item.isCorrect ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+{q.positiveMarks})
                          </span>
                        ) : item.isAttempted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Incorrect (-{q.negativeMarks})
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                            Unattempted (0)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Content with Math */}
                    <div className="text-sm font-medium text-slate-900">
                      <MathView content={q.questionText} />
                      {q.latex && (
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 my-2 text-center">
                          <MathView content={`$$${q.latex}$$`} block />
                        </div>
                      )}
                    </div>

                    {/* Options / Answer Review */}
                    {q.type === 'MCQ' && q.options ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.options.map((opt) => {
                          const isCorrectOpt = opt.id === q.correctAnswer;
                          const isStudentOpt = item.studentAnswer === opt.id;
                          let borderClass = 'border-slate-200 bg-white';

                          if (isCorrectOpt) {
                            borderClass = 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-bold';
                          } else if (isStudentOpt && !item.isCorrect) {
                            borderClass = 'border-rose-500 bg-rose-50/60 text-rose-950';
                          }

                          return (
                            <div key={opt.id} className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${borderClass}`}>
                              <span className="font-mono font-bold">{opt.id}.</span>
                              <div className="flex-1">
                                <MathView content={opt.text} />
                              </div>
                              {isCorrectOpt && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Official Key
                                </span>
                              )}
                              {isStudentOpt && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                                  Your Choice
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-slate-500">Your Answer: </span>
                          <span className="font-mono font-bold text-slate-800">
                            {item.studentAnswer || 'Not Entered'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Correct Answer: </span>
                          <span className="font-mono font-bold text-emerald-600">
                            {q.correctAnswer} (±{q.tolerance ?? 0.1})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Detailed Step-by-Step Explanation */}
                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
                      <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        Detailed Step-by-Step Solution &amp; Formula:
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <MathView content={q.explanation} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 7: RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
            <h3 className="text-xl font-black text-slate-900">
              Personalized Practice &amp; Revision Action Plan
            </h3>
            <p className="text-xs text-slate-500">
              Generated by diagnostic rules based on your exact attempt mistakes and negative marking patterns.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {res.recommendations.map((rec) => (
                <div key={rec.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700">{rec.subject}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        {rec.priority} Priority
                      </span>
                    </div>
                    <h4 className="font-extrabold text-base text-slate-900">{rec.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{rec.reason}</p>
                  </div>

                  <button
                    onClick={() => setCurrentView('student-custom-test')}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    {rec.actionText} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
