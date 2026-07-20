// Placement grid for the forest room, hand-placed from design markup.
// All coordinates are fractions of the square scene (0..1, top-left origin).
// A cell's (x, y) is where an item's feet sit; depthScale shrinks items
// toward the back of the room for the 2.5D effect.

export interface GridCell {
  key: string
  kind: 'floor' | 'wall'
  col: number
  row: number
  x: number
  y: number
  depthScale: number
}

const floorDepth = (y: number) => Math.min(1, 0.8 + 0.5 * (y - 0.55))

// Floor spots (persisted as grid_x = col, grid_y = 0)
const FLOOR_POINTS: { x: number; y: number }[] = [
  { x: 0.50, y: 0.55 }, // back-center, near the corner
  { x: 0.36, y: 0.60 }, // back-left
  { x: 0.24, y: 0.63 }, // left
  { x: 0.15, y: 0.72 }, // lower-left
  { x: 0.27, y: 0.82 }, // front-left
  { x: 0.41, y: 0.82 }, // front, left of center
  { x: 0.53, y: 0.83 }, // front-center
  { x: 0.67, y: 0.84 }, // front-right
  { x: 0.77, y: 0.75 }, // right
  { x: 0.86, y: 0.69 }, // upper-right
]

export const FLOOR_CELLS: GridCell[] = FLOOR_POINTS.map((p, i) => ({
  key: `f${i}`,
  kind: 'floor' as const,
  col: i,
  row: 0,
  x: p.x,
  y: p.y,
  depthScale: floorDepth(p.y),
}))

// Wall spots (persisted as grid_x = col, grid_y = -1). y is where the item's
// bottom sits, so these hang the sprite centered on the marked spots.
const WALL_POINTS: { x: number; y: number }[] = [
  { x: 0.40, y: 0.36 }, // left wall, right of the window
  { x: 0.57, y: 0.35 }, // right wall, near the corner
  { x: 0.71, y: 0.41 }, // right wall, middle
  { x: 0.85, y: 0.49 }, // right wall, lower
]

export const WALL_CELLS: GridCell[] = WALL_POINTS.map((p, i) => ({
  key: `w${i}`,
  kind: 'wall' as const,
  col: i,
  row: -1,
  x: p.x,
  y: p.y,
  depthScale: 0.88,
}))

// The squirrel's home (not a placement cell)
export const SQUIRREL_CELL: GridCell = {
  key: 'squirrel',
  kind: 'floor',
  col: -1,
  row: 0,
  x: 0.615,
  y: 0.775,
  depthScale: 0.92,
}

export function cellFor(gridX: number, gridY: number): GridCell | undefined {
  if (gridY === -1) return WALL_CELLS[gridX]
  return FLOOR_CELLS.find((c) => c.col === gridX && c.row === gridY)
}

export function freeCells(kind: 'floor' | 'wall', occupiedKeys: Set<string>): GridCell[] {
  const cells = kind === 'floor' ? FLOOR_CELLS : WALL_CELLS
  return cells.filter((c) => !occupiedKeys.has(c.key))
}

export function nearestFreeCell(
  fx: number,
  fy: number,
  kind: 'floor' | 'wall',
  occupiedKeys: Set<string>
): GridCell | null {
  let best: GridCell | null = null
  let bestDist = Infinity
  for (const c of freeCells(kind, occupiedKeys)) {
    const d = (c.x - fx) ** 2 + (c.y - fy) ** 2
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return best
}

// Tier 1 stored a slot index (0–7) in grid_x with grid_y null.
// Maps old slot indices to sensible cells; 6/7 (removed slots) unplace.
export const TIER1_SLOT_TO_CELL: (GridCell | null)[] = [
  FLOOR_CELLS[2],
  FLOOR_CELLS[9],
  FLOOR_CELLS[4],
  FLOOR_CELLS[8],
  FLOOR_CELLS[6],
  FLOOR_CELLS[1],
  null,
  null,
]
