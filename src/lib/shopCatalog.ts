export interface ShopItem {
  id: string
  emoji: string
  name: string
  price: number
  placement: 'floor' | 'wall'
}

// A perfect day earns 10 acorns per on-time dose, so small items are
// reachable every day or two and big ones reward a solid week.
export const SHOP_CATALOG: ShopItem[] = [
  { id: 'potted-plant',  emoji: '🪴', name: 'Potted plant',       price: 15, placement: 'floor' },
  { id: 'pennant-flag',  emoji: '🚩', name: 'Pennant flag',       price: 15, placement: 'wall' },
  { id: 'lantern',       emoji: '🏮', name: 'Lantern',            price: 20, placement: 'floor' },
  { id: 'wall-poster',   emoji: '🖼️', name: 'Wall poster',        price: 25, placement: 'wall' },
  { id: 'growing-sign',  emoji: '🪧', name: '"Keep Growing" sign', price: 25, placement: 'floor' },
  { id: 'acorn-bowl',    emoji: '🥣', name: 'Acorn bowl',         price: 30, placement: 'floor' },
  { id: 'knit-rug',      emoji: '🧶', name: 'Knit rug',           price: 35, placement: 'floor' },
  { id: 'record-player', emoji: '📀', name: 'Record player',      price: 40, placement: 'floor' },
  { id: 'bookshelf',     emoji: '📚', name: 'Bookshelf',          price: 50, placement: 'floor' },
  { id: 'desk-computer', emoji: '🖥️', name: 'Desk computer',      price: 60, placement: 'floor' },
]

export function shopItemById(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((item) => item.id === id)
}
