export type ExamType = 'JEE_MAIN' | 'JEE_ADVANCED' | 'NEET' | 'CUSTOM';

export type CourseType = 'JEE' | 'JEE_ADVANCED' | 'NEET';

export type SubjectName = 'Physics' | 'Chemistry' | 'Mathematics' | 'Botany' | 'Zoology';

export type QuestionType = 'MCQ' | 'NUMERICAL' | 'MULTIPLE_CORRECT' | 'ASSERTION_REASON';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionStatus = 'DRAFT' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export type QuestionSource = 'PYQ' | 'AI' | 'ADMIN' | 'IMPORTED';

export interface PYQMetadata {
  exam: ExamType;
  year: number;
  session?: string;
  shift?: string;
  paper?: string;
  sourceDoc: string;
  officialKeyVerified: boolean;
}

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  latex?: string;
}

export interface QuestionUsageRecord {
  questionId: string;
  timesUsed: number;
  lastUsedAt: string | null;
  testIds: string[];
}

export interface Question {
  id: string;
  questionId?: string; // Permanent canonical ID e.g. jee_physics_000001
  courseId?: string; // 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType?: 'JEE' | 'JEE_ADVANCED' | 'NEET';
  exam?: ExamType; // Alias synced with examType
  examType: ExamType;
  subject: SubjectName;
  chapter: string;
  topic: string;
  subtopic?: string;
  difficulty: Difficulty;
  type: QuestionType;
  questionType?: QuestionType; // Alias synced with type
  questionText: string;
  latex?: string;
  diagramSvg?: string;
  image?: string;
  hasImage?: boolean;
  options?: QuestionOption[];
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D' or numerical string like '4.25' or 'A,C' for multiple correct
  tolerance?: number; // for numerical questions
  explanation: string;
  marks?: number; // Alias synced with positiveMarks
  positiveMarks: number;
  negativeMarks: number;
  year?: number;
  source: QuestionSource;
  pyqMetadata?: PYQMetadata;
  patternYear?: number;
  status: QuestionStatus;
  createdAt: string;
  timesAttempted?: number;
  timesCorrect?: number;
  // Question Bank & Rotation tracking fields
  fingerprint?: string;
  normalizedText?: string;
  conceptKey?: string;
  timesUsed?: number;
  lastUsedAt?: string | null;
  testIds?: string[];
  sectionId?: string;
  sectionName?: string;
}

export type PaletteStatus = 
  | 'NOT_VISITED'
  | 'NOT_ANSWERED'
  | 'ANSWERED'
  | 'MARKED_FOR_REVIEW'
  | 'ANSWERED_AND_MARKED';

export interface UserExamResponse {
  questionId: string;
  selectedOption?: string; // 'A'|'B'|'C'|'D' or comma-separated
  numericalValue?: string;
  status: PaletteStatus;
  timeSpentSeconds: number;
  lastVisitedTimestamp?: number;
}

export interface ExamPatternSection {
  id: string;
  subject: SubjectName;
  sectionName: string; // e.g. "Section A: Multiple Choice Questions" or "Section B: Numerical Value"
  questionType: QuestionType;
  totalQuestions: number;
  compulsoryQuestions: number;
  positiveMarks: number;
  negativeMarks: number;
  instructions: string;
}

export interface ExamBlueprint {
  id: string;
  courseId?: string;
  courseType?: 'JEE' | 'JEE_ADVANCED' | 'NEET';
  exam: ExamType;
  name: string;
  year: string;
  sourceDocument: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  subjects: SubjectName[];
  sections: ExamPatternSection[];
  questionCounts: Record<
    string,
    {
      mcq: number;
      numerical: number;
      multiCorrect?: number;
      assertionReason?: number;
    }
  >;
  markingScheme: {
    mcq: { positive: number; negative: number };
    numerical: { positive: number; negative: number };
    multiCorrect?: { positive: number; negative: number };
    assertionReason?: { positive: number; negative: number };
  };
  difficultyDistribution: {
    easyPercent: number;
    mediumPercent: number;
    hardPercent: number;
  };
  navigationRules: {
    allowSectionSwitching: boolean;
    allowMarkForReview: boolean;
    evaluateAnsweredAndMarked: boolean;
    showVirtualNumericalKeypad: boolean;
    autoSubmitOnTimeExpiry: boolean;
  };
  notes: string;
}

export interface ExamPatternTemplate {
  id: string;
  examType: ExamType;
  name: string;
  patternYear: number;
  sourceDocument: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  sections: ExamPatternSection[];
  isVerified2026: boolean;
  notes: string;
  blueprint?: ExamBlueprint;
}

export interface TestQuestionMapping {
  testId: string;
  questionId: string;
  questionOrder: number;
  attemptNumber?: number;
  setLabel?: string;
}

export interface TestAttemptSnapshot {
  attemptNumber: number;
  setLabel: string; // e.g. "Set A", "Set B", "Set C"
  questionIds: string[];
  testQuestions?: TestQuestionMapping[];
  createdAt: string;
}

export type TestCategoryType = 
  | 'FULL_MOCK'
  | 'JEE_ADVANCED_PAPER1'
  | 'JEE_ADVANCED_PAPER2'
  | 'COMBINED_MOCK'
  | 'PYQ_PAPER'
  | 'SUBJECT_TEST'
  | 'CHAPTER_TEST'
  | 'CUSTOM';

