import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { ShadowSpec } from '../lib/forestStages'

const SHADOW_IMAGE = require('../../assets/forest/shadow.png')

// Soft ground ellipse placed under a sprite's real footprint (from ShadowSpec,
// measured per sprite) rather than its bounding box. As `lift` rises 0→1 the
// object is "airborne": the shadow shrinks and fades.
export function ContactShadow({
  lift,
  spec,
}: {
  lift?: SharedValue<number> | number
  spec: ShadowSpec
}) {
  const style = useAnimatedStyle(() => {
    const l = typeof lift === 'number' ? lift : lift?.value ?? 0
    return {
      opacity: 1 - l * 0.5,
      transform: [{ scale: 1 - l * 0.25 }],
    }
  })

  const w = spec.widthPct
  const h = w * 0.34 // horizontal ellipse — correct for this symmetric iso floor
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: `${(spec.centerX - w / 2) * 100}%`,
          top: `${(spec.baseY - h / 2) * 100}%`,
          width: `${w * 100}%`,
          height: `${h * 100}%`,
        },
        style,
      ]}
    >
      <Animated.Image source={SHADOW_IMAGE} resizeMode="stretch" style={{ width: '100%', height: '100%' }} />
    </Animated.View>
  )
}
