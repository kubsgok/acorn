# 0003 — Dev/prod Supabase projects and versioned migrations

**Status:** accepted
**Context:** v1 had one project and schema edits pasted into the dashboard.
**Decision:** Current project = prod; new `acorn-dev` for daily work. Schema changes are migration files in `supabase/migrations/`, with generated TypeScript types.
**Consequences:** Reproducible, reviewable schema; testing can't touch real data.
