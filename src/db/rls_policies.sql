-- ============================================================================
-- NTA PULSE — PRODUCTION POSTGRESQL / SUPABASE ROW LEVEL SECURITY (RLS)
-- Enforces strict course-based access control at the database engine level.
-- Conceptually:
--   Student -> Authenticated User -> Profile -> Active Enrollment -> Course -> Allowed Data
-- ============================================================================

-- 1. Enable Row Level Security across all 18 course-scoped & sensitive tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- 2. Helper SQL Functions for Current Session User & Authorized Course IDs
-- Uses SECURITY DEFINER + SET row_security = off to prevent recursive policy evaluation
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_user_id', true), ''),
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION app_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid TEXT;
  v_jwt_role TEXT;
  v_role TEXT;
BEGIN
  v_uid := app_current_user_id();
  v_jwt_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '');

  -- Trusted backend connection (Drizzle / pg Pool or Supabase service_role)
  IF v_jwt_role = 'service_role' OR (v_uid = '' AND current_user NOT IN ('anon', 'authenticated')) THEN
    RETURN 'ADMIN';
  END IF;

  IF v_uid = '' THEN
    RETURN 'ANONYMOUS';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid AND status = 'ACTIVE' LIMIT 1;
  RETURN COALESCE(v_role, 'ANONYMOUS');
END;
$$;

-- Returns the set of active course_ids ('course_jee', 'course_jee_adv', 'course_neet')
-- that the currently authenticated student or teacher is authorized to access.
CREATE OR REPLACE FUNCTION app_authorized_course_ids()
RETURNS SETOF TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid TEXT;
  v_role TEXT;
BEGIN
  v_role := app_current_user_role();
  IF v_role = 'ADMIN' THEN
    RETURN QUERY SELECT c.id FROM public.courses c;
    RETURN;
  END IF;

  v_uid := app_current_user_id();
  IF v_uid = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT e.course_id
    FROM public.enrollments e
    JOIN public.profiles p ON p.id = e.student_id
    WHERE e.student_id = v_uid
      AND e.status = 'ACTIVE'
      AND p.status = 'ACTIVE'
      AND p.enrollment_status = 'ACTIVE'
    UNION
    SELECT p.course_id
    FROM public.profiles p
    WHERE p.id = v_uid
      AND p.status = 'ACTIVE'
      AND p.enrollment_status = 'ACTIVE';
END;
$$;

-- 3. COURSES TABLE POLICIES
DROP POLICY IF EXISTS courses_select_policy ON courses;
CREATE POLICY courses_select_policy ON courses
  FOR ALL
  USING (
    app_current_user_role() = 'ADMIN'
    OR active = true
    OR id IN (SELECT app_authorized_course_ids())
  )
  WITH CHECK (app_current_user_role() = 'ADMIN');

-- 4. PROFILES TABLE POLICIES
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_write_policy ON profiles;
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT
  USING (
    app_current_user_role() = 'ADMIN'
    OR id = app_current_user_id()
    OR (
      app_current_user_role() = 'TEACHER'
      AND (teacher_id = app_current_user_id() OR role = 'STUDENT')
    )
  );
CREATE POLICY profiles_write_policy ON profiles
  FOR ALL
  USING (app_current_user_role() IN ('ADMIN', 'TEACHER') OR id = app_current_user_id())
  WITH CHECK (app_current_user_role() IN ('ADMIN', 'TEACHER') OR id = app_current_user_id());

-- 5. ENROLLMENTS TABLE POLICIES
-- Students can ONLY read their own enrollments; Admins & Teachers manage enrollments.
DROP POLICY IF EXISTS enrollments_select_policy ON enrollments;
CREATE POLICY enrollments_select_policy ON enrollments
  FOR SELECT
  USING (
    app_current_user_role() IN ('ADMIN', 'TEACHER')
    OR student_id = app_current_user_id()
  );

DROP POLICY IF EXISTS enrollments_write_policy ON enrollments;
CREATE POLICY enrollments_write_policy ON enrollments
  FOR ALL
  USING (app_current_user_role() IN ('ADMIN', 'TEACHER'))
  WITH CHECK (app_current_user_role() IN ('ADMIN', 'TEACHER'));

