import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SQUIRREL_IMAGE, SQUIRREL_SHADOW, SquirrelAnchor } from '../lib/forestStages'
import { ContactShadow } from './ContactShadow'

const BASE_WIDTH = 0.28 // sprite width as a fraction of the scene

// The squirrel stands with its feet at the anchor point, idling with a
// gentle bob and breath. Its contact shadow eases with the bob.
export function ForestSquirrel({ anchor }: { anchor: SquirrelAnchor }) {
  const bob = useSharedValue(0)
  const breath = useSharedValue(1)

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    )
    breath.value = withRepeat(
      withSequence(
        withTiming(1.015, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.995, { duration: 1900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    )
  }, [bob, breath])

  const lift = useDerivedValue(() => Math.min(Math.max(-bob.value / 20, 0), 1))

  const spriteStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { scaleY: breath.value }],
  }))

  const width = BASE_WIDTH * anchor.scale

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${(anchor.x - width / 2) * 100}%`,
        top: `${(anchor.y - width) * 100}%`,
        width: `${width * 100}%`,
        aspectRatio: 1,
      }}
    >
      <ContactShadow lift={lift} spec={SQUIRREL_SHADOW} />
      <Animated.Image
        source={SQUIRREL_IMAGE}
        style={[{ width: '100%', height: '100%' }, spriteStyle]}
        resizeMode="contain"
      />
    </View>
  )
}
