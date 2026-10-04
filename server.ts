import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { SEED_TESTS } from './src/data/seedTests';
import { Question, TestDefinition, TestAttemptResult } from './src/types/exam';
import { evaluateTestAttempt } from './src/utils/evaluationEngine';
import {
  ensureDatabaseSeeded,
  getQuestionsPaginated,
  createQuestionInDb,
  deleteQuestionFromDb,
  saveAttemptToDb,
  getAttemptsFromDb,
} from './src/db/repository.ts';
import {
  ensureAuthSeeded,
  authenticateUser,
  verifySessionToken,
  revokeSessionByToken,
  revokeAllUserSessions,
  completeFirstLoginPasswordChange,
  resetUserPasswordByStaff,
  getAllProfiles,
  createTeacherAccount,
  createStudentAccount,
  updateProfileByStaff,
  deleteProfileByAdmin,
  getAllBatches,
  createBatchRecord,
  updateBatchRecord,
  deleteBatchRecord,
  getAllAnnouncements,
  createAnnouncementRecord,
  deleteAnnouncementRecord,
  createPasswordRecoveryRequest,
  getPasswordRecoveryRequests,
  resolvePasswordRecoveryRequest,
  getAllTestAssignments,
  upsertTestAssignment,
  getAuditLogs,
  getStudentIdConfig,
  updateStudentIdConfig,
  generateUniqueStudentId,
  createAuditLog,
} from './src/db/authRepository.ts';
import {
  AuthenticatedRequest,
  requireSessionAuth,
  requireRoles,
} from './src/middleware/auth.ts';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '15mb' }));

// Runtime test definitions and attempts backed by PostgreSQL
let testsDB: TestDefinition[] = [...SEED_TESTS];
let attemptsDB: TestAttemptResult[] = [];

// Initialize Gemini AI Client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// Seed PostgreSQL question bank, RBAC profiles, and load historical attempts
Promise.all([
  ensureDatabaseSeeded(),
  ensureAuthSeeded(),
  getAttemptsFromDb().then((loaded) => {
    if (loaded.length > 0) {
      attemptsDB = loaded;
    }
  }),
]).catch((err) => {
  console.warn('Database initialization note:', err);
});

// ----------------- AUTHENTICATION & RBAC API ROUTES -----------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, identifier, password, rememberMe } = req.body;
    if (!role || !identifier || !password) {
      return res.status(400).json({
        error: 'Please provide your role, login identifier, and password.',
      });
    }

    const result = await authenticateUser({
      role,
      identifier,
      password,
      rememberMe: Boolean(rememberMe),
      userAgent: req.headers['user-agent'] || 'Web Client',
      ipAddress: req.ip || '127.0.0.1',
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        error: result.error,
        accountStatus: result.accountStatus,
      });
    }

    return res.json({
      token: result.token,
      profile: result.profile,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Authentication service error.' });
  }
});

// GET /api/auth/session - Verify active session token
app.get('/api/auth/session', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'No session token provided.' });
  }
  const rawToken = authHeader.slice(7).trim();
  const verification = await verifySessionToken(rawToken);
  if (!verification.valid) {
    return res.status(verification.accountStatus ? 403 : 401).json(verification);
  }
  return res.json({ valid: true, profile: verification.profile });
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    await revokeSessionByToken(rawToken);
  }
  return res.json({ success: true });
});

// POST /api/auth/first-login-password - Forced password creation on 1st student login
app.post(
  '/api/auth/first-login-password',
  requireSessionAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { newPassword } = req.body;
      if (!req.authProfile) {
        return res.status(401).json({ error: 'Not authenticated.' });
      }
      const result = await completeFirstLoginPasswordChange({
        userId: req.authProfile.id,
        newPassword,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json({ success: true, profile: result.profile });
    } catch (err) {
      console.error('First login password change error:', err);
      return res.status(500).json({ error: 'Failed to update password.' });
    }
  }
);

// POST /api/auth/forgot-password - Request password recovery
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { role, identifier, reason } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Please provide your Student ID or Email.' });
    }
    const result = await createPasswordRecoveryRequest({
      role: role || 'STUDENT',
      identifier,
      reason,
    });
    return res.json(result);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to submit recovery request.' });
  }
});

