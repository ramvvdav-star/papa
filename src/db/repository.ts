import { db } from './index.js';
import {
  questions,
  tests,
  testAttempts,
  activeExamSessions,
  questionBookmarks,
  questionReports,
} from './schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import {
  Question,
  TestDefinition,
  TestAttemptResult,
  SubjectName,
  ExamType,
  ActiveExamSession,
  QuestionBookmark,
  QuestionReport,
} from '../types/exam.js';
import { generateQuestionBank } from './questionBankGenerator.js';
import { SEED_TESTS } from '../data/seedTests.js';
import {
  normalizeQuestion,
  computeQuestionFingerprint,
  formatCanonicalQuestionId,
  enrichQuestionRecord,
  getQuestionUsage,
  syncUsageRegistryFromTests,
  deduplicateAndMigrateQuestionBank,
  buildTestQuestionMappings,
} from '../data/questionBankEngine.js';

// Canonical courseId normalizer so 'course-neet-ug', 'course_neet', 'NEET', etc. map cleanly
export function normalizeCanonicalCourse(
  courseOrExam?: string | null,
  fallbackExam?: ExamType
): { courseId: 'course_jee' | 'course_jee_adv' | 'course_neet'; courseType: 'JEE' | 'JEE_ADVANCED' | 'NEET' } {
  const raw = (courseOrExam || fallbackExam || 'JEE_MAIN').toUpperCase();
  if (raw.includes('NEET')) {
    return { courseId: 'course_neet', courseType: 'NEET' };
  }
  if (raw.includes('ADV')) {
    return { courseId: 'course_jee_adv', courseType: 'JEE_ADVANCED' };
  }
  return { courseId: 'course_jee', courseType: 'JEE' };
}

// In-memory fast cache synchronized with PostgreSQL canonical Question Bank and usage registry
let cachedQuestions: Question[] = [];
let cachedCount = 0;
let isSeeding = false;
let hasLoadedCustomDbQuestions = false;

export function getCachedQuestionBank(): Question[] {
  if (cachedQuestions.length === 0) {
    const raw = generateQuestionBank();
    const { canonicalQuestions } = deduplicateAndMigrateQuestionBank(raw);
    cachedQuestions = canonicalQuestions;
    cachedCount = cachedQuestions.length;
    syncUsageRegistryFromTests(SEED_TESTS);
  }
  return cachedQuestions.map((q) => {
    const usage = getQuestionUsage(q.questionId || q.id, q);
    return {
      ...q,
      timesUsed: usage.timesUsed,
      lastUsedAt: usage.lastUsedAt,
      testIds: usage.testIds,
    };
  });
}

// Helper to map a DB question row back to a rich Question object
function mapDbRowToQuestion(row: typeof questions.$inferSelect): Question {
  let parsedOptions = undefined;
  if (row.optionsJson) {
    try {
      parsedOptions = JSON.parse(row.optionsJson);
    } catch {
      parsedOptions = undefined;
    }
  }
  const canonicalCourse = normalizeCanonicalCourse(row.courseId || row.courseType, row.examType as ExamType);
  return enrichQuestionRecord({
    id: row.id,
    questionId: row.id,
    courseId: canonicalCourse.courseId,
    courseType: canonicalCourse.courseType,
    examType: (row.examType as ExamType) || 'JEE_MAIN',
    subject: (row.subject as SubjectName) || 'Physics',
    chapter: row.chapter || 'General',
    topic: row.topic || row.chapter || 'General',
    difficulty: (row.difficulty as Question['difficulty']) || 'MEDIUM',
    type: (row.type as Question['type']) || 'MCQ',
    questionText: row.questionText,
    latex: row.latex || undefined,
    options: parsedOptions,
    correctAnswer: row.correctAnswer,
    tolerance: row.tolerance ?? undefined,
    explanation: row.explanation,
    positiveMarks: row.positiveMarks ?? 4,
    negativeMarks: row.negativeMarks ?? 1,
    source: (row.source as Question['source']) || 'ADMIN',
    status: (row.status as Question['status']) || 'PUBLISHED',
    timesAttempted: row.timesAttempted || 0,
    timesCorrect: row.timesCorrect || 0,
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  });
}

