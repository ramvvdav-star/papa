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

// Courses table (Section 1 & Section 5: JEE, JEE_ADVANCED, NEET)
export const courses = pgTable('courses', {
  id: text('id').primaryKey(), // 'course_jee' | 'course_jee_adv' | 'course_neet'
  name: text('name').notNull(), // 'JEE (Main)' | 'JEE (Advanced)' | 'NEET (UG)'
  type: text('type').notNull(), // 'JEE' | 'JEE_ADVANCED' | 'NEET'
  description: text('description').default('').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_courses_type').on(table.type),
]);

// Student Course Enrollments table (Section 1, 5, 17, 24)
export const enrollments = pgTable('enrollments', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(), // profile.id
  courseId: text('course_id').notNull(), // 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType: text('course_type').notNull(), // 'JEE' | 'JEE_ADVANCED' | 'NEET'
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'INACTIVE'
  assignedBy: text('assigned_by').default('usr-admin-1').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_enrollments_student_id').on(table.studentId),
  index('idx_enrollments_course_id').on(table.courseId),
  index('idx_enrollments_status').on(table.status),
]);

// Course-Scoped Study Materials table (Section 2, 3, 5, 26)
export const studyMaterials = pgTable('study_materials', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull(), // 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType: text('course_type').notNull(), // 'JEE' | 'JEE_ADVANCED' | 'NEET'
  subject: text('subject').notNull(),
  chapter: text('chapter').notNull(),
  title: text('title').notNull(),
  materialType: text('material_type').default('NOTES').notNull(), // 'NOTES' | 'FORMULA_SHEET' | 'PYQ_BOOKLET' | 'CONCEPT_SUMMARY'
  description: text('description').default('').notNull(),
  contentBody: text('content_body').default('').notNull(),
  createdBy: text('created_by').default('usr-admin-1').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_study_materials_course_id').on(table.courseId),
  index('idx_study_materials_course_type').on(table.courseType),
]);

// Enterprise Profiles table for RBAC (ADMIN, TEACHER, STUDENT) + Course Enrollment
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  username: text('username').unique(),
  email: text('email').unique(),
  fullName: text('full_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('STUDENT').notNull(), // 'ADMIN' | 'TEACHER' | 'STUDENT'
  studentId: text('student_id').unique(), // e.g., JEE26-7F42K, NEET26-10482
  teacherId: text('teacher_id'), // Assigned teacher ID for students
  batchId: text('batch_id'), // Assigned primary batch ID
  className: text('class_name').default('Class 12'),
  examCategory: text('exam_category').default('JEE_MAIN').notNull(), // 'JEE_MAIN' | 'JEE_ADVANCED' | 'NEET'
  courseId: text('course_id').default('course_jee').notNull(), // 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType: text('course_type').default('JEE').notNull(), // 'JEE' | 'JEE_ADVANCED' | 'NEET'
  enrollmentStatus: text('enrollment_status').default('ACTIVE').notNull(), // 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'INACTIVE'
  assignedCoursesJson: text('assigned_courses_json').default('["JEE"]').notNull(), // For teachers/students e.g. ["JEE"] or ["NEET"] or ["JEE","JEE_ADVANCED"]
  targetYear: integer('target_year').default(2026).notNull(),
  subjectAccessJson: text('subject_access_json').default('["Physics","Chemistry","Mathematics"]').notNull(),
  testAccessJson: text('test_access_json').default('[]').notNull(),
  teacherPermissionsJson: text('teacher_permissions_json').default('{"canCreateTests":true,"canCreateQuestions":true,"canManageBatches":true,"canResetStudentPasswords":true,"canViewAllStudents":false}').notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'PENDING'
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  tempPasswordHint: text('temp_password_hint'),
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
  index('idx_profiles_course_id').on(table.courseId),
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
  courseId: text('course_id').default('course_jee').notNull(),
  courseType: text('course_type').default('JEE').notNull(),
  className: text('class_name').default('Class 12').notNull(),
  teacherId: text('teacher_id').notNull(),
  teacherName: text('teacher_name').notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'ARCHIVED'
  assignedTestIdsJson: text('assigned_test_ids_json').default('[]').notNull(),
  studentIdsJson: text('student_ids_json').default('[]').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_batches_teacher_id').on(table.teacherId),
  index('idx_batches_course_id').on(table.courseId),
]);

