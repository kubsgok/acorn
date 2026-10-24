import type { TextStyle } from 'react-native'
import { fontFamily } from './fonts'

type Typography = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>

export const typography = {
  heading: { fontFamily: fontFamily.semiBold, fontSize: 32, lineHeight: 36.8 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22.5 },
  bodyLarge: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 19 },
  input: { fontFamily: fontFamily.regular, fontSize: 15 },
  label: { fontFamily: fontFamily.medium, fontSize: 14 },
  link: { fontFamily: fontFamily.medium, fontSize: 14 },
  linkStrong: { fontFamily: fontFamily.semiBold, fontSize: 14 },
  button: { fontFamily: fontFamily.semiBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.408 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13 },
  wordmark: { fontFamily: fontFamily.wordmark, fontSize: 24, letterSpacing: 1.2 },
} as const satisfies Record<string, Typography>
