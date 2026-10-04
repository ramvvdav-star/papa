import {
  Question,
  SubjectName,
  ExamType,
  Difficulty,
  QuestionType,
  ExamBlueprint,
  QuestionUsageRecord,
  TestDefinition,
  TestAttemptSnapshot,
} from '../types/exam';
import { OFFICIAL_EXAM_BLUEPRINTS } from './officialExamPatterns';

// ============================================================================
// PART 2: NORMALIZATION & FINGERPRINT HASHING FOR DUPLICATE DETECTION
// ============================================================================

/**
 * Normalizes question text by lowercasing, removing LaTeX wrappers/punctuation,
 * and collapsing whitespace so effectively identical questions are caught.
 */
export function normalizeQuestionText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/\$+/g, '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/[^\w\s\d.=+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes a deterministic 64-bit FNV-1a hex fingerprint from normalized question text + subject + type.
 */
export function computeQuestionFingerprint(
  questionText: string,
  subject?: string,
  questionType?: string
): string {
  const normalized = `${(subject || '').toLowerCase()}|${(questionType || '').toLowerCase()}|${normalizeQuestionText(questionText)}`;
  let h1 = 0x811c9dc5;
  let h2 = 0xc9dc5118;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x1000193b);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fp_${hex1}${hex2}`;
}

/**
 * Formats a permanent canonical questionId (Part 1):
 * e.g. jee_physics_000001, jee_math_000042, neet_botany_000105
 */
export function formatCanonicalQuestionId(
  exam: ExamType,
  subject: SubjectName,
  serialNumber: number
): string {
  const examPrefix =
    exam === 'NEET'
      ? 'neet'
      : exam === 'JEE_ADVANCED'
      ? 'jee_adv'
      : 'jee';
  const subjSlug =
    subject === 'Mathematics'
      ? 'math'
      : subject.toLowerCase();
  return `${examPrefix}_${subjSlug}_${String(serialNumber).padStart(6, '0')}`;
}

/**
 * Enriches any Question object so all Part 1 required properties are present and synced.
 */
export function enrichQuestionRecord(q: Question, fallbackSerial = 1): Question {
  const canonicalId =
    q.questionId ||
    (q.id && /^(jee|neet)_/.test(q.id)
      ? q.id
      : formatCanonicalQuestionId(q.examType || 'JEE_MAIN', q.subject || 'Physics', fallbackSerial));

  const fp = q.fingerprint || computeQuestionFingerprint(q.questionText, q.subject, q.type);
  const hasImg = Boolean(q.hasImage || q.diagramSvg || q.image);

  return {
    ...q,
    id: canonicalId,
    questionId: canonicalId,
    exam: q.examType,
    examType: q.examType,
    questionType: q.type,
    type: q.type,
    marks: q.positiveMarks,
    positiveMarks: q.positiveMarks,
    year: q.year || q.pyqMetadata?.year || q.patternYear || 2026,
    image: q.image || q.diagramSvg,
    hasImage: hasImg,
    fingerprint: fp,
    timesUsed: q.timesUsed ?? 0,
    lastUsedAt: q.lastUsedAt ?? null,
    testIds: q.testIds ?? [],
  };
}

// ============================================================================
// PART 3: UNBIASED FISHER-YATES SHUFFLE
// ============================================================================

/**
 * Unbiased Fisher-Yates shuffle using Math.random() (or optional custom RNG).
 */
export function fisherYatesShuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Deterministic Mulberry32 PRNG for reproducible test snapshot generation.
 */
export function createDeterministicRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// PART 4: QUESTION USAGE TRACKING & ROTATION SYSTEM
// ============================================================================

const usageRegistry = new Map<string, QuestionUsageRecord>();

export function getQuestionUsage(questionId: string): QuestionUsageRecord {
  const existing = usageRegistry.get(questionId);
  if (existing) return existing;
  const initial: QuestionUsageRecord = {
    questionId,
    timesUsed: 0,
    lastUsedAt: null,
    testIds: [],
  };
  usageRegistry.set(questionId, initial);
  return initial;
}

export function recordQuestionUsage(
  questionIds: string[],
  testId: string,
  timestampIso: string = new Date().toISOString()
): void {
  for (const qid of questionIds) {
    const rec = getQuestionUsage(qid);
    rec.timesUsed += 1;
    rec.lastUsedAt = timestampIso;
    if (!rec.testIds.includes(testId)) {
      rec.testIds.push(testId);
    }
    usageRegistry.set(qid, rec);
  }
}

export function getAllQuestionUsageRecords(): QuestionUsageRecord[] {
  return Array.from(usageRegistry.values());
}

export function resetQuestionUsageRegistry(): void {
  usageRegistry.clear();
}

// ============================================================================
// PART 3 & PART 4: 10-STEP INTELLIGENT QUESTION SELECTION ALGORITHM
// ============================================================================

export interface IntelligentSelectionOptions {
  exam: ExamType;
  subject: SubjectName;
  questionType?: QuestionType;
  count: number;
  chapters?: string[];
  topics?: string[];
  difficulty?: Difficulty;
  excludeQuestionIds?: Set<string>;
  excludeFingerprints?: Set<string>;
  testIdForTracking?: string;
  rng?: () => number;
  timestampIso?: string;
}

/**
 * Implements the 10-step intelligent question selection pipeline:
 * 1. Filter by exam
 * 2. Filter by subject
 * 3. Filter by chapter/topic if applicable
 * 4. Filter by difficulty & questionType
 * 5. Apply blueprint constraints
 * 6. Remove questions already selected for this test (both ID and normalized text fingerprint)
 * 7. Prioritize never-used questions (timesUsed === 0)
 * 8. Prioritize lowest usage count (timesUsed ascending)
 * 9. Prioritize oldest lastUsedAt timestamp
 * 10. Unbiased Fisher-Yates shuffle among equally suitable questions
 */
export function selectQuestionsIntelligent(
  questionBank: readonly Question[],
  options: IntelligentSelectionOptions
): Question[] {
  const {
    exam,
    subject,
    questionType,
    count,
    chapters,
    topics,
    difficulty,
    excludeQuestionIds = new Set<string>(),
    excludeFingerprints = new Set<string>(),
    testIdForTracking,
    rng = Math.random,
    timestampIso = new Date().toISOString(),
  } = options;

  const usedQuestionIds = new Set<string>(excludeQuestionIds);
  const usedFingerprints = new Set<string>(excludeFingerprints);

  // Step 1 & 2: Filter by subject and compatible exam
  let candidates = questionBank.filter((q) => {
    if (q.subject !== subject) return false;
    if (q.examType === exam) return true;
    // Physics and Chemistry questions can also serve across JEE/NEET if needed as fallback
    return false;
  });

  // Fallback to same subject across exams if bank slice is smaller than requested
  if (candidates.length < count * 2) {
    candidates = questionBank.filter((q) => q.subject === subject);
  }

  // Step 3: Filter by chapter / topic if specified
  if (chapters && chapters.length > 0) {
    const chapterFiltered = candidates.filter((q) => chapters.includes(q.chapter));
    if (chapterFiltered.length >= count) {
      candidates = chapterFiltered;
    }
  }
  if (topics && topics.length > 0) {
    const topicFiltered = candidates.filter((q) => topics.includes(q.topic));
    if (topicFiltered.length >= count) {
      candidates = topicFiltered;
    }
  }

  // Step 4: Filter by questionType (MCQ vs NUMERICAL vs MULTIPLE_CORRECT)
  if (questionType) {
    const typeFiltered = candidates.filter((q) => q.type === questionType);
    if (typeFiltered.length >= count) {
      candidates = typeFiltered;
    }
  }

  // Filter by difficulty if explicitly requested and sufficient pool exists
  if (difficulty) {
    const diffFiltered = candidates.filter((q) => q.difficulty === difficulty);
    if (diffFiltered.length >= count) {
      candidates = diffFiltered;
    }
  }

  // Step 6: Deduplicate candidate pool by questionId and normalized fingerprint
  const uniqueCandidates: Question[] = [];
  const localIds = new Set<string>();
  const localFps = new Set<string>();

  for (const q of candidates) {
    const qid = q.questionId || q.id;
    const fp = q.fingerprint || computeQuestionFingerprint(q.questionText, q.subject, q.type);
    if (!usedQuestionIds.has(qid) && !usedFingerprints.has(fp) && !localIds.has(qid) && !localFps.has(fp)) {
      localIds.add(qid);
      localFps.add(fp);
      uniqueCandidates.push(q);
    }
  }

  // Step 10 (pre-shuffle): Unbiased Fisher-Yates shuffle first so ties in usage & timestamp are unbiased
  const shuffledCandidates = fisherYatesShuffle(uniqueCandidates, rng);

  // Step 7, 8, 9: Sort by (1) Never used (timesUsed === 0), (2) Lowest timesUsed, (3) Oldest lastUsedAt
  shuffledCandidates.sort((a, b) => {
    const usageA = getQuestionUsage(a.questionId || a.id);
    const usageB = getQuestionUsage(b.questionId || b.id);

    // Priority 1 & 2: timesUsed ascending (0 comes first!)
    if (usageA.timesUsed !== usageB.timesUsed) {
      return usageA.timesUsed - usageB.timesUsed;
    }

    // Priority 3: Oldest lastUsedAt first (null = never used comes first)
    if (!usageA.lastUsedAt && usageB.lastUsedAt) return -1;
    if (usageA.lastUsedAt && !usageB.lastUsedAt) return 1;
    if (usageA.lastUsedAt && usageB.lastUsedAt && usageA.lastUsedAt !== usageB.lastUsedAt) {
      return usageA.lastUsedAt.localeCompare(usageB.lastUsedAt);
    }

    return 0;
  });

  // Select top `count` strictly enforcing usedQuestionIds & usedFingerprints
  const selectedQuestions: Question[] = [];
  for (const question of shuffledCandidates) {
    if (selectedQuestions.length >= count) break;
    const qid = question.questionId || question.id;
    const fp = question.fingerprint || computeQuestionFingerprint(question.questionText, question.subject, question.type);
    if (!usedQuestionIds.has(qid) && !usedFingerprints.has(fp)) {
      const usage = getQuestionUsage(qid);
      selectedQuestions.push({
        ...question,
        id: qid,
        questionId: qid,
        fingerprint: fp,
        timesUsed: usage.timesUsed + (testIdForTracking ? 1 : 0),
        lastUsedAt: testIdForTracking ? timestampIso : usage.lastUsedAt,
        testIds: testIdForTracking
          ? Array.from(new Set([...usage.testIds, testIdForTracking]))
          : usage.testIds,
      });
      usedQuestionIds.add(qid);
      usedFingerprints.add(fp);
    }
  }

  // Final Fisher-Yates shuffle of the selected set so easy/medium/hard or topics are naturally distributed
  const finalSelection = fisherYatesShuffle(selectedQuestions, rng);

  // Record usage in tracker if testIdForTracking is provided
  if (testIdForTracking) {
    recordQuestionUsage(
      finalSelection.map((q) => q.questionId || q.id),
      testIdForTracking,
      timestampIso
    );
  }

  return finalSelection;
}

/**
 * Generates a full test question list strictly following an ExamBlueprint (Part 6),
 * guaranteeing zero duplicate questionIds and zero duplicate question fingerprints.
 */
export function selectQuestionsForBlueprint(
  questionBank: readonly Question[],
  blueprint: ExamBlueprint,
  testId: string,
  options?: {
    excludeQuestionIds?: Set<string>;
    rng?: () => number;
    timestampIso?: string;
  }
): Question[] {
  const usedQuestionIds = new Set<string>(options?.excludeQuestionIds || []);
  const usedFingerprints = new Set<string>();
  const rng = options?.rng || Math.random;
  const timestampIso = options?.timestampIso || new Date().toISOString();

  const allSelected: Question[] = [];

  for (const section of blueprint.sections) {
    const sectionQuestions = selectQuestionsIntelligent(questionBank, {
      exam: blueprint.exam,
      subject: section.subject,
      questionType: section.questionType,
      count: section.totalQuestions,
      excludeQuestionIds: usedQuestionIds,
      excludeFingerprints: usedFingerprints,
      testIdForTracking: testId,
      rng,
      timestampIso,
    }).map((q) => ({
      ...q,
      positiveMarks: section.positiveMarks,
      marks: section.positiveMarks,
      negativeMarks: section.negativeMarks,
      sectionId: section.id,
      sectionName: section.sectionName,
    }));

    for (const sq of sectionQuestions) {
      usedQuestionIds.add(sq.questionId || sq.id);
      if (sq.fingerprint) usedFingerprints.add(sq.fingerprint);
      allSelected.push(sq);
    }
  }

  return allSelected;
}

// ============================================================================
// PART 5: TEST SNAPSHOT & MULTI-ATTEMPT ROTATION ENGINE
// ============================================================================

const SET_LABELS = ['Set A', 'Set B', 'Set C', 'Set D', 'Set E', 'Set F'];

/**
 * Resolves the saved snapshot of questions for a test, or generates a new Attempt Set
 * (Attempt 1 -> Set A, Attempt 2 -> Set B, Attempt 3 -> Set C) without repeating questions
 * from previous attempts if sufficient questions exist in the bank.
 */
export function createOrResolveAttemptSnapshot(
  test: TestDefinition,
  questionBank: readonly Question[],
  attemptNumber: number,
  blueprintOverride?: ExamBlueprint
): {
  setLabel: string;
  questions: Question[];
  snapshotQuestionIds: string[];
  updatedSnapshots: TestAttemptSnapshot[];
} {
  const setIndex = Math.max(0, attemptNumber - 1);
  const setLabel = SET_LABELS[setIndex % SET_LABELS.length] || `Set #${attemptNumber}`;
  const existingSnapshots = test.attemptSnapshots || [];

  // Check if this attempt number already has a saved snapshot
  const savedForAttempt = existingSnapshots.find((s) => s.attemptNumber === attemptNumber);
  if (savedForAttempt && savedForAttempt.questionIds.length > 0) {
    const bankMap = new Map<string, Question>();
    questionBank.forEach((q) => {
      bankMap.set(q.id, q);
      if (q.questionId) bankMap.set(q.questionId, q);
    });
    test.questions.forEach((q) => {
      bankMap.set(q.id, q);
      if (q.questionId) bankMap.set(q.questionId, q);
    });

    const resolved = savedForAttempt.questionIds
      .map((id) => bankMap.get(id))
      .filter((q): q is Question => Boolean(q));

    if (resolved.length === savedForAttempt.questionIds.length) {
      return {
        setLabel: savedForAttempt.setLabel,
        questions: resolved,
        snapshotQuestionIds: savedForAttempt.questionIds,
        updatedSnapshots: existingSnapshots,
      };
    }
  }

  // If Attempt 1 and test already has its canonical saved snapshot (`test.questions`), preserve it!
  if (attemptNumber === 1 && test.questions && test.questions.length > 0) {
    const ids = test.questions.map((q) => q.questionId || q.id);
    const snapshot: TestAttemptSnapshot = {
      attemptNumber: 1,
      setLabel: 'Set A',
      questionIds: ids,
      createdAt: test.createdAt || new Date().toISOString(),
    };
    return {
      setLabel: 'Set A',
      questions: test.questions,
      snapshotQuestionIds: ids,
      updatedSnapshots: [snapshot, ...existingSnapshots.filter((s) => s.attemptNumber !== 1)],
    };
  }

  // For Attempt 2, 3, ... generate a fresh rotated Question Set (Set B, Set C) excluding previous attempt questions!
  const previouslyUsedInThisTest = new Set<string>();
  existingSnapshots.forEach((snap) => {
    snap.questionIds.forEach((id) => previouslyUsedInThisTest.add(id));
  });
  test.questions.forEach((q) => previouslyUsedInThisTest.add(q.questionId || q.id));

  let newQuestions: Question[] = [];
  const blueprint =
    blueprintOverride ||
    (test.examType === 'JEE_MAIN' && test.testType === 'FULL_MOCK'
      ? OFFICIAL_EXAM_BLUEPRINTS.JEE_MAIN_2026
      : test.examType === 'NEET' && test.testType === 'FULL_MOCK'
      ? OFFICIAL_EXAM_BLUEPRINTS.NEET_UG_2026
      : test.examType === 'JEE_ADVANCED' && test.testType === 'JEE_ADVANCED_PAPER1'
      ? OFFICIAL_EXAM_BLUEPRINTS.JEE_ADVANCED_2026_PAPER1
      : test.examType === 'JEE_ADVANCED' && test.testType === 'JEE_ADVANCED_PAPER2'
      ? OFFICIAL_EXAM_BLUEPRINTS.JEE_ADVANCED_2026_PAPER2
      : undefined);

  if (blueprint) {
    newQuestions = selectQuestionsForBlueprint(
      questionBank,
      blueprint,
      `${test.id}_attempt_${attemptNumber}`,
      {
        excludeQuestionIds: previouslyUsedInThisTest,
      }
    );
  } else {
    // Chapter / Subject / Custom test rotation
    const usedIds = new Set<string>(previouslyUsedInThisTest);
    const usedFps = new Set<string>();
    const perSubjectCount = Math.max(
      1,
      Math.floor((test.questionsCount || test.questions.length) / Math.max(1, test.subjects.length))
    );
    for (const subj of test.subjects) {
      const picked = selectQuestionsIntelligent(questionBank, {
        exam: test.examType,
        subject: subj,
        count: perSubjectCount,
        excludeQuestionIds: usedIds,
        excludeFingerprints: usedFps,
        testIdForTracking: `${test.id}_attempt_${attemptNumber}`,
      });
      picked.forEach((q) => {
        usedIds.add(q.questionId || q.id);
        if (q.fingerprint) usedFps.add(q.fingerprint);
        newQuestions.push(q);
      });
    }
  }

  const newIds = newQuestions.map((q) => q.questionId || q.id);
  const newSnap: TestAttemptSnapshot = {
    attemptNumber,
    setLabel,
    questionIds: newIds,
    createdAt: new Date().toISOString(),
  };

  return {
    setLabel,
    questions: newQuestions,
    snapshotQuestionIds: newIds,
    updatedSnapshots: [...existingSnapshots.filter((s) => s.attemptNumber !== attemptNumber), newSnap],
  };
}

