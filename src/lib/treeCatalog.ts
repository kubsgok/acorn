// Buyable tree species for the Forest (grove) tab. Each planted tree grows
// through 3 stages (sapling → young → mature) one stage per compliant day.
// Prices are tiered so acorns stay meaningful (a perfect day ≈ 10–30 acorns).

export interface TreeSpecies {
  id: string
  name: string
  emoji: string
  price: number
  stages: number[] // require()'d sprites, index = growth stage 0..2
}

export const TREE_CATALOG: TreeSpecies[] = [
  {
    id: 'tree-pine',
    name: 'Pine',
    emoji: '🌲',
    price: 20,
    stages: [
      require('../../assets/forest/tree/pine-0.png'),
      require('../../assets/forest/tree/pine-1.png'),
      require('../../assets/forest/tree/pine-2.png'),
    ],
  },
  {
    id: 'tree-maple',
    name: 'Maple',
    emoji: '🍁',
    price: 40,
    stages: [
      require('../../assets/forest/tree/maple-0.png'),
      require('../../assets/forest/tree/maple-1.png'),
      require('../../assets/forest/tree/maple-2.png'),
    ],
  },
  {
    id: 'tree-cherry',
    name: 'Cherry Blossom',
    emoji: '🌸',
    price: 70,
    stages: [
      require('../../assets/forest/tree/cherry-0.png'),
      require('../../assets/forest/tree/cherry-1.png'),
      require('../../assets/forest/tree/cherry-2.png'),
    ],
  },
]

export const TREE_IDS = new Set(TREE_CATALOG.map((t) => t.id))

export function treeById(id: string): TreeSpecies | undefined {
  return TREE_CATALOG.find((t) => t.id === id)
}

// Main tree (not buyable) — grows with the streak, 6 stages (0 seedling → 5).
export const MAIN_TREE_IMAGES: number[] = [
  require('../../assets/forest/tree/main-0.png'),
  require('../../assets/forest/tree/main-1.png'),
  require('../../assets/forest/tree/main-2.png'),
  require('../../assets/forest/tree/main-3.png'),
  require('../../assets/forest/tree/main-4.png'),
  require('../../assets/forest/tree/main-5.png'),
]

export const GROVE_BG = require('../../assets/forest/tree/grove-bg.png')
