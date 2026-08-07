// Free-placement geometry for the forest room.
// Coordinates are fractions of the square scene (0..1, top-left origin).
// Items go anywhere the user drops them, constrained to a region:
// floor items inside the floor polygon, wall items on a wall (not the window).
// Positions persist to forest_items as grid_x = x*1000, grid_y = y*1000.

export type PlacementKind = 'floor' | 'wall'
export interface ScenePos {
  x: number
  y: number
}

// Traced from the room art
const FLOOR_POLY: ScenePos[] = [
  { x: 0.50, y: 0.52 },  // back corner
  { x: 0.935, y: 0.775 }, // right corner
  { x: 0.66, y: 0.94 },  // right tongue bottom
  { x: 0.635, y: 0.885 }, // notch right
  { x: 0.475, y: 0.885 }, // notch left
  { x: 0.45, y: 0.95 },  // bottom vertex
  { x: 0.075, y: 0.775 }, // left corner
]

// Feet regions for wall items, inset so sprites stay on the wall surface
const LEFT_WALL_POLY: ScenePos[] = [
  { x: 0.10, y: 0.45 },
  { x: 0.48, y: 0.27 },
  { x: 0.48, y: 0.49 },
  { x: 0.10, y: 0.73 },
]
const RIGHT_WALL_POLY: ScenePos[] = [
  { x: 0.52, y: 0.27 },
  { x: 0.90, y: 0.45 },
  { x: 0.90, y: 0.73 },
  { x: 0.52, y: 0.49 },
]
// Window on the left wall — no posters over the glass
const WINDOW_RECT = { x0: 0.10, y0: 0.26, x1: 0.35, y1: 0.64 }

function pointInPoly(p: ScenePos, poly: ScenePos[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

function inWindow(p: ScenePos): boolean {
  return p.x > WINDOW_RECT.x0 && p.x < WINDOW_RECT.x1 && p.y > WINDOW_RECT.y0 && p.y < WINDOW_RECT.y1
}

export function isValidPos(kind: PlacementKind, p: ScenePos): boolean {
  if (kind === 'floor') return pointInPoly(p, FLOOR_POLY)
  return (pointInPoly(p, LEFT_WALL_POLY) || pointInPoly(p, RIGHT_WALL_POLY)) && !inWindow(p)
}

const FLOOR_CENTER: ScenePos = { x: 0.5, y: 0.75 }
const LEFT_WALL_CENTER: ScenePos = { x: 0.28, y: 0.52 }
const RIGHT_WALL_CENTER: ScenePos = { x: 0.72, y: 0.52 }

function marchToward(p: ScenePos, target: ScenePos, kind: PlacementKind): ScenePos {
  for (let t = 0; t <= 1; t += 0.04) {
    const q = { x: p.x + (target.x - p.x) * t, y: p.y + (target.y - p.y) * t }
    if (isValidPos(kind, q)) return q
  }
  return target
}

// Returns the drop point if it's in-region, otherwise the nearest point
// along the line toward the region's center.
export function clampToRegion(kind: PlacementKind, p: ScenePos): ScenePos {
  if (isValidPos(kind, p)) return p
  if (kind === 'floor') return marchToward(p, FLOOR_CENTER, kind)
  const target =
    Math.hypot(p.x - LEFT_WALL_CENTER.x, p.y - LEFT_WALL_CENTER.y) <
    Math.hypot(p.x - RIGHT_WALL_CENTER.x, p.y - RIGHT_WALL_CENTER.y)
      ? LEFT_WALL_CENTER
      : RIGHT_WALL_CENTER
  return marchToward(p, target, kind)
}

export function wallSide(p: ScenePos): 'left' | 'right' {
  return p.x < 0.5 ? 'left' : 'right'
}

// The room art has empty margin baked in, so it's drawn smaller than its
// frame. We zoom the image to fill the card and map placement coordinates by
// the same factor. The zoom is anchored near the floor front (ROOM_PIVOT_Y),
// so it expands upward — cropping spare ceiling, never the floor front.
// Stored positions (and the region polygons) stay in un-zoomed space.
export const ROOM_ZOOM = 1.0
export const ROOM_PIVOT_Y = 0.9
const zoomX = (f: number) => 0.5 + (f - 0.5) * ROOM_ZOOM
const zoomY = (f: number) => ROOM_PIVOT_Y + (f - ROOM_PIVOT_Y) * ROOM_ZOOM
export function toDisplay(p: ScenePos): ScenePos {
  return { x: zoomX(p.x), y: zoomY(p.y) }
}
export function fromDisplay(p: ScenePos): ScenePos {
  return {
    x: 0.5 + (p.x - 0.5) / ROOM_ZOOM,
    y: ROOM_PIVOT_Y + (p.y - ROOM_PIVOT_Y) / ROOM_ZOOM,
  }
}

// Depth scaling: things toward the back of the room render smaller
export function depthFor(kind: PlacementKind, p: ScenePos): number {
  if (kind === 'wall') return 0.88
  return Math.min(1, Math.max(0.78, 0.8 + 0.5 * (p.y - 0.55)))
}

export const SQUIRREL_ANCHOR = { x: 0.615, y: 0.775, scale: 0.92 }

// ── Persistence ──────────────────────────────────────────────────────────
export function posToGrid(p: ScenePos): { grid_x: number; grid_y: number } {
  return { grid_x: Math.round(p.x * 1000), grid_y: Math.round(p.y * 1000) }
}

// Legacy rows (cell/slot indices from earlier builds) decode to null —
// the caller re-places them at a default spot.
export function gridToPos(gridX: number | null, gridY: number | null): ScenePos | null {
  if (gridX === null || gridY === null) return null
  if (gridY === -1 || (gridX <= 20 && gridY <= 20)) return null
  return { x: gridX / 1000, y: gridY / 1000 }
}

// Spread entry points for tap-to-add and legacy migration
export const DEFAULT_FLOOR_SPOTS: ScenePos[] = [
  { x: 0.30, y: 0.72 },
  { x: 0.68, y: 0.72 },
  { x: 0.48, y: 0.82 },
  { x: 0.20, y: 0.80 },
  { x: 0.78, y: 0.80 },
  { x: 0.36, y: 0.63 },
  { x: 0.64, y: 0.62 },
]
export const DEFAULT_WALL_SPOTS: ScenePos[] = [
  { x: 0.62, y: 0.40 },
  { x: 0.78, y: 0.50 },
  { x: 0.42, y: 0.42 },
  { x: 0.26, y: 0.68 },
]
