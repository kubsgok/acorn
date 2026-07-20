import { useEffect } from 'react'
import { Pressable } from 'react-native'
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SQUIRREL_IMAGE, SquirrelAnchor } from '../lib/forestStages'

const BASE_WIDTH = 0.28 // sprite width as a fraction of the scene

// The squirrel stands with its feet at the anchor point, idles with a gentle
// bob, hops on its own every so often, and does a little hop when tapped.
export function ForestSquirrel({ anchor }: { anchor: SquirrelAnchor }) {
  const bob = useSharedValue(0)
  const hopY = useSharedValue(0)
  const squash = useSharedValue(1)

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    )
  }, [bob])

  function hop() {
    hopY.value = withSequence(
      withSpring(-16, { damping: 7, stiffness: 220 }),
      withSpring(0, { damping: 9, stiffness: 240 })
    )
    squash.value = withSequence(
      withTiming(0.92, { duration: 90 }),
      withTiming(1.06, { duration: 140 }),
      withTiming(1, { duration: 120 })
    )
  }

  // Ambient hop every 6–12 seconds
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    function schedule() {
      timer = setTimeout(() => {
        if (cancelled) return
        hop()
        schedule()
      }, 6000 + Math.random() * 6000)
    }
    schedule()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value + hopY.value }, { scaleY: squash.value }],
  }))

  const width = BASE_WIDTH * anchor.scale

  return (
    <Pressable
      onPress={hop}
      style={{
        position: 'absolute',
        left: `${(anchor.x - width / 2) * 100}%`,
        top: `${(anchor.y - width) * 100}%`,
        width: `${width * 100}%`,
        aspectRatio: 1,
      }}
    >
      <Animated.Image
        source={SQUIRREL_IMAGE}
        style={[{ width: '100%', height: '100%' }, animatedStyle]}
        resizeMode="contain"
      />
    </Pressable>
  )
}
