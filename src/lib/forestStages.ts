export interface ForestStage {
  minStreak: number
  label: string
  emoji: string
  image: number
}

// Swap the PNGs in assets/forest/ for real illustrations — no code changes needed.
export const STAGES: ForestStage[] = [
  { minStreak: 1,  label: '1 day',   emoji: '🌱', image: require('../../assets/forest/stage1.png') },
  { minStreak: 3,  label: '3 days',  emoji: '🌿', image: require('../../assets/forest/stage2.png') },
  { minStreak: 7,  label: '7 days',  emoji: '🌲', image: require('../../assets/forest/stage3.png') },
  { minStreak: 14, label: '14 days', emoji: '🌳', image: require('../../assets/forest/stage4.png') },
  { minStreak: 30, label: '30 days', emoji: '🏡', image: require('../../assets/forest/stage5.png') },
]

// Highest stage reached for this streak (stage 0 shown dimmed when streak is 0)
export function currentStageIndex(streak: number): number {
  let index = 0
  STAGES.forEach((s, i) => { if (streak >= s.minStreak) index = i })
  return index
}

// 0..1 fill toward the next stage; 1 when the forest is complete
export function stageProgress(streak: number): { progress: number; nextStage: ForestStage | null } {
  const next = STAGES.find((s) => streak < s.minStreak)
  if (!next) return { progress: 1, nextStage: null }
  const prevMin = STAGES.filter((s) => streak >= s.minStreak).pop()?.minStreak ?? 0
  return { progress: (streak - prevMin) / (next.minStreak - prevMin), nextStage: next }
}

// ── Interactive scene layout ─────────────────────────────────────────────
// All coordinates are fractions of the square scene (0..1, top-left origin),
// so they hold regardless of rendered size. Tuned against the stage art:
// the room floor is the lower-center diamond of each illustration.

export interface SceneSlot {
  x: number
  y: number
}

// Placement spots on open floor. Six slots; positions vary per stage so
// items never sit on furniture painted into later rooms. forest_items.grid_x
// stores the slot index (0–5); indices ≥ SLOT_COUNT from older builds are
// treated as unplaced.
export const SLOT_COUNT = 6

export const SLOTS_BY_STAGE: SceneSlot[][] = [
  [ // stage 1 — bare room
    { x: 0.20, y: 0.73 }, { x: 0.76, y: 0.68 }, { x: 0.28, y: 0.83 },
    { x: 0.84, y: 0.76 }, { x: 0.54, y: 0.86 }, { x: 0.34, y: 0.64 },
  ],
  [ // stage 2 — few plants, same open floor
    { x: 0.20, y: 0.73 }, { x: 0.76, y: 0.68 }, { x: 0.28, y: 0.83 },
    { x: 0.84, y: 0.76 }, { x: 0.54, y: 0.86 }, { x: 0.34, y: 0.64 },
  ],
  [ // stage 3 — console left, lantern bottom-right
    { x: 0.14, y: 0.80 }, { x: 0.76, y: 0.68 }, { x: 0.28, y: 0.83 },
    { x: 0.88, y: 0.75 }, { x: 0.54, y: 0.86 }, { x: 0.66, y: 0.62 },
  ],
  [ // stage 4 — furnished
    { x: 0.14, y: 0.80 }, { x: 0.76, y: 0.68 }, { x: 0.28, y: 0.83 },
    { x: 0.88, y: 0.75 }, { x: 0.54, y: 0.86 }, { x: 0.66, y: 0.90 },
  ],
  [ // stage 5 — full room: garden bed bottom-left, cart right
    { x: 0.30, y: 0.76 }, { x: 0.76, y: 0.68 }, { x: 0.40, y: 0.90 },
    { x: 0.88, y: 0.75 }, { x: 0.54, y: 0.86 }, { x: 0.66, y: 0.90 },
  ],
]

export interface SquirrelAnchor {
  x: number
  y: number
  scale: number
}

// Where the squirrel sprite stands in each stage (index-aligned with STAGES).
// Kept clear of SLOTS so placed items never sit on the squirrel.
export const SQUIRREL_ANCHORS: SquirrelAnchor[] = [
  { x: 0.52, y: 0.78, scale: 1.0 },
  { x: 0.52, y: 0.78, scale: 1.0 },
  { x: 0.52, y: 0.78, scale: 1.0 },
  { x: 0.52, y: 0.78, scale: 1.0 },
  { x: 0.52, y: 0.79, scale: 1.0 },
]

export const SQUIRREL_IMAGE = require('../../assets/forest/squirrel.png')

// v2 scene: one empty room the user furnishes themselves
export const ROOM_IMAGE = require('../../assets/forest/room-empty.png')

// Static require map — React Native can only bundle literal require() calls.
export const ITEM_IMAGES: Record<string, number> = {
  'potted-plant': require('../../assets/forest/items/potted-plant.png'),
  'pennant-flag': require('../../assets/forest/items/pennant-flag.png'),
  'lantern': require('../../assets/forest/items/lantern.png'),
  'wall-poster': require('../../assets/forest/items/wall-poster.png'),
  'growing-sign': require('../../assets/forest/items/growing-sign.png'),
  'acorn-bowl': require('../../assets/forest/items/acorn-bowl.png'),
  'knit-rug': require('../../assets/forest/items/knit-rug.png'),
  'record-player': require('../../assets/forest/items/record-player.png'),
  'bookshelf': require('../../assets/forest/items/bookshelf.png'),
  'desk-computer': require('../../assets/forest/items/desk-computer.png'),
}
