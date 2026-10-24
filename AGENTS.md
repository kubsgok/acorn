# AGENTS.md — Acorn Labs engineering guide

Single source of truth for **humans and AI agents**. Keep it short; details live in `docs/`.

## What Acorn is

A medication-adherence app with light gamification. MVP loop: each scheduled dose taken keeps a
**streak** going; the streak grows the user's current **plant**; a fully grown plant joins their
**forest** and a new one starts. It handles **health data**, so security and privacy come first.

## Stack

Expo (React Native, TypeScript strict) · expo-router · Supabase (Auth + Postgres + RLS) · Jest + React Native Testing Library · Maestro (E2E).
Targets **iOS and Android**. Web is not a target.

## Before you start any task

1. If you have them, read your local, git-ignored working notes `docs/HANDOVER.md` (where we are) and `docs/PROGRESS.md` (what is done). They are the owner's private notes and may not exist in your clone.
2. Work on **one phase at a time**. Ask clarifying questions before coding; plan before editing.
3. Never commit to `main`. Branch → PR → green CI → merge.

## Commands (once scaffolded in Phase 2)

| Command                | Purpose                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `npm run check`        | typecheck + lint + format check + tests. **Must pass before every commit.**               |
| `npm start`            | Expo dev server                                                                           |
| `npm test`             | Jest                                                                                      |
| `npm run test:scripts` | Tests for the repo's own scripts (e.g. the docs check)                                    |
| `npm run test:db`      | Applies `supabase/migrations` in an in-process Postgres (PGlite, no Docker) and tests RLS |

## Folder rules

```
app/                 routes only — thin, no business logic
src/theme/           design tokens (colors, typography, spacing). The ONLY place raw values live
src/components/ui/   shared presentational primitives
src/features/<name>/ screens' UI + hooks + logic for one feature
src/lib/             clients and config (supabase, secureStorage, config)
src/i18n/            translation files (en.json)
src/types/           generated DB types — never hand-edit
supabase/            migrations/ + functions/ (the backend, in git)
docs/                SETUP, DESIGN-NOTES, PROMPTS, decisions/ (ADRs); local-only PROGRESS + HANDOVER (git-ignored)
```

## Code standards

- **Readable first.** Small, single-purpose functions. Files ≤ ~150 lines; one component per file.
- **No raw colors or font sizes in components** — import tokens from `src/theme`. Repeated spacing uses tokens; a one-off Figma layout value may be a named constant at the top of that feature's file, with a comment naming the Figma node.
- **No hard-coded user-facing text** — use `t('feature.key')`.
- **TypeScript strict.** No `any`, no `!` non-null assertions on external data. Validate at boundaries.
- **Logic out of JSX.** Put it in hooks / pure functions and unit-test those.
- **Small increments.** Each commit compiles and passes `npm run check`. Conventional commits (`feat(auth): …`, `fix: …`, `chore: …`).
- **No dead code, no commented-out code, no speculative abstractions** (YAGNI).
- **Dependencies:** add with `npx expo install` (version-compatible). Justify each in the PR. Prefer Expo-maintained packages.
- **Accessibility:** every touchable has `accessibilityRole` + `accessibilityLabel`; touch targets ≥ 44pt.
- **Both platforms:** test iOS _and_ Android. Use `Platform`-specific code only when unavoidable.

## Security rules (non-negotiable)

1. **No secrets in git or in `EXPO_PUBLIC_*`** — those ship inside the app. The client may only hold the Supabase URL + anon key. Server secrets live in Supabase secrets. Only `.env.example` is committed.
2. **Tokens only in encrypted storage** (expo-secure-store). Never AsyncStorage.
3. **Never log** tokens, passwords, emails, or any health data. No `console.*` in `src/` (use the dev-only logger).
4. **Every table has Row-Level Security** and an owner policy, in the same migration that creates it. The service-role key is never used in the app.
5. **Generic auth errors** ("Email or password is incorrect"). Never show raw backend messages.
6. **Client validation is UX only**; the server/RLS is the source of truth.
7. **Supply chain:** only add packages/skills/plugins from official or well-known sources; read a skill's `SKILL.md` before installing it; pin in `skills-lock.json`.
8. **No real patient data** until a compliance review (Singapore PDPA, data region) is done.
9. Run `/security-review` before every PR to `main`.

## Phase workflow

Each phase = one small PR. End every phase with:

1. `npm run check` green.
2. A 3–5 line summary in the local `docs/PROGRESS.md` (what changed, files, how to verify, next).
3. Local `docs/HANDOVER.md` updated.
4. One conventional commit — only after the owner approves.

**Keep docs current as you go**, not just at phase end: update the shared docs (`docs/DESIGN-NOTES.md`, ADRs, `docs/SETUP.md`, this file) whenever a decision, command or rule changes, and the owner's local `docs/PROGRESS.md` / `docs/HANDOVER.md` after every meaningful step. Those two are git-ignored (not shared with the team), so nothing enforces them — it is on the agent to keep them current.

## Definition of done

Works on iOS + Android · tests for logic · `npm run check` green · no secrets/PII in logs · a11y props set · docs updated · reviewed.

See also: `SKILLS.md` (which skill to use when) · `docs/PROMPTS.md` (reusable prompts) · `docs/decisions/` (why we chose X).
