import { pgTable, text, serial, integer, timestamp, boolean, real, index } from 'drizzle-orm/pg-core';

// Legacy Users table kept for compatibility
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('student').notNull(),
  targetExam: text('target_exam').default('JEE_MAIN').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Enterprise Profiles table for RBAC (ADMIN, TEACHER, STUDENT)
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  username: text('username').unique(),
  email: text('email').unique(),
  fullName: text('full_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('STUDENT').notNull(), // 'ADMIN' | 'TEACHER' | 'STUDENT'
  studentId: text('student_id').unique(), // e.g., JEE26-10001, NEET26-10001
  teacherId: text('teacher_id'), // Assigned teacher ID for students
  batchId: text('batch_id'), // Assigned primary batch ID
  className: text('class_name').default('Class 12'),
  examCategory: text('exam_category').default('JEE_MAIN').notNull(), // 'JEE_MAIN' | 'JEE_ADVANCED' | 'NEET'
  targetYear: integer('target_year').default(2026).notNull(),
  subjectAccessJson: text('subject_access_json').default('["Physics","Chemistry","Mathematics"]').notNull(),
  testAccessJson: text('test_access_json').default('[]').notNull(),
  teacherPermissionsJson: text('teacher_permissions_json').default('{"canCreateTests":true,"canCreateQuestions":true,"canManageBatches":true,"canResetStudentPasswords":true,"canViewAllStudents":false}').notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'PENDING'
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  tempPasswordHint: text('temp_password_hint'), // Only visible to Admin/Teacher who generated it until changed
  expiresAt: timestamp('expires_at'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_profiles_role').on(table.role),
  index('idx_profiles_student_id').on(table.studentId),
  index('idx_profiles_teacher_id').on(table.teacherId),
  index('idx_profiles_batch_id').on(table.batchId),
  index('idx_profiles_status').on(table.status),
]);

// Persistent Auth Sessions table
export const authSessions = pgTable('auth_sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  rememberMe: boolean('remember_me').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_sessions_user_id').on(table.userId),
  index('idx_sessions_token_hash').on(table.tokenHash),
]);

// Classes / Batches table
export const batches = pgTable('batches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').default(''),
  examCategory: text('exam_category').default('JEE_MAIN').notNull(),
  className: text('class_name').default('Class 12').notNull(),
  teacherId: text('teacher_id').notNull(),
  teacherName: text('teacher_name').notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'ARCHIVED'
  assignedTestIdsJson: text('assigned_test_ids_json').default('[]').notNull(),
  studentIdsJson: text('student_ids_json').default('[]').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_batches_teacher_id').on(table.teacherId),
]);

// Test Access Control & Assignments table
export const testAssignments = pgTable('test_assignments', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull().unique(),
  visibility: text('visibility').default('PUBLIC').notNull(), // 'PUBLIC' | 'ASSIGNED_ONLY'
  assignedByUserId: text('assigned_by_user_id').notNull(),
  assignedTeacherIdsJson: text('assigned_teacher_ids_json').default('[]').notNull(),
  assignedBatchIdsJson: text('assigned_batch_ids_json').default('[]').notNull(),
  assignedStudentIdsJson: text('assigned_student_ids_json').default('[]').notNull(),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Platform & Batch Announcements table
export const announcements = pgTable('announcements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull(), // 'ADMIN' | 'TEACHER'
  targetAudience: text('target_audience').default('ALL').notNull(), // 'ALL' | 'TEACHERS' | 'STUDENTS' | 'BATCH'
  targetBatchId: text('target_batch_id'),
  priority: text('priority').default('NORMAL').notNull(), // 'NORMAL' | 'IMPORTANT' | 'URGENT'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Password Recovery Requests table
export const passwordRecoveryRequests = pgTable('password_recovery_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  identifier: text('identifier').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  teacherId: text('teacher_id'),
  reason: text('reason').default('Forgot password / requested credential reset'),
  status: text('status').default('PENDING').notNull(), // 'PENDING' | 'RESOLVED' | 'REJECTED'
  recoveryCode: text('recovery_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

// Platform Settings table (Student ID prefixes, counters, global settings)
export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Questions table with indexes for high-speed queries on 10,000+ items
export const questions = pgTable('questions', {
  id: text('id').primaryKey(),
  examType: text('exam_type').notNull(),
  subject: text('subject').notNull(),
  chapter: text('chapter').notNull(),
  topic: text('topic').notNull(),
  difficulty: text('difficulty').notNull(),
  type: text('type').notNull(), // MCQ | NUMERICAL
  questionText: text('question_text').notNull(),
  latex: text('latex'),
  optionsJson: text('options_json'), // JSON array of options
  correctAnswer: text('correct_answer').notNull(),
  tolerance: real('tolerance'),
  explanation: text('explanation').notNull(),
  positiveMarks: integer('positive_marks').default(4).notNull(),
  negativeMarks: integer('negative_marks').default(1).notNull(),
  source: text('source').default('ADMIN').notNull(), // AI | ADMIN | SEED
  status: text('status').default('PUBLISHED').notNull(), // DRAFT | APPROVED | PUBLISHED
  timesAttempted: integer('times_attempted').default(0).notNull(),
  timesCorrect: integer('times_correct').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_questions_exam_subject').on(table.examType, table.subject),
  index('idx_questions_chapter').on(table.chapter),
  index('idx_questions_difficulty').on(table.difficulty),
  index('idx_questions_status').on(table.status),
]);

// Tests table
export const tests = pgTable('tests', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  examType: text('exam_type').notNull(),
  testType: text('test_type').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  totalMarks: integer('total_marks').notNull(),
  positiveMarks: integer('positive_marks').default(4).notNull(),
  negativeMarks: integer('negative_marks').default(1).notNull(),
  subjectsJson: text('subjects_json').notNull(), // JSON array
  questionsCount: integer('questions_count').notNull(),
  difficulty: text('difficulty').default('MEDIUM').notNull(),
  syllabusJson: text('syllabus_json'), // JSON array
  description: text('description'),
  questionIdsJson: text('question_ids_json').notNull(), // JSON array
  published: boolean('published').default(true).notNull(),
  attemptsCount: integer('attempts_count').default(0).notNull(),
  avgScore: integer('avg_score').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_tests_exam_type').on(table.examType),
  index('idx_tests_published').on(table.published),
]);

// Test Attempts table
export const testAttempts = pgTable('test_attempts', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull(),
  testTitle: text('test_title').notNull(),
  examType: text('exam_type').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  submittedAt: timestamp('submitted_at').defaultNow(),
  timeTakenSeconds: integer('time_taken_seconds').notNull(),
  totalScore: integer('total_score').notNull(),
  maxScore: integer('max_score').notNull(),
  percentage: integer('percentage').notNull(),
  accuracy: integer('accuracy').notNull(),
  attemptRate: integer('attempt_rate').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  totalAttempted: integer('total_attempted').notNull(),
  totalCorrect: integer('total_correct').notNull(),
  totalIncorrect: integer('total_incorrect').notNull(),
  totalUnanswered: integer('total_unanswered').notNull(),
  negativeMarksLost: integer('negative_marks_lost').notNull(),
  simulatedPercentile: real('simulated_percentile').notNull(),
  practiceRank: integer('practice_rank').notNull(),
  resultJson: text('result_json').notNull(),
}, (table) => [
  index('idx_attempts_user_id').on(table.userId),
  index('idx_attempts_test_id').on(table.testId),
]);
