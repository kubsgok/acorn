# SKILLS.md — which skill to use, and when

Use **one skill per job**. Only skills from official or well-known sources are allowed (see AGENTS.md rule 7).

| Job                                 | Skill                                                          | Source                                  |
| ----------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| Clarify requirements before a phase | `grill-me` (`grill-with-docs` if the domain model is involved) | mattpocock/skills (in `.agents/skills`) |
| Turn a phase into steps             | Plan mode + `superpowers:writing-plans`                        | obra/superpowers                        |
| Explore a feature before building   | `feature-dev:feature-dev`                                      | Anthropic plugin                        |
| Smallest-change coding style        | `ponytail` (always on in this project)                         | DietrichGebert/ponytail (GitHub)        |
| Write logic                         | `superpowers:test-driven-development`                          | obra/superpowers                        |
| Debug a failure                     | `superpowers:systematic-debugging`                             | obra/superpowers                        |
| Before saying "done"                | `superpowers:verification-before-completion`                   | obra/superpowers                        |
| Figma → code                        | Figma MCP (`get_design_context`, `get_screenshot`)             | Figma (official)                        |
| Expo / EAS practices                | `expo-overview`, `expo-router`, `expo-project-structure`       | expo/skills (official)                  |
| React Native patterns & performance | `vercel-react-native-skills`                                   | vercel-labs/agent-skills                |
| Supabase, Auth, RLS, Postgres       | `supabase`, `supabase-postgres-best-practices`                 | supabase/agent-skills (official)        |
| Domain terms and ADRs               | `domain-modeling`                                              | mattpocock/skills                       |
| Module / interface design           | `codebase-design`                                              | mattpocock/skills                       |
| Review before a PR                  | `/code-review`, `/security-review`, `/simplify`                | Anthropic built-ins                     |
| Extra review / repo audit           | `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`        | DietrichGebert/ponytail (GitHub)        |
| Commit                              | `/commit` (only when the owner approves)                       | commit-commands (Anthropic plugin)      |
| Keep CLAUDE.md current              | `claude-md-management:claude-md-improver`                      | Anthropic plugin                        |
| End of session                      | `handoff`                                                      | mattpocock/skills                       |

**Adding a skill:** read its `SKILL.md` first, install from an official repo, record it in `skills-lock.json`, add a row here.
**Not used:** web/marketing design and UX skills (Tabler, viewport, page-pattern) — Acorn is native mobile and matches Figma exactly. Backend/framework skills for other stacks (Vue, TypeORM, Nomad).
**Overlaps — prefer the row above:** `tdd` (use the superpowers TDD skill), `grilling` (use `grill-me`).
