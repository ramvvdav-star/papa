import React, { useState, useEffect } from 'react';
import { useExam } from '../context/ExamContext';
import { MathView } from '../components/MathView';
import {
  ShieldCheck,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Download,
  Printer,
  FileText,
  ArrowRight,
  AlertTriangle,
  FileCheck,
  Upload,
  ShieldAlert,
  Check,
  Lock,
  Database,
} from 'lucide-react';
import {
  Question,
  ExamType,
  SubjectName,
  Difficulty,
  QuestionType,
  TestDefinition,
  CourseType,
} from '../types/exam';
import { OFFICIAL_EXAM_PATTERNS, OFFICIAL_EXAM_BLUEPRINTS } from '../data/officialExamPatterns';
import {
  selectQuestionsForBlueprint,
  generateUniqueTestId,
  validateGeneratedTestQuestions,
  buildTestQuestionMappings,
} from '../data/questionBankEngine';
import { AdminRbacControlPanel } from '../components/AdminRbacControlPanel';
import { ExamBlueprintAuditPanel } from '../components/ExamBlueprintAuditPanel';

export const AdminDashboardView: React.FC = () => {
  const {
    questions,
    tests,
    addQuestion,
    deleteQuestion,
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
    logAdminAction,
    studyMaterials,
    createStudyMaterial,
    deleteStudyMaterial,
    fetchRlsSecurityAudit,
  } = useExam();

  const [activeAdminTab, setActiveAdminTab] = useState<
    | 'rbac'
    | 'rls-security'
    | 'overview'
    | 'patterns'
    | 'questions'
    | 'study-materials'
    | 'bulk-import'
    | 'reports'
    | 'audit-logs'
    | 'settings'
    | 'export'
  >('rbac');
  const [examPatterns, setExamPatterns] = useState(OFFICIAL_EXAM_PATTERNS);
  const [selectedPatternKey, setSelectedPatternKey] = useState<string>('JEE_MAIN_2026');
  const [patternGenMessage, setPatternGenMessage] = useState<string>('');

  // RLS Audit state
  const [rlsAuditData, setRlsAuditData] = useState<any>(null);
  const [loadingRlsAudit, setLoadingRlsAudit] = useState(false);

  useEffect(() => {
    if (activeAdminTab === 'rls-security' && !rlsAuditData) {
      setLoadingRlsAudit(true);
      fetchRlsSecurityAudit()
        .then((data: any) => {
          if (data) setRlsAuditData(data);
        })
        .finally(() => setLoadingRlsAudit(false));
    }
  }, [activeAdminTab, rlsAuditData, fetchRlsSecurityAudit]);

  // Study Material Form State
  const [smCourse, setSmCourse] = useState<CourseType>('JEE');
  const [smSubject, setSmSubject] = useState<SubjectName>('Physics');
  const [smChapter, setSmChapter] = useState('Electrostatics');
  const [smTitle, setSmTitle] = useState('');
  const [smDesc, setSmDesc] = useState('');
  const [smType, setSmType] = useState<'NOTES' | 'FORMULA_SHEET' | 'SYLLABUS' | 'PYQ_BOOKLET'>('NOTES');
  const [smContent, setSmContent] = useState('');
  const [smFilterCourse, setSmFilterCourse] = useState<string>('ALL');
  const [smStatusMsg, setSmStatusMsg] = useState('');

  // Bulk Import state (Authorized Admin / Teacher only)
  const [importFormat, setImportFormat] = useState<'JSON' | 'CSV'>('JSON');
  const [importRawText, setImportRawText] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [validatedQuestions, setValidatedQuestions] = useState<Question[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string>('');

  // Reports filter state
  const [reportFilter, setReportFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('ALL');

  // ---------------- QUESTIONS BANK STATE ----------------
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourseExam, setFilterCourseExam] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');

  // Controlled Question Creation Workflow Modal State (Section 14)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQCourse, setNewQCourse] = useState<CourseType>('JEE');
  const [newQExam, setNewQExam] = useState<ExamType>('JEE_MAIN');
  const [newQSubject, setNewQSubject] = useState<SubjectName>('Physics');
  const [newQChapter, setNewQChapter] = useState('Electrostatics');
  const [newQTopic, setNewQTopic] = useState('Capacitors & Dielectrics');
  const [newQDifficulty, setNewQDifficulty] = useState<Difficulty>('MEDIUM');
  const [newQType, setNewQType] = useState<QuestionType>('MCQ');
  const [newQText, setNewQText] = useState('');
  const [newQLatex, setNewQLatex] = useState('');
  const [newQOptions, setNewQOptions] = useState([
    { id: 'A' as const, text: 'Option A' },
    { id: 'B' as const, text: 'Option B' },
    { id: 'C' as const, text: 'Option C' },
    { id: 'D' as const, text: 'Option D' },
  ]);
  const [newQCorrectAns, setNewQCorrectAns] = useState('A');
  const [newQExplanation, setNewQExplanation] = useState('Detailed step-by-step derivation.');
  const [newQValidationError, setNewQValidationError] = useState('');

  // Allowed subjects for selected course in Question Creation modal
  const allowedSubjectsForCourse: SubjectName[] =
    newQCourse === 'NEET'
      ? ['Physics', 'Chemistry', 'Botany', 'Zoology']
      : ['Physics', 'Chemistry', 'Mathematics'];

  const handleCourseSelectInModal = (course: CourseType) => {
    setNewQCourse(course);
    if (course === 'NEET') {
      setNewQExam('NEET');
      if (newQSubject === 'Mathematics') setNewQSubject('Botany');
    } else if (course === 'JEE_ADVANCED') {
      setNewQExam('JEE_ADVANCED');
      if (newQSubject === 'Botany' || newQSubject === 'Zoology') setNewQSubject('Mathematics');
    } else {
      setNewQExam('JEE_MAIN');
      if (newQSubject === 'Botany' || newQSubject === 'Zoology') setNewQSubject('Mathematics');
    }
  };

  // Filtered Questions Bank
  const filteredQuestions = questions.filter((q) => {
    if (filterCourseExam !== 'ALL' && q.examType !== filterCourseExam && q.courseType !== filterCourseExam) {
      return false;
    }
    if (filterSubject !== 'ALL' && q.subject !== filterSubject) return false;
    if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      return (
        q.questionText.toLowerCase().includes(s) ||
        q.chapter.toLowerCase().includes(s) ||
        q.topic.toLowerCase().includes(s) ||
        (q.questionId || q.id).toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Controlled Question Creation Workflow (Section 14: Validate -> Assign Course -> Subject -> Chapter -> Topic -> Difficulty -> Save)
  const handleSaveQuestion = async () => {
    setNewQValidationError('');
    if (!newQText.trim()) {
      setNewQValidationError('Question statement is required.');
      return;
    }
    if (!newQChapter.trim() || !newQTopic.trim()) {
      setNewQValidationError('Both Chapter and Topic must be assigned before saving.');
      return;
    }
    if (!allowedSubjectsForCourse.includes(newQSubject)) {
      setNewQValidationError(
        `Subject "${newQSubject}" is not valid for course "${newQCourse}".`
      );
      return;
    }
    if (newQType === 'MCQ' && newQOptions.some((o) => !o.text.trim())) {
      setNewQValidationError('All four MCQ options (A, B, C, D) must be non-empty.');
      return;
    }
    if (!newQCorrectAns.trim()) {
      setNewQValidationError('Correct answer key is required.');
      return;
    }

    const courseIdMap: Record<CourseType, string> = {
      JEE: 'course-jee-main',
      JEE_ADVANCED: 'course-jee-advanced',
      NEET: 'course-neet-ug',
    };

    await addQuestion({
      courseId: courseIdMap[newQCourse],
      courseType: newQCourse,
      examType: newQExam,
      subject: newQSubject,
      chapter: newQChapter.trim(),
      topic: newQTopic.trim(),
      difficulty: newQDifficulty,
      type: newQType,
      questionText: newQText.trim(),
      latex: newQLatex.trim() || undefined,
      options: newQType === 'MCQ' ? newQOptions : undefined,
      correctAnswer: newQCorrectAns.trim(),
      explanation: newQExplanation.trim() || 'Verified step-by-step solution.',
      positiveMarks: 4,
      negativeMarks: newQType === 'NUMERICAL' ? 0 : 1,
      source: 'ADMIN',
      status: 'APPROVED',
    });

    setShowAddModal(false);
    setNewQText('');
    setNewQLatex('');
  };

  const handleCreateStudyMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smTitle.trim() || !smContent.trim()) return;
    const created = await createStudyMaterial({
      courseType: smCourse,
      subject: smSubject,
      chapter: smChapter,
      title: smTitle.trim(),
      description: smDesc.trim() || `${smCourse} ${smSubject} Study Resource`,
      resourceType: smType,
      contentSummary: smContent.trim(),
    });
    if (created) {
      setSmTitle('');
      setSmDesc('');
      setSmContent('');
      setSmStatusMsg(`Published "${created.title}" to ${created.courseType} Study Material Library.`);
      setTimeout(() => setSmStatusMsg(''), 4000);
    }
  };

  const togglePatternVerification = (patternKey: string) => {
    setExamPatterns((prev) => ({
      ...prev,
      [patternKey]: {
        ...prev[patternKey],
        isVerified2026: !prev[patternKey].isVerified2026,
      },
    }));
  };

  const handleGeneratePaperFromPattern = async (patternKey: string) => {
    try {
      setPatternGenMessage('Selecting unused/least-used unique questions from controlled course question bank...');
      const blueprint =
        OFFICIAL_EXAM_BLUEPRINTS[patternKey] ||
        (patternKey.startsWith('JEE_ADVANCED')
          ? OFFICIAL_EXAM_BLUEPRINTS.JEE_ADVANCED_2026_PAPER1
          : patternKey === 'NEET_UG_2026'
          ? OFFICIAL_EXAM_BLUEPRINTS.NEET_UG_2026
          : OFFICIAL_EXAM_BLUEPRINTS.JEE_MAIN_2026);

      const newTestId = generateUniqueTestId(`test_${blueprint.exam.toLowerCase()}`);
      const notices: string[] = [];
      const selectedQuestions = selectQuestionsForBlueprint(questions, blueprint, newTestId, {
        strictCount: true,
        onDistributionAdjusted: (msg) => notices.push(msg),
      });

      validateGeneratedTestQuestions(selectedQuestions);
      const snapshotIds = selectedQuestions.map((q) => q.questionId || q.id);
      const testQuestions = buildTestQuestionMappings(newTestId, selectedQuestions, 1, 'Set A');

      const created = await publishTest({
        id: newTestId,
        testId: newTestId,
        title: `${blueprint.name} • Fresh Set (${newTestId})`,
        subtitle: `Authentic ${selectedQuestions.length}-question paper assembled from verified ${blueprint.courseType || blueprint.exam} question bank`,
        courseId: blueprint.courseId || (blueprint.exam === 'NEET' ? 'course_neet' : blueprint.exam === 'JEE_ADVANCED' ? 'course_jee_adv' : 'course_jee'),
        courseType: blueprint.courseType || (blueprint.exam === 'NEET' ? 'NEET' : blueprint.exam === 'JEE_ADVANCED' ? 'JEE_ADVANCED' : 'JEE'),
        examType: blueprint.exam,
        testType: patternKey.includes('PAPER2')
          ? 'JEE_ADVANCED_PAPER2'
          : patternKey.includes('PAPER1')
          ? 'JEE_ADVANCED_PAPER1'
          : 'FULL_MOCK',
        patternYear: 2026,
        blueprintId: blueprint.id,
        patternSource: `${blueprint.sourceDocument} • Snapshot ${newTestId}`,
        durationMinutes: blueprint.durationMinutes,
        totalMarks: blueprint.totalMarks,
        positiveMarks: blueprint.markingScheme.mcq.positive,
        negativeMarks: blueprint.markingScheme.mcq.negative,
        subjects: blueprint.subjects,
        questionsCount: selectedQuestions.length,
        difficulty: 'MEDIUM',
        difficultyDistributionNotice: notices.length > 0 ? notices.join(' ') : undefined,
        syllabus: blueprint.subjects.map((s) => `${s}: Complete ${blueprint.year} Syllabus`),
        description: `Freshly generated ${selectedQuestions.length}-question mock paper with 100% unique questionIds and saved test_questions snapshot.`,
        published: true,
        sections: blueprint.sections,
        questions: selectedQuestions,
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
        createdAt: new Date().toISOString(),
      });
      setPatternGenMessage(
        `Published "${created.title}" (${created.courseType}) with ${created.questionsCount} unique questions (0 duplicates)!`
      );
      setActiveTest(created);
    } catch (err: any) {
      setPatternGenMessage(
        err?.message ||
          'Not enough unique questions are available for this test. Please add more questions or reduce the number of questions.'
      );
    }
  };

  const sampleJsonTemplate = `[
  {
    "courseType": "JEE",
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
    "explanation": "Using Coulomb's law: $F = 9\\\\times 10^9 \\\\times \\\\frac{9\\\\times 10^{-12}}{0.01} = 8.1\\\\text{ N}$.",
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
          errors.push(
            `Item ${line}: Invalid subject "${item.subject}". Allowed: Physics, Chemistry, Mathematics, Botany, Zoology.`
          );
        }
        if (!item.chapter || !item.chapter.trim()) {
          errors.push(`Item ${line}: Missing required "chapter".`);
        }
        const examType: ExamType = item.examType || (item.courseType === 'NEET' ? 'NEET' : 'JEE_MAIN');
        const courseType: CourseType =
          examType === 'NEET' ? 'NEET' : examType === 'JEE_ADVANCED' ? 'JEE_ADVANCED' : 'JEE';
        if (courseType === 'NEET' && item.subject === 'Mathematics') {
          errors.push(`Item ${line}: NEET course cannot contain Mathematics questions.`);
        }
        if (courseType !== 'NEET' && (item.subject === 'Botany' || item.subject === 'Zoology')) {
          errors.push(`Item ${line}: JEE course cannot contain Botany/Zoology questions.`);
        }

        if (errors.length === 0) {
          validList.push({
            id: `IMP-${Date.now()}-${idx}`,
            courseId:
              courseType === 'NEET'
                ? 'course-neet-ug'
                : courseType === 'JEE_ADVANCED'
                ? 'course-jee-advanced'
                : 'course-jee-main',
            courseType,
            examType,
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
            status: 'APPROVED',
            createdAt: new Date().toISOString(),
          });
        }
      });
    } else {
      const lines = importRawText
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length < 2) {
        setImportErrors(['CSV must have a header row and at least one data row.']);
        return;
      }

      const rows = lines.slice(1);
      rows.forEach((row, idx) => {
        const line = idx + 2;
        const cols = row.split(',').map((c) => c.trim());
        if (cols.length < 12) {
          errors.push(`Row ${line}: Expected at least 12 columns, found ${cols.length}.`);
          return;
        }

        const [
          examTypeRaw,
          subject,
          chapter,
          topic,
          difficulty,
          type,
          questionText,
          optA,
          optB,
          optC,
          optD,
          correctAns,
          ...expParts
        ] = cols;
        const explanation = expParts.join(',') || 'Verified explanation.';
        const examType: ExamType =
          examTypeRaw === 'NEET'
            ? 'NEET'
            : examTypeRaw === 'JEE_ADVANCED'
            ? 'JEE_ADVANCED'
            : 'JEE_MAIN';
        const courseType: CourseType =
          examType === 'NEET' ? 'NEET' : examType === 'JEE_ADVANCED' ? 'JEE_ADVANCED' : 'JEE';

        if (!questionText) errors.push(`Row ${line}: Missing question text.`);
        if (!['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology'].includes(subject)) {
          errors.push(`Row ${line}: Invalid subject "${subject}".`);
        }
        if (!correctAns) errors.push(`Row ${line}: Missing correct answer.`);

        if (errors.length === 0) {
          validList.push({
            id: `CSV-${Date.now()}-${idx}`,
            courseId:
              courseType === 'NEET'
                ? 'course-neet-ug'
                : courseType === 'JEE_ADVANCED'
                ? 'course-jee-advanced'
                : 'course-jee-main',
            courseType,
            examType,
            subject: subject as SubjectName,
            chapter: chapter || 'General',
            topic: topic || 'Topic',
            difficulty: (difficulty as Difficulty) || 'MEDIUM',
            type: (type as QuestionType) || 'MCQ',
            questionText,
            options: [
              { id: 'A', text: optA || 'Option A' },
              { id: 'B', text: optB || 'Option B' },
              { id: 'C', text: optC || 'Option C' },
              { id: 'D', text: optD || 'Option D' },
            ],
            correctAnswer: correctAns.trim().toUpperCase(),
            explanation,
            positiveMarks: 4,
            negativeMarks: 1,
            source: 'IMPORTED',
            status: 'APPROVED',
            createdAt: new Date().toISOString(),
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
    setImportSuccessMessage(
      `Successfully imported ${validatedQuestions.length} course-tagged questions into the master question bank!`
    );
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
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800">
                Course Separation &amp; RLS Enforced
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              Examination Administration, Enrollments &amp; Question Bank
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage course enrollments (JEE / JEE Advanced / NEET), teacher course assignments, controlled question bank workflows, and PostgreSQL RLS policies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveAdminTab('rls-security')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Course Security &amp; RLS Audit
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Question (Controlled Workflow)
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveAdminTab('rbac')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'rbac'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Enrollments, Users, Teachers &amp; Batches
          </button>
          <button
            onClick={() => setActiveAdminTab('rls-security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'rls-security'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Course Separation &amp; RLS Security
          </button>
          <button
            onClick={() => setActiveAdminTab('questions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'questions'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Course Question Bank ({totalQuestionsInBank.toLocaleString()})
          </button>
          <button
            onClick={() => setActiveAdminTab('study-materials')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'study-materials'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Course Study Materials ({studyMaterials.length})
          </button>
          <button
            onClick={() => setActiveAdminTab('patterns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'patterns'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Official 2026 Patterns ({Object.keys(examPatterns).length})
          </button>
          <button
            onClick={() => setActiveAdminTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'overview'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Blueprint Audit &amp; Analytics
          </button>
          <button
            onClick={() => setActiveAdminTab('bulk-import')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'bulk-import'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Admin Question Import (CSV/JSON)
          </button>
          <button
            onClick={() => setActiveAdminTab('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'export'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Print &amp; PDF Export
          </button>
          <button
            onClick={() => setActiveAdminTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'reports'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Reports ({reports.filter((r) => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveAdminTab('audit-logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'audit-logs'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Security &amp; Audit Logs
          </button>
          <button
            onClick={() => setActiveAdminTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeAdminTab === 'settings'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            System Settings
          </button>
        </div>

        {/* ================= TAB: ENTERPRISE RBAC & ENROLLMENT CONTROL CENTER ================= */}
        {activeAdminTab === 'rbac' && <AdminRbacControlPanel />}

        {/* ================= TAB: COURSE SEPARATION & SUPABASE/POSTGRESQL RLS SECURITY ================= */}
        {activeAdminTab === 'rls-security' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Database className="w-3.5 h-3.5" />
                    Database &amp; API Course Isolation
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Live Course Access Matrix &amp; PostgreSQL Row-Level Security (RLS)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifies that JEE students can never read NEET questions/tests/results/materials and NEET students can never read JEE data at the database and API layers.
                </p>
              </div>
              <button
                onClick={() => {
                  setLoadingRlsAudit(true);
                  fetchRlsSecurityAudit()
                    .then((d: any) => {
                      if (d) setRlsAuditData(d);
                    })
                    .finally(() => setLoadingRlsAudit(false));
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0"
              >
                {loadingRlsAudit ? 'Verifying...' : 'Re-Verify Access Matrix'}
              </button>
            </div>

            {rlsAuditData && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Real-Time Server Authorization Matrix (Student → Enrollment → Course → Allowed Data)
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Student Account</th>
                          <th className="py-3 px-4">Enrolled Course(s)</th>
                          <th className="py-3 px-4">Enrollment Status</th>
                          <th className="py-3 px-4 text-center">JEE Main Access</th>
                          <th className="py-3 px-4 text-center">JEE Advanced Access</th>
                          <th className="py-3 px-4 text-center">NEET UG Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {(rlsAuditData.accessMatrix || []).map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">{row.student}</td>
                            <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                              {row.enrolledCourse}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  row.enrollmentStatus === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {row.enrollmentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {row.canAccessJeeMain ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  ALLOWED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  403 BLOCKED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {row.canAccessJeeAdvanced ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  ALLOWED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  403 BLOCKED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {row.canAccessNeet ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  ALLOWED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  403 BLOCKED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      PostgreSQL / Supabase Row-Level Security (RLS) Policies (`src/db/rls_policies.sql`)
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-700 font-bold">
                      {(rlsAuditData.rlsEnabledTables || []).length} Tables Protected with RLS
                    </span>
                  </div>
                  <pre className="p-4 bg-slate-950 text-emerald-300 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
                    {rlsAuditData.rlsPoliciesSql}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: OVERVIEW METRICS & BLUEPRINT AUDIT ================= */}
        {activeAdminTab === 'overview' && (
          <div className="space-y-6">
            <ExamBlueprintAuditPanel />
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
                  <span className="text-xs text-slate-500 font-mono">Pattern Year: 2026</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Official 2026 Examination Patterns &amp; Blueprints
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Separate, authoritative blueprint templates for JEE Main, JEE Advanced Paper 1, Paper 2, and NEET UG assembled strictly from the controlled question bank.
                </p>
              </div>

              {patternGenMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{patternGenMessage}</span>
                </div>
              )}
            </div>

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

            {(() => {
              const currentPattern = examPatterns[selectedPatternKey];
              if (!currentPattern) return null;

              return (
                <div className="space-y-6 pt-2">
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      currentPattern.isVerified2026
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50/80 border-amber-300 text-amber-950'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider">
                          {currentPattern.isVerified2026
                            ? 'Officially Verified 2026 Pattern'
                            : 'Flagged for Administrator Verification'}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Matches official information bulletin and syllabus guidelines published by NTA / JAB.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => togglePatternVerification(selectedPatternKey)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      {currentPattern.isVerified2026
                        ? 'Flag Configuration for Review'
                        : 'Mark as Verified 2026'}
                    </button>
                  </div>

                  <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                        Controlled Bank Paper Assembly
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Assemble a complete {currentPattern.totalQuestions}-question paper ({currentPattern.totalMarks} Marks, {currentPattern.durationMinutes} mins) from the verified {currentPattern.examType} question bank.
                      </p>
                    </div>

                    <button
                      onClick={() => handleGeneratePaperFromPattern(selectedPatternKey)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      Assemble &amp; Publish Paper <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= TAB: COURSE QUESTION BANK ================= */}
        {activeAdminTab === 'questions' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Controlled Course Question Bank
                </h3>
                <p className="text-xs text-slate-500">
                  Every question belongs strictly to a Course (`JEE`, `JEE_ADVANCED`, `NEET`) with zero cross-course contamination.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Question (Controlled Workflow)
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    loadQuestions({
                      page: 1,
                      limit: 25,
                      examType: filterCourseExam,
                      subject: filterSubject,
                      difficulty: filterDifficulty,
                      search: val,
                    });
                  }}
                  placeholder="Search question ID, chapter, text..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <select
                value={filterCourseExam}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterCourseExam(val);
                  loadQuestions({
                    page: 1,
                    limit: 25,
                    examType: val,
                    subject: filterSubject,
                    difficulty: filterDifficulty,
                    search: searchQuery,
                  });
                }}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Courses (JEE / JEE Adv / NEET)</option>
                <option value="JEE_MAIN">Course: JEE (JEE Main)</option>
                <option value="JEE_ADVANCED">Course: JEE Advanced</option>
                <option value="NEET">Course: NEET UG</option>
              </select>

              <select
                value={filterSubject}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterSubject(val);
                  loadQuestions({
                    page: 1,
                    limit: 25,
                    examType: filterCourseExam,
                    subject: val,
                    difficulty: filterDifficulty,
                    search: searchQuery,
                  });
                }}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Subjects (Phy, Chem, Math, Bot, Zoo)</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics (JEE Only)</option>
                <option value="Botany">Botany (NEET Only)</option>
                <option value="Zoology">Zoology (NEET Only)</option>
              </select>

              <select
                value={filterDifficulty}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterDifficulty(val);
                  loadQuestions({
                    page: 1,
                    limit: 25,
                    examType: filterCourseExam,
                    subject: filterSubject,
                    difficulty: val,
                    search: searchQuery,
                  });
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
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {q.questionId || q.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          q.examType === 'NEET'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.examType === 'JEE_ADVANCED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        Course: {q.courseType || q.examType}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-800">
                        {q.subject}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{q.chapter}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{q.topic}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.difficulty === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                        {q.type}
                      </span>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-lg border text-[11px] ${
                            opt.id === q.correctAnswer
                              ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-mono font-bold">{opt.id}: </span>
                          <MathView content={opt.text} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800">
                      Correct Answer: {q.correctAnswer}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{q.explanation}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  Showing page <strong className="text-slate-900">{questionBankPage}</strong> of{' '}
                  <strong className="text-slate-900">{questionBankTotalPages}</strong> (
                  {totalQuestionsInBank.toLocaleString()} Total Questions in PostgreSQL)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={questionBankPage <= 1}
                  onClick={() =>
                    loadQuestions({
                      page: questionBankPage - 1,
                      limit: 25,
                      examType: filterCourseExam,
                      subject: filterSubject,
                      difficulty: filterDifficulty,
                      search: searchQuery,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-white text-slate-700 border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                >
                  ← Previous Page
                </button>
                <button
                  type="button"
                  disabled={questionBankPage >= questionBankTotalPages}
                  onClick={() =>
                    loadQuestions({
                      page: questionBankPage + 1,
                      limit: 25,
                      examType: filterCourseExam,
                      subject: filterSubject,
                      difficulty: filterDifficulty,
                      search: searchQuery,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-white text-slate-700 border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                >
                  Next Page →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: COURSE STUDY MATERIALS ================= */}
        {activeAdminTab === 'study-materials' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                Course-Separated Study Materials &amp; Syllabus Modules
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Publish formula sheets, revision notes, and syllabus guides strictly scoped to JEE, JEE Advanced, or NEET students.
              </p>
            </div>

            {smStatusMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {smStatusMsg}
              </div>
            )}

            <form
              onSubmit={handleCreateStudyMaterial}
              className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
            >
              <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                Publish New Course Study Material
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Target Course
                  </label>
                  <select
                    value={smCourse}
                    onChange={(e) => {
                      const c = e.target.value as CourseType;
                      setSmCourse(c);
                      if (c === 'NEET' && smSubject === 'Mathematics') setSmSubject('Botany');
                      if (c !== 'NEET' && (smSubject === 'Botany' || smSubject === 'Zoology'))
                        setSmSubject('Mathematics');
                    }}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="JEE">JEE (Main)</option>
                    <option value="JEE_ADVANCED">JEE Advanced</option>
                    <option value="NEET">NEET UG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Subject
                  </label>
                  <select
                    value={smSubject}
                    onChange={(e) => setSmSubject(e.target.value as SubjectName)}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    {smCourse !== 'NEET' ? (
                      <option value="Mathematics">Mathematics</option>
                    ) : (
                      <>
                        <option value="Botany">Botany</option>
                        <option value="Zoology">Zoology</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Chapter
                  </label>
                  <input
                    type="text"
                    value={smChapter}
                    onChange={(e) => setSmChapter(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Resource Type
                  </label>
                  <select
                    value={smType}
                    onChange={(e) => setSmType(e.target.value as any)}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="FORMULA_SHEET">Formula Sheet</option>
                    <option value="NOTES">Revision Notes</option>
                    <option value="SYLLABUS">Official Syllabus</option>
                    <option value="PYQ_BOOKLET">PYQ Booklet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={smTitle}
                  onChange={(e) => setSmTitle(e.target.value)}
                  placeholder="Material Title (e.g., Electrostatics Master Formula Compendium)"
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
                <input
                  type="text"
                  value={smDesc}
                  onChange={(e) => setSmDesc(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <textarea
                rows={3}
                value={smContent}
                onChange={(e) => setSmContent(e.target.value)}
                placeholder="Key formulas, syllabus topics, or revision summary (supports LaTeX $...$)..."
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Publish to {smCourse} Library
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-600">
                Showing {studyMaterials.length} Course Study Material Records
              </div>
              <select
                value={smFilterCourse}
                onChange={(e) => setSmFilterCourse(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="ALL">All Courses</option>
                <option value="JEE">JEE Only</option>
                <option value="JEE_ADVANCED">JEE Advanced Only</option>
                <option value="NEET">NEET Only</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studyMaterials
                .filter((m) => smFilterCourse === 'ALL' || m.courseType === smFilterCourse)
                .map((mat) => (
                  <div
                    key={mat.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              mat.courseType === 'NEET'
                                ? 'bg-emerald-100 text-emerald-800'
                                : mat.courseType === 'JEE_ADVANCED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {mat.courseType}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {mat.subject} • {mat.chapter}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteStudyMaterial(mat.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Study Material"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900">{mat.title}</h4>
                      <p className="text-xs text-slate-600">{mat.description}</p>
                      <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-700">
                        <MathView content={mat.contentBody || mat.contentSummary || ''} />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= TAB: PRINT & PDF EXPORT ================= */}
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

        {/* ================= TAB: BULK QUESTION IMPORT (ADMIN ONLY) ================= */}
        {activeAdminTab === 'bulk-import' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                    Admin-Only Batch Question Pipeline
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Controlled Question Import (CSV / JSON)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Restricted strictly to Administrators and authorized Teachers. Validates course-subject compatibility before committing to the Question Bank.
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

            <div>
              <textarea
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder={
                  importFormat === 'JSON'
                    ? 'Paste JSON array here...'
                    : 'Paste CSV text here (including header row)...'
                }
                rows={10}
                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

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
                </ul>
              </div>
            )}

            {validatedQuestions.length > 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-extrabold text-emerald-950">
                      {validatedQuestions.length} Course-Validated Questions Ready to Commit
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Course assignment, subject alignment, LaTeX syntax, and answer keys verified.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCommitImport}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer shrink-0"
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
                  Academic reports filed by students during examinations regarding answer keys or wording.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map((st) => (
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

            {reports.filter((r) => reportFilter === 'ALL' || r.status === reportFilter).length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No reports matching filter "{reportFilter}".
              </div>
            ) : (
              <div className="space-y-3">
                {reports
                  .filter((r) => reportFilter === 'ALL' || r.status === reportFilter)
                  .map((rep) => (
                    <div
                      key={rep.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              rep.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : rep.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
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
                          Reported by: <strong className="text-slate-800">{rep.studentName}</strong>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium bg-white p-3 rounded-xl border border-slate-200/80">
                        {rep.description}
                      </p>

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
                Authoritative record of candidate CBT exam integrity events and administrative actions.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Candidate Examination Integrity Events ({integrityEvents.length})
              </h4>

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
                      {integrityEvents.map((evt) => (
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

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Administrative Action Audit Trail ({auditLogs.length})
              </h4>
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
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{log.actor}</td>
                        <td className="py-2.5 px-4 font-mono text-purple-700 font-bold">
                          {log.action}
                        </td>
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
                  <div className="text-xs font-bold text-slate-900">
                    Official Negative Marking Enforcement
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Apply standard $+4.00 / -1.00$ penalty rules across all mock tests.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.defaultNegativeMarking}
                  onChange={(e) =>
                    updateSystemSettings({ defaultNegativeMarking: e.target.checked })
                  }
                  className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Strict Exam Integrity Event Logging
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Record browser tab switches, window minimization, and fullscreen exits during active CBT tests.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.strictIntegrityLogging}
                  onChange={(e) =>
                    updateSystemSettings({ strictIntegrityLogging: e.target.checked })
                  }
                  className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Automatic Paper Submission on Timer Expiry
                  </div>
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
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: CONTROLLED QUESTION CREATION WORKFLOW (SECTION 14) ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600">
                  Controlled Question Creation Pipeline
                </span>
                <h3 className="font-black text-lg text-slate-900">
                  Create &amp; Validate Course Question
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {newQValidationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {newQValidationError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    1. Assign Course
                  </label>
                  <select
                    value={newQCourse}
                    onChange={(e) => handleCourseSelectInModal(e.target.value as CourseType)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs font-bold"
                  >
                    <option value="JEE">JEE (Main)</option>
                    <option value="JEE_ADVANCED">JEE Advanced</option>
                    <option value="NEET">NEET UG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    2. Assign Subject
                  </label>
                  <select
                    value={newQSubject}
                    onChange={(e) => setNewQSubject(e.target.value as SubjectName)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs font-bold"
                  >
                    {allowedSubjectsForCourse.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    3. Difficulty
                  </label>
                  <select
                    value={newQDifficulty}
                    onChange={(e) => setNewQDifficulty(e.target.value as Difficulty)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs font-bold"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    4. Format
                  </label>
                  <select
                    value={newQType}
                    onChange={(e) => setNewQType(e.target.value as QuestionType)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs font-bold"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="NUMERICAL">Numerical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    5. Assign Chapter
                  </label>
                  <input
                    type="text"
                    value={newQChapter}
                    onChange={(e) => setNewQChapter(e.target.value)}
                    className="w-full py-1.5 px-2 bg-slate-50 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    6. Assign Topic
                  </label>
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
                  Question Statement (Supports LaTeX $...$)
                </label>
                <textarea
                  rows={3}
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="Enter the question problem statement..."
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                />
              </div>

              {newQText && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
                  <span className="font-bold text-indigo-900 block text-[10px] uppercase mb-1">
                    Live LaTeX Preview:
                  </span>
                  <MathView content={newQText} />
                </div>
              )}

              {newQType === 'MCQ' ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">
                    MCQ Options
                  </label>
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
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Correct Option Key
                    </label>
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
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Validate &amp; Save to {newQCourse} Question Bank
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
