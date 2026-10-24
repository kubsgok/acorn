# Acorn Labs

A medication-adherence app with light gamification: take your doses, keep your streak, grow a plant, fill a forest.
Built with Expo (React Native + TypeScript) and Supabase, for iOS and Android.

> **Status:** v2 rebuild in progress on `rebuild/v2`. v1 is preserved at tag `v1-final`.

## For contributors (humans and AI agents)

Start with [AGENTS.md](AGENTS.md) and [docs/SETUP.md](docs/SETUP.md); design decisions are in [docs/decisions/](docs/decisions/).

## Setup

See [docs/SETUP.md](docs/SETUP.md) (Node 22, running on devices, simulators).

```bash
npm ci
cp .env.example .env.local   # DEV Supabase URL + publishable/anon key only
npm start
npm run check
```

**Never put secrets in `EXPO_PUBLIC_*` variables** — they are bundled into the app.
