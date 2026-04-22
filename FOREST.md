# Acorn Forest — Gamification Design

## Overview

The forest is the core reward loop of the app. Users earn acorns by taking their medications on time, then spend them in a shop to buy items that are placed on an interactive grid. The forest grows and evolves as the user stays adherent.

---

## Core Loop

```
Take medication → Earn acorns → Spend in shop → Place items on grid → Forest grows
```

---

## Phase 1: Grid + Shop (Priority)

### Grid
- Scrollable tile grid (6 columns × 8 rows = 48 tiles)
- Each tile holds one item
- Tap an empty tile to open placement mode
- Tap a placed item to inspect or remove it
- Items are persisted in the `forest_items` table (already in DB schema)

### Shop
- Bottom sheet modal accessible from a shop button on the forest screen
- Items organised into categories: Trees, Animals, Flowers, Decorations, Buildings
- Each item shows: icon, name, cost (acorns), and lock status
- Two unlock types:
  - **Streak unlock** — automatically unlocked at a streak milestone, free to place
  - **Acorn purchase** — bought from the shop using earned acorns

### DB changes needed
- `forest_items` table already exists: `user_id`, `item_id`, `grid_x`, `grid_y`, `placed_at`
- Add `purchased_items` table to track what the user has bought (so they can place/remove without losing the item)

```sql
create table if not exists purchased_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  item_id text not null,
  purchased_at timestamptz default now(),
  unique(user_id, item_id)
);

alter table purchased_items enable row level security;
create policy "purchased_items: own data" on purchased_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## Phase 2: Squirrel Animation + Mood

- The user's named squirrel wanders around the grid using React Native's `Animated` API
- Mood states:
  - **Happy** (streak > 0, all doses taken today) — bouncy movement, fast
  - **Idle** (streak > 0, some doses pending) — slow wandering
  - **Sad** (streak = 0 or missed dose today) — slow, droopy, stays in corner
  - **Excited** (just earned acorns) — spin/jump animation for 2 seconds
- Squirrel is always visible on the grid, cannot be removed

---

## Phase 3: Weather Overlay

- Background sky gradient shifts based on streak health:
  - **0 days** — overcast grey
  - **1–6 days** — partly cloudy, light blue
  - **7–13 days** — clear blue sky, sun visible
  - **14–29 days** — golden hour warm tones
  - **30+ days** — vibrant sunrise, animated clouds
- Weather is a background layer behind the grid, not interactive

---

## Phase 4: Tap Interactions

- Tap any placed item → bottom sheet shows:
  - Item name + description
  - Date placed / streak when unlocked
  - Option to move or remove
- Long press → drag to reposition (stretch goal)

---

## Item Catalogue

### Trees (streak unlocks — free)
| Item ID | Name | Unlock | Cost |
|---------|------|--------|------|
| `sprout` | Sprout | 1-day streak | Free |
| `fern` | Fern | 3-day streak | Free |
| `pine` | Pine Tree | 7-day streak | Free |
| `oak` | Oak Tree | 14-day streak | Free |
| `ancient` | Ancient Tree | 60-day streak | Free |

### Trees (shop)
| Item ID | Name | Cost |
|---------|------|------|
| `cherry` | Cherry Blossom | 30 acorns |
| `willow` | Willow Tree | 50 acorns |
| `cactus` | Cactus | 20 acorns |

### Animals
| Item ID | Name | Cost |
|---------|------|------|
| `rabbit` | Rabbit | 25 acorns |
| `deer` | Deer | 40 acorns |
| `bird` | Robin | 15 acorns |
| `hedgehog` | Hedgehog | 20 acorns |
| `fox` | Fox | 50 acorns |

### Flowers
| Item ID | Name | Cost |
|---------|------|------|
| `daisy` | Daisy | 10 acorns |
| `sunflower` | Sunflower | 15 acorns |
| `mushroom` | Mushroom | 10 acorns |
| `tulip` | Tulip | 12 acorns |

### Decorations
| Item ID | Name | Cost |
|---------|------|------|
| `pond` | Pond | 35 acorns |
| `bench` | Bench | 20 acorns |
| `lantern` | Lantern | 15 acorns |
| `stone_path` | Stone Path | 10 acorns |
| `fence` | Fence | 8 acorns |

### Buildings
| Item ID | Name | Unlock / Cost |
|---------|------|---------------|
| `cabin` | Cabin | 30-day streak (free) |
| `treehouse` | Treehouse | 80 acorns |
| `birdhouse` | Birdhouse | 30 acorns |
| `windmill` | Windmill | 60 acorns |

### Special (achievement-locked)
| Item ID | Name | Unlock |
|---------|------|--------|
| `golden_acorn` | Golden Acorn | Lifetime 500 acorns earned |
| `rainbow` | Rainbow | 7-day perfect streak (all on-time) |
| `shooting_star` | Shooting Star | 90-day streak |

---

## UI Layout (Forest Screen)

```
┌─────────────────────────────┐
│  Your Forest      [Shop 🛍] │  ← header
│  Streak: 12 days            │
├─────────────────────────────┤
│                             │
│   [weather/sky background]  │
│                             │
│  [ ][ ][ ][ ][ ][ ]        │
│  [ ][ ][ ][ ][ ][ ]        │  ← scrollable tile grid
│  [ ][ ][ ][ ][ ][ ]        │
│  [ ][ ][ ][ ][ ][ ]        │
│  [ ][ ][ ][ ][ ][ ]        │
│  [ ][ ][ ][ ][ ][ ]        │
│  [ ][ ][ ][ ][ ][ ]        │
│  [ ][ ][ ][ ][ ][ ]        │
│                             │
├─────────────────────────────┤
│  🌰 Acorns: 120             │  ← balance reminder
└─────────────────────────────┘
```

---

## Build Order

1. **Phase 1** — Grid + Shop (gives acorns a purpose, core engagement loop)
2. **Phase 2** — Squirrel animation + mood system
3. **Phase 3** — Weather overlay
4. **Phase 4** — Tap interactions + item info sheet
