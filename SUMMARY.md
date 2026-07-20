# Acorn — Project Summary

## What It Is

A React Native medication tracker with gamification. Users log their medications daily, earn acorns for consistency, and grow a virtual forest. A named squirrel companion (powered by Claude AI) lives in the forest and chats with users about their progress.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| Language | TypeScript 5.9 |
| Routing | expo-router v6 (file-based) |
| Styling | NativeWind (Tailwind CSS) |
| State | Zustand (`authStore`, `acornStore`) |
| Backend | Supabase (auth + PostgreSQL + RLS) |
| AI Chat | Anthropic Claude Haiku |
| AI OCR | Anthropic Claude Haiku (vision) |
| Local Storage | AsyncStorage (avatar, onboarding flags) |
| Notifications | expo-notifications |
| Camera | expo-camera + expo-image-picker |

---

## Navigation Structure

```
/ (root)
├── (auth)/               ← no swipe gestures
│   ├── login
│   └── register
├── (onboarding)/         ← sequential, no gestures
│   ├── welcome
│   ├── name-squirrel
│   ├── add-medication
│   ├── set-schedule
│   └── notifications
├── (tabs)/               ← main app
│   ├── index             Today (home)
│   ├── progress          Stats & milestones
│   ├── forest            Virtual forest
│   ├── calendar          Adherence history
│   └── settings          Profile & medications
├── medication/new        ← modal, gesture enabled
└── chat                  ← modal, gesture enabled
```

**Entry logic** (`app/index.tsx`): checks session → checks onboarding flag → routes accordingly.

---

## Screens

### Auth
- **Login** — email/password, show/hide password, link to register
- **Register** — creates Supabase account, redirects to onboarding

### Onboarding
- **Welcome** — feature overview cards (log doses, grow forest, chat)
- **Name Squirrel** — custom name input with suggestions (Pip, Hazel, Nutmeg…)
- **Add Medication** — name, dose, notes, color picker, OCR label scan, skip option
- **Set Schedule** — day picker + time slots with DateTimePicker
- **Notifications** — permission request, awards 10 bonus acorns on completion

### Today (Home)
- Acorn balance + streak pill in header
- Squirrel mood card (happy / worried / excited based on dose status), taps to chat
- Medication list split into: **Overdue**, **Upcoming**, **Done**
- Tap to log a dose → confirmation sheet → earns 10 acorns (on-time) or 5 (late)
- Acorn toast shows earned amount for 2 seconds
- FAB to add new medication

### Progress
- Stats grid: balance, streak, adherence %
- 7-day bar chart (green / amber / gray)
- Streak milestone cards (Sapling 7d → Grove 14d → Elder 30d → Ancient 60d → Legend 90d)
- Progress bar toward next milestone; future milestones shown at 50% opacity
- Avatar display, link to calendar

### Forest
- Emoji forest that grows with streak: 🌱 → 🌿 → 🌲 → 🌳 → 🏡 + 🐿️
- Acorn balance chip
- Scrollable unlock list with streak requirements

### Calendar
- Monthly grid color-coded by adherence (green / amber / red)
- Month navigation (can't go to future)
- Today highlighted with orange border
- Tap a day → detail card (X of Y taken)
- Monthly summary: adherence %, perfect days, days tracked

### Settings
- Tappable avatar (opens image picker, persists via AsyncStorage)
- Edit squirrel name
- Medication list with TAKEN / PENDING badges and delete buttons
- Sign out

### Add Medication (`medication/new`)
- Same form as onboarding: OCR scan, name, dose, notes, color picker, day picker, time slots

### Chat
- Squirrel persona via Claude Haiku
- System prompt includes: squirrel name, streak, balance, medications + schedules, today's log statuses
- Context-aware greeting on open (no API call)
- Suggestion cards on first message (View Forest, My Progress)
- Typing indicator (3-dot animation)
- Multiline input, 1000 char max, 300 token responses

---

## State (Zustand)

### `authStore`
| Field | Type | Purpose |
|---|---|---|
| `session` | `Session \| null` | Supabase session |
| `squirrelName` | `string` | AI companion name |
| `avatarUri` | `string \| null` | Profile photo (AsyncStorage) |
| `onboardingDone` | `boolean` | Onboarding completion flag |

Methods: `setSession`, `setSquirrelName`, `setAvatarUri`, `loadAvatar`, `signOut`

### `acornStore`
| Field | Type | Purpose |
|---|---|---|
| `balance` | `number` | Current acorn count |
| `lifetimeEarned` | `number` | Total acorns ever earned |
| `currentStreak` | `number` | Current consecutive days |
| `longestStreak` | `number` | Best streak ever |

Methods: `load(userId)`, `addAcorns(userId, amount)`, `setStreak`, `reset`

`addAcorns` always reads from DB before writing to prevent stale state bugs.

---

## Database (Supabase + PostgreSQL)

| Table | Purpose |
|---|---|
| `users` | Profile (email, squirrel name) |
| `medications` | Name, dose, notes, color, days_of_week |
| `medication_schedules` | time_of_day per medication |
| `medication_logs` | Take/skip events (status, acorns_earned, logged_at) |
| `acorn_balance` | Current balance + lifetime earned |
| `streaks` | current_streak, longest_streak, last_compliant_date |
| `caregiver_links` | Future caregiver feature (schema only) |
| `forest_items` | Future shop items with x/y grid coords |

All tables have Row-Level Security — users can only access their own rows via `auth.uid()`.

**Log statuses:** `pending` → `on_time` (logged within 30 min) or `late` (logged after 30 min) or `missed`

**Acorn rewards:** 10 for on-time, 5 for late, 0 for missed

---

## Key Libraries & Files

| File | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase client (AsyncStorage session, native fetch binding) |
| `src/lib/ocr.ts` | Camera/gallery picker + Claude vision API for label scanning |
| `src/components/DayPicker.tsx` | Reusable Sun–Sat day selector with "Every day" shortcut |
| `index.ts` | Entry point — loads URL polyfill before expo-router |
| `supabase-schema.sql` | Full DB schema with RLS policies |
| `.env.local` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ANTHROPIC_API_KEY` |

---

## Color Palette

| Role | Color |
|---|---|
| Primary (buttons, accents) | `#b15f00` |
| App background | `#fff8f5` |
| Card background | `#ffffff` |
| Success / green | `#006e2d` |
| Error / overdue | `#ba1a1a` |
| Warning / amber | `#f59e0b` |
| Primary text | `#1f1b17` |
| Secondary text | `#554336` |

---

## What's Done vs To Do

### Done
- Full auth flow (login, register)
- Full onboarding flow (5 screens)
- Today screen with dose logging and acorn rewards
- Progress screen with milestones
- Calendar with monthly adherence view
- Forest with streak-based emoji unlocks
- Settings with avatar, squirrel name, medication management
- AI chat with full context injection
- OCR medication label scanning
- Acorn + streak state with DB sync
- Zustand stores with bug-free new-user initialization

### To Do (High Priority)
- **Edit medication** — `/medication/[id]` screen to update existing meds
- **Notification scheduling** — permission is requested but no notifications actually fire yet
- **Missed dose logic** — doses don't auto-mark as missed after the scheduled time passes

### To Do (Later)
- Illustrated forest visual (currently emoji-only)
- Acorn shop (DB tables already designed)
- Caregiver view (schema already designed)
- Streak repair / grace mechanic
- Empty states (no history yet)
- Error boundaries for Supabase failures
- App icon + splash screen (currently Expo defaults)
- iPad layout
