-- ============================================================================
-- NTA PULSE — SUPABASE POSTGRESQL PRODUCTION SCHEMA MIGRATION
-- Version: 20261010000001
-- Purpose: Complete schema for JEE Main, JEE Advanced & NEET UG Mock Platform
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Legacy & OAuth Users Mapping Table
CREATE TABLE IF NOT EXISTS public.users (
  id serial PRIMARY KEY,
  uid text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'student',
  target_exam text NOT NULL DEFAULT 'JEE_MAIN',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Canonical Courses Table (JEE, JEE_ADVANCED, NEET)
CREATE TABLE IF NOT EXISTS public.courses (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('JEE', 'JEE_ADVANCED', 'NEET')),
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_type ON public.courses (type);

-- 3. Enterprise User Profiles & RBAC Table (ADMIN, TEACHER, STUDENT)
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  username text UNIQUE,
  email text UNIQUE,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
  student_id text UNIQUE,
  teacher_id text,
  batch_id text,
  class_name text DEFAULT 'Class 12',
  exam_category text NOT NULL DEFAULT 'JEE_MAIN' CHECK (exam_category IN ('JEE_MAIN', 'JEE_ADVANCED', 'NEET')),
  course_id text NOT NULL DEFAULT 'course_jee' REFERENCES public.courses(id) ON UPDATE CASCADE,
  course_type text NOT NULL DEFAULT 'JEE' CHECK (course_type IN ('JEE', 'JEE_ADVANCED', 'NEET')),
  enrollment_status text NOT NULL DEFAULT 'ACTIVE' CHECK (enrollment_status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'INACTIVE')),
  assigned_courses_json text NOT NULL DEFAULT '["JEE"]',
  target_year integer NOT NULL DEFAULT 2026,
  subject_access_json text NOT NULL DEFAULT '["Physics","Chemistry","Mathematics"]',
  test_access_json text NOT NULL DEFAULT '[]',
  teacher_permissions_json text NOT NULL DEFAULT '{"canCreateTests":true,"canCreateQuestions":true,"canManageBatches":true,"canResetStudentPasswords":true,"canViewAllStudents":false}',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING')),
  must_change_password boolean NOT NULL DEFAULT false,
  temp_password_hint text,
  expires_at timestamptz,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles (student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_teacher_id ON public.profiles (teacher_id);
CREATE INDEX IF NOT EXISTS idx_profiles_batch_id ON public.profiles (batch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_course_id ON public.profiles (course_id);

-- 4. Student Course Enrollments Table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_type text NOT NULL CHECK (course_type IN ('JEE', 'JEE_ADVANCED', 'NEET')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'INACTIVE')),
  assigned_by text NOT NULL DEFAULT 'usr-admin-01',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments (course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments (status);

-- 5. Course-Scoped Study Materials Table
CREATE TABLE IF NOT EXISTS public.study_materials (
  id text PRIMARY KEY,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_type text NOT NULL CHECK (course_type IN ('JEE', 'JEE_ADVANCED', 'NEET')),
  subject text NOT NULL,
  chapter text NOT NULL,
  title text NOT NULL,
  material_type text NOT NULL DEFAULT 'NOTES',
  description text NOT NULL DEFAULT '',
  content_body text NOT NULL DEFAULT '',
  file_storage_path text,
  created_by text NOT NULL DEFAULT 'usr-admin-01',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_materials_course_id ON public.study_materials (course_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_course_type ON public.study_materials (course_type);

-- 6. Persistent Auth Sessions Table
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  user_agent text,
  ip_address text,
  remember_me boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.auth_sessions (token_hash);

-- 7. Classes / Batches Table
CREATE TABLE IF NOT EXISTS public.batches (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  exam_category text NOT NULL DEFAULT 'JEE_MAIN',
  course_id text NOT NULL DEFAULT 'course_jee',
  course_type text NOT NULL DEFAULT 'JEE',
  class_name text NOT NULL DEFAULT 'Class 12',
  teacher_id text NOT NULL,
  teacher_name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  assigned_test_ids_json text NOT NULL DEFAULT '[]',
  student_ids_json text NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_batches_teacher_id ON public.batches (teacher_id);
CREATE INDEX IF NOT EXISTS idx_batches_course_id ON public.batches (course_id);

-- 8. Test Access Control & Assignments Table
CREATE TABLE IF NOT EXISTS public.test_assignments (
  id text PRIMARY KEY,
  test_id text NOT NULL UNIQUE,
  course_id text NOT NULL DEFAULT 'course_jee',
  visibility text NOT NULL DEFAULT 'PUBLIC',
  assigned_by_user_id text NOT NULL,
  assigned_teacher_ids_json text NOT NULL DEFAULT '[]',
  assigned_batch_ids_json text NOT NULL DEFAULT '[]',
  assigned_student_ids_json text NOT NULL DEFAULT '[]',
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Platform & Batch Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id text PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  course_id text NOT NULL DEFAULT 'ALL',
  course_type text NOT NULL DEFAULT 'ALL',
  author_id text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL,
  target_audience text NOT NULL DEFAULT 'ALL',
  target_batch_id text,
  priority text NOT NULL DEFAULT 'NORMAL',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Security & Operations Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY,
  actor_id text NOT NULL,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  target text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Password Recovery Requests Table
CREATE TABLE IF NOT EXISTS public.password_recovery_requests (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  identifier text NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  teacher_id text,
  reason text DEFAULT 'Forgot password / requested credential reset',
  status text NOT NULL DEFAULT 'PENDING',
  recovery_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- 12. Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value_json text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Canonical Question Bank Table
CREATE TABLE IF NOT EXISTS public.questions (
  id text PRIMARY KEY,
  course_id text NOT NULL DEFAULT 'course_jee',
  course_type text NOT NULL DEFAULT 'JEE',
  exam_type text NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL,
  type text NOT NULL,
  question_text text NOT NULL,
  normalized_text text NOT NULL DEFAULT '',
  fingerprint text NOT NULL DEFAULT '',
  concept_key text NOT NULL DEFAULT '',
  latex text,
  diagram_storage_path text,
  options_json text,
  correct_answer text NOT NULL,
  tolerance real,
  explanation text NOT NULL,
  positive_marks integer NOT NULL DEFAULT 4,
  negative_marks integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'ADMIN',
  status text NOT NULL DEFAULT 'PUBLISHED',
  times_attempted integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  times_used integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  test_ids_json text NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON public.questions (course_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_subject ON public.questions (exam_type, subject);
CREATE INDEX IF NOT EXISTS idx_questions_chapter ON public.questions (chapter);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions (difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions (status);
CREATE INDEX IF NOT EXISTS idx_questions_fingerprint ON public.questions (fingerprint);

-- 14. Global Question Usage Registry Table
CREATE TABLE IF NOT EXISTS public.question_usage (
  question_id text PRIMARY KEY,
  times_used integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  test_ids_json text NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Mock Tests & Blueprints Table
CREATE TABLE IF NOT EXISTS public.tests (
  id text PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  course_id text NOT NULL DEFAULT 'course_jee',
  course_type text NOT NULL DEFAULT 'JEE',
  exam_type text NOT NULL,
  test_type text NOT NULL,
  pattern_year integer NOT NULL DEFAULT 2026,
  blueprint_id text,
  pattern_source text,
  duration_minutes integer NOT NULL,
  total_marks integer NOT NULL,
  positive_marks integer NOT NULL DEFAULT 4,
  negative_marks integer NOT NULL DEFAULT 1,
  subjects_json text NOT NULL,
  questions_count integer NOT NULL,
  difficulty text NOT NULL DEFAULT 'MEDIUM',
  syllabus_json text,
  sections_json text,
  description text,
  question_ids_json text NOT NULL,
  test_questions_json text NOT NULL DEFAULT '[]',
  attempt_snapshots_json text NOT NULL DEFAULT '[]',
  active_attempt_set text NOT NULL DEFAULT 'Set A',
  published boolean NOT NULL DEFAULT true,
  attempts_count integer NOT NULL DEFAULT 0,
  avg_score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tests_course_id ON public.tests (course_id);
CREATE INDEX IF NOT EXISTS idx_tests_exam_type ON public.tests (exam_type);
CREATE INDEX IF NOT EXISTS idx_tests_published ON public.tests (published);

-- 16. Test Questions Snapshot Mapping Table
CREATE TABLE IF NOT EXISTS public.test_questions (
  id text PRIMARY KEY,
  test_id text NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question_order integer NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  set_label text NOT NULL DEFAULT 'Set A',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions (test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON public.test_questions (question_id);

-- 17. Student Test Attempts & Evaluations Table
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id text PRIMARY KEY,
  test_id text NOT NULL,
  test_title text NOT NULL,
  course_id text NOT NULL DEFAULT 'course_jee',
  course_type text NOT NULL DEFAULT 'JEE',
  exam_type text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz DEFAULT now(),
  time_taken_seconds integer NOT NULL,
  total_score integer NOT NULL,
  max_score integer NOT NULL,
  percentage integer NOT NULL,
  accuracy integer NOT NULL,
  attempt_rate integer NOT NULL,
  total_questions integer NOT NULL,
  total_attempted integer NOT NULL,
  total_correct integer NOT NULL,
  total_incorrect integer NOT NULL,
  total_unanswered integer NOT NULL,
  negative_marks_lost integer NOT NULL,
  simulated_percentile real NOT NULL,
  practice_rank integer NOT NULL,
  result_json text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON public.test_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.test_attempts (test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_course_id ON public.test_attempts (course_id);

-- 18. Live Active CBT Exam Sessions Table
CREATE TABLE IF NOT EXISTS public.active_exam_sessions (
  user_id text PRIMARY KEY,
  test_id text NOT NULL,
  attempt_set_label text NOT NULL DEFAULT 'Set A',
  session_json text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 19. Student Question Bookmarks & Revision Notes Table
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  question_id text NOT NULL,
  collection text NOT NULL DEFAULT 'General Revision',
  note text,
  question_json text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks (user_id);

-- 20. Question Error & Challenge Reports Table
CREATE TABLE IF NOT EXISTS public.question_reports (
  id text PRIMARY KEY,
  question_id text NOT NULL,
  test_id text,
  student_id text NOT NULL,
  student_name text NOT NULL,
  reason text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  question_snippet text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_question_reports_status ON public.question_reports (status);

-- Seed Canonical Courses Idempotently
INSERT INTO public.courses (id, name, type, description, active)
VALUES
  ('course_jee', 'JEE (Main) Engineering Entrance Course', 'JEE', 'Physics, Chemistry & Mathematics — Official 75-Question (300 Marks) NTA CBT Curriculum.', true),
  ('course_jee_adv', 'JEE (Advanced) IIT Entrance Course', 'JEE_ADVANCED', 'High-Order Multi-Format Paper 1 & Paper 2 IIT Entrance Curriculum (Physics, Chemistry, Mathematics).', true),
  ('course_neet', 'NEET (UG) Pre-Medical Entrance Course', 'NEET', 'Physics, Chemistry, Botany & Zoology — Official 180-Question (720 Marks) Medical Entrance Curriculum.', true)
ON CONFLICT (id) DO NOTHING;
