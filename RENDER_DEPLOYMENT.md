# NTA PULSE — Render Deployment Guide

This guide explains how to deploy the full-stack **NTA PULSE** application to [Render](https://render.com) with Supabase PostgreSQL and authentication.

---

## Architecture Overview on Render

- **Single Web Service**: Node.js backend (`Express` + `tsx`) serving both the backend API (`/api/*`) and the static React SPA frontend (`dist/`).
- **Zero CORS / Domain Drift**: Both frontend and backend run on the same Render domain.
- **Health Check**: Render monitors `/api/health` for zero-downtime rolling deploys.
- **Port Binding**: Automatically binds to `0.0.0.0:$PORT` provided by Render.

---

## Option 1: One-Click Blueprint Deployment (Recommended)

Render provides Infrastructure-as-Code via [`render.yaml`](file:///c:/Users/ramjh/Downloads/papa-main%20%283%29/papa-main/render.yaml).

1. Push your repository to **GitHub** or **GitLab**.
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your repository.
5. Render detects `render.yaml` automatically and creates the **Web Service**.
6. When prompted, fill in the environment variables (see below).
7. Click **Apply**.

---

## Option 2: Manual Web Service Setup in Render Dashboard

If you prefer configuring the Web Service manually via Render dashboard:

1. Click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the settings:
   - **Name**: `nta-pulse` (or your preferred name)
   - **Language / Runtime**: `Node`
   - **Branch**: `main`
   - **Region**: Oregon (US West) or closest to your database
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Health Check Path**:
     ```
     /api/health
     ```
   - **Plan**: `Free` (or `Starter`)

*(Note: If your repository contains the code inside a `papa-main/` subfolder, set **Root Directory** in settings to `papa-main`)*.

---

## Option 3: Docker Deployment

A production-ready multi-stage [`Dockerfile`](file:///c:/Users/ramjh/Downloads/papa-main%20%283%29/papa-main/Dockerfile) is also included.

1. Click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Choose **Docker** as the runtime.
4. Render will automatically build the image and start the container on `$PORT`.

---

## Required Environment Variables

Configure these in Render (`Settings` -> `Environment`):

| Variable | Description | Example / Value |
|---|---|---|
| `NODE_ENV` | Production environment flag | `production` |
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |
| `SUPABASE_URL` | Supabase Project API URL | `https://[PROJECT-REF].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key | `eyJhbGciOi...` |
| `VITE_SUPABASE_URL` | Supabase Project API URL (Frontend) | `https://[PROJECT-REF].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Public Key (Frontend) | `eyJhbGciOi...` |
| `SESSION_SECRET` | Cryptographic secret for signing sessions | 32+ random characters |
| `APP_URL` | Canonical URL of your Render service | `https://nta-pulse.onrender.com` |
| `ENABLE_DEMO_ACCOUNTS` | Auto-seed demo accounts | `true` |
| `DEMO_ADMIN_PASSWORD` | Default admin password | `Admin@2026!` |
| `DEMO_TEACHER_PASSWORD` | Default teacher password | `Teacher@2026!` |
| `DEMO_STUDENT_PASSWORD` | Default student password | `Student@2026!` |
| `GEMINI_API_KEY` | Optional AI generator key | `your_gemini_api_key` |

---

## Post-Deployment: Configure Supabase Auth Redirects

After your Render service is deployed:

1. Copy your Render live URL (e.g., `https://nta-pulse.onrender.com`).
2. Go to your **Supabase Dashboard** -> **Authentication** -> **URL Configuration**.
3. Set **Site URL** to:
   ```
   https://nta-pulse.onrender.com
   ```
4. Add to **Redirect URLs**:
   ```
   https://nta-pulse.onrender.com/**
   ```
5. Click **Save**.
