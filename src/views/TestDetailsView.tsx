import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import {
  Clock,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Layers,
  RefreshCw,
  Fingerprint,
} from 'lucide-react';
import { createOrResolveAttemptSnapshot } from '../data/questionBankEngine';

export const TestDetailsView: React.FC = () => {
  const {
    activeTest,
    setActiveTest,
    questions,
    attemptHistory,
    setCurrentView,
    startCbtExam,
  } = useExam();

  const myAttemptsForThisTest = useMemo(() => {
    if (!activeTest) return [];
    return attemptHistory.filter((a) => a.testId === activeTest.id);
  }, [attemptHistory, activeTest]);

  const [selectedAttemptNum, setSelectedAttemptNum] = useState<number>(() =>
    Math.max(1, myAttemptsForThisTest.length + 1)
  );

  if (!activeTest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-slate-600">No test selected.</p>
          <button
            onClick={() => setCurrentView('tests')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Back to Test Library
          </button>
        </div>
      </div>
    );
  }

  const isJee = activeTest.examType.startsWith('JEE');

  // Verify uniqueness in the current test snapshot
  const uniqueQuestionIdsCount = new Set(
    activeTest.questions.map((q) => q.questionId || q.id)
  ).size;

  const handleSelectAttemptSet = (attemptNum: number) => {
    setSelectedAttemptNum(attemptNum);
    const resolved = createOrResolveAttemptSnapshot(activeTest, questions, attemptNum);
    setActiveTest({
      ...activeTest,
      questions: resolved.questions,
      questionsCount: resolved.questions.length,
      snapshotQuestionIds: resolved.snapshotQuestionIds,
      attemptSnapshots: resolved.updatedSnapshots,
      activeAttemptSet: resolved.setLabel,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link */}
        <button
          onClick={() => setCurrentView('tests')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Library
        </button>

        {/* Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isJee
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {activeTest.examType.replace('_', ' ')}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {activeTest.testType.replace('_', ' ')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                Official {activeTest.patternYear || 2026} Blueprint
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-700" />
                Snapshot {activeTest.activeAttemptSet || 'Set A'} ({uniqueQuestionIdsCount}/{activeTest.questions.length} Unique Qs)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              Paper ID: {activeTest.id}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {activeTest.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {activeTest.description}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Duration</div>
              <div className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                {activeTest.durationMinutes} mins
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Questions</div>
              <div className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5">
                {activeTest.questions.length} Qs
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Maximum Marks</div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                {activeTest.totalMarks} Marks
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Marking Scheme</div>
              <div className="text-sm font-black text-emerald-600 font-mono mt-1">
                +{activeTest.positiveMarks} / -{activeTest.negativeMarks}
              </div>
            </div>
          </div>

          {/* PART 5: MULTI-ATTEMPT QUESTION SNAPSHOT SELECTOR */}
          <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                  Saved Test Snapshot &amp; Multi-Attempt Question Rotation
                </span>
              </div>
              <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                Prior Attempts on this Paper: {myAttemptsForThisTest.length}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Each attempt loads a deterministic, saved question snapshot. Choose <strong>Attempt 1 (Set A)</strong> for the canonical paper or switch to <strong>Attempt 2 (Set B)</strong> / <strong>Attempt 3 (Set C)</strong> for a fresh rotated question set with zero duplicate questions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { num: 1, label: 'Attempt 1 → Question Set A', desc: 'Saved Canonical Paper Snapshot' },
                { num: 2, label: 'Attempt 2 → Question Set B', desc: 'Rotated Unseen Question Set' },
                { num: 3, label: 'Attempt 3 → Question Set C', desc: 'Fresh Least-Used Rotation Set' },
              ].map((item) => {
                const isSelected = selectedAttemptNum === item.num;
                return (
                  <button
                    key={item.num}
                    type="button"
                    onClick={() => handleSelectAttemptSet(item.num)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                    }`}
                  >
                    <div className="text-xs font-extrabold flex items-center justify-between">
                      <span>{item.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>Sample Snapshot Question IDs:</span>
              {activeTest.questions.slice(0, 4).map((q) => (
                <span
                  key={q.id}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {q.questionId || q.id}
                </span>
              ))}
              <span>... ({activeTest.questions.length} locked)</span>
            </div>
          </div>
        </div>

        {/* Official Blueprint Section Breakdown */}
        {activeTest.sections && activeTest.sections.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Official Examination Blueprint Structure
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {activeTest.sections.length} Sections Configured
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                    <th className="py-2.5 pr-4">Subject</th>
                    <th className="py-2.5 px-4">Section</th>
                    <th className="py-2.5 px-4">Question Type</th>
                    <th className="py-2.5 px-4">Questions</th>
                    <th className="py-2.5 pl-4">Marking Scheme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeTest.sections.map((sec) => (
                    <tr key={sec.id} className="text-slate-800 dark:text-slate-200">
                      <td className="py-2.5 pr-4 font-bold">{sec.subject}</td>
                      <td className="py-2.5 px-4">{sec.sectionName}</td>
                      <td className="py-2.5 px-4 font-mono">{sec.questionType}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">
                        {sec.compulsoryQuestions} / {sec.totalQuestions} Compulsory
                      </td>
                      <td className="py-2.5 pl-4 font-mono">
                        <span className="text-emerald-600 font-bold">+{sec.positiveMarks}</span>
                        {' / '}
                        <span className="text-rose-600 font-bold">-{sec.negativeMarks}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Syllabus Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Syllabus &amp; Chapters Covered
            </h2>
          </div>
          <div className="space-y-2.5">
            {activeTest.syllabus && activeTest.syllabus.length > 0 ? (
              activeTest.syllabus.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">Standard syllabus for {activeTest.examType}.</p>
            )}
          </div>
        </div>

        {/* Examination Pattern Notice */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-3xl border border-amber-200/80 dark:border-amber-900/60 p-6 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-200">
              Real CBT Exam Environment Instructions
            </span>
            <p>
              Once you start the examination, the official countdown timer cannot be paused.
              Answers are automatically saved locally and synchronized. Ensure you are in a quiet room
              and prepare rough sheets and pen for calculations.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            onClick={() => startCbtExam(activeTest, 'PRACTICE', selectedAttemptNum)}
            className="px-6 py-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-sm rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-amber-600" />
            Start Practice Mode ({activeTest.activeAttemptSet || 'Set A'})
          </button>
          <button
            onClick={() => setCurrentView('instructions')}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 cursor-pointer"
          >
            Read Official CBT Instructions ({activeTest.activeAttemptSet || 'Set A'}) <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
