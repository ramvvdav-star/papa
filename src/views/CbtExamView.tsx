import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useExam } from '../context/ExamContext';
import { MathView } from '../components/MathView';
import { 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Bookmark, 
  Send, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2, 
  Flag, 
  Wifi, 
  WifiOff, 
  Sparkles, 
  Keyboard, 
  Check, 
  X, 
  ShieldAlert 
} from 'lucide-react';
import { SubjectName, QuestionReport } from '../types/exam';

export const CbtExamView: React.FC = () => {
  const { 
    activeTest, 
    currentQuestionIdx, 
    setCurrentQuestionIdx, 
    responses, 
    recordAnswer, 
    markForReview, 
    saveAndMarkForReview,
    clearResponse, 
    saveAndNext, 
    submitExam, 
    timerSecondsLeft, 
    lastSavedText, 
    currentUser, 
    authProfile,
    examMode, 
    isOnline, 
    logIntegrityEvent, 
    addBookmark, 
    isBookmarked, 
    removeBookmark, 
    reportQuestion 
  } = useExam();

  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [paletteFilter, setPaletteFilter] = useState<'SECTION' | 'ALL'>('SECTION');
  const [showSolutionInPractice, setShowSolutionInPractice] = useState<boolean>(false);

  // Bookmark modal
  const [showBookmarkModal, setShowBookmarkModal] = useState<boolean>(false);
  const [bookmarkNote, setBookmarkNote] = useState<string>('');
  const [bookmarkCollection, setBookmarkCollection] = useState<string>('Important Revision');

  // Report modal
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<QuestionReport['reason']>('INCORRECT_ANSWER');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  // Shortcuts modal
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Reset practice solution toggle on question change
  useEffect(() => {
    setShowSolutionInPractice(false);
  }, [currentQuestionIdx]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        logIntegrityEvent('FULLSCREEN_EXIT', 'Candidate exited examination fullscreen display mode');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [logIntegrityEvent]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowShortcutsModal(prev => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        saveAndNext();
      } else if (e.key === 'p' || e.key === 'P') {
        if (currentQuestionIdx > 0) {
          setCurrentQuestionIdx(currentQuestionIdx - 1);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (activeTest && activeTest.questions[currentQuestionIdx]) {
          markForReview(activeTest.questions[currentQuestionIdx].id);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (activeTest && activeTest.questions[currentQuestionIdx]) {
          clearResponse(activeTest.questions[currentQuestionIdx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTest, currentQuestionIdx, saveAndNext, setCurrentQuestionIdx, markForReview, clearResponse]);

  const currentQ = activeTest?.questions?.[currentQuestionIdx];

  const displayedPaletteQuestions = useMemo(() => {
    if (!activeTest || !activeTest.questions) return [];
    if (paletteFilter === 'SECTION' && currentQ) {
      return activeTest.questions
        .map((q, idx) => ({ q, idx }))
        .filter(item => item.q.subject === currentQ.subject);
    }
    return activeTest.questions.map((q, idx) => ({ q, idx }));
  }, [activeTest, paletteFilter, currentQ?.subject]);

  // Subjects in this test
  const testSubjects = useMemo(() => {
    const list: SubjectName[] = [];
    if (!activeTest || !activeTest.questions) return list;
    activeTest.questions.forEach(q => {
      if (!list.includes(q.subject)) list.push(q.subject);
    });
    return list;
  }, [activeTest]);

  // Questions grouped by subject
  const subjectQuestionsMap = useMemo(() => {
    const map = new Map<SubjectName, number[]>();
    if (!activeTest || !activeTest.questions) return map;
    activeTest.questions.forEach((q, idx) => {
      if (!map.has(q.subject)) map.set(q.subject, []);
      map.get(q.subject)!.push(idx);
    });
    return map;
  }, [activeTest]);

  // Palette summary stats
  const paletteSummary = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let marked = 0;
    let answeredAndMarked = 0;
    let notVisited = 0;

    if (activeTest && activeTest.questions) {
      activeTest.questions.forEach(q => {
        const r = responses[q.id];
        if (!r || r.status === 'NOT_VISITED') notVisited++;
        else if (r.status === 'ANSWERED') answered++;
        else if (r.status === 'NOT_ANSWERED') notAnswered++;
        else if (r.status === 'MARKED_FOR_REVIEW') marked++;
        else if (r.status === 'ANSWERED_AND_MARKED') answeredAndMarked++;
      });
    }

    return {
      total: activeTest?.questions?.length || 0,
      answered,
      notAnswered,
      marked,
      answeredAndMarked,
      notVisited
    };
  }, [activeTest, responses]);

  if (!activeTest || !activeTest.questions || activeTest.questions.length === 0 || !currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400 font-semibold">No active examination session found.</p>
      </div>
    );
  }

  const currentResp = responses[currentQ.id];

  // Format timer HH : MM : SS
  const hours = Math.floor(timerSecondsLeft / 3600);
  const minutes = Math.floor((timerSecondsLeft % 3600) / 60);
  const seconds = timerSecondsLeft % 60;
  const timeFormatted = `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;

  const isTimeCritical = timerSecondsLeft < 180;
  const isTimeLow = timerSecondsLeft < 900;

  const getSubjectProgress = (subject: SubjectName) => {
    const indices = subjectQuestionsMap.get(subject) || [];
    const answeredCount = indices.filter(idx => {
      const q = activeTest.questions[idx];
      const r = responses[q.id];
      return r && (r.status === 'ANSWERED' || r.status === 'ANSWERED_AND_MARKED');
    }).length;
    return `${answeredCount}/${indices.length}`;
  };

  const handleOptionSelect = (optionId: string) => {
    recordAnswer(currentQ.id, optionId, undefined);
  };

  // For multi-correct questions (comma separated options like 'A,C')
  const handleMultiCorrectToggle = (optionId: string) => {
    const existing = currentResp?.selectedOption ? currentResp.selectedOption.split(',') : [];
    let updated: string[];
    if (existing.includes(optionId)) {
      updated = existing.filter(x => x !== optionId);
    } else {
      updated = [...existing, optionId].sort();
    }
    recordAnswer(currentQ.id, updated.length > 0 ? updated.join(',') : '', undefined);
  };

  const handleNumericalChange = (val: string) => {
    recordAnswer(currentQ.id, undefined, val);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    await submitExam();
    setIsSubmitting(false);
    setShowSubmitModal(false);
  };

  const handleSubjectTabClick = (subj: SubjectName) => {
    const indices = subjectQuestionsMap.get(subj);
    if (indices && indices.length > 0) {
      setCurrentQuestionIdx(indices[0]);
    }
  };

  const handleSaveBookmark = () => {
    addBookmark(currentQ.id, bookmarkCollection, bookmarkNote);
    setShowBookmarkModal(false);
    setBookmarkNote('');
  };

  const handleSendReport = () => {
    reportQuestion(currentQ.id, reportReason, reportDesc, activeTest.id);
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setShowReportModal(false);
      setReportDesc('');
    }, 1500);
  };

  const isQBookmarked = isBookmarked(currentQ.id);

  const candidateName = authProfile?.fullName || currentUser.name;
  const candidateRollNo = authProfile?.studentId || '2026-NTA-88210';
  const currentSectionLabel =
    currentQ.sectionName ||
    (currentQ.type === 'NUMERICAL'
      ? 'Section B (Numerical Value)'
      : currentQ.type === 'MULTIPLE_CORRECT'
      ? 'Section 2 (One or More Correct)'
      : 'Section A (MCQs)');

  // Compute distinct sections within the currently active subject (e.g. Section A vs Section B)
  const subjectSubSections = useMemo(() => {
    const indices = subjectQuestionsMap.get(currentQ.subject) || [];
    const groups = new Map<string, { label: string; firstIdx: number; count: number; type: string }>();
    indices.forEach((idx) => {
      const q = activeTest.questions[idx];
      const label =
        q.sectionName ||
        (q.type === 'NUMERICAL'
          ? 'Section B (Numerical)'
          : q.type === 'MULTIPLE_CORRECT'
          ? 'Section 2 (Multi-Correct)'
          : 'Section A (MCQs)');
      if (!groups.has(label)) {
        groups.set(label, { label, firstIdx: idx, count: 0, type: q.type });
      }
      groups.get(label)!.count += 1;
    });
    return Array.from(groups.values());
  }, [activeTest.questions, subjectQuestionsMap, currentQ.subject]);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col font-sans select-none text-slate-800 dark:text-slate-100">
      {/* ================= 1. OFFICIAL CBT HEADER (PART 7) ================= */}
      <header className="bg-slate-900 text-white px-4 py-2 border-b-2 border-indigo-600 shadow-md flex items-center justify-between sticky top-0 z-30 shrink-0 gap-3">
        {/* Left: Exam, Subject, Candidate & Roll Number */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex flex-col items-center justify-center font-black text-white text-[10px] leading-none shrink-0">
            <span>NTA</span>
            <span className="text-[8px] font-mono text-indigo-200">CBT</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white truncate">
                {activeTest.title}
              </h1>
              <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-200 font-mono text-[10px] font-bold">
                {activeTest.activeAttemptSet || 'Set A'}
              </span>
              {examMode === 'PRACTICE' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider">
                  Practice Mode
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-300 mt-0.5">
              <span>
                Candidate: <strong className="text-white">{candidateName}</strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-amber-300 font-bold">
                Roll / ID: {candidateRollNo}
              </span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="font-mono hidden sm:inline">
                Exam: <strong className="text-white">{activeTest.examType.replace('_', ' ')}</strong>
              </span>
              <span className="text-slate-500 hidden md:inline">•</span>
              <span className="hidden md:inline">
                Subject: <strong className="text-indigo-300">{currentQ.subject}</strong> ({currentSectionLabel})
              </span>
            </div>
          </div>
        </div>

        {/* Center: Authoritative Countdown Timer */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
            Remaining Time
          </div>
          <div
            className={`px-3.5 py-1 rounded-lg font-mono text-sm sm:text-base font-black tracking-wider flex items-center gap-2 border ${
              isTimeCritical
                ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                : isTimeLow
                ? 'bg-amber-950 text-amber-300 border-amber-500'
                : 'bg-slate-800 text-emerald-400 border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>{timeFormatted}</span>
          </div>
        </div>

        {/* Right: Quick Tools, Connection & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden xl:flex items-center gap-2 text-xs">
            {isOnline ? (
              <span
                className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]"
                title="Network connection stable"
              >
                <Wifi className="w-3.5 h-3.5" /> {lastSavedText}
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-rose-400 font-bold text-[11px] animate-pulse"
                title="Network disconnected - offline backup active"
              >
                <WifiOff className="w-3.5 h-3.5" /> Offline Sync
              </span>
            )}
          </div>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Submit
          </button>
        </div>
      </header>

      {/* ================= 2. SUBJECT & SECTION TABS BAR ================= */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold uppercase text-slate-500 mr-1 hidden sm:inline">
            Subjects:
          </span>
          {testSubjects.map((subj) => {
            const isActive = currentQ.subject === subj;
            const progress = getSubjectProgress(subj);
            return (
              <button
                key={subj}
                onClick={() => handleSubjectTabClick(subj)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{subj}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-indigo-800 text-indigo-100'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {progress}
                </span>
              </button>
            );
          })}

          {/* Section A / Section B Sub-Tabs when multiple sections exist per subject */}
          {subjectSubSections.length > 1 && (
            <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-300 dark:border-slate-700">
              {subjectSubSections.map((sec) => {
                const isSecActive = currentSectionLabel.startsWith(sec.label.split(' ')[0] + ' ' + sec.label.split(' ')[1]);
                return (
                  <button
                    key={sec.label}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(sec.firstIdx)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      isSecActive
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {sec.label} ({sec.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400 hidden md:inline">
            Question Type:{' '}
            <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">
              {currentQ.type}
            </span>
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
            +{currentQ.positiveMarks}.00
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-mono font-bold">
            -{currentQ.negativeMarks}.00
          </span>
        </div>
      </div>

      {/* ================= 3. MAIN WORKSPACE ================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Question Display & Answering Workspace */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 overflow-y-auto">
          {/* Question Meta Header */}
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Question No. {currentQuestionIdx + 1}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                ID: {currentQ.questionId || currentQ.id}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                {currentQ.chapter}
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                {currentQ.topic}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {/* Bookmark Button */}
              <button
                onClick={() => {
                  if (isQBookmarked) {
                    removeBookmark(currentQ.id);
                  } else {
                    setShowBookmarkModal(true);
                  }
                }}
                className={`flex items-center gap-1 font-bold transition-colors cursor-pointer ${
                  isQBookmarked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={isQBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isQBookmarked ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isQBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>

              {/* Report Button */}
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold transition-colors cursor-pointer"
                title="Report question error"
              >
                <Flag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Report</span>
              </button>
            </div>
          </div>

          {/* Question Content & Formulas */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl">
            {/* Question Text with KaTeX & Diagrams */}
            <div className="text-slate-900 dark:text-slate-100 font-medium text-sm sm:text-base leading-relaxed space-y-3">
              <MathView content={currentQ.questionText} />
              {currentQ.latex && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-mono my-3">
                  <MathView content={`$$${currentQ.latex}$$`} block />
                </div>
              )}
              {(currentQ.diagramSvg || currentQ.image) && (
                <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center my-3">
                  {currentQ.diagramSvg ? (
                    <div
                      className="max-w-sm w-full flex justify-center"
                      dangerouslySetInnerHTML={{ __html: currentQ.diagramSvg }}
                    />
                  ) : (
                    <img
                      src={currentQ.image}
                      alt="Question Diagram"
                      className="max-h-60 object-contain rounded-lg"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Answer Options Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* MCQ: Single Correct */}
              {currentQ.type === 'MCQ' && currentQ.options && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Choose one correct option:
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentQ.options.map((opt) => {
                      const isSelected = currentResp?.selectedOption === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleOptionSelect(opt.id)}
                          className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-600 text-indigo-950 dark:text-indigo-200 font-semibold shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-colors ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-400 text-slate-600 dark:text-slate-400'
                          }`}>
                            {opt.id}
                          </div>
                          <div className="text-sm pt-0.5">
                            <MathView content={opt.text} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MULTIPLE_CORRECT: Multi Select */}
              {currentQ.type === 'MULTIPLE_CORRECT' && currentQ.options && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    One or More Than One Option May Be Correct (Select all applicable):
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentQ.options.map((opt) => {
                      const selectedList = currentResp?.selectedOption ? currentResp.selectedOption.split(',') : [];
                      const isSelected = selectedList.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleMultiCorrectToggle(opt.id)}
                          className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                            isSelected
                              ? 'bg-purple-50/80 dark:bg-purple-950/50 border-purple-600 text-purple-950 dark:text-purple-200 font-semibold shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-colors ${
                            isSelected
                              ? 'border-purple-600 bg-purple-600 text-white'
                              : 'border-slate-400 text-slate-600 dark:text-slate-400'
                          }`}>
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : opt.id}
                          </div>
                          <div className="text-sm pt-0.5">
                            <MathView content={opt.text} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Numerical Value Input */}
              {currentQ.type === 'NUMERICAL' && (
                <div className="space-y-4 max-w-md">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Enter Numerical Answer:
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Enter the numerical value (integer or decimal up to 2 decimal places):
                    </p>
                    <input
                      type="text"
                      value={currentResp?.numericalValue || ''}
                      onChange={(e) => handleNumericalChange(e.target.value)}
                      placeholder="e.g. 4.25 or -15"
                      className="w-full text-xl font-mono font-bold px-4 py-3 bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-600 focus:border-indigo-600 rounded-xl focus:outline-none text-slate-900 dark:text-slate-100"
                    />
                    {/* On-screen Keypad */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {['7','8','9','C','4','5','6','-','1','2','3','.','0','00','⌫'].map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            const cur = currentResp?.numericalValue || '';
                            if (key === 'C') {
                              handleNumericalChange('');
                            } else if (key === '⌫') {
                              handleNumericalChange(cur.slice(0, -1));
                            } else {
                              handleNumericalChange(cur + key);
                            }
                          }}
                          className="py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Practice Mode Solution Reveal Panel */}
              {examMode === 'PRACTICE' && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <button
                    onClick={() => setShowSolutionInPractice(prev => !prev)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {showSolutionInPractice ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showSolutionInPractice ? 'Hide Practice Solution' : 'Reveal Solution & Hints'}
                  </button>

                  {showSolutionInPractice && (
                    <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl space-y-2 text-xs text-amber-950 dark:text-amber-200">
                      <div className="font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Correct Answer: <span className="font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">{currentQ.correctAnswer}</span>
                      </div>
                      <div className="leading-relaxed">
                        <MathView content={currentQ.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ================= 4. BOTTOM ACTION CONTROLS (OFFICIAL NTA CBT WORKFLOW) ================= */}
          <div className="p-4 border-t border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={saveAndNext}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                Save &amp; Next <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => saveAndMarkForReview(currentQ.id)}
                className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Save current answer and mark for review (Will be evaluated)"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                Save &amp; Mark for Review
              </button>

              <button
                onClick={() => clearResponse(currentQ.id)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Response
              </button>

              <button
                onClick={() => markForReview(currentQ.id)}
                className="px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Mark for Review &amp; Next
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentQuestionIdx > 0) setCurrentQuestionIdx(currentQuestionIdx - 1);
                }}
                disabled={currentQuestionIdx === 0}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  currentQuestionIdx === 0
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 shadow-xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> &lt;&lt; Back
              </button>

              <button
                onClick={() => {
                  if (currentQuestionIdx < activeTest.questions.length - 1) {
                    setCurrentQuestionIdx(currentQuestionIdx + 1);
                  }
                }}
                disabled={currentQuestionIdx === activeTest.questions.length - 1}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  currentQuestionIdx === activeTest.questions.length - 1
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 shadow-xs'
                }`}
              >
                Next &gt;&gt; <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= 5. RIGHT SIDEBAR: QUESTION PALETTE ================= */}
        <div className="w-full lg:w-80 bg-slate-50 dark:bg-slate-950 flex flex-col border-l border-slate-300 dark:border-slate-800 overflow-hidden shrink-0">
          {/* Candidate Profile Widget */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-sky-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {candidateName.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{candidateName}</div>
              <div className="text-[10px] text-slate-500 font-mono">Roll / ID: {candidateRollNo}</div>
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {activeTest.examType.replace('_', ' ')} • {activeTest.activeAttemptSet || 'Set A'}
              </div>
            </div>
          </div>

          {/* Palette Status Legend */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-[11px] space-y-1.5 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  {paletteSummary.answered}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-red-600 text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  {paletteSummary.notAnswered}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-600">
                  {paletteSummary.notVisited}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">
                  {paletteSummary.marked}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Marked Review</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <div className="relative w-6 h-6 shrink-0">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold font-mono text-xs flex items-center justify-center">
                  {paletteSummary.answeredAndMarked}
                </span>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-white"></span>
              </div>
              <span className="text-slate-700 dark:text-slate-300 font-medium text-[10px] leading-tight">
                Ans &amp; Marked for Review (Evaluated)
              </span>
            </div>
          </div>

          {/* Section Heading & Grid Controls */}
          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">{currentQ.subject}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPaletteFilter('SECTION')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    paletteFilter === 'SECTION' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Section
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteFilter('ALL')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    paletteFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All ({activeTest.questions.length})
                </button>
              </div>
            </div>

            {/* Question Numbers Grid */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {displayedPaletteQuestions.map(({ q, idx }) => {
                const r = responses[q.id];
                const isCurrent = idx === currentQuestionIdx;
                const status = r ? r.status : 'NOT_VISITED';

                let bgClass = 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
                let isCircle = false;
                let hasGreenDot = false;

                if (status === 'ANSWERED') {
                  bgClass = 'bg-emerald-600 text-white border-emerald-700';
                } else if (status === 'NOT_ANSWERED') {
                  bgClass = 'bg-red-600 text-white border-red-700';
                } else if (status === 'MARKED_FOR_REVIEW') {
                  bgClass = 'bg-purple-600 text-white border-purple-700';
                  isCircle = true;
                } else if (status === 'ANSWERED_AND_MARKED') {
                  bgClass = 'bg-purple-600 text-white border-purple-700';
                  isCircle = true;
                  hasGreenDot = true;
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`relative h-10 flex items-center justify-center font-mono font-bold text-xs border transition-all cursor-pointer ${
                      isCircle ? 'rounded-full' : 'rounded-lg'
                    } ${bgClass} ${
                      isCurrent ? 'ring-3 ring-indigo-500 ring-offset-1 scale-105 z-10' : 'hover:opacity-90'
                    }`}
                  >
                    {idx + 1}
                    {hasGreenDot && (
                      <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Test Button */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Submit Examination
            </button>
          </div>
        </div>
      </div>

      {/* ================= 6. SUBMISSION CONFIRMATION MODAL ================= */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Submit Examination Confirmation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review your question attempt summary before submitting.
                </p>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                <span>Total Questions in Paper:</span>
                <span className="font-mono text-sm">{paletteSummary.total}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>Questions Answered:</span>
                <span className="font-mono">{paletteSummary.answered}</span>
              </div>
              <div className="flex justify-between py-1 text-red-700 dark:text-red-400 font-semibold">
                <span>Questions Not Answered:</span>
                <span className="font-mono">{paletteSummary.notAnswered}</span>
              </div>
              <div className="flex justify-between py-1 text-purple-700 dark:text-purple-400 font-semibold">
                <span>Marked for Review:</span>
                <span className="font-mono">{paletteSummary.marked}</span>
              </div>
              <div className="flex justify-between py-1 text-purple-800 dark:text-purple-300 font-semibold">
                <span>Answered &amp; Marked for Review:</span>
                <span className="font-mono">{paletteSummary.answeredAndMarked}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-500 font-semibold">
                <span>Not Visited:</span>
                <span className="font-mono">{paletteSummary.notVisited}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed border border-amber-200 dark:border-amber-800">
              <strong>Notice:</strong> Once submitted, your answers will be automatically evaluated. 
              You will receive full solution explanations, accuracy diagnosis, and mistake analysis.
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Evaluating...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. BOOKMARK QUESTION MODAL ================= */}
      {showBookmarkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Bookmark Question #{currentQuestionIdx + 1}
                </h3>
              </div>
              <button onClick={() => setShowBookmarkModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Collection Folder
              </label>
              <select
                value={bookmarkCollection}
                onChange={(e) => setBookmarkCollection(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="Important Revision">Important Revision</option>
                <option value="Tough Formulas">Tough Formulas</option>
                <option value="Tricky Concepts">Tricky Concepts</option>
                <option value="High-Yield PYQ">High-Yield PYQ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Personal Study Note (Optional)
              </label>
              <textarea
                value={bookmarkNote}
                onChange={(e) => setBookmarkNote(e.target.value)}
                placeholder="e.g. Revisit capacitor formula with multiple dielectrics before the exam..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBookmarkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBookmark}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. REPORT QUESTION MODAL ================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Report Issue with Question #{currentQuestionIdx + 1}
                </h3>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Report logged for academic administrator review. Thank you!
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nature of Issue
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as QuestionReport['reason'])}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                  >
                    <option value="INCORRECT_ANSWER">Incorrect Answer Key</option>
                    <option value="TYPO">Typographical or LaTeX Error</option>
                    <option value="AMBIGUOUS">Ambiguous Question Wording</option>
                    <option value="BROKEN_IMAGE">Broken Diagram or Missing Image</option>
                    <option value="INCORRECT_SOLUTION">Incorrect Step-by-Step Solution</option>
                    <option value="OTHER">Other Discrepancy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Description &amp; Suggested Correction
                  </label>
                  <textarea
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Briefly describe what appears incorrect in this question..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReport}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= 9. SHORTCUTS HELP MODAL ================= */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  CBT Keyboard Shortcuts
                </h3>
              </div>
              <button onClick={() => setShowShortcutsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Save &amp; Go to Next Question</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">N or Enter</kbd>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Previous Question</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">P</kbd>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Mark for Review &amp; Next</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">M</kbd>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Clear Current Response</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">C</kbd>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Toggle Command Palette</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Toggle Shortcuts Guide</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">?</kbd>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
