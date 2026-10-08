import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { ExamType, SubjectName, Difficulty, TestDefinition } from '../types/exam';
import {
  selectQuestionsIntelligent,
  generateUniqueTestId,
  validateGeneratedTestQuestions,
  buildTestQuestionMappings,
} from '../data/questionBankEngine';

export const StudentCustomTestView: React.FC = () => {
  const {
    questions,
    publishTest,
    setActiveTest,
    setCurrentView,
    authProfile,
    generateCourseAwareTest,
  } = useExam();

  const isStudent = !authProfile || authProfile.role === 'STUDENT';
  const studentCourseType =
    authProfile?.courseType ||
    (authProfile?.examCategory === 'NEET'
      ? 'NEET'
      : authProfile?.examCategory === 'JEE_ADVANCED'
      ? 'JEE_ADVANCED'
      : 'JEE');

  const lockedExamType: ExamType =
    studentCourseType === 'NEET'
      ? 'NEET'
      : studentCourseType === 'JEE_ADVANCED'
      ? 'JEE_ADVANCED'
      : 'JEE_MAIN';

  const [examType, setExamType] = useState<ExamType>(lockedExamType);
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>(
    lockedExamType === 'NEET' ? 'Botany' : 'Physics'
  );
  const [selectedChapters, setSelectedChapters] = useState<string[]>(
    lockedExamType === 'NEET'
      ? ['Genetics and Evolution', 'Plant Physiology']
      : ['Electrostatics', 'Mechanics']
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMins, setDurationMins] = useState<number>(30);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available subjects strictly based on authorized course
  const availableSubjects: SubjectName[] = useMemo(() => {
    const activeExam = isStudent ? lockedExamType : examType;
    return activeExam === 'NEET'
      ? ['Physics', 'Chemistry', 'Botany', 'Zoology']
      : ['Physics', 'Chemistry', 'Mathematics'];
  }, [isStudent, lockedExamType, examType]);

  // Available chapters for the selected subject from course-filtered questions
  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    questions
      .filter((q) => q.subject === selectedSubject)
      .forEach((q) => set.add(q.chapter));

    if (selectedSubject === 'Physics') {
      [
        'Electrostatics',
        'Mechanics',
        'Thermodynamics',
        'Modern Physics',
        'Optics',
        'Current Electricity',
      ].forEach((c) => set.add(c));
    } else if (selectedSubject === 'Chemistry') {
      [
        'Chemical Kinetics',
        'Coordination Compounds',
        'Organic Chemistry',
        'Thermodynamics',
        'Electrochemistry',
      ].forEach((c) => set.add(c));
    } else if (selectedSubject === 'Mathematics') {
      [
        'Calculus',
        'Vectors & 3D Geometry',
        'Matrices & Determinants',
        'Coordinate Geometry',
      ].forEach((c) => set.add(c));
    } else if (selectedSubject === 'Botany') {
      ['Plant Physiology', 'Genetics and Evolution', 'Cell Biology'].forEach((c) => set.add(c));
    } else if (selectedSubject === 'Zoology') {
      ['Human Physiology', 'Biotechnology'].forEach((c) => set.add(c));
    }
    return Array.from(set);
  }, [questions, selectedSubject]);

  const toggleChapter = (chap: string) => {
    if (selectedChapters.includes(chap)) {
      if (selectedChapters.length > 1) {
        setSelectedChapters((prev) => prev.filter((c) => c !== chap));
      }
    } else {
      setSelectedChapters((prev) => [...prev, chap]);
    }
  };

  const handleGenerateCustomTest = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    const effectiveExam: ExamType = isStudent ? lockedExamType : examType;
    const effectiveCourse =
      effectiveExam === 'NEET'
        ? 'NEET'
        : effectiveExam === 'JEE_ADVANCED'
        ? 'JEE_ADVANCED'
        : 'JEE';

    // First call backend course-aware test generator endpoint (/api/tests/generate)
    const serverRes = await generateCourseAwareTest({
      courseType: effectiveCourse,
      examType: effectiveExam,
      subject: selectedSubject,
      chapters: selectedChapters,
      difficulty,
      questionCount,
      durationMinutes: durationMins,
      title: `${effectiveCourse} ${selectedSubject} Sprint: ${selectedChapters
        .slice(0, 2)
        .join(' & ')}`,
    });

    if (serverRes.success && serverRes.test) {
      setIsGenerating(false);
      setActiveTest(serverRes.test);
      setCurrentView('test-details');
      return;
    }

    if (serverRes.error) {
      setErrorMsg(serverRes.error);
      setIsGenerating(false);
      return;
    }

    try {
      const customTestId = generateUniqueTestId(`test_${effectiveExam.toLowerCase()}`);
      const notices: string[] = [];
      const finalQuestions = selectQuestionsIntelligent(questions, {
        exam: effectiveExam,
        subject: selectedSubject,
        chapters: selectedChapters,
        difficulty,
        count: questionCount,
        testIdForTracking: customTestId,
        strictCount: true,
        onDistributionAdjusted: (msg) => notices.push(msg),
      });

      validateGeneratedTestQuestions(finalQuestions);
      const snapshotIds = finalQuestions.map((q) => q.questionId || q.id);
      const testQuestions = buildTestQuestionMappings(customTestId, finalQuestions, 1, 'Set A');

      const customTest: Partial<TestDefinition> = {
        id: customTestId,
        testId: customTestId,
        title: `${effectiveCourse} ${selectedSubject} Sprint: ${selectedChapters
          .slice(0, 2)
          .join(' & ')}`,
        subtitle: `Course-Verified Practice Test (${difficulty} Rigor • Zero Duplicates)`,
        courseId:
          effectiveCourse === 'NEET'
            ? 'course_neet'
            : effectiveCourse === 'JEE_ADVANCED'
            ? 'course_jee_adv'
            : 'course_jee',
        courseType: effectiveCourse,
        examType: effectiveExam,
        testType: 'CUSTOM',
        durationMinutes: durationMins,
        totalMarks: finalQuestions.length * 4,
        positiveMarks: 4,
        negativeMarks: 1,
        subjects: [selectedSubject],
        questionsCount: finalQuestions.length,
        difficulty,
        difficultyDistributionNotice: notices.length > 0 ? notices.join(' ') : undefined,
        syllabus: selectedChapters.map((c) => `${selectedSubject}: ${c}`),
        description: `Generated via course-verified intelligent question rotation focusing on ${selectedChapters.join(
          ', '
        )} with zero duplicate questions.`,
        published: true,
        questions: finalQuestions,
        snapshotQuestionIds: snapshotIds,
        testQuestions,
        attemptSnapshots: [
          {
            attemptNumber: 1,
            setLabel: 'Set A',
            questionIds: snapshotIds,
            testQuestions,
            createdAt: new Date().toISOString(),
          },
        ],
        activeAttemptSet: 'Set A',
      };

      const created = await publishTest(customTest);
      setIsGenerating(false);
      setActiveTest(created);
      setCurrentView('test-details');
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'Not enough unique questions are available for this test. Please add more questions or reduce the number of questions.'
      );
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => setCurrentView('tests')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Library
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs space-y-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Course-Aware Test Generator ({studentCourseType})
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
              Build Your {studentCourseType === 'NEET' ? 'NEET UG' : 'JEE'} Practice Test
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Questions are strictly selected from the verified {studentCourseType} question bank with zero duplicate questions.
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* 1. Enrolled Course Lock Banner (Students cannot switch courses) */}
            {isStudent ? (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400">
                    1. Enrolled Course (Server-Enforced)
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {studentCourseType === 'NEET'
                      ? 'NEET UG (Physics, Chemistry, Botany, Zoology)'
                      : studentCourseType === 'JEE_ADVANCED'
                      ? 'JEE Main & JEE Advanced (Physics, Chemistry, Mathematics)'
                      : 'JEE Main (Physics, Chemistry, Mathematics)'}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-bold">
                  ACTIVE ENROLLMENT
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  1. Select Authorized Course Blueprint (Staff Mode)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setExamType('JEE_MAIN');
                      setSelectedSubject('Physics');
                    }}
                    className={`p-3.5 rounded-xl border-2 text-xs font-bold transition-all text-left cursor-pointer ${
                      examType === 'JEE_MAIN'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-sm">JEE Main</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Physics, Chemistry, Mathematics
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExamType('NEET');
                      setSelectedSubject('Botany');
                    }}
                    className={`p-3.5 rounded-xl border-2 text-xs font-bold transition-all text-left cursor-pointer ${
                      examType === 'NEET'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-sm">NEET UG</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Physics, Chemistry, Botany, Zoology
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Subject Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                2. Select Course Subject
              </label>
              <div className="flex gap-2 flex-wrap">
                {availableSubjects.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(subj);
                      setSelectedChapters([]);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSubject === subj
                        ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Chapters Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                3. Choose Chapters ({selectedChapters.length} Selected)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {availableChapters.map((chap) => {
                  const isChecked = selectedChapters.includes(chap);
                  return (
                    <div
                      key={chap}
                      onClick={() => toggleChapter(chap)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-900 dark:text-indigo-200'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>{chap}</span>
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Difficulty, Question Count & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="EASY">Easy (Foundation)</option>
                  <option value="MEDIUM">Medium (Exam Pattern)</option>
                  <option value="HARD">Hard (Advanced)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Questions Count
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value={5}>5 Questions (Speed Drill)</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={30}>30 Questions (Half Mock)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Duration (Minutes)
                </label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleGenerateCustomTest}
              disabled={isGenerating}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isGenerating
                ? 'Validating Enrollment & Assembling Paper...'
                : `Generate & Start My ${studentCourseType === 'NEET' ? 'NEET' : 'JEE'} Test`}{' '}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