// GET /api/auth/users - List profiles (Admin gets all, Teacher gets assigned students + teachers)
app.get(
  '/api/auth/users',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const all = await getAllProfiles();
      const actor = req.authProfile!;
      if (actor.role === 'ADMIN' || actor.teacherPermissions.canViewAllStudents) {
        return res.json(all);
      }
      // Teacher only sees students assigned to them (or in their batches) + themselves
      const allBatches = await getAllBatches();
      const teacherBatchIds = new Set(
        allBatches.filter((b) => b.teacherId === actor.id).map((b) => b.id)
      );
      const filtered = all.filter(
        (u) =>
          u.id === actor.id ||
          (u.role === 'STUDENT' &&
            (u.teacherId === actor.id || (u.batchId && teacherBatchIds.has(u.batchId))))
      );
      return res.json(filtered);
    } catch (err) {
      console.error('Error listing users:', err);
      return res.status(500).json({ error: 'Failed to load users.' });
    }
  }
);

// POST /api/auth/teachers - Admin creates a teacher account
app.post(
  '/api/auth/teachers',
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await createTeacherAccount({
        ...req.body,
        actor: req.authProfile!,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (err) {
      console.error('Create teacher error:', err);
      return res.status(500).json({ error: 'Failed to create teacher account.' });
    }
  }
);

// POST /api/auth/students - Teacher or Admin creates a student account & generates unique Student ID
app.post(
  '/api/auth/students',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await createStudentAccount({
        ...req.body,
        actor: req.authProfile!,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.status(201).json(result);
    } catch (err) {
      console.error('Create student error:', err);
      return res.status(500).json({ error: 'Failed to create student account.' });
    }
  }
);

// POST /api/auth/generate-student-id-preview
app.post(
  '/api/auth/generate-student-id-preview',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req, res) => {
    try {
      const { examCategory, mode } = req.body;
      const previewId = await generateUniqueStudentId(examCategory || 'JEE_MAIN', mode);
      return res.json({ studentId: previewId });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to generate Student ID.' });
    }
  }
);

// PATCH /api/auth/users/:id - Update user profile, status, permissions, batch, or teacher
app.patch(
  '/api/auth/users/:id',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await updateProfileByStaff({
        targetUserId: req.params.id,
        patch: req.body,
        actor: req.authProfile!,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json(result);
    } catch (err) {
      console.error('Update user error:', err);
      return res.status(500).json({ error: 'Failed to update user.' });
    }
  }
);

// DELETE /api/auth/users/:id - Admin deletes user account
app.delete(
  '/api/auth/users/:id',
  requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await deleteProfileByAdmin({
        targetUserId: req.params.id,
        actor: req.authProfile!,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete user.' });
    }
  }
);

// POST /api/auth/users/:id/reset-password - Staff resets user credentials
app.post(
  '/api/auth/users/:id/reset-password',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { newTemporaryPassword, forceChangeOnNextLogin } = req.body;
      const result = await resetUserPasswordByStaff({
        targetUserId: req.params.id,
        newTemporaryPassword,
        forceChangeOnNextLogin: forceChangeOnNextLogin !== false,
        actor: req.authProfile!,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reset credentials.' });
    }
  }
);

// POST /api/auth/users/:id/revoke-sessions - Force logout user across all devices
app.post(
  '/api/auth/users/:id/revoke-sessions',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const count = await revokeAllUserSessions(req.params.id);
      await createAuditLog({
        actorId: req.authProfile!.id,
        actorName: req.authProfile!.fullName,
        actorRole: req.authProfile!.role,
        action: 'FORCE_LOGOUT_SESSIONS',
        target: req.params.id,
        details: `Revoked ${count} active session(s)`,
      });
      return res.json({ success: true, revokedCount: count });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to revoke sessions.' });
    }
  }
);

// ----------------- BATCHES & CLASSES ENDPOINTS -----------------

app.get('/api/auth/batches', requireSessionAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const all = await getAllBatches();
    return res.json(all);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load batches.' });
  }
});

app.post(
  '/api/auth/batches',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await createBatchRecord({
        ...req.body,
        actor: req.authProfile!,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.status(201).json(result.batch);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create batch.' });
    }
  }
);

app.patch(
  '/api/auth/batches/:id',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await updateBatchRecord({
        batchId: req.params.id,
        patch: req.body,
        actor: req.authProfile!,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json(result.batch);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update batch.' });
    }
  }
);

app.delete(
  '/api/auth/batches/:id',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      await deleteBatchRecord(req.params.id, req.authProfile!);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete batch.' });
    }
  }
);

// ----------------- ANNOUNCEMENTS ENDPOINTS -----------------

app.get('/api/auth/announcements', requireSessionAuth, async (_req, res) => {
  try {
    const list = await getAllAnnouncements();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load announcements.' });
  }
});

