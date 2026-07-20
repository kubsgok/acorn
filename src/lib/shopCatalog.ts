export interface ShopItem {
  id: string
  emoji: string
  name: string
  price: number
}

// A perfect day earns 10 acorns per on-time dose, so small items are
// reachable every day or two and big ones reward a solid week.
export const SHOP_CATALOG: ShopItem[] = [
  { id: 'potted-plant',  emoji: '🪴', name: 'Potted plant',       price: 15 },
  { id: 'pennant-flag',  emoji: '🚩', name: 'Pennant flag',       price: 15 },
  { id: 'lantern',       emoji: '🏮', name: 'Lantern',            price: 20 },
  { id: 'wall-poster',   emoji: '🖼️', name: 'Wall poster',        price: 25 },
  { id: 'growing-sign',  emoji: '🪧', name: '"Keep Growing" sign', price: 25 },
  { id: 'acorn-bowl',    emoji: '🥣', name: 'Acorn bowl',         price: 30 },
  { id: 'knit-rug',      emoji: '🧶', name: 'Knit rug',           price: 35 },
  { id: 'record-player', emoji: '📀', name: 'Record player',      price: 40 },
  { id: 'bookshelf',     emoji: '📚', name: 'Bookshelf',          price: 50 },
  { id: 'desk-computer', emoji: '🖥️', name: 'Desk computer',      price: 60 },
]

export function shopItemById(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((item) => item.id === id)
}
