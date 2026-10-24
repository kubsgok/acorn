# End-to-end tests (Maestro)

> **Status: written but not yet run.** They need a dev build on a simulator/emulator (Xcode / Android
> Studio, see `docs/SETUP.md`), a bundle ID in `app.json`, and a test user in the **dev** Supabase project.

1. Install Maestro: `brew install maestro` (needs Java; see https://maestro.mobile.dev).
2. Build and install a dev build: `npx expo run:ios` / `npx expo run:android`.
3. Run with credentials passed on the command line (never commit them):
   ```bash
   maestro test -e APP_ID=<bundle id> -e E2E_EMAIL=<test user> -e E2E_PASSWORD=<password> e2e/login.yaml
   ```

Use a dedicated test account on the dev project, never a real patient account.