app.post(
  '/api/auth/announcements',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const item = await createAnnouncementRecord({
        ...req.body,
        actor: req.authProfile!,
      });
      return res.status(201).json(item);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to publish announcement.' });
    }
  }
);

app.delete(
  '/api/auth/announcements/:id',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req, res) => {
    try {
      await deleteAnnouncementRecord(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete announcement.' });
    }
  }
);

// ----------------- TEST ACCESS CONTROL ENDPOINTS -----------------

app.get('/api/auth/test-assignments', requireSessionAuth, async (_req, res) => {
  try {
    const list = await getAllTestAssignments();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load test assignments.' });
  }
});

app.post(
  '/api/auth/test-assignments',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const record = await upsertTestAssignment({
        ...req.body,
        actor: req.authProfile!,
      });
      return res.json(record);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update test access rules.' });
    }
  }
);

// ----------------- PASSWORD RECOVERY & AUDIT LOGS & STUDENT ID CONFIG -----------------

app.get(
  '/api/auth/recovery-requests',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const list = await getPasswordRecoveryRequests();
      const actor = req.authProfile!;
      if (actor.role === 'ADMIN') return res.json(list);
      return res.json(list.filter((r) => r.teacherId === actor.id));
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load password recovery requests.' });
    }
  }
);

