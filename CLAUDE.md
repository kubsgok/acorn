@AGENTS.md

# Claude Code specifics

- **Grill first.** Before coding a phase, ask all clarifying questions in one batch (`grill-me`). Don't guess requirements.
- **Plan, then build.** Use plan mode for anything touching more than ~3 files. Wait for approval.
- **Smallest step that compiles.** Avoid fluff; no unrequested features or refactors.
- **Tests first** for logic (`superpowers:test-driven-development`). Show `npm run check` output before claiming done (`superpowers:verification-before-completion`).
- **Design work:** implement from Figma via the Figma MCP, mapped to `src/theme` tokens. Never hard-code values. Log any deviation from the design in `docs/DESIGN-NOTES.md`.
- **Never** read `.env*`, force-push, or run destructive DB commands. Ask first.
- **Keep docs current continuously** (owner's standing request): after every meaningful step update the owner's local, git-ignored `docs/PROGRESS.md` and `docs/HANDOVER.md` (never commit or stage them), and update shared docs (`docs/DESIGN-NOTES.md`, ADRs, `docs/SETUP.md`, `AGENTS.md`/`README.md`) in the same commit as the change. Nothing enforces the local notes — do it unprompted.
- **Don't commit or push** until the owner says so (for a phase already approved by the owner, commit that phase).
- Use Node 22: `export PATH=/opt/homebrew/opt/node@22/bin:$PATH` before npm/expo commands.
- Avoid `rm -rf` in commands (blocked by project settings); use `git rm`/targeted deletes.

## Token efficiency

- One phase per session. `/clear` between phases; resume from the local `docs/HANDOVER.md`.
- Use Explore subagents for broad searches; read only the files you need.
- Don't paste long files or logs back; reference by path.
- End a session with the `handoff` skill, then update `docs/HANDOVER.md`.
