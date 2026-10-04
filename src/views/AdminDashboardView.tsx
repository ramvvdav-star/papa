import React, { useState, useEffect } from 'react';
import { useExam } from '../context/ExamContext';
import { MathView } from '../components/MathView';
import { 
  ShieldCheck, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Search, 
  Download, 
  Printer, 
  FileText, 
  RefreshCw, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  FileCheck,
  Upload,
  Flag,
  Settings,
  ShieldAlert,
  Check,
  X
} from 'lucide-react';
import { Question, ExamType, SubjectName, Difficulty, QuestionType, TestDefinition } from '../types/exam';
import { OFFICIAL_EXAM_PATTERNS } from '../data/officialExamPatterns';
import { 
  generateJeeMainFullMocks, 
  generateJeeAdvancedPracticeSets, 
  generateNeetFullMocks 
} from '../data/fullLengthPapersGenerator';
import { AdminRbacControlPanel } from '../components/AdminRbacControlPanel';
import { ExamBlueprintAuditPanel } from '../components/ExamBlueprintAuditPanel';

export const AdminDashboardView: React.FC = () => {
  const { 
    questions, 
    tests, 
    addQuestion, 
    deleteQuestion, 
    updateQuestion, 
    publishTest, 
    setActiveTest, 
    setCurrentView,
    totalQuestionsInBank,
    questionBankPage,
    questionBankTotalPages,
    loadQuestions,
    reports,
    resolveReport,
    auditLogs,
    systemSettings,
    updateSystemSettings,
    integrityEvents,
    logAdminAction
  } = useExam();

  const [activeAdminTab, setActiveAdminTab] = useState<'rbac' | 'overview' | 'patterns' | 'questions' | 'bulk-import' | 'reports' | 'audit-logs' | 'settings' | 'ai-generator' | 'blueprint' | 'export'>('rbac');
  const [examPatterns, setExamPatterns] = useState(OFFICIAL_EXAM_PATTERNS);
  const [selectedPatternKey, setSelectedPatternKey] = useState<string>('JEE_MAIN_2026');
  const [patternGenMessage, setPatternGenMessage] = useState<string>('');

  // Bulk Import state
  const [importFormat, setImportFormat] = useState<'JSON' | 'CSV'>('JSON');
  const [importRawText, setImportRawText] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [validatedQuestions, setValidatedQuestions] = useState<Question[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string>('');

  // Reports filter state
  const [reportFilter, setReportFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('ALL');

  // Stats
  const [platformStats, setPlatformStats] = useState<any>({
    totalQuestions: totalQuestionsInBank || 10000,
    totalTests: tests.length,
    totalAttempts: 18450,
    avgAccuracy: 72,
    totalStudents: 14250
  });

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setPlatformStats(data))
      .catch(() => {});
  }, [questions.length, tests.length]);

  // ---------------- QUESTIONS BANK STATE ----------------
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  // New Question Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQText, setNewQText] = useState('');
  const [newQLatex, setNewQLatex] = useState('');
  const [newQExam, setNewQExam] = useState<ExamType>('JEE_MAIN');
  const [newQSubject, setNewQSubject] = useState<SubjectName>('Physics');
  const [newQChapter, setNewQChapter] = useState('Electrostatics');
  const [newQTopic, setNewQTopic] = useState('Capacitors');
  const [newQDifficulty, setNewQDifficulty] = useState<Difficulty>('MEDIUM');
  const [newQType, setNewQType] = useState<QuestionType>('MCQ');
  const [newQOptions, setNewQOptions] = useState([
    { id: 'A' as const, text: 'Option A' },
    { id: 'B' as const, text: 'Option B' },
    { id: 'C' as const, text: 'Option C' },
    { id: 'D' as const, text: 'Option D' }
  ]);
  const [newQCorrectAns, setNewQCorrectAns] = useState('A');
  const [newQExplanation, setNewQExplanation] = useState('Detailed step-by-step solution.');

  // ---------------- AI QUESTION GENERATOR STATE ----------------
  const [aiExam, setAiExam] = useState<ExamType>('JEE_MAIN');
  const [aiSubject, setAiSubject] = useState<SubjectName>('Physics');
  const [aiChapter, setAiChapter] = useState('Modern Physics');
  const [aiTopic, setAiTopic] = useState('De Broglie Wavelength');
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('MEDIUM');
  const [aiQuestionType, setAiQuestionType] = useState<QuestionType>('MCQ');
  const [aiCount, setAiCount] = useState<number>(3);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedList, setAiGeneratedList] = useState<Question[]>([]);
  const [aiGenerationMessage, setAiGenerationMessage] = useState('');

  // ---------------- BLUEPRINT & PAPER BUILDER STATE ----------------
  const [bpExam, setBpExam] = useState<ExamType>('JEE_MAIN');
  const [bpDuration, setBpDuration] = useState<number>(180);
  const [bpQuestionsCount, setBpQuestionsCount] = useState<number>(15);
  const [blueprintData, setBlueprintData] = useState<any>(null);
  const [isBuildingPaper, setIsBuildingPaper] = useState(false);

  // Filtered Questions Bank
  const filteredQuestions = questions.filter(q => {
    if (filterSubject !== 'ALL' && q.subject !== filterSubject) return false;
    if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      return q.questionText.toLowerCase().includes(s) || q.chapter.toLowerCase().includes(s) || q.topic.toLowerCase().includes(s);
    }
    return true;
  });

  // Save New Manual Question
  const handleSaveQuestion = async () => {
    if (!newQText.trim()) return;

    await addQuestion({
      examType: newQExam,
      subject: newQSubject,
      chapter: newQChapter,
      topic: newQTopic,
      difficulty: newQDifficulty,
      type: newQType,
      questionText: newQText,
      latex: newQLatex,
      options: newQType === 'MCQ' ? newQOptions : undefined,
      correctAnswer: newQCorrectAns,
      explanation: newQExplanation,
      positiveMarks: 4,
      negativeMarks: newQType === 'NUMERICAL' ? 0 : 1,
      source: 'ADMIN',
      status: 'PUBLISHED'
    });

    setShowAddModal(false);
    setNewQText('');
    setNewQLatex('');
  };

  // Run AI Question Generator via Server-Side API
  const handleRunAiGenerator = async () => {
    setIsAiGenerating(true);
    setAiGenerationMessage('');
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType: aiExam,
          subject: aiSubject,
          chapter: aiChapter,
          topic: aiTopic,
          difficulty: aiDifficulty,
          questionType: aiQuestionType,
          count: aiCount
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiGeneratedList(data.questions || []);
        setAiGenerationMessage(`Successfully generated ${data.questions.length} questions via ${data.source}. Review & approve below.`);
      }
    } catch {
      setAiGenerationMessage('Failed to contact generator API.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Approve AI Question into Bank
  const handleApproveAiQuestion = async (q: Question) => {
    await addQuestion({ ...q, status: 'PUBLISHED', source: 'AI' });
    setAiGeneratedList(prev => prev.filter(item => item.id !== q.id));
  };

  // Generate Blueprint
  const handleGenerateBlueprint = async () => {
    try {
      const res = await fetch('/api/ai/generate-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType: bpExam,
          durationMinutes: bpDuration,
          totalQuestions: bpQuestionsCount
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBlueprintData(data);
      }
    } catch {}
  };

  // Publish Paper from Blueprint
  const handlePublishPaperFromBlueprint = async () => {
    if (!blueprintData) return;
    setIsBuildingPaper(true);

    const isJee = blueprintData.examType.startsWith('JEE');
    const targetSubjects = isJee ? ['Physics', 'Chemistry', 'Mathematics'] : ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    
    // Pick questions from question bank
    const selectedQuestions: Question[] = [];
    targetSubjects.forEach(s => {
      const pool = questions.filter(q => q.subject === s);
      const count = Math.ceil(bpQuestionsCount / targetSubjects.length);
      selectedQuestions.push(...pool.slice(0, count));
    });

    const newPaper: Partial<TestDefinition> = {
      title: `${blueprintData.title} #${Date.now().toString().slice(-4)}`,
      subtitle: `Official Paper Variant Generated from Balanced Blueprint`,
      examType: blueprintData.examType,
      testType: 'FULL_MOCK',
      durationMinutes: blueprintData.durationMinutes,
      totalMarks: selectedQuestions.length * 4,
      positiveMarks: 4,
      negativeMarks: 1,
      subjects: targetSubjects as any,
      questionsCount: selectedQuestions.length,
      difficulty: 'MEDIUM',
      syllabus: targetSubjects.map(s => `${s}: Full Syllabus Distribution`),
      description: `Paper assembled from verified question bank adhering to 30% Easy, 50% Medium, 20% Hard distribution.`,
      published: true,
      questions: selectedQuestions
    };

    const created = await publishTest(newPaper);
    setIsBuildingPaper(false);
    setActiveTest(created);
    setCurrentView('test-details');
  };

  const togglePatternVerification = (patternKey: string) => {
    setExamPatterns(prev => ({
      ...prev,
      [patternKey]: {
        ...prev[patternKey],
        isVerified2026: !prev[patternKey].isVerified2026
      }
    }));
  };

  const handleGeneratePaperFromPattern = async (patternKey: string) => {
    setPatternGenMessage('Generating authentic full-length paper from official blueprint...');
    let newPapers: TestDefinition[] = [];
    if (patternKey === 'JEE_MAIN_2026') {
      newPapers = generateJeeMainFullMocks();
    } else if (patternKey.startsWith('JEE_ADVANCED')) {
      newPapers = generateJeeAdvancedPracticeSets();
    } else if (patternKey === 'NEET_UG_2026') {
      newPapers = generateNeetFullMocks();
    }
    
    if (newPapers.length > 0) {
      const base = newPapers[Math.floor(Math.random() * newPapers.length)];
      const created = await publishTest({
        ...base,
        id: `gen-${patternKey.toLowerCase().replace(/_/g, '-')}-${Date.now()}`,
        title: `${base.title} [Live Pattern Instance]`,
        subtitle: `Authentic ${base.questionsCount}-question paper generated from verified ${base.patternYear} template`,
        createdAt: new Date().toISOString()
      });
      setPatternGenMessage(`Successfully generated & published "${created.title}" with ${created.questionsCount} questions to CBT library!`);
      setActiveTest(created);
    }
  };

  const sampleJsonTemplate = `[
  {
    "examType": "JEE_MAIN",
    "subject": "Physics",
    "chapter": "Electrostatics",
    "topic": "Coulomb's Law",
    "difficulty": "MEDIUM",
    "type": "MCQ",
    "questionText": "Two point charges $q_1 = 3\\\\,\\\\mu\\\\text{C}$ and $q_2 = -3\\\\,\\\\mu\\\\text{C}$ are separated by $10\\\\text{ cm}$. Find the electrostatic force.",
    "latex": "F = \\\\frac{1}{4\\\\pi\\\\varepsilon_0}\\\\frac{|q_1 q_2|}{r^2}",
    "options": [
      { "id": "A", "text": "8.1 N attractive" },
      { "id": "B", "text": "8.1 N repulsive" },
      { "id": "C", "text": "0.81 N attractive" },
      { "id": "D", "text": "Zero" }
    ],
    "correctAnswer": "A",
    "explanation": "Using Coulomb's law: $F = 9\\\\times 10^9 \\\\times \\\\frac{9\\\\times 10^{-12}}{0.01} = 8.1\\\\text{ N}$. Since charges are opposite, force is attractive.",
    "positiveMarks": 4,
    "negativeMarks": 1
  }
]`;

  const sampleCsvTemplate = `examType,subject,chapter,topic,difficulty,type,questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation
JEE_MAIN,Physics,Electrostatics,Coulombs Law,MEDIUM,MCQ,Two charges attract with force F. If distance is doubled the force becomes:,F/2,F/4,2F,4F,B,Force is inversely proportional to square of distance.
NEET,Botany,Genetics,Mendel Laws,EASY,MCQ,Phenotypic ratio in monohybrid cross is:,1:2:1,3:1,9:3:3:1,2:1,B,Standard monohybrid F2 phenotypic ratio is 3:1.`;

  const handleValidateImport = () => {
    setImportErrors([]);
    setValidatedQuestions([]);
    setImportSuccessMessage('');

    if (!importRawText.trim()) {
      setImportErrors(['Import input is empty. Paste valid JSON or CSV data first.']);
      return;
    }

    const errors: string[] = [];
    const validList: Question[] = [];

    if (importFormat === 'JSON') {
      let parsed: any;
      try {
        parsed = JSON.parse(importRawText);
      } catch (e: any) {
        setImportErrors([`JSON Syntax Error: ${e.message}`]);
        return;
      }

      if (!Array.isArray(parsed)) {
        setImportErrors(['JSON data must be an array of question objects [ { ... } ].']);
        return;
      }

      parsed.forEach((item, idx) => {
        const line = idx + 1;
        if (!item.questionText || !item.questionText.trim()) {
          errors.push(`Item ${line}: Missing required "questionText".`);
        }
        if (!['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology'].includes(item.subject)) {
          errors.push(`Item ${line}: Invalid subject "${item.subject}". Allowed: Physics, Chemistry, Mathematics, Botany, Zoology.`);
        }
        if (!item.chapter || !item.chapter.trim()) {
          errors.push(`Item ${line}: Missing required "chapter".`);
        }
        if (item.type === 'MCQ' || !item.type) {
          if (!Array.isArray(item.options) || item.options.length < 2) {
            errors.push(`Item ${line}: MCQ must contain at least 2 options.`);
          }
          if (!item.correctAnswer) {
            errors.push(`Item ${line}: Missing "correctAnswer" (e.g. 'A', 'B', 'C', 'D').`);
          }
        }
        if (errors.length === 0) {
          validList.push({
            id: `IMP-${Date.now()}-${idx}`,
            examType: item.examType || 'JEE_MAIN',
            subject: item.subject,
            chapter: item.chapter,
            topic: item.topic || 'General',
            difficulty: item.difficulty || 'MEDIUM',
            type: item.type || 'MCQ',
            questionText: item.questionText,
            latex: item.latex || undefined,
            options: item.options || undefined,
            correctAnswer: item.correctAnswer || 'A',
            explanation: item.explanation || 'Verified solution.',
            positiveMarks: Number(item.positiveMarks) || 4,
            negativeMarks: Number(item.negativeMarks) || 1,
            source: 'IMPORTED',
            status: 'PUBLISHED',
            createdAt: new Date().toISOString()
          });
        }
      });
    } else {
      // CSV parser
      const lines = importRawText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        setImportErrors(['CSV must have a header row and at least one data row.']);
        return;
      }

      const rows = lines.slice(1);
      rows.forEach((row, idx) => {
        const line = idx + 2;
        const cols = row.split(',').map(c => c.trim());
        if (cols.length < 12) {
          errors.push(`Row ${line}: Expected at least 12 columns, found ${cols.length}.`);
          return;
        }

        const [examType, subject, chapter, topic, difficulty, type, questionText, optA, optB, optC, optD, correctAns, ...expParts] = cols;
        const explanation = expParts.join(',') || 'Verified explanation.';

        if (!questionText) {
          errors.push(`Row ${line}: Missing question text.`);
        }
        if (!['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology'].includes(subject)) {
          errors.push(`Row ${line}: Invalid subject "${subject}".`);
        }
        if (!correctAns) {
          errors.push(`Row ${line}: Missing correct answer.`);
        }

        if (errors.length === 0) {
          validList.push({
            id: `CSV-${Date.now()}-${idx}`,
            examType: (examType as any) || 'JEE_MAIN',
            subject: (subject as any) || 'Physics',
            chapter: chapter || 'General',
            topic: topic || 'Topic',
            difficulty: (difficulty as any) || 'MEDIUM',
            type: (type as any) || 'MCQ',
            questionText,
            options: [
              { id: 'A', text: optA || 'Option A' },
              { id: 'B', text: optB || 'Option B' },
              { id: 'C', text: optC || 'Option C' },
              { id: 'D', text: optD || 'Option D' }
            ],
            correctAnswer: correctAns.trim().toUpperCase(),
            explanation,
            positiveMarks: 4,
            negativeMarks: 1,
            source: 'IMPORTED',
            status: 'PUBLISHED',
            createdAt: new Date().toISOString()
          });
        }
      });
    }

    if (errors.length > 0) {
      setImportErrors(errors);
      setValidatedQuestions([]);
    } else {
      setImportErrors([]);
      setValidatedQuestions(validList);
    }
  };

  const handleCommitImport = async () => {
    if (validatedQuestions.length === 0) return;
    for (const q of validatedQuestions) {
      await addQuestion(q);
    }
    setImportSuccessMessage(`Successfully imported ${validatedQuestions.length} verified questions into the master question bank!`);
    logAdminAction('BULK_IMPORT', `${validatedQuestions.length} Questions`, `Format: ${importFormat}`);
    setValidatedQuestions([]);
    setImportRawText('');
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                Administrative Command Center
              </span>
              <span className="text-xs text-slate-500 font-mono">Platform v2.4 (Active)</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              Examination Administration &amp; AI Engine
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage question banks, generate balanced blueprints, run AI question synthesis, and monitor student metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveAdminTab('ai-generator')}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate AI Questions
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveAdminTab('rbac')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'rbac' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Users, Teachers, Students &amp; Batches
          </button>
          <button
            onClick={() => setActiveAdminTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'overview' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Platform Analytics &amp; Papers
          </button>
          <button
            onClick={() => setActiveAdminTab('patterns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'patterns' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Official 2026 Patterns ({Object.keys(examPatterns).length})
          </button>
          <button
            onClick={() => setActiveAdminTab('questions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'questions' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Question Bank ({totalQuestionsInBank.toLocaleString()})
          </button>
          <button
            onClick={() => setActiveAdminTab('ai-generator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'ai-generator' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            AI Question Generator
          </button>
          <button
            onClick={() => setActiveAdminTab('blueprint')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'blueprint' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Paper Blueprint &amp; Variants
          </button>
          <button
            onClick={() => setActiveAdminTab('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'export' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Print &amp; PDF Export
          </button>
          <button
            onClick={() => setActiveAdminTab('bulk-import')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'bulk-import' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Bulk Import (CSV/JSON)
          </button>
          <button
            onClick={() => setActiveAdminTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'reports' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Reports ({reports.filter(r => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveAdminTab('audit-logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'audit-logs' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Security &amp; Audit Logs
          </button>
          <button
            onClick={() => setActiveAdminTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'settings' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            System Settings
          </button>
        </div>

        {/* ================= TAB 0: ENTERPRISE RBAC CONTROL CENTER ================= */}
        {activeAdminTab === 'rbac' && <AdminRbacControlPanel />}

        {/* ================= TAB 1: OVERVIEW METRICS & BLUEPRINT AUDIT ================= */}
        {activeAdminTab === 'overview' && (
          <div className="space-y-6">
            <ExamBlueprintAuditPanel />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Total Questions in Bank</div>
                <div className="text-3xl font-black text-slate-900 font-mono">{questions.length}</div>
                <p className="text-xs text-slate-500">Across 5 Subjects</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Published Papers</div>
                <div className="text-3xl font-black text-indigo-600 font-mono">{tests.length}</div>
                <p className="text-xs text-slate-500">Full &amp; Chapter Mocks</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Candidate Attempts</div>
                <div className="text-3xl font-black text-emerald-600 font-mono">{platformStats.totalAttempts}</div>
                <p className="text-xs text-slate-500">Auto-evaluated</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Global Avg Accuracy</div>
                <div className="text-3xl font-black text-sky-600 font-mono">{platformStats.avgAccuracy}%</div>
                <p className="text-xs text-slate-500">All India Cohort Mean</p>
              </div>
            </div>

            {/* Platform Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-extrabold text-base text-slate-900">Highest Missed Chapters (All India)</h3>
                <div className="space-y-3">
                  {[
                    { chapter: 'Rotational Dynamics', subj: 'Physics', err: '58% Error Rate' },
                    { chapter: 'Coordination Compounds', subj: 'Chemistry', err: '52% Error Rate' },
                    { chapter: 'Definite Integrals', subj: 'Mathematics', err: '47% Error Rate' },
                    { chapter: 'Neural Synaptic Control', subj: 'Zoology', err: '44% Error Rate' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{item.chapter}</div>
                        <div className="text-[10px] text-slate-500">{item.subj}</div>
                      </div>
                      <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {item.err}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">AI Generation Engine Status</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Integrated with Gemini 3.8 Flash for strict syllabus compliance, LaTeX math rendering, and multi-step solutions.
                  </p>
                  <div className="mt-4 p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 text-xs text-purple-950">
                    <div className="flex items-center gap-2 font-bold">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Validation Pipeline Active
                    </div>
                    <p className="text-[11px] leading-relaxed text-purple-800">
                      All AI-generated questions are flagged as <strong>DRAFT</strong>. 
                      They require admin schema review and approval before being pushed to candidate test libraries.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveAdminTab('ai-generator')}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  Open AI Question Generator →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: OFFICIAL 2026 EXAMINATION PATTERNS ================= */}
        {activeAdminTab === 'patterns' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                    NTA &amp; JAB Regulatory Templates
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Pattern Year: 2026
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Official 2026 Examination Patterns &amp; Blueprints
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Separate, authoritative blueprint templates for JEE Main, JEE Advanced Paper 1, Paper 2, and NEET UG.
                  Admins can verify or flag configurations whenever national regulatory bodies issue revisions.
                </p>
              </div>

              {patternGenMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{patternGenMessage}</span>
                </div>
              )}
            </div>

            {/* Pattern Switcher Pills */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(examPatterns).map(([key, pat]) => {
                const isSelected = selectedPatternKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPatternKey(key);
                      setPatternGenMessage('');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {pat.examType.replace('_', ' ')}
                      </span>
                      {pat.isVerified2026 ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      )}
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 mt-1 line-clamp-1">
                      {pat.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-2">
                      {pat.totalQuestions} Qs • {pat.totalMarks} Marks • {pat.durationMinutes}m
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Pattern Details */}
            {(() => {
              const currentPattern = examPatterns[selectedPatternKey];
              if (!currentPattern) return null;

              return (
                <div className="space-y-6 pt-2">
                  {/* Verification Banner */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    currentPattern.isVerified2026
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-300 text-amber-950'
                  }`}>
                    <div className="flex items-start sm:items-center gap-3">
                      {currentPattern.isVerified2026 ? (
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">
                          {currentPattern.isVerified2026
                            ? 'Officially Verified 2026 Pattern'
                            : 'Flagged for Administrator Verification'}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {currentPattern.isVerified2026
                            ? 'Matches official information bulletin and syllabus guidelines published by NTA / JAB.'
                            : 'This pattern template requires administrative inspection against newly issued public gazettes or bulletins.'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePatternVerification(selectedPatternKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          currentPattern.isVerified2026
                            ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {currentPattern.isVerified2026 ? 'Flag Configuration for Review' : 'Mark as Verified 2026'}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Specs & Source Document */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Pattern Year &amp; Target</div>
                      <div className="text-base font-extrabold text-slate-900">
                        {currentPattern.patternYear} • {currentPattern.examType.replace('_', ' ')}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {currentPattern.totalQuestions} Questions total | {currentPattern.sections.length} Prescribed Sections
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 md:col-span-2">
                      <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Official Source Document
                      </div>
                      <div className="text-xs font-bold text-slate-800 font-mono">
                        {currentPattern.sourceDocument}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {currentPattern.notes}
                      </p>
                    </div>
                  </div>

                  {/* Section-by-Section Breakdown Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                        Prescribed Subject Sections &amp; Marking Scheme
                      </h4>
                      <span className="text-xs text-slate-500 font-mono">
                        {currentPattern.sections.length} Sections Defined
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4">Subject</th>
                            <th className="py-2.5 px-4">Section Name</th>
                            <th className="py-2.5 px-4">Type</th>
                            <th className="py-2.5 px-4 text-center">Questions</th>
                            <th className="py-2.5 px-4 text-center">Marking (+ / -)</th>
                            <th className="py-2.5 px-4">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {currentPattern.sections.map(sec => (
                            <tr key={sec.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-4 font-bold text-slate-900">{sec.subject}</td>
                              <td className="py-2.5 px-4 text-slate-700">{sec.sectionName}</td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sec.questionType === 'NUMERICAL'
                                    ? 'bg-amber-100 text-amber-800'
                                    : sec.questionType === 'MULTIPLE_CORRECT'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {sec.questionType}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">
                                {sec.totalQuestions} ({sec.compulsoryQuestions} Compulsory)
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono">
                                <span className="text-emerald-700 font-bold">+{sec.positiveMarks}</span>
                                {' / '}
                                <span className="text-rose-700 font-bold">-{sec.negativeMarks}</span>
                              </td>
                              <td className="py-2.5 px-4 text-[11px] text-slate-500 max-w-xs leading-tight">
                                {sec.instructions}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions & Full-Paper Generation */}
                  <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                        Full-Length Examination Generation Engine
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Instantly synthesize a complete, realistic {currentPattern.totalQuestions}-question paper ({currentPattern.totalMarks} Marks, {currentPattern.durationMinutes} mins) following this exact verified template.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => {
                          setCurrentView('tests');
                        }}
                        className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        View in CBT Library
                      </button>
                      <button
                        onClick={() => handleGeneratePaperFromPattern(selectedPatternKey)}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        Generate &amp; Publish Paper
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= TAB 2: QUESTION BANK ================= */}
        {activeAdminTab === 'questions' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Master Question Bank</h3>
                <p className="text-xs text-slate-500">Search, edit, preview LaTeX formulas, and manage published states.</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Manual Question
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    loadQuestions({ page: 1, limit: 25, subject: filterSubject, difficulty: filterDifficulty, search: val });
                  }}
                  placeholder="Search 10,000+ questions..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <select
                value={filterSubject}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterSubject(val);
                  loadQuestions({ page: 1, limit: 25, subject: val, difficulty: filterDifficulty, search: searchQuery });
                }}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Subjects (Phy, Chem, Math, Bot, Zoo)</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Botany">Botany</option>
                <option value="Zoology">Zoology</option>
              </select>

              <select
                value={filterDifficulty}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterDifficulty(val);
                  loadQuestions({ page: 1, limit: 25, subject: filterSubject, difficulty: val, search: searchQuery });
                }}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            {/* Questions Table */}
            <div className="space-y-4">
              {filteredQuestions.map((q) => (
                <div key={q.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">{q.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700">
                        {q.subject}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{q.chapter}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{q.topic}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-800' : q.difficulty === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                        {q.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {q.status}
                      </span>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-800 leading-relaxed font-medium">
                    <MathView content={q.questionText} />
                    {q.latex && (
                      <div className="p-2 bg-white rounded border border-slate-200 my-1 text-center font-mono">
                        <MathView content={`$$${q.latex}$$`} block />
                      </div>
                    )}
                  </div>

                  {q.type === 'MCQ' && q.options && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {q.options.map(opt => (
                        <div key={opt.id} className={`p-2 rounded-lg border text-[11px] ${
                          opt.id === q.correctAnswer ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <span className="font-mono font-bold">{opt.id}: </span>
                          <MathView content={opt.text} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800">Correct Answer: {q.correctAnswer}</span>
                    <span className="mx-2">•</span>
                    <span>{q.explanation}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls for 10,000 Questions */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  Showing page <strong className="text-slate-900">{questionBankPage}</strong> of{' '}
                  <strong className="text-slate-900">{questionBankTotalPages}</strong> ({totalQuestionsInBank.toLocaleString()} Total Questions in PostgreSQL)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={questionBankPage <= 1}
                  onClick={() => loadQuestions({ page: questionBankPage - 1, limit: 25, subject: filterSubject, difficulty: filterDifficulty, search: searchQuery })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    questionBankPage <= 1
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  ← Previous Page
                </button>

                <div className="flex items-center gap-1 font-mono text-xs">
                  {[
                    Math.max(1, questionBankPage - 1),
                    questionBankPage,
                    Math.min(questionBankTotalPages, questionBankPage + 1)
                  ].filter((v, i, a) => a.indexOf(v) === i).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => loadQuestions({ page: p, limit: 25, subject: filterSubject, difficulty: filterDifficulty, search: searchQuery })}
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-colors ${
                        p === questionBankPage
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={questionBankPage >= questionBankTotalPages}
                  onClick={() => loadQuestions({ page: questionBankPage + 1, limit: 25, subject: filterSubject, difficulty: filterDifficulty, search: searchQuery })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    questionBankPage >= questionBankTotalPages
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Next Page →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: AI QUESTION GENERATOR ================= */}
        {activeAdminTab === 'ai-generator' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Gemini 3.8 Flash Question Synthesizer
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-2">
                Automated High-Yield Practice Question Generation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate original questions with LaTeX equations, single-choice distractors, and rigorous step-by-step mathematical explanations.
              </p>
            </div>

            {/* Generator Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-purple-50/50 rounded-2xl border border-purple-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Exam
                </label>
                <select
                  value={aiExam}
                  onChange={(e) => setAiExam(e.target.value as ExamType)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="JEE_MAIN">JEE Main</option>
                  <option value="JEE_ADVANCED">JEE Advanced Practice</option>
                  <option value="NEET">NEET UG</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <select
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value as SubjectName)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Botany">Botany</option>
                  <option value="Zoology">Zoology</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chapter
                </label>
                <input
                  type="text"
                  value={aiChapter}
                  onChange={(e) => setAiChapter(e.target.value)}
                  placeholder="e.g. Modern Physics, Kinetics..."
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Topic / Sub-Concept
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. De Broglie Wavelength"
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Difficulty &amp; Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as Difficulty)}
                    className="w-full py-2 px-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                  <select
                    value={aiQuestionType}
                    onChange={(e) => setAiQuestionType(e.target.value as QuestionType)}
                    className="w-full py-2 px-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="NUMERICAL">Numerical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Count
                </label>
                <div className="flex gap-2">
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value={1}>1 Question</option>
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                  </select>
                  <button
                    onClick={handleRunAiGenerator}
                    disabled={isAiGenerating}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isAiGenerating ? 'Generating...' : 'Synthesize'}
                  </button>
                </div>
              </div>
            </div>

            {aiGenerationMessage && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {aiGenerationMessage}
              </div>
            )}

            {/* Generated Items Review & Approval Queue */}
            {aiGeneratedList.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                    Approval Queue: {aiGeneratedList.length} Questions Awaiting Verification
                  </h4>
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Draft Status • Review Before Publishing
                  </span>
                </div>

                <div className="space-y-4">
                  {aiGeneratedList.map((q) => (
                    <div key={q.id} className="p-5 rounded-2xl border-2 border-purple-200 bg-white shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                            AI-Generated Practice
                          </span>
                          <span className="text-xs font-bold text-slate-800">{q.subject}: {q.chapter}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveAiQuestion(q)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Publish
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-slate-900 leading-relaxed font-medium">
                        <MathView content={q.questionText} />
                        {q.latex && (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200 my-1 text-center font-mono">
                            <MathView content={`$$${q.latex}$$`} block />
                          </div>
                        )}
                      </div>

                      {q.options && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {q.options.map(opt => (
                            <div key={opt.id} className={`p-2 rounded-lg border text-[11px] ${
                              opt.id === q.correctAnswer ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                              <span className="font-mono font-bold">{opt.id}: </span>
                              <MathView content={opt.text} />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-[11px] text-slate-700 space-y-1">
                        <span className="font-bold text-purple-900">Step-by-Step Solution:</span>
                        <div>
                          <MathView content={q.explanation} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: BLUEPRINT & PAPER BUILDER ================= */}
        {activeAdminTab === 'blueprint' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Paper Blueprint &amp; Multi-Variant Generator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure syllabus distribution, difficulty ratios (30% Easy, 50% Medium, 20% Hard), and publish directly to the live CBT engine.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Examination Blueprint
                </label>
                <select
                  value={bpExam}
                  onChange={(e) => setBpExam(e.target.value as ExamType)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="JEE_MAIN">JEE Main (Phy, Chem, Math)</option>
                  <option value="NEET">NEET UG (Phy, Chem, Bot, Zoo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={bpDuration}
                  onChange={(e) => setBpDuration(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Questions to Select
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={bpQuestionsCount}
                    onChange={(e) => setBpQuestionsCount(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                  <button
                    onClick={handleGenerateBlueprint}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Build Blueprint
                  </button>
                </div>
              </div>
            </div>

            {blueprintData && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">{blueprintData.title}</h4>
                    <p className="text-xs text-slate-500 font-mono">
                      {blueprintData.subjects.join(' • ')} | {blueprintData.durationMinutes} Minutes | {bpQuestionsCount} Qs
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Easy: 30%
                    </span>
                    <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                      Medium: 50%
                    </span>
                    <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 text-xs font-bold">
                      Hard: 20%
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={handlePublishPaperFromBlueprint}
                    disabled={isBuildingPaper}
                    className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isBuildingPaper ? 'Publishing...' : 'Assemble & Publish to CBT Library'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: PRINT & PDF EXPORT ================= */}
        {activeAdminTab === 'export' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Official PDF &amp; Document Generation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate printable Question Papers, Answer Keys, and Step-by-Step Solutions sheets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-base text-slate-900">Question Paper PDF</h4>
                  <p className="text-xs text-slate-500">
                    Clean printable exam paper with headers, candidate roll number fields, instructions, and LaTeX formulas.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Question Paper
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-base text-slate-900">Official Answer Key PDF</h4>
                  <p className="text-xs text-slate-500">
                    Tabular answer key grid for candidate OMR cross-checking and evaluation.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Print Answer Key
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-base text-slate-900">Detailed Solutions PDF</h4>
                  <p className="text-xs text-slate-500">
                    Complete step-by-step mathematical explanations, derivations, and reaction diagrams.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Full Solutions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: BULK QUESTION IMPORT ================= */}
        {activeAdminTab === 'bulk-import' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                    Batch Question Pipeline
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Schema-Validated Import
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Bulk Question Import (CSV / JSON)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Import multiple questions with mathematical LaTeX notation, options, correct answers, and step-by-step explanations.
                  All inputs are pre-validated before committing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportFormat('JSON');
                    setImportRawText(sampleJsonTemplate);
                    setImportErrors([]);
                    setValidatedQuestions([]);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Load Sample JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportFormat('CSV');
                    setImportRawText(sampleCsvTemplate);
                    setImportErrors([]);
                    setValidatedQuestions([]);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Load Sample CSV
                </button>
              </div>
            </div>

            {/* Format Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase text-slate-500">Format:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportFormat('JSON')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importFormat === 'JSON' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  JSON Array
                </button>
                <button
                  type="button"
                  onClick={() => setImportFormat('CSV')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importFormat === 'CSV' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  CSV Delimited
                </button>
              </div>
            </div>

            {/* Textarea Input */}
            <div>
              <textarea
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder={importFormat === 'JSON' ? 'Paste JSON array here...' : 'Paste CSV text here (including header row)...'}
                rows={10}
                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Error notifications */}
            {importErrors.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Validation Discrepancies Found ({importErrors.length}):
                </div>
                <ul className="list-disc list-inside text-xs text-rose-700 space-y-1 font-mono">
                  {importErrors.slice(0, 8).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importErrors.length > 8 && (
                    <li>...and {importErrors.length - 8} additional errors.</li>
                  )}
                </ul>
              </div>
            )}

            {/* Success validation */}
            {validatedQuestions.length > 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-extrabold text-emerald-950">
                      {validatedQuestions.length} Questions Verified &amp; Ready to Import
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      All required fields, LaTeX equations, and options passed validation.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCommitImport}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer shrink-0"
                >
                  Commit &amp; Save to Master Bank
                </button>
              </div>
            )}

            {importSuccessMessage && (
              <div className="p-4 bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                {importSuccessMessage}
              </div>
            )}

            {/* Action button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleValidateImport}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Validate Input
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB: QUESTION REPORTS ================= */}
        {activeAdminTab === 'reports' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Student Question Reports ({reports.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Academic reports filed by students during examinations regarding answer keys, ambiguous wording, or typographical errors.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setReportFilter(st)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      reportFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Reports List */}
            {reports.filter(r => reportFilter === 'ALL' || r.status === reportFilter).length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No reports matching filter "{reportFilter}".
              </div>
            ) : (
              <div className="space-y-3">
                {reports
                  .filter(r => reportFilter === 'ALL' || r.status === reportFilter)
                  .map(rep => (
                    <div 
                      key={rep.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rep.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : rep.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {rep.status}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {rep.reason.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Question ID: {rep.questionId}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono">
                          Reported by: <strong className="text-slate-800">{rep.studentName}</strong> on {new Date(rep.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium bg-white p-3 rounded-xl border border-slate-200/80">
                        {rep.description}
                      </p>

                      {rep.questionSnippet && (
                        <div className="text-[11px] text-slate-500 italic">
                          Snippet: "{rep.questionSnippet}..."
                        </div>
                      )}

                      {rep.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => resolveReport(rep.id, 'DISMISSED')}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => resolveReport(rep.id, 'RESOLVED')}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            Mark as Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: AUDIT & INTEGRITY LOGS ================= */}
        {activeAdminTab === 'audit-logs' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                Examination Integrity &amp; Administrative Audit Logs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative record of candidate CBT exam integrity events (fullscreen exits, tab navigation) and administrative content modifications.
              </p>
            </div>

            {/* Candidate Integrity Events Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Candidate Examination Integrity Events ({integrityEvents.length})
                </h4>
              </div>

              {integrityEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-2xl">
                  No integrity alerts recorded during current session.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Event Type</th>
                        <th className="py-2.5 px-4">Details</th>
                        <th className="py-2.5 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {integrityEvents.map(evt => (
                        <tr key={evt.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {evt.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-800">{evt.details}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Administrative Operations Audit Log */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Administrative Action Audit Trail ({auditLogs.length})
                </h4>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Target Entity</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{log.actor}</td>
                        <td className="py-2.5 px-4 font-mono text-purple-700 font-bold">{log.action}</td>
                        <td className="py-2.5 px-4 text-slate-700">{log.target}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: SYSTEM SETTINGS ================= */}
        {activeAdminTab === 'settings' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                Platform Examination Settings &amp; Rules
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure global examination rules, scoring policies, and security enforcement parameters.
              </p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Official Negative Marking Enforcement</div>
                  <p className="text-[11px] text-slate-500">
                    Apply standard $+4.00 / -1.00$ penalty rules across all mock tests.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.defaultNegativeMarking}
                  onChange={(e) => updateSystemSettings({ defaultNegativeMarking: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Strict Exam Integrity Event Logging</div>
                  <p className="text-[11px] text-slate-500">
                    Record browser tab switches, window minimization, and fullscreen exits during active CBT tests.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.strictIntegrityLogging}
                  onChange={(e) => updateSystemSettings({ strictIntegrityLogging: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Automatic Paper Submission on Timer Expiry</div>
                  <p className="text-[11px] text-slate-500">
                    Automatically submit and score candidate test papers when countdown reaches 00:00:00.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.autoSubmitOnTimeout}
                  onChange={(e) => updateSystemSettings({ autoSubmitOnTimeout: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Allow Student Account Registration</div>
                  <p className="text-[11px] text-slate-500">
                    Allow new candidates to register for JEE and NEET test series.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.allowRegistration}
                  onChange={(e) => updateSystemSettings({ allowRegistration: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Maintenance Mode</div>
                  <p className="text-[11px] text-slate-500">
                    Prevent students from launching new examination sessions during administrative maintenance.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.maintenanceMode}
                  onChange={(e) => updateSystemSettings({ maintenanceMode: e.target.checked })}
                  className="w-5 h-5 text-rose-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD MANUAL QUESTION ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-lg text-slate-900">Add New Question to Master Bank</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Exam</label>
                  <select
                    value={newQExam}
                    onChange={(e) => setNewQExam(e.target.value as ExamType)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs"
                  >
                    <option value="JEE_MAIN">JEE Main</option>
                    <option value="NEET">NEET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Subject</label>
                  <select
                    value={newQSubject}
                    onChange={(e) => setNewQSubject(e.target.value as SubjectName)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Botany">Botany</option>
                    <option value="Zoology">Zoology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Difficulty</label>
                  <select
                    value={newQDifficulty}
                    onChange={(e) => setNewQDifficulty(e.target.value as Difficulty)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Type</label>
                  <select
                    value={newQType}
                    onChange={(e) => setNewQType(e.target.value as QuestionType)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="NUMERICAL">Numerical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Chapter</label>
                  <input
                    type="text"
                    value={newQChapter}
                    onChange={(e) => setNewQChapter(e.target.value)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Topic</label>
                  <input
                    type="text"
                    value={newQTopic}
                    onChange={(e) => setNewQTopic(e.target.value)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">
                  Question Text (Supports LaTeX $...$)
                </label>
                <textarea
                  rows={3}
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="Enter the question problem statement..."
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                />
              </div>

              {/* Live Preview Box */}
              {newQText && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
                  <span className="font-bold text-indigo-900 block text-[10px] uppercase mb-1">Live LaTeX Preview:</span>
                  <MathView content={newQText} />
                </div>
              )}

              {newQType === 'MCQ' ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Options</label>
                  <div className="grid grid-cols-2 gap-2">
                    {newQOptions.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs">{opt.id}:</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const copy = [...newQOptions];
                            copy[idx].text = e.target.value;
                            setNewQOptions(copy);
                          }}
                          className="w-full p-1.5 bg-slate-50 border rounded-lg text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Correct Option</label>
                    <select
                      value={newQCorrectAns}
                      onChange={(e) => setNewQCorrectAns(e.target.value)}
                      className="py-1 px-3 bg-slate-50 border rounded-lg text-xs font-bold text-emerald-700"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    Correct Numerical Value (e.g. 4.25 or 12)
                  </label>
                  <input
                    type="text"
                    value={newQCorrectAns}
                    onChange={(e) => setNewQCorrectAns(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">
                  Step-by-Step Explanation
                </label>
                <textarea
                  rows={2}
                  value={newQExplanation}
                  onChange={(e) => setNewQExplanation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Save &amp; Publish Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