app.post(
  '/api/auth/recovery-requests/:id/resolve',
  requireRoles(['ADMIN', 'TEACHER']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await resolvePasswordRecoveryRequest({
        requestId: req.params.id,
        newTemporaryPassword: req.body.newTemporaryPassword,
        actor: req.authProfile!,
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to resolve recovery request.' });
    }
  }
);

app.get('/api/auth/audit-logs', requireRoles(['ADMIN']), async (_req, res) => {
  try {
    const logs = await getAuditLogs(150);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

app.get('/api/auth/student-id-config', requireRoles(['ADMIN', 'TEACHER']), async (_req, res) => {
  try {
    const config = await getStudentIdConfig();
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load Student ID configuration.' });
  }
});

app.patch('/api/auth/student-id-config', requireRoles(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateStudentIdConfig(req.body);
    await createAuditLog({
      actorId: req.authProfile!.id,
      actorName: req.authProfile!.fullName,
      actorRole: req.authProfile!.role,
      action: 'UPDATE_STUDENT_ID_CONFIG',
      target: 'Student ID Generator Prefixes',
      details: `Prefixes: JEE=${updated.jeeMainPrefix}, ADV=${updated.jeeAdvancedPrefix}, NEET=${updated.neetPrefix}`,
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update Student ID configuration.' });
  }
});

// ----------------- EXAM & QUESTION BANK API ROUTES -----------------

const seedTestIds = new Set(SEED_TESTS.map((t) => t.id));

// GET /api/tests - list all published tests
app.get('/api/tests', (req, res) => {
  const { examType, testType, customOnly } = req.query;
  let results = testsDB;
  if (customOnly === 'true') {
    results = results.filter((t) => !seedTestIds.has(t.id));
  }
  if (examType && typeof examType === 'string' && examType !== 'ALL') {
    results = results.filter((t) => t.examType === examType);
  }
  if (testType && typeof testType === 'string' && testType !== 'ALL') {
    results = results.filter((t) => t.testType === testType);
  }
  res.json(results);
});

// GET /api/tests/:id - get single test
app.get('/api/tests/:id', (req, res) => {
  const test = testsDB.find((t) => t.id === req.params.id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }
  res.json(test);
});

// POST /api/tests - create / publish a new test
app.post('/api/tests', (req, res) => {
  const newTest: TestDefinition = {
    id: req.body.id || `test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: req.body.title || 'Custom Practice Paper',
    subtitle: req.body.subtitle || 'Generated Examination Paper',
    examType: req.body.examType || 'JEE_MAIN',
    testType: req.body.testType || 'CUSTOM',
    patternYear: Number(req.body.patternYear) || 2026,
    patternSource: req.body.patternSource || 'NTA/JAB Official Information Bulletin 2026',
    durationMinutes: Number(req.body.durationMinutes) || 60,
    totalMarks: Number(req.body.totalMarks) || 100,
    positiveMarks: Number(req.body.positiveMarks) || 4,
    negativeMarks: Number(req.body.negativeMarks) || 1,
    subjects: req.body.subjects || ['Physics'],
    questionsCount: req.body.questions ? req.body.questions.length : 0,
    difficulty: req.body.difficulty || 'MEDIUM',
    syllabus: req.body.syllabus || [],
    description: req.body.description || 'Practice test created on NTA Pulse',
    isAiGenerated: req.body.isAiGenerated || false,
    published: req.body.published !== undefined ? req.body.published : true,
    questions: req.body.questions || [],
    createdAt: new Date().toISOString(),
    attemptsCount: 0,
    avgScore: 0,
  };

  testsDB.unshift(newTest);
  res.status(201).json(newTest);
});

// PATCH /api/tests/:id - update test (publish/unpublish, edit title, duration, etc.)
app.patch('/api/tests/:id', (req, res) => {
  const idx = testsDB.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Test not found' });
  }
  testsDB[idx] = { ...testsDB[idx], ...req.body };
  res.json(testsDB[idx]);
});

// DELETE /api/tests/:id - delete test
app.delete('/api/tests/:id', (req, res) => {
  testsDB = testsDB.filter((t) => t.id !== req.params.id);
  res.json({ success: true });
});

// GET /api/questions - paginated query across 10,000+ questions
app.get('/api/questions', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const examType = req.query.examType as string;
    const subject = req.query.subject as string;
    const chapter = req.query.chapter as string;
    const difficulty = req.query.difficulty as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const result = await getQuestionsPaginated({
      page,
      limit,
      examType,
      subject,
      chapter,
      difficulty,
      status,
      search,
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching paginated questions:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /api/questions - add a new question to PostgreSQL & cache
app.post('/api/questions', async (req, res) => {
  try {
    const created = await createQuestionInDb(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// DELETE /api/questions/:id
app.delete('/api/questions/:id', async (req, res) => {
  try {
    await deleteQuestionFromDb(req.params.id);
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// POST /api/evaluate - Server-side authoritative test evaluation
app.post('/api/evaluate', async (req, res) => {
  const { testId, responses, timeTakenSeconds, userId, userName, startedAt } = req.body;
  const targetTest = testsDB.find((t) => t.id === testId) || req.body.testDefinition;

  if (!targetTest) {
    return res.status(404).json({ error: 'Test definition not found for evaluation' });
  }

  const result = evaluateTestAttempt(
    targetTest,
    responses || {},
    (targetTest.durationMinutes || 180) * 60,
    Number(timeTakenSeconds) || 0,
    userId || 'usr-student-rahul',
    userName || 'Rahul Verma'
  );

  attemptsDB.unshift(result);
  await saveAttemptToDb(result);
  res.json(result);
});

// GET /api/attempts - list attempts
app.get('/api/attempts', (req, res) => {
  const { userId } = req.query;
  if (userId && typeof userId === 'string') {
    return res.json(attemptsDB.filter((a) => a.userId === userId));
  }
  res.json(attemptsDB);
});

// POST /api/ai/generate-questions - Server-side Gemini Question Generator
app.post('/api/ai/generate-questions', async (req, res) => {
  const { examType, subject, chapter, topic, difficulty, count, questionType } = req.body;
  const questionCount = Math.min(Number(count) || 5, 15);

  if (aiClient) {
    try {
      const prompt = `Generate ${questionCount} authentic ${examType || 'JEE_MAIN'} exam questions for:
Subject: ${subject || 'Physics'}
Chapter: ${chapter || 'Electrostatics'}
Topic: ${topic || 'Coulomb Law and Electric Field'}
Difficulty: ${difficulty || 'MEDIUM'}
Question Type: ${questionType || 'MCQ'}

Return a valid JSON array where each object has:
- questionText: clear scientific question statement
- latex: optional key formula in LaTeX
- type: "MCQ" or "NUMERICAL"
- options: if MCQ, array of 4 objects [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}]
- correctAnswer: "A"/"B"/"C"/"D" for MCQ, or exact numeric string like "4.5" for NUMERICAL
- explanation: step-by-step derivation and physical/chemical/mathematical principle.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '[]';
      const parsed = JSON.parse(rawText);
      const generatedQuestions: Question[] = (Array.isArray(parsed) ? parsed : []).map(
        (item: any, idx: number) => ({
          id: `ai-q-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          examType: examType || 'JEE_MAIN',
          subject: subject || 'Physics',
          chapter: chapter || 'Electrostatics',
          topic: topic || 'Core Concept',
          difficulty: difficulty || 'MEDIUM',
          type: item.type === 'NUMERICAL' ? 'NUMERICAL' : 'MCQ',
          questionText: item.questionText || 'Generated competitive exam question',
          latex: item.latex || undefined,
          options: item.type === 'NUMERICAL' ? undefined : item.options,
          correctAnswer: String(item.correctAnswer || 'A'),
          tolerance: item.type === 'NUMERICAL' ? 0.1 : undefined,
          explanation: item.explanation || 'Detailed step-by-step solution.',
          positiveMarks: 4,
          negativeMarks: item.type === 'NUMERICAL' ? 0 : 1,
          source: 'AI',
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          timesAttempted: 0,
          timesCorrect: 0,
        })
      );

      return res.json({ questions: generatedQuestions, source: 'gemini-3.8-flash' });
    } catch (err) {
      console.warn('Gemini API call note, fallback used:', err);
    }
  }

  // Fallback high-yield questions
  const fallbackList: Question[] = [];
  for (let i = 0; i < questionCount; i++) {
    const isNum = questionType === 'NUMERICAL' || (i % 2 === 1 && questionType !== 'MCQ');
    const qSubject = subject || 'Physics';
    const qChapter = chapter || 'Electrostatics';
    fallbackList.push({
      id: `ai-gen-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      examType: examType || 'JEE_MAIN',
      subject: qSubject,
      chapter: qChapter,
      topic: topic || 'Core Principle',
      difficulty: difficulty || 'MEDIUM',
      type: isNum ? 'NUMERICAL' : 'MCQ',
      questionText: `An electron is accelerated through potential $V = ${(i + 1) * 50}\\text{ V}$. Find its kinetic energy in $\\text{eV}$:`,
      latex: 'K = e V',
      options: isNum
        ? undefined
        : [
            { id: 'A', text: `${(i + 1) * 50} eV` },
            { id: 'B', text: `${(i + 1) * 25} eV` },
            { id: 'C', text: `${(i + 1) * 100} eV` },
            { id: 'D', text: `10 eV` },
          ],
      correctAnswer: `${(i + 1) * 50}`,
      tolerance: isNum ? 0.1 : undefined,
      explanation:
        'Kinetic energy gained by charge $e$ falling through potential difference $V$ is $K = eV$.',
      positiveMarks: 4,
      negativeMarks: isNum ? 0 : 1,
      source: 'AI',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      timesAttempted: 0,
      timesCorrect: 0,
    });
  }

  res.json({ questions: fallbackList, source: 'algorithmic-high-yield' });
});

// POST /api/ai/generate-blueprint
app.post('/api/ai/generate-blueprint', (req, res) => {
  const { examType, testType, durationMinutes, totalQuestions } = req.body;
  const isJee = (examType || 'JEE_MAIN').startsWith('JEE');
  const subjects = isJee
    ? ['Physics', 'Chemistry', 'Mathematics']
    : ['Physics', 'Chemistry', 'Botany', 'Zoology'];
  const questionsPerSubj = Math.floor((totalQuestions || 75) / subjects.length);

  const blueprint = {
    id: `bp-${Date.now()}`,
    title: `${examType === 'NEET' ? 'NEET UG' : 'JEE Main'} All-India Paper Blueprint`,
    examType: examType || 'JEE_MAIN',
    testType: testType || 'FULL_MOCK',
    durationMinutes: Number(durationMinutes) || (isJee ? 180 : 200),
    totalQuestions: totalQuestions || (isJee ? 75 : 180),
    positiveMarks: 4,
    negativeMarks: 1,
    subjects,
    difficultySplit: {
      easyPercent: 30,
      mediumPercent: 50,
      hardPercent: 20,
    },
    questionTypesSplit: {
      mcqCount: isJee ? 60 : 180,
      numericalCount: isJee ? 15 : 0,
    },
    chaptersDistribution: subjects.map((s) => ({
      subject: s,
      questionsCount: questionsPerSubj,
      keyChapters:
        s === 'Physics'
          ? ['Mechanics', 'Electrostatics', 'Thermodynamics', 'Modern Physics', 'Optics']
          : s === 'Chemistry'
          ? [
              'Chemical Kinetics',
              'Coordination Chemistry',
              'Organic Reaction Mechanisms',
              'Thermodynamics',
            ]
          : s === 'Mathematics'
          ? ['Calculus', 'Vectors & 3D', 'Matrices & Determinants', 'Coordinate Geometry']
          : s === 'Botany'
          ? ['Plant Physiology', 'Genetics & Evolution', 'Cell Biology']
          : ['Human Physiology', 'Endocrine & Neural Control', 'Biotechnology'],
    })),
  };

  res.json(blueprint);
});

// Setup Vite or Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
