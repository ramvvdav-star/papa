# NTA PULSE — Supabase + GitHub + Vercel Production Architecture & Deployment Guide

## 1. Why Login Previously Failed on Vercel (And How It Was Fixed)

1. **Serverless Cold-Start Bundling (`vite` import & `.ts` extensions)**:
   - Previously, `server.ts` statically imported `vite` at the top level (`import { createServer as createViteServer } from 'vite'`), and `api/index.ts` used `.ts` file extension imports. In Vercel's production serverless runtime (`@vercel/node`), `vite` is a `devDependency` and only needed in local dev.
   - **Fix**: `vite` is now dynamically imported only when `process.env.NODE_ENV !== 'production'`, and all server/middleware imports use standard module specifiers.
2. **Self-Healing Database Schema Bootstrap (`src/db/bootstrapSchema.ts`)**:
   - Previously, if a newly provisioned PostgreSQL / Supabase database did not yet have all 20 tables (`courses`, `profiles`, `enrollments`, `auth_sessions`, `tests`, `test_attempts`, etc.), queries threw `relation "tests" does not exist` or `Failed query: insert into "courses"`.
   - **Fix**: `ensureSchemaBootstrapped()` automatically executes idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements on boot before seeding or querying.
3. **Stateless + Stateful HMAC Session Tokens Across Serverless Lambdas**:
   - On Vercel, consecutive API requests (`/api/auth/login` followed by `/api/auth/batches` or `/api/tests`) can be routed to different serverless lambda instances.
   - **Fix**: Session tokens (`nta_sess.<payload>.<hmac>`) are both stored in PostgreSQL `auth_sessions` AND cryptographically signed with HMAC-SHA256, ensuring sessions remain valid across any serverless instance and persist across browser refreshes.
4. **Google Sign-In Profile Unpacking**:
   - Fixed `/api/auth/google` and `/api/auth/session` in `server.ts` to properly destructure `{ profile, sessionToken }` from `getOrCreateFirebaseProfile()`.

---

## 2. Supabase Database Setup & SQL Migrations

All version-controlled PostgreSQL migrations are located in `supabase/migrations/`:

- `supabase/migrations/20261010000001_nta_pulse_complete_schema.sql`: Creates all 20 normalized tables (`courses`, `profiles`, `enrollments`, `study_materials`, `auth_sessions`, `batches`, `test_assignments`, `announcements`, `audit_logs`, `password_recovery_requests`, `platform_settings`, `questions`, `question_usage`, `tests`, `test_questions`, `test_attempts`, `active_exam_sessions`, `user_bookmarks`, `question_reports`, `users`) with indexes and constraints.
- `supabase/migrations/20261010000002_nta_pulse_rls_and_auth_triggers.sql`: Enables Row Level Security (RLS) on all public tables, creates role & course verification functions (`is_admin_user()`, `is_teacher_user()`, `is_course_authorized()`), enforces strict JEE vs. JEE Advanced vs. NEET course isolation, and adds `handle_new_supabase_auth_user()` for automatic student profile provisioning.

### Option A: Automatic Schema Creation (Zero-Config)
Simply set `DATABASE_URL` (your Supabase Transaction/Session Pooler URI or Direct Connection URI) in your environment variables. On the first API request, `src/db/bootstrapSchema.ts` automatically creates all tables, indexes, and seeds the initial RBAC accounts and official mock tests.

### Option B: Run Explicit Migration & Reconciliation Script
```bash
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" npm run db:migrate:supabase
```

---

## 3. Deploying to GitHub & Vercel

1. **Push Repository to GitHub**:
   ```bash
   git add .
   git commit -m "Production Supabase + Vercel Serverless Architecture"
   git push origin main
   ```
2. **Import Project in Vercel**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - `vercel.json` automatically routes `/api/(.*)` to the Express serverless handler `/api/index.ts` and SPA routes to `/index.html`.
3. **Environment Variables in Vercel (`Settings -> Environment Variables`)**:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string (`postgresql://...`)
   - `SESSION_SECRET`: Any 32+ character random string for signing stateless/stateful session tokens
   - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`: Your Supabase Project URL and Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY`: (Server-only) Your Supabase Service Role Key
   - `GEMINI_API_KEY`: (Optional) Server-side Gemini API key
4. **Verify Live Health Endpoint**:
   - Open `https://<your-vercel-domain>.vercel.app/api/health` to confirm `"status": "ok"`.
