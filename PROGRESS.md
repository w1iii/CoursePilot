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

- [x] `POST /api/sync` — Canvas courses/assignments/announcements
- [x] `GET/POST /api/tasks` — list + create manual tasks
- [x] `PATCH/DELETE /api/tasks/[id]` — update/delete manual tasks
- [x] `POST /api/ask` — RAG answer + citations through RAG service

### Libraries

- [x] `env.ts`, `supabase.ts`, `canvas.ts`, `user.ts`
- [x] `sync.ts` — Canvas metadata sync
- [x] `ai/rag.ts` — course resolution + RAG client + citations

### Database

- [x] Supabase project + schema applied
- [x] Tables: `users`, `courses`, `academic_tasks`, `announcements`
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

## Next

- [ ] Per-user Canvas personal access tokens
- [ ] Canvas modules → automatic RAG ingestion
- [ ] Hosted Neon RAG DB + hosted RAG service
- [ ] Vercel deployment
- [ ] Task CRUD UI
- [ ] AI task priority + announcement scoring
- [ ] Deadline-change detection
- [ ] Tests, rate limiting, AI request logging
- [ ] Loading/error UI states
