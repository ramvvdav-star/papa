# NTA PULSE — Supabase + GitHub + Vercel Production Architecture & Deployment Guide

## 1. Key Architectural Fixes for Serverless & Persistence

1. **Zero Firebase Dependency**:
   - All Firebase and Firebase Admin packages, configuration files (`firebase-blueprint.json`, `firestore.rules`), and imports have been completely removed. Authentication is powered by Supabase Auth (`@supabase/supabase-js`) and PostgreSQL-persisted RBAC sessions (`auth_sessions`).
2. **Serverless Cold-Start Bundling (`vite` dynamic import)**:
   - `server.ts` dynamically imports `vite` only when `process.env.NODE_ENV !== 'production'`. In Vercel's production serverless runtime (`api/index.ts`), Express handles `/api/*` routes without loading `vite`.
3. **Self-Healing Database Schema Bootstrap (`src/db/bootstrapSchema.ts`)**:
   - `ensureSchemaBootstrapped()` executes idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements before seeding or querying, preventing missing-table errors on fresh databases.
4. **Non-Recursive Row Level Security (`src/db/rls_policies.sql`)**:
   - All 18 public tables have PostgreSQL Row Level Security enabled. Helper functions (`app_current_user_role()`, `app_authorized_course_ids()`) use `SECURITY DEFINER` with `SET row_security = off` to prevent infinite recursion (`stack depth limit exceeded`) while enforcing strict course isolation between `JEE`, `JEE_ADVANCED`, and `NEET`.

---

## 2. Supabase Database Setup & SQL Migrations

All version-controlled PostgreSQL migrations are located in `supabase/migrations/` and `src/db/`:

- `supabase/migrations/20260410000000_complete_production_schema.sql`: Creates all 18 production tables and indexes idempotently.
- `src/db/rls_policies.sql`: Enables Row Level Security (RLS) on all public tables and configures non-recursive course-isolation policies.

### Option A: Automatic Schema Creation
Set `DATABASE_URL` (your Supabase Transaction/Session Pooler URI or Direct Connection URI) in your environment variables. On startup, `src/db/bootstrapSchema.ts` automatically verifies all tables, indexes, and seeds initial courses, demo accounts, and official mock tests without overwriting existing data.

### Option B: Run Explicit Migration Script
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
   - `vercel.json` routes `/api/(.*)` to `/api/index.ts` and all frontend SPA routes to `/index.html`.
3. **Environment Variables in Vercel (`Settings -> Environment Variables`)**:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string (`postgresql://...`)
   - `SESSION_SECRET`: 32+ character cryptographic random secret
   - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`: Your Supabase Project URL and Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY`: (Server-only) Your Supabase Service Role Key
   - `APP_URL`: `https://<your-vercel-domain>.vercel.app`
4. **Configure Supabase Auth Redirect URLs**:
   - In your Supabase Dashboard (`Authentication -> URL Configuration`), set **Site URL** to `https://<your-vercel-domain>.vercel.app` and add `https://<your-vercel-domain>.vercel.app/**` under **Redirect URLs**.
