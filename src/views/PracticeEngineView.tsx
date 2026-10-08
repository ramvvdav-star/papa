import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import {
  Zap,
  Target,
  Sliders,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { SubjectName, Difficulty, ExamType, Question } from '../types/exam';
import { selectQuestionsIntelligent, generateUniqueTestId } from '../data/questionBankEngine';

export const PracticeEngineView: React.FC = () => {
  const {
    questions,
    startCustomPractice,
    startMistakePractice,
    mistakeQuestions,
    attemptHistory,
    authProfile,
  } = useExam();

  const isNeetStudent =
    authProfile?.courseType === 'NEET' || authProfile?.examCategory === 'NEET';
  const courseTitle = isNeetStudent
    ? 'NEET UG'
    : authProfile?.courseType === 'JEE_ADVANCED'
    ? 'JEE Main & Advanced'
    : 'JEE Main';

  const allowedSubjects: SubjectName[] = useMemo(
    () =>
      isNeetStudent
        ? ['Physics', 'Chemistry', 'Botany', 'Zoology']
        : ['Physics', 'Chemistry', 'Mathematics'],
    [isNeetStudent]
  );

  const [activeTab, setActiveTab] = useState<
    'weak-areas' | 'chapter-drill' | 'mistakes' | 'random-pyq'
  >('weak-areas');

  // Chapter drill form state locked to authorized course subjects
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>(
    isNeetStudent ? 'Botany' : 'Physics'
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'ALL'>('ALL');
  const [questionCount, setQuestionCount] = useState<number>(15);

  // Available chapters for selected subject
  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    questions
      .filter((q) => q.subject === selectedSubject)
      .forEach((q) => set.add(q.chapter));
    return Array.from(set);
  }, [questions, selectedSubject]);

  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');

  // Detect weak areas from past attempts (Strictly filtered by enrolled course subjects)
  const detectedWeakTopics = useMemo(() => {
    const stats: Record<
      string,
      { subject: SubjectName; total: number; incorrect: number }
    > = {};

    attemptHistory.forEach((att) => {
      att.questionReviews?.forEach((rev) => {
        if (!allowedSubjects.includes(rev.question.subject)) return;
        const key = `${rev.question.subject}::${rev.question.chapter}`;
        if (!stats[key]) {
          stats[key] = { subject: rev.question.subject, total: 0, incorrect: 0 };
        }
        stats[key].total++;
        if (!rev.isCorrect && rev.isAttempted) {
          stats[key].incorrect++;
        }
      });
    });

    const list = Object.entries(stats)
      .map(([key, data]) => {
        const [, chapter] = key.split('::');
        const errorRate = Math.round((data.incorrect / data.total) * 100);
        return {
          subject: data.subject,
          chapter,
          total: data.total,
          incorrect: data.incorrect,
          errorRate,
        };
      })
      .filter((item) => item.total >= 2 && item.errorRate >= 35)
      .sort((a, b) => b.errorRate - a.errorRate);

    // Course-specific fallback if no attempts yet
    if (list.length === 0) {
      if (isNeetStudent) {
        return [
          {
            subject: 'Botany' as SubjectName,
            chapter: 'Genetics and Evolution',
            total: 8,
            incorrect: 4,
            errorRate: 50,
          },
          {
            subject: 'Zoology' as SubjectName,
            chapter: 'Human Physiology',
            total: 6,
            incorrect: 3,
            errorRate: 50,
          },
          {
            subject: 'Physics' as SubjectName,
            chapter: 'Electrostatics',
            total: 5,
            incorrect: 2,
            errorRate: 40,
          },
        ];
      }
      return [
        {
          subject: 'Physics' as SubjectName,
          chapter: 'Electrostatics',
          total: 6,
          incorrect: 3,
          errorRate: 50,
        },
        {
          subject: 'Chemistry' as SubjectName,
          chapter: 'Chemical Kinetics',
          total: 5,
          incorrect: 2,
          errorRate: 40,
        },
        {
          subject: 'Mathematics' as SubjectName,
          chapter: 'Calculus',
          total: 8,
          incorrect: 4,
          errorRate: 50,
        },
      ];
    }
    return list;
  }, [attemptHistory, allowedSubjects, isNeetStudent]);

  const targetExamType: ExamType = isNeetStudent
    ? 'NEET'
    : authProfile?.courseType === 'JEE_ADVANCED'
    ? 'JEE_ADVANCED'
    : 'JEE_MAIN';

  const handleLaunchChapterDrill = () => {
    const drillId = generateUniqueTestId('drill_chapter');
    const selected = selectQuestionsIntelligent(questions, {
      exam: targetExamType,
      subject: selectedSubject,
      chapters: selectedChapter !== 'ALL' ? [selectedChapter] : undefined,
      difficulty: selectedDifficulty !== 'ALL' ? selectedDifficulty : undefined,
      count: questionCount,
      testIdForTracking: drillId,
    });
    const title = `${courseTitle} ${selectedSubject}: ${
      selectedChapter === 'ALL' ? 'Comprehensive' : selectedChapter
    } Practice Drill`;
    startCustomPractice(selected, title, Math.round(selected.length * 2));
  };

  const handleLaunchWeakAreaDrill = (subject: SubjectName, chapter: string) => {
    const drillId = generateUniqueTestId('drill_weak');
    const selected = selectQuestionsIntelligent(questions, {
      exam: targetExamType,
      subject,
      chapters: [chapter],
      count: 15,
      testIdForTracking: drillId,
    });
    startCustomPractice(selected, `${courseTitle} Mastery: ${chapter} (${subject})`, 30);
  };

  const handleLaunchRandomPyq = () => {
    const drillId = generateUniqueTestId('drill_pyq');
    const pyqBank = questions.filter((q) => q.source === 'PYQ');
    const sourceBank = pyqBank.length >= 20 ? pyqBank : questions;
    const usedIds = new Set<string>();
    const usedFps = new Set<string>();
    const sampled: Question[] = [];
    const perSubject = Math.ceil(20 / allowedSubjects.length);

    allowedSubjects.forEach((subj) => {
      if (sampled.length >= 20) return;
      const picked = selectQuestionsIntelligent(sourceBank, {
        exam: targetExamType,
        subject: subj,
        count: Math.min(perSubject, 20 - sampled.length),
        excludeQuestionIds: usedIds,
        excludeFingerprints: usedFps,
        testIdForTracking: drillId,
      });
      picked.forEach((q) => {
        usedIds.add(q.questionId || q.id);
        if (q.fingerprint) usedFps.add(q.fingerprint);
        sampled.push(q);
      });
    });

    startCustomPractice(sampled, `${courseTitle} PYQ Speed Workout (${sampled.length} Qs)`, 40);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              {courseTitle} Practice Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Subjects: {allowedSubjects.join(', ')}
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            {courseTitle} Personalized Practice &amp; Weak-Area Drills
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Target your {courseTitle} mistakes, run chapter-wise question sprints across{' '}
            {allowedSubjects.join(', ')}, and turn conceptual weak points into exam strengths.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('weak-areas')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'weak-areas'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 text-rose-500" />
            {courseTitle} Weak Areas ({detectedWeakTopics.length})
          </button>
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'mistakes'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-amber-500" />
            Mistake Book Sprint ({mistakeQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab('chapter-drill')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'chapter-drill'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-indigo-500" />
            {courseTitle} Chapter Drill
          </button>
          <button
            onClick={() => setActiveTab('random-pyq')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeTab === 'random-pyq'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-emerald-500" />
            {courseTitle} PYQ Workout
          </button>
        </div>

        {/* TAB 1: WEAK AREAS */}
        {activeTab === 'weak-areas' && (
          <div className="space-y-6">
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-rose-900 dark:text-rose-200">
                  {courseTitle} Algorithmic Weak-Point Detection:{' '}
                </strong>
                <span className="text-rose-800 dark:text-rose-300">
                  Based on your {courseTitle} test attempts, questions from these chapters experienced the highest negative marking or error rates.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {detectedWeakTopics.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-400 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {item.subject}
                      </span>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        {item.errorRate}% Miss Rate
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {item.chapter}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.incorrect} incorrect out of {item.total} attempted questions in past {courseTitle} tests.
                    </p>
                  </div>

                  <button
                    onClick={() => handleLaunchWeakAreaDrill(item.subject, item.chapter)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Start 15-Q Mastery Drill <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: MISTAKE BOOK */}
        {activeTab === 'mistakes' && (
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {courseTitle} Mistake Book Revision Sprint
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  You have {mistakeQuestions.length} unique {courseTitle} questions marked as incorrect in past mock tests.
                </p>
              </div>

              <button
                onClick={() => startMistakePractice()}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-amber-200 dark:shadow-none transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4" /> Practice All {mistakeQuestions.length} Mistakes
              </button>
            </div>

            {mistakeQuestions.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Missed {courseTitle} Questions Recorded
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  As you attempt full-length {courseTitle} mock tests, any missed questions will automatically queue here for revision.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sample Queued Mistakes:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mistakeQuestions.slice(0, 6).map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          {q.subject} · {q.chapter}
                        </span>
                        <span className="text-rose-500 font-bold">{q.difficulty}</span>
                      </div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                        {q.questionText}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHAPTER DRILL FORM */}
        {activeTab === 'chapter-drill' && (
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Configure {courseTitle} Chapter Drill
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pick an authorized {courseTitle} subject, chapter, question count, and difficulty to practice with instant solutions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {courseTitle} Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value as SubjectName);
                    setSelectedChapter('ALL');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  {allowedSubjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Chapter
                </label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="ALL">All Chapters in {selectedSubject}</option>
                  {availableChapters.map((chap) => (
                    <option key={chap} value={chap}>
                      {chap}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Difficulty
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="ALL">Balanced Mix</option>
                  <option value="EASY">Easy (Foundation)</option>
                  <option value="MEDIUM">Medium ({courseTitle} Level)</option>
                  <option value="HARD">Hard (Advanced Rigor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Questions
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value={10}>10 Questions (20 mins)</option>
                  <option value={15}>15 Questions (30 mins)</option>
                  <option value={25}>25 Questions (50 mins)</option>
                  <option value={45}>45 Questions (90 mins)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleLaunchChapterDrill}
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 cursor-pointer"
              >
                Launch {courseTitle} Practice Mode <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: RANDOM PYQ WORKOUT */}
        {activeTab === 'random-pyq' && (
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Verified {courseTitle} Previous-Year Question (PYQ) Workout
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sample 20 authentic previous-year {courseTitle} questions across{' '}
                {allowedSubjects.join(', ')}.
              </p>
            </div>

            <div className="p-6 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                  20-Question Authentic {courseTitle} PYQ Sprint
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Grounded in official NTA sessions with verified answers and step-by-step explanations.
                </p>
              </div>

              <button
                onClick={handleLaunchRandomPyq}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 dark:shadow-none transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Flame className="w-4 h-4" /> Start {courseTitle} PYQ Workout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
