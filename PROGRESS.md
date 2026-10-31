# CoursePilot — Progress

Last updated: 2026-10-31

## Status

Working local demo. Build + lint green.

## Stack

- Next.js 15.5.28 (App Router), React 19, TypeScript, Tailwind CSS 4
- Clerk auth
- Supabase PostgreSQL (metadata only, no ORM)
- Canvas REST API
- External CoursePilot-RAG service (FastAPI + Gemini + pgvector)

## Done

### Auth and pages

- [x] Clerk middleware protects `/dashboard` and API routes
- [x] Landing, sign-in, sign-up pages
- [x] Auth-gated dashboard

### API

- [x] `POST /api/canvas/connect` — validate + encrypt per-user Canvas token
- [x] `GET /api/canvas/status` — connection status (token never returned)
- [x] `POST /api/canvas/disconnect` — remove stored connection
- [x] `POST /api/sync` — Canvas courses/assignments/announcements (per-user token)
- [x] `GET/POST /api/tasks` — list + create manual tasks
- [x] `PATCH/DELETE /api/tasks/[id]` — update/delete manual tasks
- [x] `POST /api/ask` — RAG answer + citations through RAG service

### Libraries

- [x] `env.ts`, `supabase.ts`, `canvas.ts`, `user.ts`
- [x] `sync.ts` — Canvas metadata sync
- [x] `ai/rag.ts` — course resolution + RAG client + citations
- [x] `crypto.ts` — AES-256-GCM token encryption
- [x] `canvas-account.ts` — per-user Canvas credentials + status

### Database

- [x] Supabase project + schema applied
- [x] Tables: `users`, `canvas_accounts`, `courses`, `academic_tasks`, `announcements`
- [x] RLS enabled

### RAG

- [x] Separate RAG DB/schema (`documents`, `chunks`)
- [x] Chat auth via `X-RAG-Token`
- [x] Course-scoped citation answers
- [x] Gemini fallback planned; local model `gemini-3.6-flash`

### Verified

- [x] `npm run build`
- [x] `npm run lint`
- [x] `npx tsc --noEmit`
- [x] RAG `/health`, ingest, chat

### Multi-user Canvas

- [x] Per-user Canvas personal access tokens (AES-256-GCM at rest)
- [x] Connect / status / disconnect UI + routes
- [x] Sync uses the signed-in user's credentials
- [x] Env token only when `CANVAS_ALLOW_ENV_TOKEN=true`

## Next

- [ ] Canvas OAuth (deferred until developer key is available)
- [ ] Canvas modules → automatic RAG ingestion
- [ ] Hosted Neon RAG DB + hosted RAG service
- [ ] Vercel deployment
- [ ] Task CRUD UI
- [ ] AI task priority + announcement scoring
- [ ] Deadline-change detection
- [ ] Tests, rate limiting, AI request logging
- [ ] Loading/error UI states
