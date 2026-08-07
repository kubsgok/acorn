# 🌰 Acorn

**A medication tracker that grows a forest.** Log your doses, keep a streak, earn acorns, and furnish a cozy isometric room with a squirrel companion who chats with you about your progress.

Acorn turns medication adherence into a gentle daily ritual: every day you take all your meds, your streak grows and your acorn balance climbs — which you spend decorating a little room that becomes uniquely yours.

---

## Features

- **Dose logging** — daily medication schedule with on-time / late / missed states and acorn rewards (10 on-time, 5 late).
- **Streak engine** — a self-healing streak computed from your log history: a day counts only when *every* scheduled dose is taken; a missed dose resets it; med-free days carry it.
- **Interactive forest** — a furnish-your-room scene where you drag and drop illustrated decorations onto the floor and walls, with depth sorting and contact shadows for a 2.5D feel. An animated squirrel lives in the room.
- **Acorn shop** — spend earned acorns on decorations that persist to your room.
- **AI squirrel chat** — a named companion (powered by Claude) that greets you and nudges you about pending doses, with full context of your streak, balance, and schedule.
- **OCR label scanning** — snap a photo of a medication label to auto-fill its details (Claude vision).
- **Progress & calendar** — adherence stats, a 7-day chart, streak milestones, and a month-by-month adherence calendar.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript |
| Routing | expo-router (file-based) |
| Styling | NativeWind + inline styles |
| State | Zustand (`authStore`, `acornStore`) |
| Backend | Supabase (Auth + Postgres + Row-Level Security) |
| Animation | Reanimated 4 + Gesture Handler |
| AI | Anthropic Claude (chat + vision OCR) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- [Expo Go](https://expo.dev/go) on your phone, or an iOS Simulator / Android emulator
- A [Supabase](https://supabase.com) project and an [Anthropic API key](https://console.anthropic.com)

### 1. Install
```bash
npm install --legacy-peer-deps
```
> `--legacy-peer-deps` is needed due to a react / react-dom peer version overlap in the Expo SDK 54 dependency tree.

### 2. Configure environment
Create a `.env.local` in the project root:
```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-key
```

### 3. Set up the database
In the Supabase SQL editor, run [`supabase-schema.sql`](supabase-schema.sql) to create the tables and Row-Level Security policies.

### 4. Run
```bash
npx expo start
```
Scan the QR code with Expo Go. On a restricted network (dorm/office Wi-Fi), use `npx expo start --tunnel`. If images look stale after asset changes, clear the cache with `npx expo start -c`.

---

## How the Core Systems Work

### Streak engine (`src/lib/streaks.ts`)
Rather than incrementing a counter, the streak is **recomputed from the last 90 days of logs** every time the Today or Forest tab gains focus — so it self-heals no matter how long the app was closed.
- `markMissedDoses()` — flips any still-pending dose past midnight of its scheduled day to `missed`.
- `recomputeStreak()` — walks backward from today: a day is compliant only if every scheduled dose was taken; a missed dose breaks the streak; a day with no meds scheduled is neutral.

### The forest (`app/(tabs)/forest.tsx`, `src/lib/forestGrid.ts`)
One empty room the user furnishes themselves. Decorations are placed freely (constrained to floor/wall regions), depth-sorted back-to-front, and rendered with per-sprite contact shadows. Positions persist to `forest_items.grid_x/grid_y`. Floor items sit on the floor; posters, pennants, and signs mount on the walls with an isometric skew.

---

## Project Structure

```
app/                     ← screens (expo-router)
  (auth)/                login, register
  (onboarding)/          welcome → name squirrel → add meds → schedule → notifications
  (tabs)/                today · progress · forest · calendar · settings
  medication/new         add-medication modal
  chat, shop             modals
src/
  lib/                   supabase, streaks, forestGrid, forestStages, shopCatalog, ocr
  components/            ForestSquirrel, DraggableDecoration, ContactShadow, StageCelebration, …
  stores/                authStore, acornStore
assets/forest/           room + squirrel + decoration sprites
supabase-schema.sql      full DB schema + RLS
```

---

## Database

Postgres via Supabase, all tables protected by Row-Level Security (`auth.uid()`): `users`, `medications`, `medication_schedules`, `medication_logs`, `acorn_balance`, `streaks`, `forest_items`, and `caregiver_links` (schema reserved for a future caregiver view).

---

## Development Notes

- **Demo shortcuts** (remove before release): long-press the acorn chip on the Forest tab grants test acorns; long-press an "Owned" item in the Shop refunds it. Both are marked with `DEV` comments.
- Some forest art (empty room, squirrel) may be placeholder pending final illustrations; see `STATUS.md` for the current state and remaining tasks.

---

## License

Private project — all rights reserved.