/**
 * Audits a list of tests and the centralized question bank to verify:
 * 1. Zero duplicate questions within any single test
 * 2. Distinct question snapshots across tests
 * 3. Usage rotation metrics (Never used, Least used, Max used)
 */
export function auditQuestionBankAndTests(
  questionBank: readonly Question[],
  tests: readonly TestDefinition[]
) {
  let duplicateIdsInTests = 0;
  let duplicateFingerprintsInTests = 0;
  const perTestAudit: Array<{
    testId: string;
    title: string;
    totalQuestions: number;
    uniqueIds: number;
    uniqueFingerprints: number;
    hasDuplicates: boolean;
  }> = [];

  for (const t of tests) {
    const ids = new Set<string>();
    const fps = new Set<string>();
    for (const q of t.questions || []) {
      const qid = q.questionId || q.id;
      const fp = q.fingerprint || computeQuestionFingerprint(q.questionText, q.subject, q.type);
      if (ids.has(qid)) duplicateIdsInTests++;
      if (fps.has(fp)) duplicateFingerprintsInTests++;
      ids.add(qid);
      fps.add(fp);
    }
    perTestAudit.push({
      testId: t.id,
      title: t.title,
      totalQuestions: (t.questions || []).length,
      uniqueIds: ids.size,
      uniqueFingerprints: fps.size,
      hasDuplicates: ids.size !== (t.questions || []).length || fps.size !== (t.questions || []).length,
    });
  }

  let neverUsedCount = 0;
  let usedOnceCount = 0;
  let usedMultipleCount = 0;

  for (const q of questionBank) {
    const u = getQuestionUsage(q.questionId || q.id);
    if (u.timesUsed === 0) neverUsedCount++;
    else if (u.timesUsed === 1) usedOnceCount++;
    else usedMultipleCount++;
  }

  return {
    totalBankQuestions: questionBank.length,
    totalTestsAudited: tests.length,
    duplicateIdsInTests,
    duplicateFingerprintsInTests,
    zeroDuplicatesVerified: duplicateIdsInTests === 0 && duplicateFingerprintsInTests === 0,
    neverUsedCount,
    usedOnceCount,
    usedMultipleCount,
    perTestAudit,
  };
}
