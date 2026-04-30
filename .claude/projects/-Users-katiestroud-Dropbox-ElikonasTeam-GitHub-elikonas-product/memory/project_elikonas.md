---
name: Project - Elikonas
description: Core product context — what it is, tech stack, and initial structure
type: project
---

Elikonas is an AI-powered education marketplace for non-traditional learners. Delaware PBC, pre-launch alpha.

**Tech stack:**
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS v4
- Backend: API routes in Next.js (Node.js/Express noted as intent but currently using Next.js API routes)
- Database: PostgreSQL via Supabase
- Auth: Supabase Auth (using @supabase/ssr for SSR-compatible cookies)
- Payments: Stripe (v22, API version 2026-04-22.dahlia)
- AI: Anthropic API — model `claude-sonnet-4-20250514`, constant in `lib/anthropic/client.ts`
- Hosting: AWS (planned)

**Brand colors:**
- Dark teal: #084c61 → `text-brand-dark-teal`
- Teal: #177e89 → `text-brand-teal`
- Red: #db3a34 → `text-brand-red`
- Gold: #ffc857 → `text-brand-gold`
- Charcoal: #323031 → `text-brand-charcoal`
Colors are defined in `app/globals.css` via Tailwind v4 `@theme inline` block.

**Key file locations:**
- Supabase browser client: `lib/supabase/client.ts`
- Supabase server client: `lib/supabase/server.ts`
- Auth middleware: `middleware.ts` (root)
- Stripe client: `lib/stripe/client.ts`
- Anthropic client: `lib/anthropic/client.ts`
- Shared types: `types/index.ts`
- Env template: `.env.local.example` (committed); `.env.local` is gitignored

**Route structure:**
- `app/(auth)/login` and `app/(auth)/register` — unauthenticated routes
- `app/(dashboard)/learner` and `app/(dashboard)/provider` — authenticated routes (protected by middleware)
- `app/api/auth`, `app/api/payments`, `app/api/ai` — API route stubs

**Why:** Pre-launch, setting up a clean, type-safe scaffold before building features.
**How to apply:** Use established lib clients and route groups. Don't add new auth solutions — use Supabase SSR pattern already in place.
