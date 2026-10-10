/**
 * NTA PULSE — REPEATABLE IDEMPOTENT SUPABASE / POSTGRESQL DATA MIGRATION SCRIPT
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" npm run db:migrate:supabase
 */

import dotenv from 'dotenv';
import { ensureSchemaBootstrapped, isDatabaseReachable } from '../src/db/bootstrapSchema';
import { ensureAuthSeeded, getAllProfiles, getAllCourses, getAllEnrollments, getAllBatches } from '../src/db/authRepository';
import { ensureDatabaseSeeded, getAllTestsFromDb, getCachedQuestionBank } from '../src/db/repository';
import { auditQuestionBankAndTests } from '../src/data/questionBankEngine';

dotenv.config();

async function runSupabaseMigration() {
  console.log('======================================================================');
  console.log(' NTA PULSE — SUPABASE POSTGRESQL SCHEMA & DATA MIGRATION');
  console.log('======================================================================');

  const connected = await ensureSchemaBootstrapped();
  if (!connected || !isDatabaseReachable()) {
    console.error(
      'ERROR: No reachable PostgreSQL / Supabase connection found. Please set DATABASE_URL or SUPABASE_DB_URL in your .env file before running migration.'
    );
    process.exit(1);
  }

  console.log('[1/4] PostgreSQL / Supabase schema tables & indexes verified.');

  await ensureAuthSeeded();
  const [courses, profiles, enrollments, batches] = await Promise.all([
    getAllCourses(),
    getAllProfiles(),
    getAllEnrollments(),
    getAllBatches(),
  ]);
  console.log(
    `[2/4] RBAC & Course records migrated idempotently: ${courses.length} courses, ${profiles.length} profiles, ${enrollments.length} enrollments, ${batches.length} batches.`
  );

  const totalQuestions = await ensureDatabaseSeeded();
  const tests = await getAllTestsFromDb();
  const bank = getCachedQuestionBank();
  const audit = auditQuestionBankAndTests(bank, tests);

  console.log(
    `[3/4] Question Bank & Mock Tests migrated: ${totalQuestions} canonical questions, ${tests.length} official mock tests.`
  );
  console.log(
    `[4/4] Deduplication & Integrity Audit: ${audit.duplicateIdsInTests} duplicate IDs, ${audit.duplicateFingerprintsInTests} duplicate fingerprints.`
  );
  console.log('======================================================================');
  console.log(' MIGRATION COMPLETE — ALL RECORDS RECONCILED IN POSTGRESQL / SUPABASE');
  console.log('======================================================================');
  process.exit(0);
}

runSupabaseMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
