import { supabase } from './supabase'
import { useAcornStore } from '../stores/acornStore'

function localDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// A pending dose stays loggable until midnight of its scheduled day;
// after that it becomes missed (0 acorns) and can break the streak.
export async function markMissedDoses(userId: string): Promise<void> {
  await supabase
    .from('medication_logs')
    .update({ status: 'missed', acorns_earned: 0 })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('scheduled_at', startOfToday().toISOString())
}

// Recomputes the streak from the log history instead of incrementing a
// counter, so it self-heals no matter how many days the app was closed.
//
// Day rules (walking backward from today):
// - all doses on_time/late  → compliant, streak grows
// - any missed dose         → broken, walk stops
// - no logs at all          → neutral (nothing scheduled), streak carries
// - today with pending left → neutral until the last dose is logged
export async function recomputeStreak(userId: string): Promise<number> {
  const since = new Date()
  since.setDate(since.getDate() - 90)

  const [{ data: logs }, { data: existing }] = await Promise.all([
    supabase
      .from('medication_logs')
      .select('scheduled_at, status')
      .eq('user_id', userId)
      .gte('scheduled_at', since.toISOString()),
    supabase
      .from('streaks')
      .select('longest_streak')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const byDay = new Map<string, { taken: number; missed: number; pending: number }>()
  for (const log of logs ?? []) {
    const key = localDayKey(log.scheduled_at)
    const day = byDay.get(key) ?? { taken: 0, missed: 0, pending: 0 }
    if (log.status === 'on_time' || log.status === 'late') day.taken++
    else if (log.status === 'missed') day.missed++
    else day.pending++
    byDay.set(key, day)
  }

  let streak = 0
  let lastCompliantDate: string | null = null
  const cursor = startOfToday()
  const todayKey = localDayKey(cursor.toISOString())

  for (let i = 0; i < 90; i++) {
    const key = localDayKey(cursor.toISOString())
    const day = byDay.get(key)

    if (day) {
      const compliant = day.missed === 0 && day.pending === 0 && day.taken > 0
      if (compliant) {
        streak++
        lastCompliantDate = lastCompliantDate ?? key
      } else if (day.missed > 0 || (day.pending > 0 && key !== todayKey)) {
        break
      }
      // today with doses still pending: neutral, keep walking
    }
    // no logs that day: neutral, keep walking

    cursor.setDate(cursor.getDate() - 1)
  }

  const longest = Math.max(existing?.longest_streak ?? 0, streak)
  await supabase.from('streaks').upsert(
    {
      user_id: userId,
      current_streak: streak,
      longest_streak: longest,
      last_compliant_date: lastCompliantDate,
    },
    { onConflict: 'user_id' }
  )
  useAcornStore.getState().setStreak(streak, longest)
  return streak
}