export async function ensureDatabaseSeeded(): Promise<number> {
  const bank = getCachedQuestionBank();
  if (isSeeding) return bank.length;

  try {
    isSeeding = true;

    // 1. Always ensure SEED_TESTS are persisted in the PostgreSQL `tests` table first!
    const existingTestRows = await db.select({ id: tests.id }).from(tests);
    const existingTestIds = new Set(existingTestRows.map((r) => r.id));

    for (const t of SEED_TESTS) {
      const tId = t.testId || t.id;
      if (!existingTestIds.has(tId)) {
        const cInfo = normalizeCanonicalCourse(t.courseId || t.courseType, t.examType);
        await db
          .insert(tests)
          .values({
            id: tId,
            title: t.title,
            subtitle: t.subtitle,
            courseId: cInfo.courseId,
            courseType: cInfo.courseType,
            examType: t.examType,
            testType: t.testType,
            durationMinutes: t.durationMinutes,
            totalMarks: t.totalMarks,
            positiveMarks: t.positiveMarks,
            negativeMarks: t.negativeMarks,
            subjectsJson: JSON.stringify(t.subjects),
            questionsCount: t.questionsCount,
            difficulty: t.difficulty,
            syllabusJson: JSON.stringify(t.syllabus || []),
            description: t.description,
            questionIdsJson: JSON.stringify((t.questions || []).map((q) => q.questionId || q.id)),
            testDataJson: JSON.stringify(t),
            published: t.published,
            attemptsCount: t.attemptsCount || 0,
            avgScore: t.avgScore || 0,
          })
          .onConflictDoNothing();
      }
    }

    // 2. Check questions table count and sync any admin/teacher-created DB questions into memory cache
    const countRes = await db.select({ count: sql<number>`count(*)` }).from(questions);
    const dbCount = Number(countRes[0]?.count || 0);

    if (!hasLoadedCustomDbQuestions && dbCount > 0) {
      hasLoadedCustomDbQuestions = true;
      const customRows = await db
        .select()
        .from(questions)
        .where(eq(questions.source, 'ADMIN'));
      const existingIds = new Set(cachedQuestions.map((q) => q.questionId || q.id));
      for (const r of customRows) {
        if (!existingIds.has(r.id)) {
          cachedQuestions.unshift(mapDbRowToQuestion(r));
          existingIds.add(r.id);
        }
      }
      cachedCount = cachedQuestions.length;
    }

    if (dbCount >= bank.length) {
      isSeeding = false;
      cachedCount = Math.max(dbCount, cachedQuestions.length);
      return cachedCount;
    }

    // Background seed remaining canonical questions
    const chunkSize = 250;
    (async () => {
      try {
        for (let i = 0; i < bank.length; i += chunkSize) {
          const chunk = bank.slice(i, i + chunkSize);
          await db
            .insert(questions)
            .values(
              chunk.map((q) => {
                const cInfo = normalizeCanonicalCourse(q.courseId || q.courseType, q.examType);
                return {
                  id: q.questionId || q.id,
                  courseId: cInfo.courseId,
                  courseType: cInfo.courseType,
                  examType: q.examType,
                  subject: q.subject,
                  chapter: q.chapter,
                  topic: q.topic,
                  difficulty: q.difficulty,
                  type: q.type,
                  questionText: q.questionText,
                  latex: q.latex || null,
                  optionsJson: q.options ? JSON.stringify(q.options) : null,
                  correctAnswer: q.correctAnswer,
                  tolerance: q.tolerance || null,
                  explanation: q.explanation,
                  positiveMarks: q.positiveMarks,
                  negativeMarks: q.negativeMarks,
                  source: q.source,
                  status: q.status,
                  timesAttempted: q.timesAttempted || 0,
                  timesCorrect: q.timesCorrect || 0,
                };
              })
            )
            .onConflictDoNothing();
        }
      } catch (err) {
        console.warn('Database background seed note:', err);
      } finally {
        isSeeding = false;
      }
    })();

    return bank.length;
  } catch (err) {
    isSeeding = false;
    return bank.length;
  }
}

