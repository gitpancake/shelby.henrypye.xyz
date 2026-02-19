# Shelby - 3rd Gen 4Runner Tracker

## Project Overview
Single-vehicle tracking app for a 1998 Toyota 4Runner SR5. Upload service documents (invoices, CarFAX reports, repair orders), extract data via Anthropic API, and track component service history.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (dark JARVIS-style UI)
- **Database**: PostgreSQL on Supabase (shared instance, all tables prefixed `shelby_`)
- **ORM**: Prisma
- **AI**: Anthropic Claude Sonnet (PDF document extraction)
- **Auth**: Cookie-based session auth (credentials in .env)

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx prisma db push   # Sync schema to DB (additive, won't drop shared tables)
npx prisma generate  # Regenerate Prisma client
```

## Architecture

### Database (shared Supabase)
Existing tables from other apps (`jobs`, `trip_projects`, `user_cv`) are defined in the Prisma schema so they don't get dropped. DO NOT modify these.

Shelby tables:
- `shelby_vehicle` — single vehicle record (VIN-decoded via NHTSA)
- `shelby_document` — uploaded PDF/image files with processing status
- `shelby_service_record` — extracted service events (date, mileage, shop)
- `shelby_service_line_item` — individual work items per record
- `shelby_component` — normalized component tracker (unique per vehicle+name)

### Key Files
- `src/lib/anthropic.ts` — AI extraction prompt and API call
- `src/lib/auth.ts` — session token creation/verification
- `src/lib/prisma.ts` — Prisma client singleton
- `src/lib/nhtsa.ts` — VIN decode via NHTSA API
- `src/lib/files.ts` — file upload storage utility
- `src/proxy.ts` — Next.js 16 proxy (auth middleware)
- `src/components/PageShell.tsx` — shared nav + layout wrapper

### Auth Flow
Credentials from `AUTH_USERNAME` / `AUTH_PASSWORD` env vars. HMAC-signed httpOnly cookie. Proxy redirects unauthenticated users to `/login`.

### Document Processing Flow
1. Upload PDF → stored in `public/uploads/` with UUID filename
2. Click "Extract Records" → POST to `/api/documents/[id]/process`
3. Anthropic API reads PDF, returns structured JSON (service records + normalized components)
4. Results stored in transaction (60s timeout for large docs like CarFAX)
5. UI polls every 3s for status updates

### UI Design
JARVIS-inspired dark theme: `#060606` background, monospace data, `text-[10px] tracking-[0.3em] uppercase` labels, gradient divider lines, `border-neutral-800/60` containers. Black/white/neutral palette only.

## Environment Variables (.env)
```
AUTH_USERNAME=
AUTH_PASSWORD=
POSTGRES_PRISMA_URL=       # Supabase pooled connection
POSTGRES_URL_NON_POOLING=  # Supabase direct connection
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## Important Notes
- This is a shared Supabase instance. Never run destructive migrations.
- `files/` directory contains local PDFs — gitignored, do not commit.
- `public/uploads/` contains uploaded docs — gitignored except `.gitkeep`.
- The proxy.ts file uses the Next.js 16 `proxy` convention (not `middleware`).
