-- ============================================================================
-- NTA PULSE (JEE MAIN, JEE ADVANCED & NEET UG) — COMPLETE SUPABASE MIGRATION
-- Includes all 18 production tables, indexes, and Row Level Security (RLS) policies
-- Safe to run idempotently on any PostgreSQL / Supabase database
-- ============================================================================

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  course_name TEXT NOT NULL,
  course_code TEXT NOT NULL,
  description TEXT,
  subjects_json TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  student_id TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  account_status TEXT NOT NULL DEFAULT 'ACTIVE',
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  course_type TEXT NOT NULL DEFAULT 'JEE',
  exam_category TEXT NOT NULL DEFAULT 'JEE_MAIN',
  batch_id TEXT,
  class_grade TEXT DEFAULT '12th',
  expiry_date TEXT,
  teacher_id TEXT,
  assigned_courses_json TEXT DEFAULT '["JEE"]',
  assigned_subjects_json TEXT DEFAULT '[]',
  assigned_batches_json TEXT DEFAULT '[]',
  teacher_permissions_json TEXT DEFAULT '{}',
  test_access_json TEXT DEFAULT '[]',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  course_type TEXT NOT NULL,
  enrollment_status TEXT NOT NULL DEFAULT 'ACTIVE',
  assigned_by TEXT,
  enrolled_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS study_materials (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  course_type TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL DEFAULT 'NOTES',
  content_body TEXT NOT NULL,
  resource_url TEXT,
  uploaded_by TEXT,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  remember_me BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  course_type TEXT NOT NULL DEFAULT 'JEE',
  exam_category TEXT NOT NULL DEFAULT 'JEE_MAIN',
  class_grade TEXT NOT NULL DEFAULT '12th',
  description TEXT,
  teacher_ids_json TEXT NOT NULL DEFAULT '[]',
  student_ids_json TEXT NOT NULL DEFAULT '[]',
  assigned_test_ids_json TEXT NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  course_id TEXT DEFAULT 'ALL',
  target_role TEXT NOT NULL DEFAULT 'ALL',
  target_batch_id TEXT DEFAULT 'ALL',
  target_exam TEXT DEFAULT 'ALL',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS password_recovery_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  identifier TEXT NOT NULL,
  full_name TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS test_assignments (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  course_type TEXT NOT NULL DEFAULT 'JEE',
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  assigned_batch_ids_json TEXT NOT NULL DEFAULT '[]',
  assigned_student_ids_json TEXT NOT NULL DEFAULT '[]',
  assigned_teacher_ids_json TEXT NOT NULL DEFAULT '[]',
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  target_exam TEXT NOT NULL DEFAULT 'JEE_MAIN',
  target_year INTEGER NOT NULL DEFAULT 2026,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  course_type TEXT NOT NULL DEFAULT 'JEE',
  exam_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  latex TEXT,
  diagram_svg TEXT,
  image TEXT,
  options_json TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  positive_marks INTEGER NOT NULL DEFAULT 4,
  negative_marks INTEGER NOT NULL DEFAULT 1,
  year INTEGER,
  source TEXT,
  status TEXT DEFAULT 'APPROVED',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  course_type TEXT NOT NULL DEFAULT 'JEE',
  exam_type TEXT NOT NULL,
  test_type TEXT NOT NULL,
  pattern_year INTEGER NOT NULL DEFAULT 2026,
  duration_minutes INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  positive_marks INTEGER NOT NULL DEFAULT 4,
  negative_marks INTEGER NOT NULL DEFAULT 1,
  subjects_json TEXT NOT NULL,
  questions_count INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  syllabus_json TEXT,
  description TEXT,
  question_ids_json TEXT NOT NULL,
  test_data_json TEXT,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  attempts_count INTEGER DEFAULT 0,
  avg_score REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS test_attempts (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  test_title TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  course_type TEXT NOT NULL DEFAULT 'JEE',
  exam_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  total_score REAL NOT NULL,
  max_score REAL NOT NULL,
  accuracy REAL NOT NULL,
  percentile REAL NOT NULL,
  air_rank INTEGER NOT NULL,
  total_candidates INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  incorrect_count INTEGER NOT NULL,
  unattempted_count INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS active_exam_sessions (
  user_id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  session_json TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS question_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  course_id TEXT NOT NULL DEFAULT 'course_jee',
  collection TEXT NOT NULL DEFAULT 'General Revision',
  note TEXT,
  question_json TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS question_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  question_id TEXT NOT NULL,
  test_id TEXT,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  question_snippet TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for high-concurrency CBT queries
CREATE INDEX IF NOT EXISTS idx_questions_course_subject ON questions(course_id, subject, difficulty);
CREATE INDEX IF NOT EXISTS idx_tests_course_exam ON tests(course_id, exam_type);
CREATE INDEX IF NOT EXISTS idx_attempts_user_course ON test_attempts(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON question_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token_hash);

-- Enable Row Level Security across all 18 tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;
