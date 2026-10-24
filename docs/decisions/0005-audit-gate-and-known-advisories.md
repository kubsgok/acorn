# 0005 — npm audit gate at "critical" (known dev-tooling advisories)

**Status:** accepted (revisit when Expo ships fixes)
**Context:** On a fresh Expo SDK 58 install, `npm audit` reports 5 _high_ advisories, all reached through `@expo/cli` (`node-forge`, `zod`, `@expo/code-signing-certificates`). That is local/CI dev tooling, not code bundled into the app. The suggested `npm audit fix --force` would downgrade Expo to v44, which is unacceptable.
**Decision:** CI runs `npm audit --audit-level=critical`. Dependabot watches for fixes. We do not force-downgrade.
**Consequences:** A new _critical_ advisory fails CI. Highs are tracked here; re-run `npm audit` after every Expo SDK patch and tighten the gate to `high` once clean.
