import React, { useState, useMemo } from 'react';
import { useExam } from '../context/ExamContext';
import { 
  Sliders, 
  Sparkles, 
  Clock, 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  BookOpen,
  Zap,
  Layers
} from 'lucide-react';
import { ExamType, SubjectName, Difficulty, TestDefinition } from '../types/exam';
import { selectQuestionsIntelligent } from '../data/questionBankEngine';

export const StudentCustomTestView: React.FC = () => {
  const { questions, publishTest, setActiveTest, setCurrentView, generateBlueprintMockTest } = useExam();

  const [examType, setExamType] = useState<ExamType>('JEE_MAIN');
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>('Physics');
  const [selectedChapters, setSelectedChapters] = useState<string[]>(['Electrostatics', 'Mechanics']);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [durationMins, setDurationMins] = useState<number>(30);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Available subjects based on exam
  const availableSubjects: SubjectName[] = useMemo(() => {
    return examType === 'NEET' 
      ? ['Physics', 'Chemistry', 'Botany', 'Zoology']
      : ['Physics', 'Chemistry', 'Mathematics'];
  }, [examType]);

  // Available chapters for the selected subject
  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    questions
      .filter(q => q.subject === selectedSubject)
      .forEach(q => set.add(q.chapter));
    
    // Add default fallbacks if seed is compact
    if (selectedSubject === 'Physics') {
      ['Electrostatics', 'Mechanics', 'Thermodynamics', 'Modern Physics', 'Optics', 'Current Electricity'].forEach(c => set.add(c));
    } else if (selectedSubject === 'Chemistry') {
      ['Chemical Kinetics', 'Coordination Compounds', 'Organic Chemistry', 'Thermodynamics', 'Electrochemistry'].forEach(c => set.add(c));
    } else if (selectedSubject === 'Mathematics') {
      ['Calculus', 'Vectors & 3D Geometry', 'Matrices & Determinants', 'Coordinate Geometry'].forEach(c => set.add(c));
    } else if (selectedSubject === 'Botany') {
      ['Plant Physiology', 'Genetics and Evolution', 'Cell Biology'].forEach(c => set.add(c));
    } else if (selectedSubject === 'Zoology') {
      ['Human Physiology', 'Biotechnology'].forEach(c => set.add(c));
    }
    return Array.from(set);
  }, [questions, selectedSubject]);

  const toggleChapter = (chap: string) => {
    if (selectedChapters.includes(chap)) {
      if (selectedChapters.length > 1) {
        setSelectedChapters(prev => prev.filter(c => c !== chap));
      }
    } else {
      setSelectedChapters(prev => [...prev, chap]);
    }
  };

  const handleGenerateCustomTest = async () => {
    setIsGenerating(true);

    const customTestId = `custom-${examType.toLowerCase()}-${Date.now().toString().slice(-6)}`;

    // 10-Step Intelligent Question Selection (Never used -> Least used -> Oldest lastUsedAt -> Fisher-Yates shuffle)
    const finalQuestions = selectQuestionsIntelligent(questions, {
      exam: examType,
      subject: selectedSubject,
      chapters: selectedChapters,
      difficulty,
      count: questionCount,
      testIdForTracking: customTestId,
    });

    const snapshotIds = finalQuestions.map((q) => q.questionId || q.id);

    const customTest: Partial<TestDefinition> = {
      id: customTestId,
      title: `${selectedSubject} Sprint: ${selectedChapters.slice(0, 2).join(' & ')}`,
      subtitle: `Intelligent Rotated Practice Test (${difficulty} Rigor • Zero Duplicates)`,
      examType,
      testType: 'CUSTOM',
      durationMinutes: durationMins,
      totalMarks: finalQuestions.length * 4,
      positiveMarks: 4,
      negativeMarks: 1,
      subjects: [selectedSubject],
      questionsCount: finalQuestions.length,
      difficulty,
      syllabus: selectedChapters.map((c) => `${selectedSubject}: ${c}`),
      description: `Generated via 10-step intelligent question rotation focusing on ${selectedChapters.join(', ')} with Fisher-Yates unbiased shuffle and saved question snapshot.`,
      published: true,
      questions: finalQuestions,
      snapshotQuestionIds: snapshotIds,
      attemptSnapshots: [
        {
          attemptNumber: 1,
          setLabel: 'Set A',
          questionIds: snapshotIds,
          createdAt: new Date().toISOString(),
        },
      ],
      activeAttemptSet: 'Set A',
    };

    const created = await publishTest(customTest);
    setIsGenerating(false);
    setActiveTest(created);
    setCurrentView('test-details');
  };

  const handleGenerateFullOfficialMock = async (bpKey: string) => {
    setIsGenerating(true);
    const created = await generateBlueprintMockTest(bpKey);
    setIsGenerating(false);
    setActiveTest(created);
    setCurrentView('test-details');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => setCurrentView('tests')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Library
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Personalized Sprint Engine
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              Build Your Custom Practice Test
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Select specific subjects, chapters, duration, and question counts to target weak topics.
            </p>
          </div>

          <div className="space-y-6">
            {/* 1. Exam Target */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Select Target Exam
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setExamType('JEE_MAIN');
                    setSelectedSubject('Physics');
                  }}
                  className={`p-3.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                    examType === 'JEE_MAIN'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-extrabold text-sm">JEE Main</div>
                  <div className="text-[11px] text-slate-500 font-normal">Physics, Chemistry, Mathematics</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExamType('NEET');
                    setSelectedSubject('Botany');
                  }}
                  className={`p-3.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                    examType === 'NEET'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-extrabold text-sm">NEET UG</div>
                  <div className="text-[11px] text-slate-500 font-normal">Physics, Chemistry, Botany, Zoology</div>
                </button>
              </div>
            </div>

            {/* 2. Subject Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. Select Subject
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedSubject === subj
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Chapters Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{chap}</span>
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-md border border-slate-300"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Difficulty, Question Count & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="EASY">Easy (Foundation)</option>
                  <option value="MEDIUM">Medium (Exam Pattern)</option>
                  <option value="HARD">Hard (Advanced)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Questions Count
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value={5}>5 Questions (Speed Drill)</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={30}>30 Questions (Half Mock)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Duration (Minutes)
                </label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleGenerateCustomTest}
              disabled={isGenerating}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? 'Assembling Paper...' : 'Generate & Start My Test'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
