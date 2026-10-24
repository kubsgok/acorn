import { colors, spacing, radius, typography, fontFamily, minTouchTarget } from '@/theme'

describe('theme tokens', () => {
  it('matches the Figma brand colors', () => {
    expect(colors.background).toBe('#f0e5c5')
    expect(colors.primary).toBe('#b15f00')
    expect(colors.link).toBe('#8d4b00')
  })

  it('uses a strictly increasing spacing scale', () => {
    const values = Object.values(spacing)
    expect(values).toEqual([...values].sort((a, b) => a - b))
  })

  it('has accessible minimum touch target and button radius per Figma', () => {
    expect(minTouchTarget).toBeGreaterThanOrEqual(44)
    expect(radius.button).toBe(16)
  })

  it('maps every text style to a loaded font family', () => {
    const families = new Set<string>(Object.values(fontFamily))
    for (const style of Object.values(typography)) {
      expect(families.has(style.fontFamily)).toBe(true)
    }
  })
})
