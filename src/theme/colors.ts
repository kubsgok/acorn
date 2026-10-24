// Values come from Figma (file oiO6LQnorIR7cPMi6A34l0). Components must use these, never raw hex.
export const colors = {
  background: '#f0e5c5',
  surface: '#ffffff',
  primary: '#b15f00',
  onPrimary: '#fff8f5',
  link: '#8d4b00',
  textStrong: '#1f1b17',
  textBody: '#554336',
  textMuted: '#78716c',
  textSubtle: 'rgba(30, 30, 30, 0.6)',
  border: '#dbc2b0',
  borderSubtle: '#e7e5e4',
  // Not in Figma (no error states designed) — see docs/DESIGN-NOTES.md.
  error: '#b3261e',
  sky: ['#d6e8ee', '#f3f0e2', '#8c8574'],
} as const

// Gradient stop positions for `colors.sky` (the middle stop sits at 46.154%).
export const skyStops = [0, 0.46154, 1] as const
