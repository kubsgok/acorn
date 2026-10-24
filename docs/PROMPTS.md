# Reusable prompts

## Phase prompt

```
Read AGENTS.md first, plus my local docs/HANDOVER.md and docs/PROGRESS.md if present.
Goal: Phase <N> — <name>. Scope: <bullets>. Out of scope: <bullets>.
1. Grill me: ask every clarifying question in one batch before any code.
2. Plan: list files to create/change, one line of purpose each. Wait for my OK.
3. Implement in the smallest steps that compile. Tokens + i18n only, files < ~150 lines,
   no new dependency without asking, no secrets, never log PII/tokens.
4. Tests first for any logic; run `npm run check` and show the output.
5. Verify on iOS and Android; self-review the diff (secrets, errors, dead code, a11y).
6. Update my local docs/PROGRESS.md (3–5 lines) and docs/HANDOVER.md (git-ignored, never commit them); propose a commit message. Don't commit until I say so.
```

## Bug fix

```
Bug: <symptom, steps, expected>. Reproduce it with a failing test first, then fix the root cause,
then show `npm run check` green. Don't refactor unrelated code.
```

## Review before PR

```
Run /code-review, /security-review and /simplify on this branch. Fix confirmed findings; list the rest.
```

## End of session

```
Use the handoff skill, update docs/HANDOVER.md and docs/PROGRESS.md, then I'll /clear.
```
