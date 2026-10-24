import { useFonts } from 'expo-font'
import { font42dotSans_400Regular } from '@expo-google-fonts/42dot-sans/400Regular'
import { font42dotSans_500Medium } from '@expo-google-fonts/42dot-sans/500Medium'
import { font42dotSans_600SemiBold } from '@expo-google-fonts/42dot-sans/600SemiBold'
import { Afacad_400Regular } from '@expo-google-fonts/afacad/400Regular'

// One family name per weight: Android does not synthesize weights from a single family.
export const fontFamily = {
  regular: 'DotSans-Regular',
  medium: 'DotSans-Medium',
  semiBold: 'DotSans-SemiBold',
  wordmark: 'Afacad-Regular',
} as const

/** Loads the app fonts. Returns true once they are ready to render. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [fontFamily.regular]: font42dotSans_400Regular,
    [fontFamily.medium]: font42dotSans_500Medium,
    [fontFamily.semiBold]: font42dotSans_600SemiBold,
    [fontFamily.wordmark]: Afacad_400Regular,
  })
  // On a font load error, render with system fonts rather than blocking the app forever.
  return loaded || error !== null
}
