import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, skyStops } from '@/theme'
import { useCanvasScale } from './canvas'
import { heroLayers } from './heroLayers'

/** Height of the illustration area in Figma points; below it the screen is plain background. */
const HERO_HEIGHT = 425
/** The sky gradient spans the whole 852-pt Figma frame, so we draw it full height and clip it. */
const FRAME_HEIGHT = 852

/** Decorative illustration: purely visual, hidden from screen readers. */
export function WelcomeHero() {
  const scale = useCanvasScale()
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.hero, { height: HERO_HEIGHT * scale }]}
    >
      <LinearGradient
        colors={colors.sky}
        locations={skyStops}
        style={[styles.gradient, { height: FRAME_HEIGHT * scale }]}
      />
      {heroLayers.map(({ id, Svg, x, y, w, h, opacity, rotate }) => (
        <View
          key={id}
          style={[
            styles.layer,
            {
              left: x * scale,
              top: y * scale,
              opacity,
              transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined,
            },
          ]}
        >
          <Svg width={w * scale} height={h * scale} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  layer: { position: 'absolute' },
})