// Persist a TestDefinition (created, generated, or updated) into PostgreSQL `tests` table
export async function saveTestToDb(test: TestDefinition): Promise<void> {
  try {
    const tId = test.testId || test.id;
    const cInfo = normalizeCanonicalCourse(test.courseId || test.courseType, test.examType);
    const values = {
      id: tId,
      title: test.title,
      subtitle: test.subtitle || '',
      courseId: cInfo.courseId,
      courseType: cInfo.courseType,
      examType: test.examType,
      testType: test.testType,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      positiveMarks: test.positiveMarks,
      negativeMarks: test.negativeMarks,
      subjectsJson: JSON.stringify(test.subjects || []),
      questionsCount: test.questionsCount || (test.questions || []).length,
      difficulty: test.difficulty || 'MEDIUM',
      syllabusJson: JSON.stringify(test.syllabus || []),
      description: test.description || '',
      questionIdsJson: JSON.stringify((test.questions || []).map((q) => q.questionId || q.id)),
      testDataJson: JSON.stringify({
        ...test,
        id: tId,
        testId: tId,
        courseId: cInfo.courseId,
        courseType: cInfo.courseType,
      }),
      published: test.published ?? true,
      attemptsCount: test.attemptsCount || 0,
      avgScore: test.avgScore || 0,
    };

    await db
      .insert(tests)
      .values(values)
      .onConflictDoUpdate({
        target: tests.id,
        set: values,
      });
  } catch (err) {
    console.warn('Failed to persist test to PostgreSQL:', err);
  }
}

export async function deleteTestFromDb(testId: string): Promise<void> {
  try {
    await db.delete(tests).where(eq(tests.id, testId));
  } catch (err) {
    console.warn('Failed to delete test from PostgreSQL:', err);
  }
}

