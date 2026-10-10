import { createPool, isDatabaseConfigured } from './index.ts';

let schemaBootstrapped = false;
let schemaBootstrapPromise: Promise<boolean> | null = null;
let dbReachable = false;

export function isDatabaseReachable(): boolean {
  return dbReachable;
}

/**
 * Self-healing PostgreSQL schema bootstrapper.
 * Safely creates all required tables, columns, and indexes if they do not exist
 * in Cloud SQL, Supabase PostgreSQL, or any connected Postgres database.
 */
export async function ensureSchemaBootstrapped(): Promise<boolean> {
  if (schemaBootstrapped) return dbReachable;
  if (schemaBootstrapPromise) return schemaBootstrapPromise;

  schemaBootstrapPromise = (async () => {
    if (!isDatabaseConfigured()) {
      dbReachable = false;
      schemaBootstrapped = true;
      return false;
    }

    const pool = createPool();
    let client;
    try {
      client = await pool.connect();
      await client.query('SELECT 1');
      dbReachable = true;

      await client.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" serial PRIMARY KEY,
          "uid" text NOT NULL UNIQUE,
          "email" text NOT NULL,
          "display_name" text,
          "role" text NOT NULL DEFAULT 'student',
          "target_exam" text NOT NULL DEFAULT 'JEE_MAIN',
          "created_at" timestamp DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "courses" (
          "id" text PRIMARY KEY,
          "name" text NOT NULL,
          "type" text NOT NULL,
          "description" text NOT NULL DEFAULT '',
          "active" boolean NOT NULL DEFAULT true,
          "created_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_courses_type" ON "courses" ("type");

        CREATE TABLE IF NOT EXISTS "enrollments" (
          "id" text PRIMARY KEY,
          "student_id" text NOT NULL,
          "course_id" text NOT NULL,
          "course_type" text NOT NULL,
          "status" text NOT NULL DEFAULT 'ACTIVE',
          "assigned_by" text NOT NULL DEFAULT 'usr-admin-01',
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_enrollments_student_id" ON "enrollments" ("student_id");
        CREATE INDEX IF NOT EXISTS "idx_enrollments_course_id" ON "enrollments" ("course_id");
        CREATE INDEX IF NOT EXISTS "idx_enrollments_status" ON "enrollments" ("status");

        CREATE TABLE IF NOT EXISTS "study_materials" (
          "id" text PRIMARY KEY,
          "course_id" text NOT NULL,
          "course_type" text NOT NULL,
          "subject" text NOT NULL,
          "chapter" text NOT NULL,
          "title" text NOT NULL,
          "material_type" text NOT NULL DEFAULT 'NOTES',
          "description" text NOT NULL DEFAULT '',
          "content_body" text NOT NULL DEFAULT '',
          "created_by" text NOT NULL DEFAULT 'usr-admin-01',
          "created_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_study_materials_course_id" ON "study_materials" ("course_id");
        CREATE INDEX IF NOT EXISTS "idx_study_materials_course_type" ON "study_materials" ("course_type");

        CREATE TABLE IF NOT EXISTS "profiles" (
          "id" text PRIMARY KEY,
          "username" text UNIQUE,
          "email" text UNIQUE,
          "full_name" text NOT NULL,
          "password_hash" text NOT NULL,
          "role" text NOT NULL DEFAULT 'STUDENT',
          "student_id" text UNIQUE,
          "teacher_id" text,
          "batch_id" text,
          "class_name" text DEFAULT 'Class 12',
          "exam_category" text NOT NULL DEFAULT 'JEE_MAIN',
          "course_id" text NOT NULL DEFAULT 'course_jee',
          "course_type" text NOT NULL DEFAULT 'JEE',
          "enrollment_status" text NOT NULL DEFAULT 'ACTIVE',
          "assigned_courses_json" text NOT NULL DEFAULT '["JEE"]',
          "target_year" integer NOT NULL DEFAULT 2026,
          "subject_access_json" text NOT NULL DEFAULT '["Physics","Chemistry","Mathematics"]',
          "test_access_json" text NOT NULL DEFAULT '[]',
          "teacher_permissions_json" text NOT NULL DEFAULT '{"canCreateTests":true,"canCreateQuestions":true,"canManageBatches":true,"canResetStudentPasswords":true,"canViewAllStudents":false}',
          "status" text NOT NULL DEFAULT 'ACTIVE',
          "must_change_password" boolean NOT NULL DEFAULT false,
          "temp_password_hint" text,
          "expires_at" timestamp,
          "last_login" timestamp,
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_profiles_role" ON "profiles" ("role");
        CREATE INDEX IF NOT EXISTS "idx_profiles_student_id" ON "profiles" ("student_id");
        CREATE INDEX IF NOT EXISTS "idx_profiles_teacher_id" ON "profiles" ("teacher_id");
        CREATE INDEX IF NOT EXISTS "idx_profiles_batch_id" ON "profiles" ("batch_id");
        CREATE INDEX IF NOT EXISTS "idx_profiles_status" ON "profiles" ("status");
        CREATE INDEX IF NOT EXISTS "idx_profiles_course_id" ON "profiles" ("course_id");

        CREATE TABLE IF NOT EXISTS "auth_sessions" (
          "id" text PRIMARY KEY,
          "token_hash" text NOT NULL UNIQUE,
          "user_id" text NOT NULL,
          "role" text NOT NULL,
          "user_agent" text,
          "ip_address" text,
          "remember_me" boolean NOT NULL DEFAULT false,
          "expires_at" timestamp NOT NULL,
          "revoked" boolean NOT NULL DEFAULT false,
          "created_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "auth_sessions" ("user_id");
        CREATE INDEX IF NOT EXISTS "idx_sessions_token_hash" ON "auth_sessions" ("token_hash");

        CREATE TABLE IF NOT EXISTS "batches" (
          "id" text PRIMARY KEY,
          "name" text NOT NULL,
          "description" text DEFAULT '',
          "exam_category" text NOT NULL DEFAULT 'JEE_MAIN',
          "course_id" text NOT NULL DEFAULT 'course_jee',
          "course_type" text NOT NULL DEFAULT 'JEE',
          "class_name" text NOT NULL DEFAULT 'Class 12',
          "teacher_id" text NOT NULL,
          "teacher_name" text NOT NULL,
          "status" text NOT NULL DEFAULT 'ACTIVE',
          "assigned_test_ids_json" text NOT NULL DEFAULT '[]',
          "student_ids_json" text NOT NULL DEFAULT '[]',
          "created_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_batches_teacher_id" ON "batches" ("teacher_id");
        CREATE INDEX IF NOT EXISTS "idx_batches_course_id" ON "batches" ("course_id");

        CREATE TABLE IF NOT EXISTS "test_assignments" (
          "id" text PRIMARY KEY,
          "test_id" text NOT NULL UNIQUE,
          "course_id" text NOT NULL DEFAULT 'course_jee',
          "visibility" text NOT NULL DEFAULT 'PUBLIC',
          "assigned_by_user_id" text NOT NULL,
          "assigned_teacher_ids_json" text NOT NULL DEFAULT '[]',
          "assigned_batch_ids_json" text NOT NULL DEFAULT '[]',
          "assigned_student_ids_json" text NOT NULL DEFAULT '[]',
          "due_date" timestamp,
          "created_at" timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "announcements" (
          "id" text PRIMARY KEY,
          "title" text NOT NULL,
          "content" text NOT NULL,
          "course_id" text NOT NULL DEFAULT 'ALL',
          "course_type" text NOT NULL DEFAULT 'ALL',
          "author_id" text NOT NULL,
          "author_name" text NOT NULL,
          "author_role" text NOT NULL,
          "target_audience" text NOT NULL DEFAULT 'ALL',
          "target_batch_id" text,
          "priority" text NOT NULL DEFAULT 'NORMAL',
          "created_at" timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "audit_logs" (
          "id" text PRIMARY KEY,
          "actor_id" text NOT NULL,
          "actor_name" text NOT NULL,
          "actor_role" text NOT NULL,
          "action" text NOT NULL,
          "target" text NOT NULL,
          "details" text,
          "created_at" timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "password_recovery_requests" (
          "id" text PRIMARY KEY,
          "user_id" text NOT NULL,
          "identifier" text NOT NULL,
          "user_name" text NOT NULL,
          "user_role" text NOT NULL,
          "teacher_id" text,
          "reason" text DEFAULT 'Forgot password / requested credential reset',
          "status" text NOT NULL DEFAULT 'PENDING',
          "recovery_code" text,
          "created_at" timestamp NOT NULL DEFAULT now(),
          "resolved_at" timestamp
        );

        CREATE TABLE IF NOT EXISTS "platform_settings" (
          "key" text PRIMARY KEY,
          "value_json" text NOT NULL,
          "updated_at" timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "questions" (
          "id" text PRIMARY KEY,
          "course_id" text NOT NULL DEFAULT 'course_jee',
          "course_type" text NOT NULL DEFAULT 'JEE',
          "exam_type" text NOT NULL,
          "subject" text NOT NULL,
          "chapter" text NOT NULL,
          "topic" text NOT NULL,
          "difficulty" text NOT NULL,
          "type" text NOT NULL,
          "question_text" text NOT NULL,
          "normalized_text" text NOT NULL DEFAULT '',
          "fingerprint" text NOT NULL DEFAULT '',
          "concept_key" text NOT NULL DEFAULT '',
          "latex" text,
          "options_json" text,
          "correct_answer" text NOT NULL,
          "tolerance" real,
          "explanation" text NOT NULL,
          "positive_marks" integer NOT NULL DEFAULT 4,
          "negative_marks" integer NOT NULL DEFAULT 1,
          "source" text NOT NULL DEFAULT 'ADMIN',
          "status" text NOT NULL DEFAULT 'PUBLISHED',
          "times_attempted" integer NOT NULL DEFAULT 0,
          "times_correct" integer NOT NULL DEFAULT 0,
          "times_used" integer NOT NULL DEFAULT 0,
          "last_used_at" timestamp,
          "test_ids_json" text NOT NULL DEFAULT '[]',
          "created_at" timestamp DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_questions_course_id" ON "questions" ("course_id");
        CREATE INDEX IF NOT EXISTS "idx_questions_exam_subject" ON "questions" ("exam_type", "subject");
        CREATE INDEX IF NOT EXISTS "idx_questions_chapter" ON "questions" ("chapter");
        CREATE INDEX IF NOT EXISTS "idx_questions_difficulty" ON "questions" ("difficulty");
        CREATE INDEX IF NOT EXISTS "idx_questions_status" ON "questions" ("status");
        CREATE INDEX IF NOT EXISTS "idx_questions_fingerprint" ON "questions" ("fingerprint");

        CREATE TABLE IF NOT EXISTS "question_usage" (
          "question_id" text PRIMARY KEY,
          "times_used" integer NOT NULL DEFAULT 0,
          "last_used_at" timestamp,
          "test_ids_json" text NOT NULL DEFAULT '[]',
          "updated_at" timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "tests" (
          "id" text PRIMARY KEY,
          "title" text NOT NULL,
          "subtitle" text,
          "course_id" text NOT NULL DEFAULT 'course_jee',
          "course_type" text NOT NULL DEFAULT 'JEE',
          "exam_type" text NOT NULL,
          "test_type" text NOT NULL,
          "pattern_year" integer NOT NULL DEFAULT 2026,
          "blueprint_id" text,
          "pattern_source" text,
          "duration_minutes" integer NOT NULL,
          "total_marks" integer NOT NULL,
          "positive_marks" integer NOT NULL DEFAULT 4,
          "negative_marks" integer NOT NULL DEFAULT 1,
          "subjects_json" text NOT NULL,
          "questions_count" integer NOT NULL,
          "difficulty" text NOT NULL DEFAULT 'MEDIUM',
          "syllabus_json" text,
          "sections_json" text,
          "description" text,
          "question_ids_json" text NOT NULL,
          "test_questions_json" text NOT NULL DEFAULT '[]',
          "attempt_snapshots_json" text NOT NULL DEFAULT '[]',
          "active_attempt_set" text NOT NULL DEFAULT 'Set A',
          "published" boolean NOT NULL DEFAULT true,
          "attempts_count" integer NOT NULL DEFAULT 0,
          "avg_score" integer NOT NULL DEFAULT 0,
          "created_at" timestamp DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_tests_course_id" ON "tests" ("course_id");
        CREATE INDEX IF NOT EXISTS "idx_tests_exam_type" ON "tests" ("exam_type");
        CREATE INDEX IF NOT EXISTS "idx_tests_published" ON "tests" ("published");

        CREATE TABLE IF NOT EXISTS "test_questions" (
          "id" text PRIMARY KEY,
          "test_id" text NOT NULL,
          "question_id" text NOT NULL,
          "question_order" integer NOT NULL,
          "attempt_number" integer NOT NULL DEFAULT 1,
          "set_label" text NOT NULL DEFAULT 'Set A',
          "created_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_test_questions_test_id" ON "test_questions" ("test_id");
        CREATE INDEX IF NOT EXISTS "idx_test_questions_question_id" ON "test_questions" ("question_id");

        CREATE TABLE IF NOT EXISTS "test_attempts" (
          "id" text PRIMARY KEY,
          "test_id" text NOT NULL,
          "test_title" text NOT NULL,
          "course_id" text NOT NULL DEFAULT 'course_jee',
          "course_type" text NOT NULL DEFAULT 'JEE',
          "exam_type" text NOT NULL,
          "user_id" text NOT NULL,
          "user_name" text NOT NULL,
          "started_at" timestamp DEFAULT now(),
          "submitted_at" timestamp DEFAULT now(),
          "time_taken_seconds" integer NOT NULL,
          "total_score" integer NOT NULL,
          "max_score" integer NOT NULL,
          "percentage" integer NOT NULL,
          "accuracy" integer NOT NULL,
          "attempt_rate" integer NOT NULL,
          "total_questions" integer NOT NULL,
          "total_attempted" integer NOT NULL,
          "total_correct" integer NOT NULL,
          "total_incorrect" integer NOT NULL,
          "total_unanswered" integer NOT NULL,
          "negative_marks_lost" integer NOT NULL,
          "simulated_percentile" real NOT NULL,
          "practice_rank" integer NOT NULL,
          "result_json" text NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "idx_attempts_user_id" ON "test_attempts" ("user_id");
        CREATE INDEX IF NOT EXISTS "idx_attempts_test_id" ON "test_attempts" ("test_id");
        CREATE INDEX IF NOT EXISTS "idx_attempts_course_id" ON "test_attempts" ("course_id");

        CREATE TABLE IF NOT EXISTS "active_exam_sessions" (
          "user_id" text PRIMARY KEY,
          "test_id" text NOT NULL,
          "attempt_set_label" text NOT NULL DEFAULT 'Set A',
          "session_json" text NOT NULL,
          "updated_at" timestamp NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "user_bookmarks" (
          "id" text PRIMARY KEY,
          "user_id" text NOT NULL,
          "question_id" text NOT NULL,
          "collection" text NOT NULL DEFAULT 'General Revision',
          "note" text,
          "question_json" text,
          "created_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_user_bookmarks_user_id" ON "user_bookmarks" ("user_id");

        CREATE TABLE IF NOT EXISTS "question_reports" (
          "id" text PRIMARY KEY,
          "question_id" text NOT NULL,
          "test_id" text,
          "student_id" text NOT NULL,
          "student_name" text NOT NULL,
          "reason" text NOT NULL,
          "description" text NOT NULL,
          "status" text NOT NULL DEFAULT 'PENDING',
          "question_snippet" text,
          "created_at" timestamp NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS "idx_question_reports_status" ON "question_reports" ("status");
      `);

      // Ensure any newly added columns exist on pre-existing tables
      await client.query(`
        ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "course_id" text NOT NULL DEFAULT 'course_jee';
        ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "course_type" text NOT NULL DEFAULT 'JEE';
        ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "enrollment_status" text NOT NULL DEFAULT 'ACTIVE';
        ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "assigned_courses_json" text NOT NULL DEFAULT '["JEE"]';
        ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "course_id" text NOT NULL DEFAULT 'course_jee';
        ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "course_type" text NOT NULL DEFAULT 'JEE';
        ALTER TABLE "test_assignments" ADD COLUMN IF NOT EXISTS "course_id" text NOT NULL DEFAULT 'course_jee';
        ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "course_id" text NOT NULL DEFAULT 'ALL';
        ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "course_type" text NOT NULL DEFAULT 'ALL';
        ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "course_id" text NOT NULL DEFAULT 'course_jee';
        ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "course_type" text NOT NULL DEFAULT 'JEE';
        ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "normalized_text" text NOT NULL DEFAULT '';
        ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "fingerprint" text NOT NULL DEFAULT '';
        ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "concept_key" text NOT NULL DEFAULT '';
        ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "times_used" integer NOT NULL DEFAULT 0;
        ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp;
        ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "test_ids_json" text NOT NULL DEFAULT '[]';
        ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "course_id" text NOT NULL DEFAULT 'course_jee';
        ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "course_type" text NOT NULL DEFAULT 'JEE';
        ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "pattern_year" integer NOT NULL DEFAULT 2026;
        ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "blueprint_id" text;
        ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "pattern_source" text;
        ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "test_questions_json" text NOT NULL DEFAULT '[]';
        ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "attempt_snapshots_json" text NOT NULL DEFAULT '[]';
        ALTER TABLE "tests" ADD COLUMN IF NOT EXISTS "active_attempt_set" text NOT NULL DEFAULT 'Set A';
        ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "course_id" text NOT NULL DEFAULT 'course_jee';
        ALTER TABLE "test_attempts" ADD COLUMN IF NOT EXISTS "course_type" text NOT NULL DEFAULT 'JEE';
      `);

      schemaBootstrapped = true;
      return true;
    } catch (err) {
      dbReachable = false;
      schemaBootstrapped = true;
      console.warn('PostgreSQL bootstrap check (running with resilient store):', (err as Error)?.message || err);
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  })();

  return schemaBootstrapPromise;
}
