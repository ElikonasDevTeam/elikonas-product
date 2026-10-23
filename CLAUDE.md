@AGENTS.md

# CLAUDE.md — elikonas-product

Instructions for Claude Code working in this repo. `AGENTS.md` (imported above) holds framework rules managed by Next.js; leave it as is and put Elikonas rules here. Items in [brackets] still need to be confirmed against the live codebase.

## What this is

Elikonas is a portable lifelong learning-record platform for adult learners on non-traditional career paths. It helps people prove they are learning so they can compete for better jobs. Elikonas is a public benefit corporation. The app has been live at elikonas.com since Aug 8, 2026, and the current focus is growing the user base. Eli is the in-app AI guide, powered by the Anthropic API.

## Decision rights

- Katie Stroud (founder/CEO) makes final product and strategy decisions, including all user-facing wording.
- Dan Brackett (CTO), Tom Jacobs (VP business development, also contributing code), and Isara Witten (junior developer) work in this repo.
- Present options and tradeoffs before implementing anything that changes product behavior or user-facing copy. Make no unilateral product decisions.

## How changes arrive and how to apply them

Planning happens in Claude chat. Changes arrive here as markdown specs. This repo is the second review layer, so treat every spec as a proposal to verify, not a diff to apply.

1. Before editing, read the files the spec touches in the live repo and confirm the spec's assumptions still hold (file paths, function names, schema, existing behavior).
2. Report any mismatch before making changes. Never apply diffs blindly.
3. Check specifically:
   - RLS policies exist and are correct for any new or changed table.
   - RPC functions have the right `GRANT EXECUTE` permissions.
   - The build passes: [`npm run build` — confirm command] before pushing.
4. Branching and PRs: [confirm with Dan — e.g. feature branches + PR to main, or direct to main].

## Stack

| Area | Tool | Notes |
| --- | --- | --- |
| Framework | Next.js | Deployed on Netlify |
| Hosting/DNS | Netlify | DNS managed in Netlify |
| Database | Supabase (PostgreSQL) | See database rules below |
| Payments | Stripe, live mode | Founding member, monthly, and annual products |
| AI | Anthropic API | Powers Eli |
| Analytics | Cloudflare Web Analytics, Microsoft Clarity | Cloudflare drops query strings |
| Consent | CookieYes | Loaded via a Script component in `app/layout.tsx` |
| Email | Brevo (transactional) | Mailchimp is being retired; don't add new Mailchimp code |
| Support | Zendesk | Fed by support@elikonas.com |

## Database rules

- Production: Supabase project `ylnkmrlapzogmrskydde`. Staging: a separate free Supabase project.
- Migrations live in [supabase/migrations — confirm path].
- Apply and test migrations on staging first. Never run migrations or data changes against production without explicit confirmation in the session.

## Safety rules

- Never commit secrets. Keys live in `.env.local` [confirm] and Netlify environment variables. Never print key values in output.
- Stripe is in live mode. Do not create or modify products, prices, or webhooks without explicit confirmation. Use Stripe test keys for local work.
- Don't remove or reorder the CookieYes script without checking consent behavior.

## Product conventions

- Mobile matters: the app is a PWA for now and many learners are phone-first. Check layouts at mobile widths. An official mobile app is planned for early 2027.
- Analytics tracking: Cloudflare doesn't log query strings, so use distinct URL paths (e.g. `/postcards`, `/bookmark`) instead of UTM parameters.
- Free tier limits Eli to 5 prompts a day. Paid tier design is undecided; don't build tier features without a spec.

## Copy and brand

- "Eli" is the AI guide's name. Otherwise use "Elikonas" as the umbrella term for the AI, marketplace, and resource features; don't name components separately.
- No marketing taglines. Say plainly what the product does.
- Elikonas is additive to higher education, never a college alternative.
- Brand tokens: dark teal `#084c61`, teal `#177e89`, gold `#ffc857`, red `#db3a34`, charcoal `#323031`. Typeface: Crimson Pro (serif).

## Roadmap context

- Next major build: the content provider portal (after pending app updates).
- Providers can hold dual accounts (learner + provider). Smooth account switching can come later.
- Provider offering fields should match the learner ed-unit fields.
- The "learning library" is a placeholder for the offerings catalog.
- Employer portals are likely 2+ years out, but build marketplace infrastructure so employers can later add offerings.

## Related repo

Blog posts live in the separate `elikonas-placeholder` repo, named `post_YYYYMMDD_slug.html`, sharing `global-styles.css`, `index-styles.css`, `blog-styles.css`, and `post-styles.css`.
