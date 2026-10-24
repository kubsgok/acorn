import { useWindowDimensions } from 'react-native'

/** Width of the Figma frames (iPhone 393 × 852). Illustration coordinates are in this space. */
export const DESIGN_WIDTH = 393

/** Scale factor that maps the 393-pt Figma canvas to the current screen width. */
export function useCanvasScale(): number {
  const { width } = useWindowDimensions()
  return width / DESIGN_WIDTH
}