export async function getTestsFromDb(): Promise<TestDefinition[]> {
  try {
    const rows = await db.select().from(tests).orderBy(desc(tests.createdAt));
    const bank = getCachedQuestionBank();
    const bankMap = new Map<string, Question>();
    bank.forEach((q) => {
      bankMap.set(q.id, q);
      if (q.questionId) bankMap.set(q.questionId, q);
    });

    const seedMap = new Map<string, TestDefinition>();
    SEED_TESTS.forEach((st) => {
      seedMap.set(st.id, st);
      if (st.testId) seedMap.set(st.testId, st);
    });

    const loadedTests: TestDefinition[] = [];
    const seenIds = new Set<string>();

    for (const r of rows) {
      if (seenIds.has(r.id)) continue;
      seenIds.add(r.id);

      if (r.testDataJson) {
        try {
          const parsed = JSON.parse(r.testDataJson) as TestDefinition;
          if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            const cInfo = normalizeCanonicalCourse(r.courseId || parsed.courseId, parsed.examType);
            loadedTests.push({
              ...parsed,
              id: r.id,
              testId: r.id,
              courseId: cInfo.courseId,
              courseType: cInfo.courseType,
              published: r.published,
              attemptsCount: r.attemptsCount,
              avgScore: r.avgScore,
            });
            continue;
          }
        } catch {
          // fallback to reconstructing from questionIdsJson
        }
      }

      const seedMatch = seedMap.get(r.id);
      if (seedMatch) {
        loadedTests.push({
          ...seedMatch,
          published: r.published,
          attemptsCount: r.attemptsCount || seedMatch.attemptsCount || 0,
          avgScore: r.avgScore || seedMatch.avgScore || 0,
        });
        continue;
      }

      // Reconstruct from questionIdsJson
      let qIds: string[] = [];
      try {
        qIds = JSON.parse(r.questionIdsJson || '[]');
      } catch {
        qIds = [];
      }
      const resolvedQuestions = qIds
        .map((qid) => bankMap.get(qid))
        .filter((q): q is Question => Boolean(q));

      let subjects: SubjectName[] = ['Physics', 'Chemistry', 'Mathematics'];
      try {
        subjects = JSON.parse(r.subjectsJson || '["Physics"]');
      } catch {}

      let syllabus: string[] = [];
      try {
        syllabus = JSON.parse(r.syllabusJson || '[]');
      } catch {}

      const cInfo = normalizeCanonicalCourse(r.courseId || r.courseType, r.examType as ExamType);
      loadedTests.push({
        id: r.id,
        testId: r.id,
        title: r.title,
        subtitle: r.subtitle || 'Course Assessment Paper',
        courseId: cInfo.courseId,
        courseType: cInfo.courseType,
        examType: (r.examType as ExamType) || 'JEE_MAIN',
        testType: (r.testType as TestDefinition['testType']) || 'CUSTOM',
        patternYear: 2026,
        durationMinutes: r.durationMinutes,
        totalMarks: r.totalMarks,
        positiveMarks: r.positiveMarks,
        negativeMarks: r.negativeMarks,
        subjects,
        questionsCount: resolvedQuestions.length || r.questionsCount,
        difficulty: (r.difficulty as TestDefinition['difficulty']) || 'MEDIUM',
        syllabus,
        description: r.description || '',
        published: r.published,
        questions: resolvedQuestions,
        snapshotQuestionIds: qIds,
        testQuestions: buildTestQuestionMappings(r.id, resolvedQuestions, 1, 'Set A'),
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        attemptsCount: r.attemptsCount,
        avgScore: r.avgScore,
      });
    }

    // Ensure all SEED_TESTS are present even if DB was empty on first boot
    for (const st of SEED_TESTS) {
      const tId = st.testId || st.id;
      if (!seenIds.has(tId) && !seenIds.has(st.id)) {
        loadedTests.push(st);
      }
    }

    syncUsageRegistryFromTests(loadedTests);
    return loadedTests;
  } catch (err) {
    console.warn('Error loading tests from PostgreSQL, falling back to SEED_TESTS:', err);
    return [...SEED_TESTS];
  }
}

