# CoursePilot

AI-Powered Academic Dashboard for Canvas LMS.

Full spec: [`docs/CoursePilot.md`](docs/CoursePilot.md)

## Stack

- **Frontend/Backend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Database:** Supabase PostgreSQL + pgvector (no ORM)
- **Auth:** Clerk
- **AI:** OpenAI (GPT-5 + text-embedding-3-small), RAG over synced Canvas data
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

3. Create a Supabase project. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor (enables `vector`, creates tables + `match_documents` RPC).

4. Create a Clerk application. Copy publishable + secret keys into `.env`.

5. Get a Canvas access token (Account → Settings → Access Tokens). Set `CANVAS_API_URL` to your school's Canvas host.

6. Run:

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
      sync/route.ts          POST — pull Canvas data → Postgres → embeddings
      tasks/route.ts         GET list, POST create manual task
      tasks/[id]/route.ts    PATCH update, DELETE manual task
      ask/route.ts           POST RAG question
  lib/
    env.ts                   Env helpers
    supabase.ts              Service-role client
    canvas.ts                Canvas API client
    user.ts                  Clerk → users table upsert
    sync.ts                  Canvas sync pipeline
    ai/
      openai.ts              OpenAI client
      embeddings.ts          Embedding helpers
      rag.ts                 Retrieve → prompt → answer
supabase/
  schema.sql                 Full schema + pgvector + match_documents()
```

## API surface

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/sync` | Sync Canvas courses/assignments/announcements, index embeddings |
| GET | `/api/tasks` | List tasks for current user |
| POST | `/api/tasks` | Create manual academic task |
| PATCH | `/api/tasks/:id` | Update status/notes/priority/due date |
| DELETE | `/api/tasks/:id` | Delete manual task (Canvas-synced tasks can't be deleted) |
| POST | `/api/ask` | RAG question → grounded answer + sources |

## Notes

- All secrets live in `.env` (gitignored). `.env.example` only has variable names.
- Supabase service-role key stays server-side (route handlers only).
- RLS is enabled on all tables; app access uses the service role.
