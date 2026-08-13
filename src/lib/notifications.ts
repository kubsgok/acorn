import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'
import { translate, useLangStore } from './i18n'

// Local (on-device) medication reminders.
// For each scheduled dose we set two one-shot notifications over a rolling
// window: a reminder at the dose time, and a follow-up FOLLOWUP_HOURS later
// that only fires if the dose still hasn't been logged (we cancel it on log,
// and skip doses already taken when we re-sync). Everything is scheduled
// locally, so it works with no network and the app closed.

const WINDOW_DAYS = 7
const FOLLOWUP_HOURS = 2
// iOS silently caps an app at 64 pending local notifications; stay under it.
const MAX_SCHEDULED = 58
const ANDROID_CHANNEL = 'medication-reminders'

interface ScheduleRow {
  id: string
  time_of_day: string // "HH:MM:SS"
  medication: { name: string; dose: string | null; days_of_week: string | null } | null
}

// Foreground presentation behaviour. Call once at app start.
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'Medication reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  })
}

// Ask for permission (idempotent). Returns whether it's granted.
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const req = await Notifications.requestPermissionsAsync()
  return req.granted
}

function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// A Date on `base`'s calendar day at the given "HH:MM(:SS)" wall-clock time.
function doseDateFor(base: Date, timeOfDay: string): Date {
  const [h, m] = timeOfDay.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m ?? 0, 0, 0)
  return d
}

function daysOfWeek(raw: string | null): number[] {
  if (!raw) return [0, 1, 2, 3, 4, 5, 6]
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) && arr.length > 0 ? arr : [0, 1, 2, 3, 4, 5, 6]
  } catch {
    return [0, 1, 2, 3, 4, 5, 6]
  }
}

export function reminderId(scheduleId: string, dayKey: string) {
  return `rem-${scheduleId}-${dayKey}`
}
export function followupId(scheduleId: string, dayKey: string) {
  return `fup-${scheduleId}-${dayKey}`
}

// Cancel the pair of notifications for one dose occurrence (call when a dose is
// logged so its follow-up doesn't fire).
export async function cancelDoseNotifications(scheduleId: string, scheduledAtISO: string) {
  if (Platform.OS === 'web') return
  const key = localDayKey(new Date(scheduledAtISO))
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(reminderId(scheduleId, key)).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(followupId(scheduleId, key)).catch(() => {}),
  ])
}

// Rebuild all medication reminders from the user's current schedules. Cancels
// everything we previously scheduled and lays down a fresh rolling window,
// skipping doses already taken today.
export async function syncMedicationReminders(userId: string) {
  if (Platform.OS === 'web') return
  const perm = await Notifications.getPermissionsAsync()
  if (!perm.granted) return

  await ensureAndroidChannel()

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

  const [{ data: schedules }, { data: logs }] = await Promise.all([
    supabase
      .from('medication_schedules')
      .select('id, time_of_day, medication:medications!inner(name, dose, user_id, days_of_week)')
      .eq('medication.user_id', userId),
    supabase
      .from('medication_logs')
      .select('schedule_id, status')
      .eq('user_id', userId)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString()),
  ])

  // schedule_ids that are already taken today → don't remind about them
  const takenToday = new Set(
    (logs ?? [])
      .filter((l: any) => l.status === 'on_time' || l.status === 'late')
      .map((l: any) => l.schedule_id)
  )

  // Start clean — we own every scheduled notification in this app.
  await Notifications.cancelAllScheduledNotificationsAsync()

  const lang = useLangStore.getState().lang
  const now = Date.now()
  const rows = (schedules ?? []) as unknown as ScheduleRow[]

  type Pending = { when: number; id: string; title: string; body: string }
  const pending: Pending[] = []

  for (let offset = 0; offset < WINDOW_DAYS; offset++) {
    const base = new Date(todayStart)
    base.setDate(base.getDate() + offset)
    const weekday = base.getDay()
    const dayKey = localDayKey(base)

    for (const row of rows) {
      const med = row.medication
      if (!med) continue
      if (!daysOfWeek(med.days_of_week).includes(weekday)) continue
      // Skip today's doses that are already taken.
      if (offset === 0 && takenToday.has(row.id)) continue

      const name = med.name
      const dose = med.dose ? `${med.dose} · ` : ''
      const doseTime = doseDateFor(base, row.time_of_day).getTime()
      const followTime = doseTime + FOLLOWUP_HOURS * 3600_000

      if (doseTime > now) {
        pending.push({
          when: doseTime,
          id: reminderId(row.id, dayKey),
          title: translate(lang, 'push.remindTitle', { name }),
          body: dose + translate(lang, 'push.remindBody'),
        })
      }
      if (followTime > now) {
        pending.push({
          when: followTime,
          id: followupId(row.id, dayKey),
          title: translate(lang, 'push.followTitle', { name }),
          body: translate(lang, 'push.followBody', { name }),
        })
      }
    }
  }

  // Soonest first, and stay under the platform cap.
  pending.sort((a, b) => a.when - b.when)
  const toSchedule = pending.slice(0, MAX_SCHEDULED)

  await Promise.all(
    toSchedule.map((p) =>
      Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: { title: p.title, body: p.body, sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(p.when),
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
        },
      }).catch(() => {})
    )
  )
}
