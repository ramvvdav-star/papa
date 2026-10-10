-- NTA PULSE — ACTIVE ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE & POSTGRESQL
-- Enforces strict role & course separation across JEE Main, JEE Advanced, and NEET UG

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- 1. Students can ONLY read questions, tests, and study materials matching their ACTIVE enrolled course
CREATE POLICY "student_course_isolated_questions" ON public.questions
  FOR SELECT USING (
    public.is_course_authorized(course_id, course_type)
  );

CREATE POLICY "student_course_isolated_tests" ON public.tests
  FOR SELECT USING (
    public.is_course_authorized(course_id, course_type)
  );

CREATE POLICY "student_course_isolated_materials" ON public.study_materials
  FOR SELECT USING (
    public.is_course_authorized(course_id, course_type)
  );

-- 2. Students can ONLY read or insert their own test attempts within their enrolled course
CREATE POLICY "student_strict_own_attempts" ON public.test_attempts
  FOR SELECT USING (
    user_id = public.current_app_user_id()
    OR public.is_admin_user()
    OR (public.is_teacher_user() AND public.is_course_authorized(course_id, course_type))
  );
