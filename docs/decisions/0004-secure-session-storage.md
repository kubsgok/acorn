# 0004 — Session tokens in encrypted storage (chunked SecureStore)

**Status:** accepted (updated in Phase 8)
**Context:** v1 stored Supabase session tokens in AsyncStorage (unencrypted) in a health app. A session (access + refresh token) is larger than SecureStore's ~2 KB per-value limit.
**Decision:** Store the session in `expo-secure-store` (iOS Keychain / Android Keystore), split into ≤1500-char chunks plus a count key (`src/lib/secureStorage.ts`). We chose this over Supabase's `LargeSecureStore` example (AES in AsyncStorage + key in SecureStore) because it needs no extra dependencies and no hand-written crypto.
**Consequences:** Tokens are encrypted at rest by the OS. A torn write (missing chunk) is treated as signed out. If sessions grow much larger, revisit.
