# CoursePilot

AI-Powered Academic Dashboard for Canvas LMS.

Full spec: [`docs/CoursePilot.md`](docs/CoursePilot.md)

## Stack

- **Frontend/Backend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Database:** Supabase PostgreSQL (no ORM)
- **Auth:** Clerk
- **AI:** External [`CoursePilot-RAG`](../rag/canvas-ai-assistant) service (FastAPI + Gemini + pgvector)
- **Canvas:** Canvas REST API

## Getting started

1. Install deps:

   ```bash
   npm install
   ```

2. Copy env and fill in real values:

   ```bash
   cp .env.example .env
   ```

3. Create a Supabase project. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.

4. Create a Clerk application. Copy publishable + secret keys into `.env`.

5. Generate `TOKEN_ENCRYPTION_KEY` (encrypts per-user Canvas tokens):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Set `CANVAS_API_URL` to your school's Canvas host (prefilled in the connect form).
   Each user adds their own Canvas personal access token from the dashboard
   (Canvas → Account → Settings → New Access Token).

6. Start the RAG service in `../rag/canvas-ai-assistant` (it owns the vector DB):

   ```bash
   cd ../rag/canvas-ai-assistant
   uv sync
   cp .env.example .env   # fill DATABASE_URL + GEMINI_API_KEY
   uv run uvicorn app.main:app --reload --port 8000
   ```

   Point CoursePilot at it with `RAG_API_URL` (default `http://localhost:8000`).

7. Run:

   ```bash
   npm run dev
   ```

## Project layout

```
src/
  middleware.ts              Clerk route protection
  app/
    page.tsx                 Landing
    sign-in/ sign-up/        Clerk auth pages
    dashboard/               Dashboard (tasks, deadlines, announcements, AI assistant)
    api/
      canvas/connect/route.ts    POST — validate + store encrypted Canvas token
      canvas/status/route.ts     GET — connection status (never returns the token)
      canvas/disconnect/route.ts POST — remove the stored connection
      sync/route.ts          POST — pull Canvas data → Postgres
      tasks/route.ts         GET list, POST create manual task
      tasks/[id]/route.ts    PATCH update, DELETE manual task
      ask/route.ts           POST RAG question
  lib/
    env.ts                   Env helpers
    supabase.ts              Service-role client
    canvas.ts                Canvas API client (per-user credentials)
    canvas-account.ts        Canvas connection storage + credential resolution
    crypto.ts                AES-256-GCM token encryption
    user.ts                  Clerk → users table upsert
    sync.ts                  Canvas sync pipeline (courses/tasks/announcements)
    ai/
      rag.ts                 RAG service client + course resolution
      ingest.ts              Canvas course → RAG ingestion client
    rate-limit.ts            Postgres-backed per-user request limits
supabase/
  schema.sql                 CoursePilot tables + RLS
```

## API surface

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/canvas/connect` | Validate and store the user's Canvas token |
| GET | `/api/canvas/status` | Connection status for the current user |
| POST | `/api/canvas/disconnect` | Delete the stored Canvas connection |
| POST | `/api/sync` | Sync Canvas courses/assignments/announcements |
| GET | `/api/tasks` | List tasks for current user |
| POST | `/api/tasks` | Create manual academic task |
| PATCH | `/api/tasks/:id` | Update status/notes/priority/due date |
| DELETE | `/api/tasks/:id` | Delete manual task (Canvas-synced tasks can't be deleted) |
| POST | `/api/ask` | RAG question → CoursePilot-RAG answer + citations |

## Canvas → RAG ingestion

Sync keeps Canvas metadata in Supabase and also indexes course material into the
RAG service, using the signed-in user's Canvas credentials (sent per request,
never stored by RAG).

- **Scope:** Canvas module **Files** (PDF, HTML, PPTX) and **Pages** only.
  Assignments, quizzes, external URLs, external tools, and subheaders are skipped.
- **Cadence:** each sync re-indexes up to `RAG_INGEST_MAX_COURSES` courses whose
  `rag_indexed_at` is empty or older than `RAG_REINDEX_HOURS`. This spreads a
  large account across syncs and avoids embedding-quota bursts.
- **Failures:** item-level failures (oversized files, empty pages, Gemini 429s)
  are reported in the sync result and retried on the next re-index; they never
  roll back courses/tasks/announcements.
- **Disable:** set `RAG_INGESTION_ENABLED=false`.

## Rate limiting

`/api/ask` is the most expensive route (Gemini embedding + generation), so each
user gets a minute and a day budget enforced in Postgres:

- `RATE_LIMIT_PER_MINUTE` (default `10`)
- `RATE_LIMIT_PER_DAY` (default `200`)

Calls are counted by the `check_rate_limit()` SQL function, so all serverless
instances share counters without Redis/Upstash. Over-limit requests return
`429` with a `Retry-After` header. If the limiter itself errors, requests fail
open rather than locking users out.

## Notes

- All secrets live in `.env` (gitignored). `.env.example` only has variable names.
- Supabase service-role key stays server-side (route handlers only).
- RLS is enabled on all tables; app access uses the service role.
- Canvas tokens are encrypted with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`) and are
  never returned to the browser after submission. The shared `CANVAS_ACCESS_TOKEN`
  is only used when `CANVAS_ALLOW_ENV_TOKEN=true` (local development).
- `/api/ask` resolves the signed-in user's selected course to its Canvas course ID,
  then calls `POST {RAG_API_URL}/api/v1/chat` with `X-RAG-Token`. RAG course material
  is ingested by the RAG service (`scripts/ingest_documents.py` or
  `/api/v1/ingestion/canvas-module`).