// Test Access Control & Assignments table
export const testAssignments = pgTable('test_assignments', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull().unique(),
  courseId: text('course_id').default('course_jee').notNull(),
  visibility: text('visibility').default('PUBLIC').notNull(), // 'PUBLIC' | 'ASSIGNED_ONLY'
  assignedByUserId: text('assigned_by_user_id').notNull(),
  assignedTeacherIdsJson: text('assigned_teacher_ids_json').default('[]').notNull(),
  assignedBatchIdsJson: text('assigned_batch_ids_json').default('[]').notNull(),
  assignedStudentIdsJson: text('assigned_student_ids_json').default('[]').notNull(),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Platform & Batch Announcements table (Course-scoped)
export const announcements = pgTable('announcements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  courseId: text('course_id').default('ALL').notNull(), // 'ALL' | 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType: text('course_type').default('ALL').notNull(), // 'ALL' | 'JEE' | 'JEE_ADVANCED' | 'NEET'
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

// Questions table with strict course_id & exam_type association + uniqueness & usage tracking
export const questions = pgTable('questions', {
  id: text('id').primaryKey(),
  courseId: text('course_id').default('course_jee').notNull(), // 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType: text('course_type').default('JEE').notNull(), // 'JEE' | 'JEE_ADVANCED' | 'NEET'
  examType: text('exam_type').notNull(), // 'JEE_MAIN' | 'JEE_ADVANCED' | 'NEET'
  subject: text('subject').notNull(),
  chapter: text('chapter').notNull(),
  topic: text('topic').notNull(),
  difficulty: text('difficulty').notNull(),
  type: text('type').notNull(), // MCQ | NUMERICAL | MULTIPLE_CORRECT
  questionText: text('question_text').notNull(),
  normalizedText: text('normalized_text').default('').notNull(),
  fingerprint: text('fingerprint').default('').notNull(),
  conceptKey: text('concept_key').default('').notNull(),
  latex: text('latex'),
  optionsJson: text('options_json'), // JSON array of options
  correctAnswer: text('correct_answer').notNull(),
  tolerance: real('tolerance'),
  explanation: text('explanation').notNull(),
  positiveMarks: integer('positive_marks').default(4).notNull(),
  negativeMarks: integer('negative_marks').default(1).notNull(),
  source: text('source').default('ADMIN').notNull(), // ADMIN | PYQ | IMPORTED
  status: text('status').default('PUBLISHED').notNull(), // DRAFT | APPROVED | PUBLISHED
  timesAttempted: integer('times_attempted').default(0).notNull(),
  timesCorrect: integer('times_correct').default(0).notNull(),
  timesUsed: integer('times_used').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  testIdsJson: text('test_ids_json').default('[]').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_questions_course_id').on(table.courseId),
  index('idx_questions_exam_subject').on(table.examType, table.subject),
  index('idx_questions_chapter').on(table.chapter),
  index('idx_questions_difficulty').on(table.difficulty),
  index('idx_questions_status').on(table.status),
  index('idx_questions_fingerprint').on(table.fingerprint),
]);

// Global Question Usage table (Requirement 6: questionId, timesUsed, lastUsedAt, testIds)
export const questionUsage = pgTable('question_usage', {
  questionId: text('question_id').primaryKey(),
  timesUsed: integer('times_used').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  testIdsJson: text('test_ids_json').default('[]').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tests table with strict course_id association & saved snapshot metadata
export const tests = pgTable('tests', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  courseId: text('course_id').default('course_jee').notNull(), // 'course_jee' | 'course_jee_adv' | 'course_neet'
  courseType: text('course_type').default('JEE').notNull(), // 'JEE' | 'JEE_ADVANCED' | 'NEET'
  examType: text('exam_type').notNull(),
  testType: text('test_type').notNull(),
  patternYear: integer('pattern_year').default(2026).notNull(),
  blueprintId: text('blueprint_id'),
  patternSource: text('pattern_source'),
  durationMinutes: integer('duration_minutes').notNull(),
  totalMarks: integer('total_marks').notNull(),
  positiveMarks: integer('positive_marks').default(4).notNull(),
  negativeMarks: integer('negative_marks').default(1).notNull(),
  subjectsJson: text('subjects_json').notNull(), // JSON array
  questionsCount: integer('questions_count').notNull(),
  difficulty: text('difficulty').default('MEDIUM').notNull(),
  syllabusJson: text('syllabus_json'), // JSON array
  sectionsJson: text('sections_json'), // JSON array of BlueprintSection
  description: text('description'),
  questionIdsJson: text('question_ids_json').notNull(), // JSON array of snapshot questionIds
  testQuestionsJson: text('test_questions_json').default('[]').notNull(), // JSON array of TestQuestionMapping
  attemptSnapshotsJson: text('attempt_snapshots_json').default('[]').notNull(), // JSON array of TestAttemptSnapshot
  activeAttemptSet: text('active_attempt_set').default('Set A').notNull(),
  published: boolean('published').default(true).notNull(),
  attemptsCount: integer('attempts_count').default(0).notNull(),
  avgScore: integer('avg_score').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_tests_course_id').on(table.courseId),
  index('idx_tests_exam_type').on(table.examType),
  index('idx_tests_published').on(table.published),
]);

// Test Questions Snapshot Mapping table (Requirement 10: testId, questionId, questionOrder)
export const testQuestions = pgTable('test_questions', {
  id: text('id').primaryKey(), // `${testId}_${attemptNumber}_${questionOrder}`
  testId: text('test_id').notNull(),
  questionId: text('question_id').notNull(),
  questionOrder: integer('question_order').notNull(),
  attemptNumber: integer('attempt_number').default(1).notNull(),
  setLabel: text('set_label').default('Set A').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_test_questions_test_id').on(table.testId),
  index('idx_test_questions_question_id').on(table.questionId),
]);

// Test Attempts table with strict course_id & user_id ownership
export const testAttempts = pgTable('test_attempts', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull(),
  testTitle: text('test_title').notNull(),
  courseId: text('course_id').default('course_jee').notNull(),
  courseType: text('course_type').default('JEE').notNull(),
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
  index('idx_attempts_course_id').on(table.courseId),
]);

// Active Exam Sessions table (Server-backed live exam snapshot & progress persistence)
export const activeExamSessions = pgTable('active_exam_sessions', {
  userId: text('user_id').primaryKey(),
  testId: text('test_id').notNull(),
  attemptSetLabel: text('attempt_set_label').default('Set A').notNull(),
  sessionJson: text('session_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Bookmarks table (Server-backed question bookmarks & notes)
export const userBookmarks = pgTable('user_bookmarks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  collection: text('collection').default('General Revision').notNull(),
  note: text('note'),
  questionJson: text('question_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_user_bookmarks_user_id').on(table.userId),
]);

// Question Error Reports table (Server-backed student question reports)
export const questionReports = pgTable('question_reports', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull(),
  testId: text('test_id'),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  reason: text('reason').notNull(),
  description: text('description').notNull(),
  status: text('status').default('PENDING').notNull(),
  questionSnippet: text('question_snippet'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_question_reports_status').on(table.status),
]);

