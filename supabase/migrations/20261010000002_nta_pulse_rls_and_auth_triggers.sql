-- ============================================================================
-- NTA PULSE — SUPABASE ROW LEVEL SECURITY (RLS) & AUTH PROVISIONING MIGRATION
-- Version: 20261010000002
-- Purpose: Least-privilege RLS policies for ADMIN, TEACHER, and STUDENT roles
--          with strict JEE vs JEE_ADVANCED vs NEET course isolation.
-- ============================================================================

-- Enable RLS across all exposed public tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- Helper Functions for Role & Course Verification
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('app.current_user_id', true), '')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = public.current_app_user_id()
      AND role = 'ADMIN'
      AND status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = public.current_app_user_id()
      AND role = 'TEACHER'
      AND status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_course_authorized(target_course_id text, target_course_type text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = public.current_app_user_id()
        AND p.status = 'ACTIVE'
        AND (
          p.course_id = target_course_id
          OR p.course_type = target_course_type
          OR p.assigned_courses_json LIKE '%' || target_course_type || '%'
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = public.current_app_user_id()
        AND e.status = 'ACTIVE'
        AND (e.course_id = target_course_id OR e.course_type = target_course_type)
    );
$$;

-- 1. COURSES POLICIES
DROP POLICY IF EXISTS "courses_select_authenticated" ON public.courses;
CREATE POLICY "courses_select_authenticated" ON public.courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
CREATE POLICY "courses_admin_all" ON public.courses
  FOR ALL USING (public.is_admin_user());

-- 2. PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_self_or_staff" ON public.profiles;
CREATE POLICY "profiles_select_self_or_staff" ON public.profiles
  FOR SELECT USING (
    id = public.current_app_user_id()
    OR public.is_admin_user()
    OR (public.is_teacher_user() AND (role = 'TEACHER' OR teacher_id = public.current_app_user_id()))
  );

DROP POLICY IF EXISTS "profiles_update_admin_or_assigned_teacher" ON public.profiles;
CREATE POLICY "profiles_update_admin_or_assigned_teacher" ON public.profiles
  FOR UPDATE USING (
    public.is_admin_user()
    OR (public.is_teacher_user() AND role = 'STUDENT' AND teacher_id = public.current_app_user_id())
  );

DROP POLICY IF EXISTS "profiles_insert_staff" ON public.profiles;
CREATE POLICY "profiles_insert_staff" ON public.profiles
  FOR INSERT WITH CHECK (
    public.is_admin_user()
    OR (public.is_teacher_user() AND role = 'STUDENT')
  );

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
CREATE POLICY "profiles_delete_admin_only" ON public.profiles
  FOR DELETE USING (public.is_admin_user());

-- 3. ENROLLMENTS POLICIES
DROP POLICY IF EXISTS "enrollments_select_own_or_staff" ON public.enrollments;
CREATE POLICY "enrollments_select_own_or_staff" ON public.enrollments
  FOR SELECT USING (
    student_id = public.current_app_user_id()
    OR public.is_admin_user()
    OR public.is_teacher_user()
  );

DROP POLICY IF EXISTS "enrollments_write_staff_only" ON public.enrollments;
CREATE POLICY "enrollments_write_staff_only" ON public.enrollments
  FOR ALL USING (public.is_admin_user() OR public.is_teacher_user());

-- 4. QUESTIONS POLICIES (Course-Isolated Read; Admin/Teacher Write)
DROP POLICY IF EXISTS "questions_select_course_isolated" ON public.questions;
CREATE POLICY "questions_select_course_isolated" ON public.questions
  FOR SELECT USING (
    public.is_course_authorized(course_id, course_type)
  );

DROP POLICY IF EXISTS "questions_write_staff" ON public.questions;
CREATE POLICY "questions_write_staff" ON public.questions
  FOR ALL USING (public.is_admin_user() OR public.is_teacher_user());

-- 5. TESTS POLICIES (Course-Isolated Read; Admin/Teacher Write)
DROP POLICY IF EXISTS "tests_select_course_isolated" ON public.tests;
CREATE POLICY "tests_select_course_isolated" ON public.tests
  FOR SELECT USING (
    public.is_course_authorized(course_id, course_type)
  );

DROP POLICY IF EXISTS "tests_write_staff" ON public.tests;
CREATE POLICY "tests_write_staff" ON public.tests
  FOR ALL USING (public.is_admin_user() OR public.is_teacher_user());

-- 6. TEST ATTEMPTS POLICIES (Strict Student Ownership + Staff Read)
DROP POLICY IF EXISTS "test_attempts_select_owner_or_staff" ON public.test_attempts;
CREATE POLICY "test_attempts_select_owner_or_staff" ON public.test_attempts
  FOR SELECT USING (
    user_id = public.current_app_user_id()
    OR public.is_admin_user()
    OR (public.is_teacher_user() AND public.is_course_authorized(course_id, course_type))
  );

DROP POLICY IF EXISTS "test_attempts_insert_owner" ON public.test_attempts;
CREATE POLICY "test_attempts_insert_owner" ON public.test_attempts
  FOR INSERT WITH CHECK (
    user_id = public.current_app_user_id()
    AND public.is_course_authorized(course_id, course_type)
  );

-- 7. ACTIVE EXAM SESSIONS & BOOKMARKS (Strict User Ownership)
DROP POLICY IF EXISTS "active_sessions_owner_all" ON public.active_exam_sessions;
CREATE POLICY "active_sessions_owner_all" ON public.active_exam_sessions
  FOR ALL USING (user_id = public.current_app_user_id() OR public.is_admin_user());

DROP POLICY IF EXISTS "bookmarks_owner_all" ON public.user_bookmarks;
CREATE POLICY "bookmarks_owner_all" ON public.user_bookmarks
  FOR ALL USING (user_id = public.current_app_user_id() OR public.is_admin_user());

-- 8. STUDY MATERIALS & ANNOUNCEMENTS (Course-Isolated Read; Staff Write)
DROP POLICY IF EXISTS "study_materials_select_course" ON public.study_materials;
CREATE POLICY "study_materials_select_course" ON public.study_materials
  FOR SELECT USING (public.is_course_authorized(course_id, course_type));

DROP POLICY IF EXISTS "study_materials_write_staff" ON public.study_materials;
CREATE POLICY "study_materials_write_staff" ON public.study_materials
  FOR ALL USING (public.is_admin_user() OR public.is_teacher_user());

DROP POLICY IF EXISTS "announcements_select_course" ON public.announcements;
CREATE POLICY "announcements_select_course" ON public.announcements
  FOR SELECT USING (
    course_id = 'ALL'
    OR course_type = 'ALL'
    OR public.is_course_authorized(course_id, course_type)
  );

DROP POLICY IF EXISTS "announcements_write_staff" ON public.announcements;
CREATE POLICY "announcements_write_staff" ON public.announcements
  FOR ALL USING (public.is_admin_user() OR public.is_teacher_user());

-- 9. SUPABASE AUTH AUTOMATIC PROFILE PROVISIONING TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_supabase_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_type text;
  v_course_id text;
  v_exam_category text;
  v_student_code text;
BEGIN
  v_course_type := COALESCE(NEW.raw_user_meta_data->>'course_type', 'JEE');
  IF v_course_type = 'NEET' THEN
    v_course_id := 'course_neet';
    v_exam_category := 'NEET';
    v_student_code := 'NEET26-' || upper(substr(md5(NEW.id::text), 1, 5));
  ELSIF v_course_type = 'JEE_ADVANCED' THEN
    v_course_id := 'course_jee_adv';
    v_exam_category := 'JEE_ADVANCED';
    v_student_code := 'JADV26-' || upper(substr(md5(NEW.id::text), 1, 5));
  ELSE
    v_course_type := 'JEE';
    v_course_id := 'course_jee';
    v_exam_category := 'JEE_MAIN';
    v_student_code := 'JEE26-' || upper(substr(md5(NEW.id::text), 1, 5));
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, password_hash, role, student_id,
    exam_category, course_id, course_type, enrollment_status,
    assigned_courses_json, status, must_change_password
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Candidate'),
    'supabase_auth_managed',
    'STUDENT',
    v_student_code,
    v_exam_category,
    v_course_id,
    v_course_type,
    'ACTIVE',
    json_build_array(v_course_type)::text,
    'ACTIVE',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.enrollments (
    id, student_id, course_id, course_type, status, assigned_by
  )
  VALUES (
    'enr-' || NEW.id::text || '-' || v_course_id,
    NEW.id::text,
    v_course_id,
    v_course_type,
    'ACTIVE',
    'supabase_auth_trigger'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
