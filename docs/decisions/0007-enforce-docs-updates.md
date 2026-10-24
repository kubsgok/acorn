# 0007 — Progress/handover notes are local-only (supersedes the enforcement idea)

**Status:** accepted (owner decision, 2026-10-24)
**Context:** We briefly enforced updates to `docs/PROGRESS.md` and `docs/HANDOVER.md` with a pre-commit hook and a CI job. The owner prefers these working notes to stay private rather than be shared with the team repo.
**Decision:** Both files are git-ignored and live only in the owner's clone; the enforcement was removed (it needs the files committed). Agents keep them up to date as an explicit instruction (`CLAUDE.md`), not a gate.
**Consequences:** Teammates see decisions through ADRs, `docs/SETUP.md`, `docs/DESIGN-NOTES.md` and `AGENTS.md`, not progress logs. Nothing mechanically stops the local notes going stale. The files still appear in earlier commits on `rebuild/v2` (history was not rewritten).
