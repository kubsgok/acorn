# 0006 — Onboarding data model (derived game state, DOB stored)

**Status:** accepted (owner decisions, 2026-10-24)
**Context:** The MVP spec is offline-first: reminders and game state live on the phone, and drops are applied when the app next opens. Onboarding needs a profile, consent record, medications with dose times, the first plant, and pseudonymous usage events.
**Decisions:**

- **Streak and plant growth are derived**, not stored: one pure, unit-tested function computes them from dose logs on the device. The database stores plants only as records (growing / completed → the Forest). Counters can't drift from the logs.
- **Date of birth is stored** (owner's choice) and the database rejects anyone under 18, so no profile row is ever saved for a minor. Trade-off: more personal data than an "18+ confirmed" flag would hold; revisit under the PDPA review (the Singapore gate may need to be 21).
- **Medications** are soft-deleted (`deleted_at`) so calendar history survives; 1–4 daily dose times each (iOS allows 64 pending notifications, 3 per dose).
- **Events** are insert-only from the app with a fixed list of names and small object props; no names, DOB, medication names or locations.
- **Privileges:** RLS on every table, owner-only policies, and explicit grants to `authenticated` only. The migration revokes default privileges first, so it is safe whether or not the dashboard's "automatically expose new tables" is on (we keep it off).
  **Consequences:** Dose logs (`dose_logs`) and the local-first sync layer are a later migration. Deleting the auth user cascades to all rows (account + data deletion); the server-side delete itself (needs the service role, so an Edge Function) is still to build. Tested without Docker via PGlite (`npm run test:db`, run in CI).
