# Contributing to Elikonas

This is the loop we actually use to ship changes. Read it once end to end before your first PR — most of the trip-ups below are things we hit ourselves setting this up.

## The loop

1. **Find or file an issue.** Every change starts as a GitHub Issue — use the Bug report or Feature request template. Check the [Elikonas Dev project board](#) for what's already scoped and unclaimed.
2. **Branch off `staging`, never off `main`:**
   ```
   git checkout staging
   git pull
   git checkout -b feature/short-description
   ```
   (or `fix/short-description` for bugs)
3. **Do the work, commit normally.**
4. **Push and open a PR into `staging`** (not `main`):
   ```
   git push -u origin feature/short-description
   gh pr create --base staging
   ```
   Netlify automatically builds a **Deploy Preview** for the PR — a unique URL, linked in the PR checks. Use it to actually look at your change before asking for review.
5. **Once merged to `staging`,** it auto-deploys to the staging site, wired to its own isolated Supabase project (`elikonas-staging`) — safe to test signups, data changes, anything, without touching real users.
6. **Releases to production** (`staging` → `main`) are handled separately, usually by Katie — `main` has branch protection on, so nothing lands there without a PR and review regardless of who's pushing.

## Environment setup (first time only)

- Clone the repo, then copy `.env.local` values from Katie or Code (never commit this file — it's gitignored on purpose, and holds live secrets)
- Install the GitHub CLI if you don't have it: `brew install gh`, then `gh auth login` → GitHub.com → HTTPS → browser login
- If you're using Claude Code with the Supabase MCP connection: it needs approving once per machine. If the interactive prompt doesn't show up on `claude` startup (it doesn't always), run `/mcp` inside a Claude Code session, or as a fallback create `.claude/settings.local.json` (gitignored) with `{"enabledMcpjsonServers": ["supabase"]}`

## Things that will trip you up (they got us too)

- **Terminal vs. Claude Code's chat window are different places.** Plain shell commands (`git`, `cat`, `ls`, `gh`) go in an actual terminal prompt — the short line ending in `%` or `$` — not inside Code's chat box. If you paste a shell command into Code's chat, it'll try to interpret it as a request to you rather than running it, and you'll get a confusing conversational reply back instead of command output.
- **`gh api` needs `-F` (capital), not `-f`, for non-string values** (integers, booleans, `null`). Using lowercase `-f` sends everything as a literal string and the API will reject it with a schema error.
- **zsh treats `[` and `]` as pattern-matching characters.** Wrap any argument containing brackets in single quotes.
- **Never commit `.env.local`, API keys, or connection strings.** If a tool ever proposes force-adding a gitignored secrets file to git, say no — that puts the secret in git history permanently, readable by anyone with repo access, even after later deletion.
- **Check which repo/project you're actually looking at.** There's more than one Netlify project and more than one repo with "elikonas" in the name floating around from earlier iterations — confirm the linked repository and the connected Supabase project before changing settings anywhere.

## Database changes

Schema changes go through migrations, not manual edits in the Supabase dashboard. If your change needs a new table/column:
1. Write it as a migration (via `supabase db diff` locally, or by hand)
2. Apply it to `elikonas-staging` first, test it there
3. Flag it in your PR description so it gets applied to production as part of the release, not silently

## Release notes

If your change is user-facing, add a line to `CHANGELOG.md` under `[Unreleased]` in the same PR. Plain-language entries for the public `/updates` page get added separately, at release time.