// Paginated query for Question Bank with strict course isolation & usage metrics
export async function getQuestionsPaginated(params: {
  page?: number;
  limit?: number;
  examType?: string;
  subject?: string;
  chapter?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  allowedCourseIds?: string[];
  allowedExamTypes?: string[];
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;

  const allQuestions = getCachedQuestionBank();
  let filtered = allQuestions;

  if (params.allowedCourseIds && params.allowedCourseIds.length > 0) {
    const allowedSet = new Set(params.allowedCourseIds);
    filtered = filtered.filter((q) => {
      const normCourse = normalizeCanonicalCourse(q.courseId || q.courseType, q.examType);
      return allowedSet.has(normCourse.courseId);
    });
  }
  if (params.allowedExamTypes && params.allowedExamTypes.length > 0) {
    const allowedSet = new Set(params.allowedExamTypes);
    filtered = filtered.filter((q) => allowedSet.has(q.examType));
  }
  if (params.examType && params.examType !== 'ALL') {
    filtered = filtered.filter((q) => q.examType === params.examType);
  }
  if (params.subject && params.subject !== 'ALL') {
    filtered = filtered.filter((q) => q.subject === params.subject);
  }
  if (params.chapter && params.chapter !== 'ALL') {
    filtered = filtered.filter((q) => q.chapter === params.chapter);
  }
  if (params.difficulty && params.difficulty !== 'ALL') {
    filtered = filtered.filter((q) => q.difficulty === params.difficulty);
  }
  if (params.status && params.status !== 'ALL') {
    filtered = filtered.filter((q) => q.status === params.status);
  }
  if (params.search && params.search.trim()) {
    const s = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (q) =>
        (q.questionId || q.id).toLowerCase().includes(s) ||
        q.questionText.toLowerCase().includes(s) ||
        q.chapter.toLowerCase().includes(s) ||
        q.topic.toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const items = filtered.slice(offset, offset + limit);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// Insert single question with canonical questionId & duplicate text prevention (Requirements 1 & 3)
export async function createQuestionInDb(q: Partial<Question>): Promise<Question> {
  const bank = getCachedQuestionBank();
  const examType: ExamType = q.examType || 'JEE_MAIN';
  const subject: SubjectName = q.subject || 'Physics';
  const normInput = normalizeQuestion(q.questionText || '');

  if (!normInput || normInput.length < 5) {
    throw new Error('Question text is too short or empty.');
  }

  // Requirement 3: Block duplicate normalized question text
  const duplicateByText = bank.find(
    (existing) =>
      existing.subject === subject &&
      normalizeQuestion(existing.questionText) === normInput
  );
  if (duplicateByText) {
    throw new Error(
      `Duplicate question text detected: identical question already exists with ID ${duplicateByText.questionId || duplicateByText.id}.`
    );
  }

  // Requirement 1: Assign permanent canonical questionId (e.g. jee_physics_000851)
  const existingForSubj = bank.filter(
    (item) => item.examType === examType && item.subject === subject
  );
  let nextSerial = existingForSubj.length + 1;
  let canonicalId =
    q.questionId && /^(jee_adv|jee|neet)_/.test(q.questionId)
      ? q.questionId
      : formatCanonicalQuestionId(examType, subject, nextSerial);

  const usedIds = new Set(bank.map((item) => item.questionId || item.id));
  while (usedIds.has(canonicalId)) {
    nextSerial++;
    canonicalId = formatCanonicalQuestionId(examType, subject, nextSerial);
  }

  const canonicalCourse = normalizeCanonicalCourse(q.courseId || q.courseType, examType);

  const newQ = enrichQuestionRecord(
    {
      id: canonicalId,
      questionId: canonicalId,
      courseId: canonicalCourse.courseId,
      courseType: canonicalCourse.courseType,
      examType,
      subject,
      chapter: q.chapter || 'General Chapter',
      topic: q.topic || q.chapter || 'General Topic',
      difficulty: q.difficulty || 'MEDIUM',
      type: q.type || 'MCQ',
      questionText: q.questionText || '',
      latex: q.latex,
      options: q.options,
      correctAnswer: q.correctAnswer || 'A',
      tolerance: q.tolerance,
      explanation: q.explanation || 'Detailed step-by-step solution.',
      positiveMarks: q.positiveMarks || 4,
      negativeMarks: q.negativeMarks ?? 1,
      source: q.source || 'ADMIN',
      status: q.status || 'PUBLISHED',
      createdAt: new Date().toISOString(),
      timesAttempted: 0,
      timesCorrect: 0,
      fingerprint: computeQuestionFingerprint(q.questionText || '', subject, q.type || 'MCQ'),
      normalizedText: normInput,
      timesUsed: 0,
      lastUsedAt: null,
      testIds: [],
    },
    nextSerial
  );

  try {
    await db
      .insert(questions)
      .values({
        id: newQ.id,
        courseId: canonicalCourse.courseId,
        courseType: canonicalCourse.courseType,
        examType: newQ.examType,
        subject: newQ.subject,
        chapter: newQ.chapter,
        topic: newQ.topic,
        difficulty: newQ.difficulty,
        type: newQ.type,
        questionText: newQ.questionText,
        latex: newQ.latex || null,
        optionsJson: newQ.options ? JSON.stringify(newQ.options) : null,
        correctAnswer: newQ.correctAnswer,
        tolerance: newQ.tolerance || null,
        explanation: newQ.explanation,
        positiveMarks: newQ.positiveMarks,
        negativeMarks: newQ.negativeMarks,
        source: newQ.source,
        status: newQ.status,
        timesAttempted: 0,
        timesCorrect: 0,
      })
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          questionText: newQ.questionText,
          explanation: newQ.explanation,
          correctAnswer: newQ.correctAnswer,
          status: newQ.status,
        },
      });
  } catch (err) {
    console.warn('Saved question in canonical cache:', err);
  }

  cachedQuestions.unshift(newQ);
  cachedCount = cachedQuestions.length;
  return newQ;
}

