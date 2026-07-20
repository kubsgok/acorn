# Acorn — Project Progress

## What Acorn is
A medication tracker with gamification. Users log their medications, earn acorns for consistency, and watch their forest grow as a reward. A squirrel companion lives in the forest and reflects the user's streak through mood and movement.

---

## Done

### Auth
- [x] Login screen — centered logo, show/hide password, rounded button
- [x] Register screen — same design system
- [x] Swipe-back prevention on all auth screens (`gestureEnabled: false`)
 
### Onboarding
- [x] Welcome screen — feature overview cards (pill / tree / chat icons)
- [x] Name your squirrel — with name suggestions (Nutmeg, Ember, etc.)
- [x] Add medication — name, dose, notes, color picker, OCR scan label, skip button
- [x] Set schedule — day picker, time slots
- [x] Notifications — permission request, bonus acorns chip

### Today (Home)
- [x] Medication list with take/undo actions
- [x] Squirrel mood card (taps into chat)
- [x] Acorn balance display
- [x] Streak pill
- [x] FAB to add medication
- [x] Confirm sheet slides up from bottom
- [x] Squirrel mood logic — happy when doses pending, worried when overdue, excited when all done

### Progress
- [x] Bento stats grid (streak, lifetime acorns, total taken, best streak)
- [x] 7-day bar chart (green/amber/stone)
- [x] Milestone cards with progress bar
- [x] Avatar display
- [x] Calendar icon links to Calendar tab

### Calendar
- [x] Monthly grid — days color-coded by adherence (green/amber/red)
- [x] Month navigation (prev/next, can't go to future)
- [x] Today highlighted with orange border
- [x] Tap a day — detail card showing X of Y taken
- [x] Legend (all taken / partial / missed)
- [x] Monthly summary — adherence %, perfect days, days tracked

### Forest
- [x] Forest screen with streak-based emoji unlocks (sprout/fern/pine/oak/cabin)
- [x] Acorn balance chip
- [x] Unlock list with locked/unlocked states
- [x] Scrollable

### Settings
- [x] Profile header with tappable avatar (opens image picker)
- [x] Avatar persists via AsyncStorage, loads on app start
- [x] Medication list with TAKEN/PENDING badges
- [x] Edit squirrel name
- [x] Sign out
- [x] Calendar icon links to Calendar tab

### Chat
- [x] Squirrel persona powered by Claude Haiku
- [x] System prompt includes: squirrel name, streak, balance, medications + schedules, today's log statuses
- [x] Local greeting on open (no API call)
- [x] Suggestion cards (View Forest, My Progress)
- [x] Multiline text input

### Add Medication (`/medication/new`)
- [x] Inline day picker
- [x] Dynamic time slots
- [x] Color picker
- [x] OCR label scan

### State & Data
- [x] `acornStore` — balance, lifetime earned, streak; `addAcorns` always reads from DB first
- [x] `authStore` — session, squirrel name, avatar URI
- [x] New user acorn bug fixed (was showing 35 instead of 0)
- [x] All tabs wired up in layout

---

## To Do

### High priority
- [ ] **Edit medication screen** (`/medication/[id]`) — tap a med in settings to edit name, dose, notes, color, schedule
- [ ] **Notification scheduling** — permission is requested but actual local notifications are not scheduled. Need to use `expo-notifications` to schedule daily reminders based on medication times
- [ ] **Missed dose logic** — doses that pass without being logged should auto-update to `missed` status and affect streak calculation

### Forest
- [ ] **Forest visual** — the current forest is a simple emoji list; needs a proper illustrated design (see concept image)
- [ ] **Shop** — buy items with acorns to decorate the forest (post-MVP, DB tables already designed)
- [ ] **Tab gating** — optionally hide the forest tab until day 3 streak

### Progress & Streaks
- [ ] **Streak calculation** — currently relies on client-side logic; should be validated server-side or via a Supabase function to prevent manipulation
- [ ] **Streak repair** — grace mechanic or streak freeze if user misses a day

### Caregiver
- [ ] **Caregiver view** — let a second user monitor adherence for another account (e.g. parent + child, carer + patient)

### Polish
- [ ] **Empty states** — progress and calendar screens when user has no medication history
- [ ] **Onboarding re-entry** — if user skips medication setup, prompt them again on first open of Today screen
- [ ] **Error boundaries** — graceful fallback if Supabase calls fail
- [ ] **App icon + splash screen** — currently using Expo defaults
- [ ] **iPad / large screen layout** — currently optimised for iPhone only

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | Profile (squirrel name, email) |
| `medications` | Name, dose, notes, color per medication |
| `medication_schedules` | Days of week + times per medication |
| `medication_logs` | Take/skip events with timestamp and status |
| `acorn_balance` | Current balance + lifetime earned |
| `streaks` | Current streak + longest streak |
| `forest_items` | Placed shop items with x/y coordinates (post-MVP) |
| `purchased_items` | Owned shop items per user (post-MVP) |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Routing | expo-router v6 (file-based) |
| Backend | Supabase (auth + PostgreSQL + RLS) |
| State | Zustand (`authStore`, `acornStore`) |
| Chat AI | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| Image picker | expo-image-picker |
| Gradients | expo-linear-gradient |
| Storage | AsyncStorage (avatar URI, onboarding flags) |
| Icons | Ionicons + MaterialCommunityIcons |