-- 6. QUESTIONS TABLE POLICIES (Strict Course Isolation: question.course_id = student's enrolled course)
-- A JEE student querying NEET questions directly receives 0 rows.
DROP POLICY IF EXISTS questions_course_isolation_select ON questions;
CREATE POLICY questions_course_isolation_select ON questions
  FOR SELECT
  USING (
    app_current_user_role() = 'ADMIN'
    OR (
      app_current_user_role() = 'TEACHER'
      AND course_id IN (SELECT app_authorized_course_ids())
    )
    OR (
      app_current_user_role() = 'STUDENT'
      AND status = 'PUBLISHED'
      AND course_id IN (SELECT app_authorized_course_ids())
    )
  );

DROP POLICY IF EXISTS questions_staff_write ON questions;
CREATE POLICY questions_staff_write ON questions
  FOR ALL
  USING (
    app_current_user_role() = 'ADMIN'
    OR (
      app_current_user_role() = 'TEACHER'
      AND course_id IN (SELECT app_authorized_course_ids())
    )
  );

-- 7. TESTS TABLE POLICIES (Strict Course Isolation: test.course_id = student's enrolled course)
DROP POLICY IF EXISTS tests_course_isolation_select ON tests;
CREATE POLICY tests_course_isolation_select ON tests
  FOR SELECT
  USING (
    app_current_user_role() = 'ADMIN'
    OR (
      app_current_user_role() = 'TEACHER'
      AND course_id IN (SELECT app_authorized_course_ids())
    )
    OR (
      app_current_user_role() = 'STUDENT'
      AND published = TRUE
      AND course_id IN (SELECT app_authorized_course_ids())
    )
  );

-- 8. STUDY MATERIALS TABLE POLICIES (Strict Course Isolation)
DROP POLICY IF EXISTS study_materials_course_isolation_select ON study_materials;
CREATE POLICY study_materials_course_isolation_select ON study_materials
  FOR SELECT
  USING (
    app_current_user_role() = 'ADMIN'
    OR course_id IN (SELECT app_authorized_course_ids())
  );

-- 9. ANNOUNCEMENTS TABLE POLICIES (Course-Scoped)
DROP POLICY IF EXISTS announcements_course_isolation_select ON announcements;
CREATE POLICY announcements_course_isolation_select ON announcements
  FOR SELECT
  USING (
    app_current_user_role() = 'ADMIN'
    OR course_id = 'ALL'
    OR course_id IN (SELECT app_authorized_course_ids())
  );

-- 10. TEST ATTEMPTS / RESULTS TABLE POLICIES (Student Ownership + Course Isolation)
-- Students can ONLY read and insert their own attempts for their enrolled course.
DROP POLICY IF EXISTS attempts_student_course_select ON test_attempts;
CREATE POLICY attempts_student_course_select ON test_attempts
  FOR SELECT
  USING (
    app_current_user_role() = 'ADMIN'
    OR (
      app_current_user_role() = 'TEACHER'
      AND course_id IN (SELECT app_authorized_course_ids())
    )
    OR (
      app_current_user_role() = 'STUDENT'
      AND user_id = app_current_user_id()
      AND course_id IN (SELECT app_authorized_course_ids())
    )
  );

DROP POLICY IF EXISTS attempts_student_course_insert ON test_attempts;
CREATE POLICY attempts_student_course_insert ON test_attempts
  FOR INSERT
  WITH CHECK (
    user_id = app_current_user_id()
    AND course_id IN (SELECT app_authorized_course_ids())
  );

-- 11. ACTIVE EXAM SESSIONS, BOOKMARKS, REPORTS & GOVERNANCE POLICIES
DROP POLICY IF EXISTS active_exam_sessions_owner_policy ON active_exam_sessions;
CREATE POLICY active_exam_sessions_owner_policy ON active_exam_sessions
  FOR ALL
  USING (user_id = app_current_user_id() OR app_current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS question_bookmarks_owner_policy ON question_bookmarks;
CREATE POLICY question_bookmarks_owner_policy ON question_bookmarks
  FOR ALL
  USING (user_id = app_current_user_id() OR app_current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS question_reports_policy ON question_reports;
CREATE POLICY question_reports_policy ON question_reports
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_current_user_role() IN ('ADMIN', 'TEACHER'));

DROP POLICY IF EXISTS batches_select_policy ON batches;
CREATE POLICY batches_select_policy ON batches
  FOR SELECT
  USING (app_current_user_role() = 'ADMIN' OR course_id IN (SELECT app_authorized_course_ids()));

DROP POLICY IF EXISTS test_assignments_select_policy ON test_assignments;
CREATE POLICY test_assignments_select_policy ON test_assignments
  FOR SELECT
  USING (app_current_user_role() = 'ADMIN' OR course_id IN (SELECT app_authorized_course_ids()));

DROP POLICY IF EXISTS auth_sessions_owner_policy ON auth_sessions;
CREATE POLICY auth_sessions_owner_policy ON auth_sessions
  FOR ALL
  USING (user_id = app_current_user_id() OR app_current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS audit_logs_admin_policy ON audit_logs;
CREATE POLICY audit_logs_admin_policy ON audit_logs
  FOR SELECT
  USING (app_current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS password_recovery_staff_policy ON password_recovery_requests;
CREATE POLICY password_recovery_staff_policy ON password_recovery_requests
  FOR SELECT
  USING (app_current_user_role() IN ('ADMIN', 'TEACHER') OR user_id = app_current_user_id());

DROP POLICY IF EXISTS platform_settings_admin_policy ON platform_settings;
CREATE POLICY platform_settings_admin_policy ON platform_settings
  FOR SELECT
  USING (app_current_user_role() IN ('ADMIN', 'TEACHER'));

DROP POLICY IF EXISTS users_owner_policy ON users;
CREATE POLICY users_owner_policy ON users
  FOR SELECT
  USING (uid = app_current_user_id() OR app_current_user_role() = 'ADMIN');