// Update existing question in PostgreSQL & canonical cache
export async function updateQuestionInDb(id: string, patch: Partial<Question>): Promise<Question | null> {
  const bank = getCachedQuestionBank();
  const idx = cachedQuestions.findIndex((q) => q.id === id || q.questionId === id);
  const existing = idx !== -1 ? cachedQuestions[idx] : bank.find((q) => q.id === id || q.questionId === id);

  if (!existing) return null;

  const updatedExamType = patch.examType || existing.examType;
  const canonicalCourse = normalizeCanonicalCourse(
    patch.courseId || patch.courseType || existing.courseId || existing.courseType,
    updatedExamType
  );

  const merged = enrichQuestionRecord({
    ...existing,
    ...patch,
    id: existing.id,
    questionId: existing.questionId || existing.id,
    courseId: canonicalCourse.courseId,
    courseType: canonicalCourse.courseType,
  });

  if (idx !== -1) {
    cachedQuestions[idx] = merged;
  } else {
    cachedQuestions.unshift(merged);
  }

  try {
    await db
      .update(questions)
      .set({
        courseId: canonicalCourse.courseId,
        courseType: canonicalCourse.courseType,
        examType: merged.examType,
        subject: merged.subject,
        chapter: merged.chapter,
        topic: merged.topic,
        difficulty: merged.difficulty,
        type: merged.type,
        questionText: merged.questionText,
        latex: merged.latex || null,
        optionsJson: merged.options ? JSON.stringify(merged.options) : null,
        correctAnswer: merged.correctAnswer,
        tolerance: merged.tolerance ?? null,
        explanation: merged.explanation,
        positiveMarks: merged.positiveMarks,
        negativeMarks: merged.negativeMarks,
        status: merged.status,
      })
      .where(eq(questions.id, existing.id));
  } catch (err) {
    console.warn('Failed to update question in PostgreSQL:', err);
  }

  return merged;
}

// Delete question
export async function deleteQuestionFromDb(id: string): Promise<boolean> {
  try {
    await db.delete(questions).where(eq(questions.id, id));
  } catch {}
  cachedQuestions = cachedQuestions.filter((q) => q.id !== id && q.questionId !== id);
  cachedCount = cachedQuestions.length;
  return true;
}

