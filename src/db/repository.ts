import { db } from './index.ts';
import { questions, tests, testAttempts } from './schema.ts';
import { eq, and, sql, ilike, or, inArray } from 'drizzle-orm';
import {
  Question,
  TestDefinition,
  TestAttemptResult,
  SubjectName,
  ExamType,
  Difficulty,
  QuestionStatus,
} from '../types/exam';
import { generateQuestionBank } from './questionBankGenerator';
import { SEED_TESTS } from '../data/seedTests';
import {
  normalizeQuestion,
  computeQuestionFingerprint,
  formatCanonicalQuestionId,
  enrichQuestionRecord,
  getQuestionUsage,
  syncUsageRegistryFromTests,
  deduplicateAndMigrateQuestionBank,
} from '../data/questionBankEngine';

// In-memory fast cache synchronized with canonical Question Bank and usage registry
let cachedQuestions: Question[] = [];
let cachedCount = 0;
let isSeeding = false;

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

export async function ensureDatabaseSeeded(): Promise<number> {
  const bank = getCachedQuestionBank();
  if (isSeeding) return bank.length;

  try {
    const countRes = await db.select({ count: sql<number>`count(*)` }).from(questions);
    const dbCount = Number(countRes[0]?.count || 0);

    if (dbCount >= bank.length) {
      cachedCount = dbCount;
      return dbCount;
    }

    isSeeding = true;
    const chunkSize = 250;
    (async () => {
      try {
        for (let i = 0; i < bank.length; i += chunkSize) {
          const chunk = bank.slice(i, i + chunkSize);
          await db
            .insert(questions)
            .values(
              chunk.map((q) => ({
                id: q.questionId || q.id,
                courseId:
                  q.courseId ||
                  (q.examType === 'NEET'
                    ? 'course_neet'
                    : q.examType === 'JEE_ADVANCED'
                    ? 'course_jee_adv'
                    : 'course_jee'),
                courseType:
                  q.courseType ||
                  (q.examType === 'NEET'
                    ? 'NEET'
                    : q.examType === 'JEE_ADVANCED'
                    ? 'JEE_ADVANCED'
                    : 'JEE'),
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
              }))
            )
            .onConflictDoNothing();
        }
      } catch (err) {
        console.warn('Database background seed note:', err);
      } finally {
        isSeeding = false;
      }
    })();

    const testCountRes = await db.select({ count: sql<number>`count(*)` }).from(tests);
    if (Number(testCountRes[0]?.count || 0) === 0) {
      for (const t of SEED_TESTS) {
        await db
          .insert(tests)
          .values({
            id: t.testId || t.id,
            title: t.title,
            subtitle: t.subtitle,
            examType: t.examType,
            testType: t.testType,
            durationMinutes: t.durationMinutes,
            totalMarks: t.totalMarks,
            positiveMarks: t.positiveMarks,
            negativeMarks: t.negativeMarks,
            subjectsJson: JSON.stringify(t.subjects),
            questionsCount: t.questionsCount,
            difficulty: t.difficulty,
            syllabusJson: JSON.stringify(t.syllabus),
            description: t.description,
            questionIdsJson: JSON.stringify(t.questions.map((q) => q.questionId || q.id)),
            published: t.published,
            attemptsCount: t.attemptsCount || 0,
            avgScore: t.avgScore || 0,
          })
          .onConflictDoNothing();
      }
    }

    return bank.length;
  } catch (err) {
    isSeeding = false;
    return bank.length;
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
    filtered = filtered.filter((q) => q.courseId && allowedSet.has(q.courseId));
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

  const newQ = enrichQuestionRecord(
    {
      id: canonicalId,
      questionId: canonicalId,
      courseId: q.courseId,
      courseType: q.courseType,
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
    await db.insert(questions).values({
      id: newQ.id,
      courseId: newQ.courseId!,
      courseType: newQ.courseType!,
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
    });
  } catch (err) {
    console.warn('Saved question in canonical cache:', err);
  }

  cachedQuestions.unshift(newQ);
  cachedCount = cachedQuestions.length;
  return newQ;
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
    await db.insert(testAttempts).values({
      id: attempt.id,
      testId: attempt.testId,
      testTitle: attempt.testTitle,
      examType: attempt.examType,
      userId: attempt.userId,
      userName: attempt.userName,
      timeTakenSeconds: attempt.timeTakenSeconds,
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      accuracy: attempt.accuracy,
      attemptRate: attempt.attemptRate,
      totalQuestions: attempt.totalQuestions,
      totalAttempted: attempt.totalAttempted,
      totalCorrect: attempt.totalCorrect,
      totalIncorrect: attempt.totalIncorrect,
      totalUnanswered: attempt.totalUnanswered,
      negativeMarksLost: attempt.negativeMarksLost,
      simulatedPercentile: attempt.simulatedPercentile,
      practiceRank: attempt.practiceRank,
      resultJson: JSON.stringify(attempt),
    });
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
        parsed.push(item);
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
