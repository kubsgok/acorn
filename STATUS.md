# Acorn — Status & TODO

_Last updated: July 13, 2026 (forest feature build)_

---

## ✅ Completed

### Streak & missed-dose engine (new — this was the critical gap)
Before this build, **the streak was never updated anywhere** — `logDose` awarded acorns but nothing wrote to the `streaks` table, so the streak was permanently 0 and the forest could never grow.

- `src/lib/streaks.ts` — new module:
  - `markMissedDoses(userId)` — any dose still `pending` after midnight of its scheduled day flips to `missed` (0 acorns).
  - `recomputeStreak(userId)` — rebuilds the streak from the last 90 days of `medication_logs` (self-healing/idempotent, works no matter how long the app was closed). Rules: a day counts only if **every** scheduled dose was taken (`on_time` or `late`); a `missed` dose breaks the streak; days with nothing scheduled are neutral (carry the streak, don't add to it); today counts as soon as its last dose is logged. Updates `current_streak`, `longest_streak`, `last_compliant_date` and the Zustand store.
- Wiring in `app/(tabs)/index.tsx` (Today): missed-marking + recompute on load/focus; recompute fires immediately when the last dose of the day is logged (the "forest grows" moment).
- Wiring in `app/(tabs)/forest.tsx`: recompute on tab focus.
- **Tested**: 9 scenario tests run against the compiled engine (gap days, missed doses, stale pendings, longest-streak preservation, missed-marking filters) — all pass.

### Forest screen rebuilt to the mockup (`app/(tabs)/forest.tsx`)
- Header with 🌰 balance and 🔥 streak chips.
- Full-width illustrated scene (square), image chosen by streak stage; "X DAY STREAK" wooden-sign badge overlaid bottom-left; streak 0 shows dimmed stage-1 art with a call to action; tapping the scene opens the squirrel chat.
- "Keep going" card with SVG progress ring filling toward the next growth stage.
- Shop entry card → `/shop`.
- Forest Progress row (1 / 3 / 7 / 14 / 30 days, current stage highlighted, future stages dimmed) with "X acorns saved".
- "Your Decorations" grid showing purchased shop items (hidden until you own something).
- Stage data/thresholds live in `src/lib/forestStages.ts`.

### Final stage artwork ✅ (v1 — superseded by Tier 1 art needs, see TODO)
- All 5 AI-generated isometric room illustrations are in `assets/forest/stage1.png` … `stage5.png` (1254×1254, textless, consistent squirrel/room). Placeholders fully replaced.
- ⚠️ Tier 1 (below) needs these **regenerated without the squirrel** plus new sprites — see the updated brief in `~/Downloads/acorn-forest-art-brief.md`.

### Tier 1 interactive forest (new)
- **Animated squirrel** — `src/components/ForestSquirrel.tsx`: separate sprite layered over the room; continuous idle bob, random ambient hops every 6–12s, tap → hop → opens chat. Currently renders a generated placeholder blob (`assets/forest/squirrel.png`) until real art lands.
- **Tap-to-place decorations** — 4 floor slots defined in `src/lib/forestStages.ts` (`SLOTS`); owned-but-unplaced items show in the "Your Decorations" card → tap one → free slots pulse on the scene → tap to place. Placement persists to `forest_items.grid_x` (slot index). Tap a placed item to put it away. Placed items render as PNGs from `assets/forest/items/<item-id>.png` (placeholder tinted squares until real art).
- **Stage-up celebration** — `src/components/StageCelebration.tsx`: when the streak crosses into a new stage, the scene does a spring pop, acorns rain, and a "Your forest grew!" banner shows (once per stage, tracked in AsyncStorage `acorn:lastCelebratedStage`).
- Verified: `tsc` clean, iOS export succeeds, new sprite assets confirmed in the bundle.

### Acorn shop (new)
- `app/shop.tsx` — modal screen: 10-item catalog, balance header, Buy disabled when unaffordable, confirm sheet, "Owned" state, purchase toast.
- `src/lib/shopCatalog.ts` — hardcoded catalog (15–60 acorns, tuned to ~10–30 acorns/day earnings).
- `acornStore.spendAcorns()` — re-reads the DB before writing, so it can't overspend or double-charge; purchases persist to the existing `forest_items` table (RLS already in place).
- Route registered in `app/_layout.tsx`.

### Dependency / pre-existing fixes
- Added `@expo/vector-icons` as an explicit dependency — it was imported by every screen but missing from `node_modules` entirely (the app couldn't have bundled). Installed with `--legacy-peer-deps` due to a pre-existing react 19.1 / react-dom 19.2 peer conflict.
- Added `react-native-svg` (for the progress ring).
- Fixed `app/(tabs)/settings.tsx` using a nonexistent `"squirrel"` icon name (would have rendered "?") — replaced with the 🐿️ emoji used elsewhere.
- `npx tsc --noEmit` is clean; full iOS bundle export (`expo export`) succeeds.

---

## 🔴 TODO — must do before submission

### 0. Tier 1 art batch (16 images — blocks the polished look, not the build)
The app runs with placeholders. Generate per `~/Downloads/acorn-forest-art-brief.md` (v2):
- [ ] 5 rooms **without the squirrel** → replace `assets/forest/stage1–5.png`
- [ ] 1 transparent squirrel sprite → `assets/forest/squirrel.png`
- [ ] 10 transparent item sprites → `assets/forest/items/<item-id>.png` (exact names in the brief)
Then eyeball slot/squirrel positions on all 5 stages and tune the fractions in `src/lib/forestStages.ts` (`SLOTS`, `SQUIRREL_ANCHORS`) if anything overlaps furniture.

### 1. On-device verification of the new forest (30–45 min)
Nothing has been exercised on a real device/simulator with a logged-in account yet. Checklist:
- [ ] Log **all** of today's doses on the Today tab → streak ticks up → Forest tab shows the correct stage image and badge.
- [ ] New art looks right in the scene card: check that the streak badge (bottom-left) is legible over the illustration, and the square crop doesn't cut anything important.
- [ ] Preview every stage: temporarily set `current_streak` in the Supabase `streaks` table to 3, 7, 14, 30 → refocus the Forest tab → image, badge, ring, and highlighted progress stage all update. (Values get overwritten by the next recompute — that's expected.)
- [ ] Missed-dose flow: leave a dose unlogged, change device date to tomorrow (or seed a `pending` log with yesterday's `scheduled_at` in Supabase) → open app → dose shows `missed`, streak resets to 0.
- [ ] Shop: buy an affordable item → balance drops, item appears in "Your Decorations", persists after app restart; Buy is disabled when balance is too low.
- [ ] Streak 0 state: fresh account → dimmed scene with "start growing" copy, ring empty.

### 2. Notification scheduling (pre-existing, HIGH)
Permission is requested during onboarding but **no notifications ever fire**. Need to schedule local notifications (`expo-notifications`) per medication schedule (`medication_schedules.time_of_day` × `medications.days_of_week`), and reschedule on medication add/edit/delete.

### 3. Edit medication screen (pre-existing, HIGH)
No way to change an existing medication. Add `/medication/[id]` reusing the form from `app/medication/new.tsx` (name, dose, notes, color, days, time slots), pre-filled, with update instead of insert.

---

## 🟡 TODO — nice-to-have (post-deadline / if time remains)

- ~~Animated squirrel~~ ✅ built (Tier 1). Tier 2 upgrades: wandering/waypoints, Rive rig with real walk cycle.
- ~~Decoration placement~~ ✅ built as tap-to-place slots (Tier 1). Tier 2 upgrades: free drag-and-drop, per-stage slot layouts, pinch-zoom camera.
- **Streak repair / grace mechanic** (e.g. spend acorns to patch one missed day).
- **Empty states** for Progress/Calendar when there's no history yet.
- **Error boundaries / offline handling** for Supabase failures (screens currently assume queries succeed).
- **App icon + splash screen** (still Expo defaults).
- **iPad layout.**
- **Caregiver view** (schema exists, no UI).

---

## Reference

- Growth thresholds: 1 / 3 / 7 / 14 / 30-day streak → stage 1–5 (`src/lib/forestStages.ts`).
- Acorn rewards: 10 on-time, 5 late, 0 missed. Sinks: shop only.
- To swap/update stage art: overwrite `assets/forest/stageN.png` (square, no text, quiet bottom-left corner) — no code changes; restart Metro with `npx expo start -c` if a cached image sticks.
- Art-generation brief (for regenerating art, e.g. squirrel-less versions): `~/Downloads/acorn-forest-art-brief.md`.
