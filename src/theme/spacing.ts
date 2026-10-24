// 4pt-based scale. Exact one-off Figma values are added here only when a component needs them.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 36,
} as const

export const radius = {
  field: 12,
  button: 16,
  pill: 9999,
} as const

// Minimum accessible touch target (points).
export const minTouchTarget = 44

// Height of buttons and text fields (Figma Login frame 141:370).
export const controlHeight = 56

// Opacity for pressed / disabled controls (not in Figma; see docs/DESIGN-NOTES.md).
export const pressedOpacity = 0.7
