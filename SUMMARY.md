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
| Local Storage | AsyncStorage (avatar, onboarding flags, language) |
| i18n | Custom lightweight store (`src/lib/i18n.ts`) — EN / ES / FR / 中文 |
| Animation / gesture | react-native-reanimated, react-native-gesture-handler, expo-haptics |
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
│   ├── about-you         Demographics (name, preferred name, age, sex, birthday, country, goals)
│   ├── name-squirrel
│   ├── add-medication
│   ├── set-schedule
│   ├── notifications
│   ├── forest-intro      Tree Forest explainer
│   └── den-intro         Den explainer
├── (tabs)/               ← main app (lands on Forest)
│   ├── forest            Tree Forest (grove) — main tree + planted species
│   ├── den               Furnish-your-room (formerly "forest")
│   ├── index             Today (home)
│   ├── progress          Stats & milestones + Calendar (segmented toggle)
│   ├── calendar          Adherence history (hidden route, embedded in Progress)
│   └── settings          Profile, demographics, language, medications
├── medication/new        ← add OR edit (with ?id=), modal, gesture enabled
├── shop                  ← den decoration shop, modal
├── tree-shop             ← tree shop, modal
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

### Forest (Tree Forest — landing tab)
- Illustrated outdoor grove with a **main tree** that grows through 6 stages as the streak climbs (1/3/7/14/30) and wilts back when it breaks
- Buy **tree species** (Pine/Maple/Cherry Blossom) → they land in a "Your Trees" inventory as saplings → tap or drag to plant on the grass → grow one stage per compliant day
- Drag placed trees to reposition; tap to put away; depth-sorted with contact shadows
- Milestone popups at 3/7/14/30 days award bonus acorns; first-open intro + (i) info button

### Den (furnish-your-room — formerly "Forest")
- One illustrated room + drag-and-drop decorations bought in the Shop; squirrel companion; grows cozier with the streak
- First-open intro + (i) info button

### Calendar
- Monthly grid color-coded by adherence (green / amber / red)
- Month navigation (can't go to future)
- Today highlighted with orange border
- Tap a day → detail card with **per-medication breakdown** (each dose's name, time, On-time/Late/Missed/Pending)
- Monthly summary: adherence %, perfect days, days tracked
- Now embedded in the **Progress** tab via a segmented Overview/Calendar toggle

### Settings
- Tappable avatar (opens image picker, persists via AsyncStorage)
- Edit squirrel name
- **Language** section — EN / ES / FR / 中文 flag chips
- Medication list with TAKEN / PENDING badges, **edit (pencil)** and delete buttons
- Sign out

### Add / Edit Medication (`medication/new`, optional `?id=`)
- Same form as onboarding: OCR scan, name, dose, notes, color picker, day picker, time slots
- With an `id` it edits an existing med (prefilled, schedules reconciled in place)

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
| `fullName` | `string \| null` | User's full name (demographics) |
| `preferredName` | `string \| null` | What to call the user (greeting + chat) |
| `avatarUri` | `string \| null` | Profile photo (AsyncStorage) |
| `onboardingDone` | `boolean` | Onboarding completion flag |

Methods: `setSession`, `setSquirrelName`, `setPreferredName`, `loadProfile`, `setAvatarUri`, `loadAvatar`, `signOut`

Language lives in a separate store (`useLangStore` in `src/lib/i18n.ts`): `lang`, `setLang`, `loadLang`; `useT()` returns `t(key, vars?)`.

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
| `users` | Profile (email, squirrel name; demographics: full_name, preferred_name, age, sex, birthday, country, acorn_goals[], acorn_goals_other) |
| `medications` | Name, dose, notes, color, days_of_week |
| `medication_schedules` | time_of_day per medication |
| `medication_logs` | Take/skip events (status, acorns_earned, logged_at) |
| `acorn_balance` | Current balance + lifetime earned |
| `streaks` | current_streak, longest_streak, last_compliant_date |
| `caregiver_links` | Future caregiver feature (schema only) |
| `forest_items` | Future shop items with x/y grid coords |

All tables have Row-Level Security — users can only access their own rows via `auth.uid()`.

**Log statuses:** `pending` → `on_time` (logged within 30 min) or `late` (logged after 30 min) or `missed`

**Acorn rewards:** 10 for on-time, 5 for late, 0 for missed. New users **start with 20 acorns** + **10** finish-setup bonus = **30**. Streak milestones (3/7/14/30d) award 15/25/40/60 bonus acorns (once ever).

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
- Full auth flow (login, register) + small language toggle on login
- Full onboarding flow (welcome, about-you demographics, name squirrel, add med, schedule, notifications, forest & den intros)
- Today screen with dose logging, acorn rewards, "take all" button, personalized greeting
- Progress screen with milestones + embedded Calendar (per-day medication breakdown)
- **Tree Forest** (grove) — streak-driven main tree + buyable/plantable species, tree shop, inventory, milestone popups
- **Den** — furnish-your-room with drag-and-drop decorations + shop
- Settings with avatar, squirrel name, language toggle, medication add/edit/delete
- AI chat with full context injection + user's preferred name
- OCR medication label scanning
- Streak engine (missed-dose marking + recompute); acorn + streak state with DB sync
- i18n (EN/ES/FR/中文) across core screens
- Zustand stores with bug-free new-user initialization (start with 20 acorns)

### To Do (High Priority)
- **Notification scheduling** — permission is requested but no notifications actually fire yet

### To Do (Later)
- Caregiver view (schema already designed)
- Streak repair / grace mechanic
- Empty states (no history yet)
- Error boundaries for Supabase failures
- Extend i18n to remaining screens (med form, chat, progress charts) + translate chat replies
- App icon + splash screen (currently Expo defaults)
- iPad layout
