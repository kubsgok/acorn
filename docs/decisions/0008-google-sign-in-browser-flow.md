# 0008 — Google sign-in through Supabase's browser flow

**Status:** accepted (replaces an earlier native-SDK version, never released)
**Context:** The product spec wants Apple/Google sign-in. A native Google SDK needs a dev build (Xcode or EAS) and iOS/Android OAuth clients with SHA-1s; it cannot run in Expo Go, which the team uses to try the app.
**Decision:** Use `supabase.auth.signInWithOAuth` with `skipBrowserRedirect`, open the URL with `expo-web-browser`'s `openAuthSessionAsync`, then `exchangeCodeForSession` (`src/features/auth/useGoogleSignIn.ts`). The client uses PKCE, so the redirect carries only a one-time code, never tokens.
**Consequences:** Works in Expo Go and in builds, and needs only one Google Web client. The sign-in is a browser sheet rather than the native account picker. The redirect URLs must be allow-listed in Supabase. Revisit native sign-in if the UX matters more than Expo Go. Apple follows later. Hermes has no WebCrypto, so `src/lib/webCrypto.ts` fills `crypto.subtle.digest` and `getRandomValues` from `expo-crypto`; without it Supabase falls back to the weaker `plain` PKCE challenge.