export interface TestDefinition {
  id: string;
  testId?: string;
  title: string;
  subtitle: string;
  courseId?: string; // 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType?: 'JEE' | 'JEE_ADVANCED' | 'NEET';
  examType: ExamType;
  testType: TestCategoryType;
  patternYear: number;
  patternSource?: string;
  blueprintId?: string;
  durationMinutes: number;
  totalMarks: number;
  positiveMarks: number;
  negativeMarks: number;
  subjects: SubjectName[];
  questionsCount: number;
  difficulty: Difficulty;
  difficultyDistributionNotice?: string;
  syllabus: string[];
  description: string;
  isAiGenerated?: boolean;
  isOfficialPyq?: boolean;
  isFixedPaper?: boolean;
  pyqDetails?: PYQMetadata;
  published: boolean;
  sections?: ExamPatternSection[];
  questions: Question[];
  // Saved Test Snapshot System (Part 5 & Requirement 10)
  snapshotQuestionIds?: string[];
  testQuestions?: TestQuestionMapping[];
  attemptSnapshots?: TestAttemptSnapshot[];
  activeAttemptSet?: string;
  createdAt: string;
  attemptsCount?: number;
  avgScore?: number;
}

export interface QuestionResultReview {
  question: Question;
  studentAnswer?: string;
  isCorrect: boolean;
  isAttempted: boolean;
  isMarked: boolean;
  marksAwarded: number;
  timeSpentSeconds: number;
  mistakeTag?: 'CONCEPTUAL' | 'CALCULATION' | 'TIME_PRESSURE' | 'GUESS' | 'UNATTEMPTED' | 'ACCURATE';
}

export interface SubjectAnalysisItem {
  subject: SubjectName;
  score: number;
  maxScore: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
  timeSpentSeconds: number;
  avgTimePerQuestion: number;
}

export interface ChapterAnalysisItem {
  chapter: string;
  subject: SubjectName;
  totalQuestions: number;
  attempted: number;
  correct: number;
  accuracy: number;
  score: number;
  isWeak: boolean;
}

export interface MistakeCategoryBreakdown {
  conceptual: number;
  calculation: number;
  timePressure: number;
  guess: number;
  unanswered: number;
  negativeMarksLost: number;
}

export interface PracticeRecommendation {
  id: string;
  title: string;
  subject: SubjectName;
  chapter: string;
  reason: string;
  actionText: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TestAttemptResult {
  id: string;
  testId: string;
  testTitle: string;
  courseId?: string;
  courseType?: 'JEE' | 'JEE_ADVANCED' | 'NEET';
  examType: ExamType;
  testType?: TestCategoryType;
  attemptSetLabel?: string;
  snapshotQuestionIds?: string[];
  userId: string;
  userName: string;
  startedAt: string;
  submittedAt: string;
  timeTakenSeconds: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  attemptRate: number;
  totalQuestions: number;
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
  negativeMarksLost: number;
  simulatedPercentile: number;
  practiceRank: number;
  totalParticipantsSimulated: number;
  subjectAnalysis: SubjectAnalysisItem[];
  chapterAnalysis: ChapterAnalysisItem[];
  mistakeAnalysis: MistakeCategoryBreakdown;
  questionReviews: QuestionResultReview[];
  recommendations: PracticeRecommendation[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  targetExam: ExamType;
  targetYear: number;
  totalTestsAttempted: number;
  averageScore: number;
  bestScore: number;
  averageAccuracy: number;
  practiceStreakDays: number;
}

export interface PaperBlueprint {
  id: string;
  title: string;
  examType: ExamType;
  testType: string;
  patternYear: number;
  durationMinutes: number;
  subjects: SubjectName[];
  totalQuestions: number;
  difficultySplit: {
    easyPercent: number;
    mediumPercent: number;
    hardPercent: number;
  };
  questionTypesSplit: {
    mcqCount: number;
    numericalCount: number;
    multiCorrectCount?: number;
    assertionReasonCount?: number;
  };
  chapters: Record<SubjectName, string[]>;
  positiveMarks: number;
  negativeMarks: number;
}

export type ExamMode = 'SIMULATION' | 'PRACTICE';

export interface ExamIntegrityEvent {
  id: string;
  type: 'FULLSCREEN_EXIT' | 'TAB_HIDDEN' | 'NETWORK_OFFLINE' | 'NETWORK_RECONNECTED' | 'UNEXPECTED_NAVIGATION' | 'TIMEOUT';
  timestamp: string;
  details: string;
}

export interface QuestionBookmark {
  id: string;
  questionId: string;
  collection: string;
  note?: string;
  createdAt: string;
  question?: Question;
}

export interface QuestionReport {
  id: string;
  questionId: string;
  testId?: string;
  studentName: string;
  reason: 'INCORRECT_ANSWER' | 'TYPO' | 'AMBIGUOUS' | 'BROKEN_IMAGE' | 'INCORRECT_SOLUTION' | 'OTHER';
  description: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  questionSnippet?: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  details?: string;
}

export interface SystemSettings {
  defaultNegativeMarking: boolean;
  enableLeaderboard: boolean;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  strictIntegrityLogging: boolean;
  autoSubmitOnTimeout: boolean;
}

export interface ActiveExamSession {
  testId: string;
  attemptSetLabel?: string;
  snapshotQuestionIds?: string[];
  testQuestions?: TestQuestionMapping[];
  testSnapshot?: TestDefinition;
  responses: Record<string, UserExamResponse>;
  timerSecondsLeft: number;
  examStartTime: number;
  currentQuestionIdx: number;
  examMode: ExamMode;
  integrityEvents: ExamIntegrityEvent[];
  lastSavedTimestamp: number;
}