// Save Test Attempt
export async function saveAttemptToDb(attempt: TestAttemptResult) {
  try {
    const cInfo = normalizeCanonicalCourse(attempt.courseId || attempt.courseType, attempt.examType);
    const enrichedAttempt: TestAttemptResult = {
      ...attempt,
      courseId: cInfo.courseId,
      courseType: cInfo.courseType,
    };
    await db
      .insert(testAttempts)
      .values({
        id: enrichedAttempt.id,
        testId: enrichedAttempt.testId,
        testTitle: enrichedAttempt.testTitle,
        courseId: cInfo.courseId,
        courseType: cInfo.courseType,
        examType: enrichedAttempt.examType,
        studentId: enrichedAttempt.userId,
        userName: enrichedAttempt.userName,
        timeTakenSeconds: enrichedAttempt.timeTakenSeconds,
        totalScore: enrichedAttempt.totalScore,
        maxScore: enrichedAttempt.maxScore,
        percentage: enrichedAttempt.percentage,
        accuracy: enrichedAttempt.accuracy,
        attemptRate: enrichedAttempt.attemptRate,
        totalQuestions: enrichedAttempt.totalQuestions,
        totalAttempted: enrichedAttempt.totalAttempted,
        totalCorrect: enrichedAttempt.totalCorrect,
        totalIncorrect: enrichedAttempt.totalIncorrect,
        totalUnanswered: enrichedAttempt.totalUnanswered,
        negativeMarksLost: enrichedAttempt.negativeMarksLost,
        simulatedPercentile: enrichedAttempt.simulatedPercentile,
        practiceRank: enrichedAttempt.practiceRank,
        resultJson: JSON.stringify(enrichedAttempt),
      })
      .onConflictDoNothing();
  } catch (err) {
    console.warn('Failed to persist attempt to PostgreSQL:', err);
  }
}

export async function getAttemptsFromDb(): Promise<TestAttemptResult[]> {
  try {
    const rows = await db.select().from(testAttempts);
    const parsed: TestAttemptResult[] = [];
    for (const r of rows) {
      try {
        const item = JSON.parse(r.resultJson) as TestAttemptResult;
        const cInfo = normalizeCanonicalCourse(r.courseId || item.courseId, r.examType as ExamType);
        parsed.push({
          ...item,
          userId: r.studentId || item.userId,
          courseId: cInfo.courseId,
          courseType: cInfo.courseType,
        });
      } catch {
        // skip malformed
      }
    }
    return parsed.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  } catch (err) {
    console.warn('Failed to read attempts from PostgreSQL:', err);
    return [];
  }
}

// ----------------- PERSISTENT ACTIVE EXAM SESSIONS (CROSS-DEVICE AUTOSAVE) -----------------

export async function getActiveExamSessionFromDb(userId: string): Promise<ActiveExamSession | null> {
  try {
    const rows = await db
      .select()
      .from(activeExamSessions)
      .where(eq(activeExamSessions.userId, userId));
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].sessionJson) as ActiveExamSession;
  } catch (err) {
    console.warn('Failed to load active exam session from PostgreSQL:', err);
    return null;
  }
}

export async function saveActiveExamSessionToDb(
  userId: string,
  session: ActiveExamSession,
  courseId = 'course_jee'
): Promise<void> {
  try {
    const payload = {
      userId,
      testId: session.testId,
      courseId,
      examMode: session.examMode || 'SIMULATION',
      timerSecondsLeft: Math.max(0, Math.round(session.timerSecondsLeft || 0)),
      currentQuestionIdx: session.currentQuestionIdx || 0,
      sessionJson: JSON.stringify(session),
      updatedAt: new Date(),
    };
    await db
      .insert(activeExamSessions)
      .values(payload)
      .onConflictDoUpdate({
        target: activeExamSessions.userId,
        set: payload,
      });
  } catch (err) {
    console.warn('Failed to save active exam session to PostgreSQL:', err);
  }
}

export async function deleteActiveExamSessionFromDb(userId: string): Promise<void> {
  try {
    await db.delete(activeExamSessions).where(eq(activeExamSessions.userId, userId));
  } catch (err) {
    console.warn('Failed to delete active exam session from PostgreSQL:', err);
  }
}

// ----------------- PERSISTENT QUESTION BOOKMARKS -----------------

