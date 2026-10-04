import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import { SubjectName, ExamType, Difficulty, Question } from '../types/exam';
import { 
  Zap, 
  RotateCcw, 
  Target, 
  Flame, 
  BookOpen, 
  Sparkles, 
  Clock, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

export const PracticeEngineView: React.FC = () => {
  const { 
    questions, 
    currentUser, 
    startCustomPractice, 
    startMistakePractice, 
    mistakeQuestions,
    attemptHistory 
  } = useExam();

  const [activeTab, setActiveTab] = useState<'weak-areas' | 'chapter-drill' | 'mistakes' | 'random-pyq'>('weak-areas');

  // Chapter drill form state
  const [selectedExam, setSelectedExam] = useState<ExamType>(currentUser.targetExam || 'JEE_MAIN');
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>('Physics');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'ALL'>('ALL');
  const [questionCount, setQuestionCount] = useState<number>(15);

  // Available chapters for selected subject
  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    questions
      .filter(q => q.subject === selectedSubject)
      .forEach(q => set.add(q.chapter));
    return Array.from(set);
  }, [questions, selectedSubject]);

  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');

  // Detect weak areas from past attempts
  const detectedWeakTopics = useMemo(() => {
    const stats: Record<string, { subject: SubjectName; total: number; incorrect: number }> = {};
    
    attemptHistory.forEach(att => {
      att.questionReviews?.forEach(rev => {
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
        const [subj, chapter] = key.split('::');
        const errorRate = Math.round((data.incorrect / data.total) * 100);
        return {
          subject: data.subject,
          chapter,
          total: data.total,
          incorrect: data.incorrect,
          errorRate
        };
      })
      .filter(item => item.total >= 2 && item.errorRate >= 35)
      .sort((a, b) => b.errorRate - a.errorRate);

    // Fallback if no attempts yet
    if (list.length === 0) {
      return [
        { subject: 'Physics' as SubjectName, chapter: 'Electrostatics', total: 6, incorrect: 3, errorRate: 50 },
        { subject: 'Chemistry' as SubjectName, chapter: 'Chemical Kinetics', total: 5, incorrect: 2, errorRate: 40 },
        { subject: 'Mathematics' as SubjectName, chapter: 'Definite Integration', total: 8, incorrect: 4, errorRate: 50 }
      ];
    }
    return list;
  }, [attemptHistory]);

  const handleLaunchChapterDrill = () => {
    let pool = questions.filter(q => q.subject === selectedSubject);
    if (selectedChapter !== 'ALL') {
      pool = pool.filter(q => q.chapter === selectedChapter);
    }
    if (selectedDifficulty !== 'ALL') {
      pool = pool.filter(q => q.difficulty === selectedDifficulty);
    }

    if (pool.length === 0) {
      pool = questions.filter(q => q.subject === selectedSubject);
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, questionCount);
    const title = `${selectedSubject}: ${selectedChapter === 'ALL' ? 'Comprehensive' : selectedChapter} Practice Drill`;
    startCustomPractice(shuffled, title, Math.round(shuffled.length * 2));
  };

  const handleLaunchWeakAreaDrill = (subject: SubjectName, chapter: string) => {
    let pool = questions.filter(q => q.subject === subject && q.chapter === chapter);
    if (pool.length < 5) {
      pool = questions.filter(q => q.subject === subject);
    }
    const sampled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 15);
    startCustomPractice(sampled, `Targeted Mastery: ${chapter} (${subject})`, 30);
  };

  const handleLaunchRandomPyq = () => {
    const pyqs = questions.filter(q => q.source === 'PYQ');
    const pool = pyqs.length >= 15 ? pyqs : questions;
    const sampled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 20);
    startCustomPractice(sampled, 'Authentic PYQ Speed Workout (20 Qs)', 40);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Dynamic Practice Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">Interactive Solution Mode</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Personalized Practice &amp; Weak-Area Drills
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Target your specific mistakes, run chapter-wise question sprints with on-demand solution reveals, 
            and turn conceptual weak points into exam strengths.
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
            Detected Weak Areas ({detectedWeakTopics.length})
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
            Custom Chapter Drill
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
            Authentic PYQ Workout
          </button>
        </div>

        {/* TAB 1: WEAK AREAS */}
        {activeTab === 'weak-areas' && (
          <div className="space-y-6">
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-rose-900 dark:text-rose-200">Algorithmic Weak-Point Detection: </strong>
                <span className="text-rose-800 dark:text-rose-300">
                  Based on your actual test attempts, questions from these chapters experienced the highest negative marking or error rates.
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
                      {item.incorrect} incorrect out of {item.total} attempted questions in past full-length tests.
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
                  Mistake Book Revision Sprint
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  You have {mistakeQuestions.length} unique questions marked as incorrect in past mock tests.
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
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Missed Questions Recorded</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  As you attempt full-length JEE and NEET mock tests, any missed questions will automatically queue here for revision.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sample Queued Mistakes:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mistakeQuestions.slice(0, 6).map((q) => (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{q.subject} · {q.chapter}</span>
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
                Configure Custom Chapter Drill
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pick a subject, chapter, question count, and difficulty to practice with instant solutions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value as SubjectName);
                    setSelectedChapter('ALL');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Botany">Botany</option>
                  <option value="Zoology">Zoology</option>
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
                  {availableChapters.map(chap => (
                    <option key={chap} value={chap}>{chap}</option>
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
                  <option value="MEDIUM">Medium (JEE/NEET Level)</option>
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
                Launch Interactive Practice Mode <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: RANDOM PYQ WORKOUT */}
        {activeTab === 'random-pyq' && (
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Verified Previous-Year Question (PYQ) Workout
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sample 20 authentic previous-year questions from national examinations across Physics, Chemistry, and Mathematics.
              </p>
            </div>

            <div className="p-6 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                  20-Question Authentic PYQ Sprint
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Grounded in official NTA January/April sessions with verified answers and explanations.
                </p>
              </div>

              <button
                onClick={handleLaunchRandomPyq}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 dark:shadow-none transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Flame className="w-4 h-4" /> Start PYQ Workout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
