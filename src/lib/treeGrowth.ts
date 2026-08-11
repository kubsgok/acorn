import { supabase } from './supabase'

// Growth model for the Forest (grove) tab.
// - The main tree's stage is a pure function of the current streak.
// - Each planted tree grows one stage per COMPLIANT day since it was planted.
// Both reuse the same "a day counts only if every scheduled dose was taken"
// rule as the streak engine (src/lib/streaks.ts).

export const MAIN_TREE_THRESHOLDS = [1, 3, 7, 14, 30] // streak days → stages 1..5
export const MAIN_TREE_STAGES = MAIN_TREE_THRESHOLDS.length + 1 // incl. stage 0 (seedling)
export const MAX_PLANTED_STAGE = 2 // 0 sapling → 1 young → 2 mature (one stage per compliant day)

function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Highest main-tree stage reached for a given streak (0 when streak is 0).
export function mainTreeStage(streak: number): number {
  let stage = 0
  MAIN_TREE_THRESHOLDS.forEach((t, i) => {
    if (streak >= t) stage = i + 1
  })
  return stage
}

// Set of local-day keys (last ~90d) on which the user was compliant:
// every scheduled dose that day was taken (on_time/late), none missed/pending.
export async function compliantDaySet(userId: string): Promise<Set<string>> {
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const { data: logs } = await supabase
    .from('medication_logs')
    .select('scheduled_at, status')
    .eq('user_id', userId)
    .gte('scheduled_at', since.toISOString())

  const byDay = new Map<string, { taken: number; missed: number; pending: number }>()
  for (const log of logs ?? []) {
    const key = localDayKey(new Date(log.scheduled_at))
    const day = byDay.get(key) ?? { taken: 0, missed: 0, pending: 0 }
    if (log.status === 'on_time' || log.status === 'late') day.taken++
    else if (log.status === 'missed') day.missed++
    else day.pending++
    byDay.set(key, day)
  }

  const set = new Set<string>()
  for (const [key, d] of byDay) {
    if (d.missed === 0 && d.pending === 0 && d.taken > 0) set.add(key)
  }
  return set
}

// A planted tree gains a stage for each compliant day from its planting date
// through today (inclusive), clamped to MAX_PLANTED_STAGE.
export function plantedTreeStage(placedAtISO: string, compliant: Set<string>): number {
  const start = new Date(placedAtISO)
  start.setHours(0, 0, 0, 0)
  const cursor = new Date(start)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let count = 0
  while (cursor <= today) {
    if (compliant.has(localDayKey(cursor))) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.min(count, MAX_PLANTED_STAGE)
}

export interface GroveTree {
  id: string
  item_id: string
  x: number // scene fraction 0..1
  y: number
  stage: number
}

// Loads planted trees and computes each one's current growth stage with a
// single compliant-day query (not one per tree).
export async function loadGrove(userId: string, treeIds: Set<string>): Promise<GroveTree[]> {
  const [{ data: rows }, compliant] = await Promise.all([
    supabase.from('forest_items').select('id, item_id, grid_x, grid_y, placed_at').eq('user_id', userId),
    compliantDaySet(userId),
  ])
  return (rows ?? [])
    .filter((r) => treeIds.has(r.item_id) && r.grid_x !== null && r.grid_y !== null)
    .map((r) => ({
      id: r.id,
      item_id: r.item_id,
      x: (r.grid_x as number) / 1000,
      y: (r.grid_y as number) / 1000,
      stage: plantedTreeStage(r.placed_at, compliant),
    }))
}
