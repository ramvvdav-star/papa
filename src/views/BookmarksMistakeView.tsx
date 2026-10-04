import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import { MathView } from '../components/MathView';
import { Question } from '../types/exam';
import { 
  Bookmark, 
  RotateCcw, 
  Trash2, 
  Edit3, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  BookOpen, 
  ArrowRight
} from 'lucide-react';

export const BookmarksMistakeView: React.FC = () => {
  const { 
    bookmarks, 
    removeBookmark, 
    mistakeQuestions, 
    startMistakePractice, 
    startCustomPractice 
  } = useExam();

  const [activeTab, setActiveTab] = useState<'bookmarks' | 'mistakes'>('bookmarks');
  const [selectedCollection, setSelectedCollection] = useState<string>('ALL');

  // Unique collections
  const collections = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach(b => set.add(b.collection || 'General'));
    return Array.from(set);
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (selectedCollection === 'ALL') return bookmarks;
    return bookmarks.filter(b => b.collection === selectedCollection);
  }, [bookmarks, selectedCollection]);

  const handlePracticeBookmarks = () => {
    const list: Question[] = filteredBookmarks
      .map(b => b.question)
      .filter((q): q is Question => !!q);
    if (list.length > 0) {
      startCustomPractice(list, `Bookmarks Practice: ${selectedCollection}`, Math.round(list.length * 2.5));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                Personal Study Vault
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {bookmarks.length} Bookmarks · {mistakeQuestions.length} Mistakes Recorded
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              Bookmarks &amp; Mistake Book
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Review flagged high-yield questions, revise personal notes, and eliminate repeat errors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'bookmarks' && filteredBookmarks.length > 0 && (
              <button
                onClick={handlePracticeBookmarks}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" /> Practice Selected Bookmarks ({filteredBookmarks.length})
              </button>
            )}

            {activeTab === 'mistakes' && mistakeQuestions.length > 0 && (
              <button
                onClick={() => startMistakePractice()}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Practice Mistakes ({mistakeQuestions.length})
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Saved Bookmarks ({bookmarks.length})
          </button>
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'mistakes'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Mistake Book ({mistakeQuestions.length})
          </button>
        </div>

        {/* TAB 1: BOOKMARKS */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-6">
            {/* Collection Filter */}
            {collections.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Collection:
                </span>
                <button
                  onClick={() => setSelectedCollection('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    selectedCollection === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  All ({bookmarks.length})
                </button>
                {collections.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCollection(c)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      selectedCollection === c
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {c} ({bookmarks.filter(b => b.collection === c).length})
                  </button>
                ))}
              </div>
            )}

            {filteredBookmarks.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <Bookmark className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Bookmarks in this Collection</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the "Bookmark" icon on any question during an examination or result review to save it here with custom revision notes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredBookmarks.map(b => {
                  const q = b.question;
                  if (!q) return null;

                  return (
                    <div 
                      key={b.id}
                      className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 hover:border-indigo-400 transition-all"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300">
                            {q.subject}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {q.chapter} · {q.topic}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Collection: <strong className="text-indigo-600 dark:text-indigo-400">{b.collection}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            q.difficulty === 'EASY' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : q.difficulty === 'MEDIUM' 
                              ? 'bg-amber-50 text-amber-700' 
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {q.difficulty}
                          </span>
                          <button
                            onClick={() => removeBookmark(b.questionId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Remove bookmark"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text & Math */}
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                        <MathView content={q.questionText} />
                      </div>

                      {q.latex && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
                          <MathView content={`$$${q.latex}$$`} block />
                        </div>
                      )}

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map(opt => {
                            const isCorrect = q.correctAnswer === opt.id;
                            return (
                              <div 
                                key={opt.id}
                                className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                                  isCorrect 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold' 
                                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {opt.id}
                                </span>
                                <div>
                                  <MathView content={opt.text} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Personal Note */}
                      {b.note && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
                          <strong>Study Note: </strong> {b.note}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Official Solution:
                          </div>
                          <div>
                            <MathView content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MISTAKE BOOK */}
        {activeTab === 'mistakes' && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-amber-900 dark:text-amber-200">Continuous Mistake Elimination: </strong>
                <span className="text-amber-800 dark:text-amber-300">
                  Whenever you submit a mock test, any incorrect or unattempted responses are recorded here. 
                  Re-test yourself until your accuracy reaches 100%.
                </span>
              </div>
            </div>

            {mistakeQuestions.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Zero Pending Mistakes</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Outstanding! You currently have no missed questions queued for revision. 
                  Take another full-length mock paper to test your mastery.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {mistakeQuestions.map(q => (
                  <div 
                    key={q.id}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300">
                          {q.subject}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {q.chapter} · {q.topic}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                      <MathView content={q.questionText} />
                    </div>

                    {q.latex && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
                        <MathView content={`$$${q.latex}$$`} block />
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Correct Answer: <span className="font-mono text-emerald-700 dark:text-emerald-400">{q.correctAnswer}</span>
                      </div>
                      <div>
                        <MathView content={q.explanation} />
                      </div>
                    </div>
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
