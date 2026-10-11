# NTA PULSE — National Competitive Examination Platform (JEE Main, JEE Advanced & NEET UG)

NTA Pulse is a full-stack Computer-Based Test (CBT) simulation, question bank, and analytics platform for **JEE Main**, **JEE Advanced**, and **NEET UG** candidates, faculty mentors, and examination controllers.

---

## 1. Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, KaTeX Mathematical Rendering, Motion Animations.
- **Backend:** Express.js API Server (`server.ts` for Node/Dev & `api/index.ts` for Vercel Serverless Functions).
- **Database:** Supabase PostgreSQL with Drizzle ORM (`src/db/schema.ts`), automatic idempotent schema bootstrap (`src/db/bootstrapSchema.ts`), and 18-table Row Level Security (`src/db/rls_policies.sql`).
- **Authentication:** Supabase Auth (`@supabase/supabase-js`) + Server-Validated PostgreSQL RBAC Sessions (`auth_sessions`) with `scrypt` salted password hashing, forced first-login password rotation, and strict course isolation (`JEE`, `JEE_ADVANCED`, `NEET`).
- **Zero Firebase Dependency:** All Firebase / Firestore dependencies, config files, and SDK imports have been completely removed.

---

## 2. Persistent Database Tables (Supabase PostgreSQL)

All 18 production tables are persisted in PostgreSQL and protected by Row Level Security (RLS):
1. `courses` — Canonical course definitions (`course_jee`, `course_jee_adv`, `course_neet`)
2. `profiles` — RBAC user accounts (`STUDENT`, `TEACHER`, `ADMIN`) with course & subject access
3. `enrollments` — Student-to-course enrollment mappings (`ACTIVE`, `SUSPENDED`, `EXPIRED`)
4. `auth_sessions` — Server-side session tokens with expiration and instant revocation
5. `batches` — Cohort & classroom management linked to teachers and courses
6. `questions` — Centralized deduplicated question bank with fingerprint & concept indexing
7. `question_usage` — Cross-test question rotation & usage tracking
8. `tests` — Official blueprint & custom mock tests with saved question snapshots
9. `test_questions` — Ordered question snapshot mappings per test and attempt set (`Set A`, `Set B`)
10. `test_assignments` — Visibility rules (`PUBLIC` vs `ASSIGNED_ONLY`) per test
11. `test_attempts` — Full student attempt evaluations, accuracy, percentile, and question-by-question reviews
12. `active_exam_sessions` — Live CBT timer & response state auto-saved across refreshes
13. `user_bookmarks` — Saved student question bookmarks and revision notes
14. `question_reports` — Student-submitted question error reports and faculty resolutions
15. `study_materials` — Course-scoped formula sheets, notes, and PYQ compendiums
16. `announcements` — Priority broadcasts scoped by course or batch
17. `password_recovery_requests` — Student & teacher credential recovery tickets
18. `audit_logs` & `platform_settings` — Immutable security audit trail and persistent system settings

---

## 3. Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Server-only | Supabase PostgreSQL connection string (Pooler or Direct URI) |
| `VITE_SUPABASE_URL` | Client & Server | Your Supabase project URL (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Client & Server | Your Supabase public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Supabase Service Role secret key for server-side token verification & admin sync |
| `SESSION_SECRET` | Server-only | 32+ character random secret for session signing |
| `APP_URL` | Server-only | Canonical application URL for OAuth & password recovery redirects |
| `ENABLE_DEMO_ACCOUNTS` | Server-only | Set to `"true"` to enable sandbox demo accounts or `"false"` to disable |
| `DEMO_ADMIN_PASSWORD` | Server-only | Custom password for the demo administrator account |
| `DEMO_TEACHER_PASSWORD` | Server-only | Custom password for demo teacher accounts |
| `DEMO_STUDENT_PASSWORD` | Server-only | Custom password for demo student accounts |

---

## 4. Database Migrations & Setup

### Automatic Idempotent Bootstrap
On server startup, `ensureSchemaBootstrapped()` (`src/db/bootstrapSchema.ts`) automatically verifies and creates all required PostgreSQL tables and indexes using `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING` without overwriting existing records.

### Manual Supabase SQL Migration
To apply the schema and Row Level Security policies directly in the Supabase SQL Editor or via CLI:
1. Run `supabase/migrations/20260410000000_complete_production_schema.sql`
2. Run `src/db/rls_policies.sql`
3. Or execute the CLI reconciliation script:
   ```bash
   npm run db:migrate:supabase
   ```

---

## 5. Demonstration Accounts (Synthetic Sandbox)

When `ENABLE_DEMO_ACCOUNTS` is enabled, the login screen provides clearly labeled **Demonstration Accounts** for testing each role and course isolation gate:

| Role | Course / Scope | Login Identifier | Default Demo Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Active JEE)** | `JEE` | `JEE26-10001` | `Student@2026!` | Enrolled in JEE Main Morning Batch |
| **Student (1st Login Temp)** | `JEE + JEE_ADVANCED` | `JEE26-7F42K` | `Temp@7F42K` | Triggers forced first-login password change |
| **Student (Active NEET)** | `NEET` | `NEET26-10001` | `Student@2026!` | Enrolled in NEET Biology Batch (180 Qs) |
| **Student (Suspended)** | `JEE` | `JEE26-10003` | `Student@2026!` | Demonstrates `403 SUSPENDED` security gate |
| **Teacher (JEE Faculty)** | `JEE + JEE_ADVANCED` | `hcverma@ntapulse.edu.in` | `Teacher@2026!` | Prof. H.C. Verma — JEE Batch & Test Control |
| **Teacher (NEET Faculty)** | `NEET` | `ritusharma@ntapulse.edu.in` | `Teacher@2026!` | Dr. Ritu Sharma — NEET Batch & Question Bank |
| **Administrator** | `ALL COURSES` | `admin@ntapulse.edu.in` | `Admin@2026!` | Full RBAC, RLS Audit, & Platform Settings |

### Credential Rotation & Production Hardening
- To rotate demo credentials or disable demo accounts in production, set `ENABLE_DEMO_ACCOUNTS="false"` or override `DEMO_ADMIN_PASSWORD`, `DEMO_TEACHER_PASSWORD`, and `DEMO_STUDENT_PASSWORD` in your environment variables, then reset passwords from the Administrator Console (`/admin/users`).
- Seeded demo accounts are restricted from deleting real production accounts when `NODE_ENV="production"`.

---

## 6. Local Development & Production Build

```bash
# Install dependencies
npm install

# Run TypeScript typecheck / linter
npm run lint

# Build production frontend bundle
npm run build

# Start development server (Express + Vite on port 3000)
npm run dev
```