export async function getBookmarksForUserFromDb(userId: string): Promise<QuestionBookmark[]> {
  try {
    const rows = await db
      .select()
      .from(questionBookmarks)
      .where(eq(questionBookmarks.userId, userId))
      .orderBy(desc(questionBookmarks.createdAt));

    const bank = getCachedQuestionBank();
    const bankMap = new Map<string, Question>();
    bank.forEach((q) => {
      bankMap.set(q.id, q);
      if (q.questionId) bankMap.set(q.questionId, q);
    });

    return rows.map((r) => {
      let questionObj = bankMap.get(r.questionId);
      if (!questionObj && r.questionJson) {
        try {
          questionObj = JSON.parse(r.questionJson) as Question;
        } catch {}
      }
      return {
        id: r.id,
        questionId: r.questionId,
        collection: r.collection,
        note: r.note || undefined,
        createdAt: r.createdAt.toISOString(),
        question: questionObj,
      };
    });
  } catch (err) {
    console.warn('Failed to load bookmarks from PostgreSQL:', err);
    return [];
  }
}

export async function upsertBookmarkInDb(
  userId: string,
  bookmark: QuestionBookmark,
  courseId = 'course_jee'
): Promise<QuestionBookmark> {
  const id = bookmark.id || `bm-${userId}-${bookmark.questionId}`;
  try {
    const values = {
      id,
      userId,
      questionId: bookmark.questionId,
      courseId,
      collection: bookmark.collection || 'Important Revision',
      note: bookmark.note || '',
      questionJson: bookmark.question ? JSON.stringify(bookmark.question) : null,
      createdAt: new Date(bookmark.createdAt || Date.now()),
    };
    await db
      .insert(questionBookmarks)
      .values(values)
      .onConflictDoUpdate({
        target: questionBookmarks.id,
        set: {
          collection: values.collection,
          note: values.note,
          questionJson: values.questionJson,
        },
      });
  } catch (err) {
    console.warn('Failed to save bookmark to PostgreSQL:', err);
  }
  return { ...bookmark, id };
}

export async function deleteBookmarkFromDb(userId: string, questionId: string): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(questionBookmarks)
      .where(eq(questionBookmarks.userId, userId));
    const target = rows.find((r) => r.questionId === questionId || r.id === questionId);
    if (target) {
      await db.delete(questionBookmarks).where(eq(questionBookmarks.id, target.id));
    }
  } catch (err) {
    console.warn('Failed to delete bookmark from PostgreSQL:', err);
  }
}

// ----------------- PERSISTENT QUESTION ERROR REPORTS -----------------

export async function getQuestionReportsFromDb(): Promise<QuestionReport[]> {
  try {
    const rows = await db
      .select()
      .from(questionReports)
      .orderBy(desc(questionReports.createdAt));

    return rows.map((r) => ({
      id: r.id,
      questionId: r.questionId,
      testId: r.testId || undefined,
      studentName: r.studentName,
      reason: r.reason as QuestionReport['reason'],
      description: r.description,
      status: (r.status as QuestionReport['status']) || 'PENDING',
      createdAt: r.createdAt.toISOString(),
      questionSnippet: r.questionSnippet || undefined,
    }));
  } catch (err) {
    console.warn('Failed to load question reports from PostgreSQL:', err);
    return [];
  }
}

export async function createQuestionReportInDb(
  userId: string,
  report: QuestionReport
): Promise<QuestionReport> {
  try {
    await db
      .insert(questionReports)
      .values({
        id: report.id,
        questionId: report.questionId,
        testId: report.testId || null,
        userId,
        studentName: report.studentName,
        reason: report.reason,
        description: report.description,
        status: report.status || 'PENDING',
        questionSnippet: report.questionSnippet || null,
        createdAt: new Date(report.createdAt || Date.now()),
      })
      .onConflictDoNothing();
  } catch (err) {
    console.warn('Failed to save question report to PostgreSQL:', err);
  }
  return report;
}

export async function updateQuestionReportStatusInDb(
  reportId: string,
  status: 'RESOLVED' | 'DISMISSED'
): Promise<void> {
  try {
    await db
      .update(questionReports)
      .set({ status })
      .where(eq(questionReports.id, reportId));
  } catch (err) {
    console.warn('Failed to update question report status in PostgreSQL:', err);
  }
}

export const getAllTestsFromDb = getTestsFromDb;

