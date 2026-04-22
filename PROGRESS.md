# Acorn — Build Progress

## Done

### Foundation
- Expo + TypeScript project scaffolded
- Expo Router (file-based routing) configured
- Supabase client set up with AsyncStorage session persistence
- Zustand stores: `authStore` (session, squirrel name, onboarding state), `acornStore` (balance, streak)
- NativeWind + Tailwind configured
- `app.json` configured with scheme, camera and notification plugins
- `.env.local` wired up with Supabase credentials
- Full database schema written (`supabase-schema.sql`) — 8 tables, RLS policies on all

### Auth
- Login screen
- Register screen
- Auto-redirect based on session + onboarding state

### Onboarding (5 screens)
- Welcome screen
- Name your squirrel (text input + name suggestions)
- Add first medication (name, dose, color picker)
- Set schedule (time picker, multiple times per day)
- Notification opt-in (permission request)
- Awards 10 acorns on completion, writes `onboarding_done` to AsyncStorage

### Today tab
- Generates today's medication logs from schedules on load
- Medication cards with status pills: Pending / Taken on time / Taken late / Missed
- "I took it" button with confirmation modal
- Acorn award logic: 10 acorns on time, 5 acorns late
- Acorn earn flash (+N 🌰) on successful log
- Squirrel mood indicator (happy/sad based on streak)
- Acorn balance + streak counter in header

### Progress tab
- 7-day bar chart (green = full, amber = partial, grey = none)
- Stats row: balance, current streak, 7-day adherence %
- Streak milestone tracker (7 / 14 / 30 / 60 / 90 days)

### Forest tab
- Placeholder view showing items that unlock at each streak milestone
- Items appear progressively as streak grows (sprout at 1d, fern at 3d, pine at 7d, oak at 14d, cabin at 30d)

### Settings tab
- Shows squirrel name
- Medication list with schedules
- Delete medication
- Add new medication (name, dose, color, time picker)
- Sign out

---

## Still To Build

### Notifications
- Schedule local push at each medication's set time
- Schedule follow-up nudge 2 hours later if not logged
- Cancel and reschedule when medications are added/edited/deleted
- Enforce 2-notification-per-medication-per-day cap
- Notification copy uses squirrel name
- Notification Settings screen (toggle on/off, test button)

### Streak logic
- Streak currently doesn't increment — need to wire up the logic:
  - After logging: check if all doses for today are on_time or late
  - If yes and previous day was compliant, increment streak
  - Missed dose should break streak and reset to 0
  - Update `longest_streak` when current beats it

### OCR scanner
- Camera screen to scan pill bottle label
- Extract medication name and dose via ML Kit
- Pre-fill the add medication form with a confirmation step

### Edit medication
- `app/medication/[id].tsx` — edit name, dose, color, schedule times

### Post-MVP (deferred)
- Interactive forest shop (browse items, spend acorns)
- Drag-and-place forest grid
- RevenueCat subscriptions + feature gating
- HealthKit integration
- Social sharing / milestone cards
- Caregiver linked accounts (schema is in place)
- Firebase Remote Config A/B testing on nudge copy
- PostHog analytics
