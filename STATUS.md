# Acorn — Status & TODO

_Last updated: August 13, 2026 (tree-forest, demographics, i18n, edit-meds build)_

---

## ✅ Completed

### Session — Aug 13, 2026 (branch `feature/tree-forest`)

**Tree Forest (new flagship "Forest" tab) + Den rename**
- New outdoor grove (`app/(tabs)/forest.tsx`) is the app's landing tab: a central **main tree** that grows with the streak (thresholds 1/3/7/14/30, wilts back when the streak breaks) and buyable **tree species** you plant on the grass. The old room feature was renamed **"Den"** (`app/(tabs)/den.tsx`), logic unchanged.
- **Growth engine** `src/lib/treeGrowth.ts`: `mainTreeStage(streak)`, `plantedTreeStage(placedAt, compliantDays)` (one stage per compliant day after planting, clamped), `loadGrove()` splits rows into planted vs. inventory in one query. `src/lib/treeCatalog.ts` — 3 species (Pine 20, Maple 40, Cherry Blossom 70). `src/lib/groveLayout.ts` — ground polygon, depth scaling, main-tree position.
- **Tree shop** `app/tree-shop.tsx`: buy with acorns → tree lands in a **"Your Trees"** inventory (as a sapling). **Plant/arrange**: tap or long-press-drag an inventory tree into the grove (ghost follows finger); drag placed trees to reposition; tap a planted tree to **put it away** back to inventory.
- **Milestone popups** at 3/7/14/30-day streaks award bonus acorns (15/25/40/60), fire once ever (gated on `longestStreak` via AsyncStorage).
- **First-open intro popups + (i) info buttons** on both Forest and Den; shared explainer components (`ForestIntro`, `DenIntro`).
- Real illustrated art installed + optimized (grove background, 6 main-tree stages, 3 stages × 3 species), normalized to bottom-anchor and downscaled (~44MB → ~10MB) to fix slow image loading.
- **Planted-tree sizing** tuned so a fresh sapling reads clearly and mature trees stand taller (`TREE_WIDTH_FACTOR` + per-stage bump in `forest.tsx`).

**Onboarding: demographics + feature intros**
- New **"A bit about you"** step (`app/(onboarding)/about-you.tsx`): full name, preferred name, birthday (auto-fills age), sex, country, and multi-select "what do you want from Acorn?" goals + open-ended text. Saved to new `users` columns (see schema SQL). Flow: welcome → **about-you** → name-squirrel → add-med → schedule → notifications → **forest-intro** → **den-intro** → app.
- **Preferred name** is stored in `authStore` (+ `loadProfile` hydration on boot) and used to address the user: Today greeting ("Good morning, Alex") and the squirrel chat system prompt.

**Edit medications**
- `app/medication/new.tsx` now doubles as an editor when opened with an `id` (prefills fields + schedule times; "Save Changes"). Settings gained a **pencil** button per med. Schedules reconcile in place (kept rows updated so today's log links survive; removed rows unlinked from logs before delete to avoid FK errors).

**Starting acorns**
- New accounts start with **20 acorns** (set at onboarding) + the existing **10** finish-setup bonus = **30**, enough to buy the first tree.

**Language toggle (i18n)**
- `src/lib/i18n.ts`: EN / ES / FR / 中文, persisted to AsyncStorage, hydrated at boot, live re-render via `useT()`. Toggle in **Settings** (flag chips) and a **small toggle on the login screen**. Core screens translated: auth, all onboarding, tab labels, Today greeting, Forest/Den headers + intros, Settings.

**Calendar**
- Tapping a day now shows a **per-medication breakdown** (each dose's name, dose, scheduled time, and On-time/Late/Missed/Pending status), not just an aggregate.

**Today**
- **"Take all medications"** button logs every pending dose at once (with confirm sheet). Soft-shadow visual polish across Today / Progress / Settings; Calendar merged into the Progress tab via a segmented toggle.

**DB schema (run in Supabase):** `users` gained `full_name, preferred_name, age, sex, birthday, country, acorn_goals[], acorn_goals_other` (ALTER statements in `supabase-schema.sql`).



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

### Forest v2 — furnish-your-room (newest)
- **One empty room** (`assets/forest/room-empty.png`) replaces the five auto-furnishing stage rooms. The streak shows via the badge, ring, and progress row (no tree centerpiece — cut by design decision).
- **Drag-and-drop decorating** (`src/components/DraggableDecoration.tsx`): tap an owned item to add it to the room, then drag it anywhere — it lifts with a shadow, free cells of the matching kind glow, and it spring-snaps to the nearest free cell with a haptic tick. Drag to the bottom-right tray (or tap it) to put it away.
- **Isometric grid** (`src/lib/forestGrid.ts`): 14 floor cells with per-row depth scaling + painter's-algorithm ordering (items in front overlap the squirrel correctly), 4 wall spots (poster/pennant are `placement: 'wall'` in the catalog), a reserved cell for the squirrel. Positions persist to `forest_items.grid_x/grid_y`; Tier 1 slot placements migrate automatically on first load.
- Deps added: `react-native-gesture-handler` (+ `GestureHandlerRootView` in root layout), `expo-haptics`.
- ⚠️ Placeholder art: room-empty is currently a copy of stage 1 (has a painted sprout + pot on the floor) — see `~/Downloads/acorn-forest-art-brief.md` (v3): one image, the truly empty room. Squirrel + item sprites carry over.
- Verified: `tsc` clean, iOS export succeeds. Device pass still needed (drag feel, cell positions, migration).

### Tier 1 interactive forest (superseded by v2 scene; streak/shop/celebration logic carried over)
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

### 3. ~~Edit medication screen~~ ✅ DONE (Aug 13)
`app/medication/new.tsx` now handles both add and edit (open with an `id` param; pencil button in Settings). Schedules reconcile in place.

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
