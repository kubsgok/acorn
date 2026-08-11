import { useEffect, useMemo } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  interpolate,
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

const DURATION = 2400

function Acorn({ progress, seed }: { progress: SharedValue<number>; seed: number }) {
  // Deterministic per-acorn randomness so styles don't change across renders
  const { left, start, drift, size } = useMemo(
    () => ({
      left: 6 + ((seed * 37) % 84),
      start: ((seed * 13) % 30) / 100, // stagger: 0..0.3 of the timeline
      drift: (((seed * 7) % 40) - 20) * 1.2,
      size: 18 + ((seed * 11) % 10),
    }),
    [seed]
  )

  const style = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [start, 1], [0, 1], 'clamp')
    return {
      transform: [{ translateY: t * 300 - 30 }, { translateX: t * drift }, { rotate: `${t * drift * 6}deg` }],
      opacity: interpolate(t, [0, 0.1, 0.75, 1], [0, 1, 1, 0]),
    }
  })

  return (
    <Animated.Text style={[{ position: 'absolute', top: 0, left: `${left}%`, fontSize: size }, style]}>
      🌰
    </Animated.Text>
  )
}

// Full-scene overlay: falling acorns + a "forest grew" banner. Plays once,
// then calls onDone so the parent can unmount it.
export function StageCelebration({
  fromEmoji,
  toEmoji,
  onDone,
  title = 'Your forest grew!',
  subtitle,
}: {
  fromEmoji: string
  toEmoji: string
  onDone: () => void
  title?: string
  subtitle?: string
}) {
  const progress = useSharedValue(0)
  const banner = useSharedValue(0)

  useEffect(() => {
    banner.value = withSpring(1, { damping: 12, stiffness: 160 })
    progress.value = withTiming(1, { duration: DURATION }, (finished) => {
      if (finished) runOnJS(onDone)()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + banner.value * 0.3 }],
    opacity: banner.value,
  }))

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <Acorn key={i} progress={progress} seed={i + 1} />
      ))}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: '38%',
            alignSelf: 'center',
            backgroundColor: '#5b4332',
            borderRadius: 18,
            paddingHorizontal: 20,
            paddingVertical: 12,
            alignItems: 'center',
          },
          bannerStyle,
        ]}
      >
        <Text style={{ color: '#f7ede2', fontWeight: '800', fontSize: 16 }}>{title}</Text>
        <Text style={{ fontSize: 20, marginTop: 4 }}>
          {fromEmoji}  →  {toEmoji}
        </Text>
        {subtitle && (
          <Text style={{ color: '#ffd98a', fontWeight: '800', fontSize: 14, marginTop: 6 }}>{subtitle}</Text>
        )}
      </Animated.View>
    </View>
  )
}
