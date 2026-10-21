# CoursePilot — Progress

Last updated: 2026-10-21

## Status: Initial scaffold complete — build + lint green

Project: `coursepilot/` · Spec: `docs/CoursePilot.md`

---

## Stack

- Next.js 15.5.28 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4
- Clerk 7 (auth) · Supabase PostgreSQL + pgvector (no ORM) · OpenAI (GPT-5 + text-embedding-3-small)
- Canvas REST API for LMS sync
- Planned hosting: Vercel (app) + Supabase (db)

---

## Done

### Auth & pages

- [x] Clerk middleware protecting `/dashboard` + all API routes
- [x] Landing page (`/`)
- [x] `/sign-in`, `/sign-up` (Clerk components)
- [x] Root layout wrapped in `ClerkProvider`
- [x] Auth-gated dashboard

### API (Next.js route handlers)

- [x] `POST /api/sync` — Canvas → courses/tasks/announcements → normalize → embed → pgvector
- [x] `GET /api/tasks` — list tasks (user-scoped)
- [x] `POST /api/tasks` — create manual academic task (validated)
- [x] `PATCH /api/tasks/[id]` — update status/notes/priority/due date
- [x] `DELETE /api/tasks/[id]` — delete manual tasks only; Canvas-synced protected
- [x] `POST /api/ask` — RAG: embed question → vector search → GPT-5 → answer + sources

### Libraries (`src/lib/`)

- [x] `env.ts` — env helpers
- [x] `supabase.ts` — service-role client (server-only)
- [x] `canvas.ts` — Canvas API client (courses, assignments, announcements)
- [x] `user.ts` — Clerk session → `users` table upsert
- [x] `sync.ts` — sync pipeline: normalize, upsert, dedupe, embed, index
- [x] `ai/openai.ts` — OpenAI client + model config
- [x] `ai/embeddings.ts` — single + batch embedding helpers
- [x] `ai/rag.ts` — retrieve → prompt → answer → structured response w/ sources

### Database (`supabase/schema.sql`)

- [x] Tables: `users`, `courses`, `academic_tasks`, `announcements`, `documents`
- [x] Relationships: User → Courses → Tasks → Announcements → Documents
- [x] pgvector extension, 1536-dim embeddings, HNSW cosine index
- [x] `match_documents()` RPC for similarity retrieval
- [x] RLS enabled on all tables
- [x] Validation CHECK constraints (type, priority, status)

### Dashboard UI

- [x] Today's priorities card
- [x] Upcoming deadlines card
- [x] Important announcements card
- [x] Courses card
- [x] AI academic assistant (ask box → `/api/ask`)
- [x] Sync Canvas button

### Project config

- [x] `.env.example` (names only) + `.env` (placeholders) — gitignored
- [x] ESLint flat config (Next 15 FlatCompat)
- [x] README with setup steps + API table

### Verified

- [x] `npm run build` passes
- [x] `npm run lint` passes

---

## Not done (next steps)

### Setup (blocking real use)

- [ ] Create Supabase project, run `supabase/schema.sql`
- [ ] Create Clerk application, copy real keys → `.env`
- [ ] Get Canvas access token (Canvas → Account → Settings), set `CANVAS_API_URL` to school host
- [ ] Set real `OPENAI_API_KEY`
- [ ] Test end-to-end sync with real Canvas account

### Features

- [ ] Personal task CRUD UI (API exists, no frontend form to create/edit manual tasks)
- [ ] AI-generated task priority (column exists, no auto-fill)
- [ ] Announcement importance scoring (column exists, no AI scoring)
- [ ] Deadline-change detection ("did any professor move a deadline?")
- [ ] Fallback import: Canvas export / syllabus PDF upload (risk plan from spec)
- [ ] AI request logging table
- [ ] Graceful AI-failure handling surfaced in UI

### Quality

- [ ] Git repo init + first commit
- [ ] Tests (unit for sync/dedupe, integration for API)
- [ ] Loading/error states for dashboard data
- [ ] Rate limiting on `/api/ask`

---

1. create-next-app@latest shipped Next 16 → pinned back to 15.5.28 per spec
2. Clerk Core 3 (Mar 2026) removed `SignedIn`/`SignedOut`/`Protect` → use `<Show when="signed-in">`
3. Next 16-style `eslint.config.mjs` failed on Next 15 → rewrote with `FlatCompat`
4. Next 16 template's `next.config.ts` had `cacheComponents`/`partialPrefetching` (invalid on 15) → removed
5. npm registry flaky during install → retries + raised fetch timeouts needed
