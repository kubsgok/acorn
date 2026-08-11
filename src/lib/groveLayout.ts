// Ground geometry for the outdoor grove (Forest tab).
// Coordinates are fractions of the square scene (0..1, top-left origin).
// The grass/plantable area sits below the horizon; the main tree stands at
// the back-center, and planted trees go anywhere on the grass.

export interface ScenePos {
  x: number
  y: number
}

export const HORIZON_Y = 0.56 // sky above, grass below
export const MAIN_TREE_POS: ScenePos = { x: 0.5, y: 0.7 }

// Grass polygon (a gentle trapezoid — a bit wider at the front)
const GROUND_POLY: ScenePos[] = [
  { x: 0.14, y: HORIZON_Y + 0.04 },
  { x: 0.86, y: HORIZON_Y + 0.04 },
  { x: 0.96, y: 0.95 },
  { x: 0.04, y: 0.95 },
]

function pointInPoly(p: ScenePos, poly: ScenePos[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function isOnGround(p: ScenePos): boolean {
  return pointInPoly(p, GROUND_POLY)
}

const GROUND_CENTER: ScenePos = { x: 0.5, y: 0.8 }

export function clampToGround(p: ScenePos): ScenePos {
  if (isOnGround(p)) return p
  for (let t = 0; t <= 1; t += 0.04) {
    const q = { x: p.x + (GROUND_CENTER.x - p.x) * t, y: p.y + (GROUND_CENTER.y - p.y) * t }
    if (isOnGround(q)) return q
  }
  return GROUND_CENTER
}

// Trees toward the back of the grass render smaller.
export function depthFor(y: number): number {
  return Math.min(1, Math.max(0.7, 0.7 + 0.9 * (y - HORIZON_Y)))
}

// Spread spots for auto-planting bought trees (avoids the main tree).
export const DEFAULT_TREE_SPOTS: ScenePos[] = [
  { x: 0.24, y: 0.74 },
  { x: 0.76, y: 0.74 },
  { x: 0.18, y: 0.86 },
  { x: 0.82, y: 0.86 },
  { x: 0.40, y: 0.9 },
  { x: 0.62, y: 0.9 },
  { x: 0.5, y: 0.82 },
]
