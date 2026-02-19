# Shelby

Vehicle tracker for a 3rd gen Toyota 4Runner. Upload service documents, extract data with AI, track component service history.

## Setup

```bash
npm install
cp .env.example .env  # Fill in your credentials
npx prisma db push
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH_USERNAME` | Login username |
| `AUTH_PASSWORD` | Login password |
| `POSTGRES_PRISMA_URL` | Supabase pooled connection string |
| `POSTGRES_URL_NON_POOLING` | Supabase direct connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `ANTHROPIC_API_KEY` | Anthropic API key for document extraction |

## Stack

- Next.js 16 / TypeScript / Tailwind CSS v4
- Prisma + PostgreSQL (Supabase)
- Anthropic Claude Sonnet (PDF extraction)
