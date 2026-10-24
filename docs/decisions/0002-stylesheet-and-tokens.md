# 0002 — StyleSheet + typed theme tokens (no NativeWind)

**Status:** accepted
**Context:** v1 mixed NativeWind with inline styles; values were scattered and untyped.
**Decision:** Use React Native `StyleSheet` with typed tokens in `src/theme/`. Components never contain raw colors/sizes.
**Consequences:** No extra build tooling; type-checked styles; slightly more verbose than utility classes.
