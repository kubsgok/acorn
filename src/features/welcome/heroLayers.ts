import type { FC } from 'react'
import type { SvgProps } from 'react-native-svg'
import Acorn from '../../../assets/svg/hero/acorn.svg'
import Cloud1 from '../../../assets/svg/hero/cloud-1.svg'
import Cloud2 from '../../../assets/svg/hero/cloud-2.svg'
import Cloud3 from '../../../assets/svg/hero/cloud-3.svg'
import Meadow1 from '../../../assets/svg/hero/meadow-1.svg'
import Meadow2 from '../../../assets/svg/hero/meadow-2.svg'
import Meadow3 from '../../../assets/svg/hero/meadow-3.svg'
import Meadow4 from '../../../assets/svg/hero/meadow-4.svg'
import SunCore from '../../../assets/svg/hero/sun-core.svg'
import SunRayBl from '../../../assets/svg/hero/sun-ray-bl.svg'
import SunRayBr from '../../../assets/svg/hero/sun-ray-br.svg'
import SunRayTl from '../../../assets/svg/hero/sun-ray-tl.svg'
import SunRayTr from '../../../assets/svg/hero/sun-ray-tr.svg'
import TreeLarge from '../../../assets/svg/hero/tree-large.svg'
import TreeRight from '../../../assets/svg/hero/tree-right.svg'
import TreeSmall from '../../../assets/svg/hero/tree-small.svg'

export type HeroLayer = {
  id: string
  Svg: FC<SvgProps>
  /** Position and size in Figma points (393-wide canvas). Origin = top-left of the frame. */
  x: number
  y: number
  w: number
  h: number
  opacity?: number
  /** Degrees, rotated about the layer's centre. */
  rotate?: number
}

// Sun parts are positioned inside the 78 × 78.18 sun box at (318, 52).
const SUN = { x: 318, y: 52 }

/** Back-to-front. Coordinates are read from Figma node 98:612 (see docs/DESIGN-NOTES.md). */
export const heroLayers: HeroLayer[] = [
  { id: 'sun-core', Svg: SunCore, x: SUN.x + 20.67, y: SUN.y + 20.77, w: 36.654, h: 36.654 },
  { id: 'sun-ray-bl', Svg: SunRayBl, x: SUN.x, y: SUN.y + 37.14, w: 32.614, h: 34.422 },
  { id: 'sun-ray-br', Svg: SunRayBr, x: SUN.x + 37.12, y: SUN.y + 45.38, w: 34.33, h: 32.816 },
  { id: 'sun-ray-tr', Svg: SunRayTr, x: SUN.x + 45.21, y: SUN.y + 7.06, w: 32.815, h: 34.328 },
  { id: 'sun-ray-tl', Svg: SunRayTl, x: SUN.x + 6.93, y: SUN.y, w: 34.331, h: 32.814 },
  { id: 'cloud-1', Svg: Cloud1, x: -30, y: 118, w: 210.003, h: 36.809 },
  { id: 'cloud-2', Svg: Cloud2, x: 246, y: 205, w: 150.002, h: 26.292, opacity: 0.95 },
  { id: 'cloud-3', Svg: Cloud3, x: 126, y: 88, w: 110.002, h: 19.281, opacity: 0.8 },
  { id: 'meadow-1', Svg: Meadow1, x: -104, y: 242, w: 470, h: 267 },
  { id: 'meadow-2', Svg: Meadow2, x: 147, y: 243, w: 470, h: 267 },
  { id: 'meadow-3', Svg: Meadow3, x: -40, y: 269, w: 470, h: 267 },
  { id: 'meadow-4', Svg: Meadow4, x: 160.5, y: 303, w: 113, h: 16 },
  { id: 'tree-large', Svg: TreeLarge, x: 3, y: 159, w: 92, h: 107.538 },
  { id: 'tree-small', Svg: TreeSmall, x: 92, y: 215, w: 48.156, h: 56.289 },
  // Unrotated 114.24 × 127.975, rotated 33.8° about its centre (203.05, 255).
  { id: 'acorn', Svg: Acorn, x: 145.93, y: 191.01, w: 114.24, h: 127.975, rotate: 33.8 },
  { id: 'tree-right', Svg: TreeRight, x: 269, y: 114, w: 124, h: 144.943 },
]
