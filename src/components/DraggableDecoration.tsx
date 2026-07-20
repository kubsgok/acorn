import { useEffect, useRef } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { GridCell } from '../lib/forestGrid'

export const DECORATION_WIDTH = 0.16 // base fraction of scene, scaled by cell depth

interface Props {
  rowId: string
  image: number
  cell: GridCell
  sceneSize: number
  onDragActive: (active: boolean) => void
  onDrop: (rowId: string, fx: number, fy: number) => void
  onTap: (rowId: string) => void
}

// A placed decoration: drag to move (parent snaps it to the nearest free
// cell), tap to put away. Bounces whenever it lands on a new cell.
export function DraggableDecoration({ rowId, image, cell, sceneSize, onDragActive, onDrop, onTap }: Props) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const lift = useSharedValue(0)
  const land = useSharedValue(1)
  const prevKey = useRef(cell.key)

  useEffect(() => {
    if (cell.key !== prevKey.current) {
      prevKey.current = cell.key
      land.value = withSequence(
        withTiming(0.85, { duration: 90 }),
        withSpring(1, { damping: 6, stiffness: 220 })
      )
    }
  }, [cell.key, land])

  const pan = Gesture.Pan()
    .minDistance(6)
    .onStart(() => {
      lift.value = withTiming(1, { duration: 120 })
      runOnJS(onDragActive)(true)
    })
    .onUpdate((e) => {
      tx.value = e.translationX
      ty.value = e.translationY
    })
    .onEnd((e) => {
      const fx = cell.x + e.translationX / sceneSize
      const fy = cell.y + e.translationY / sceneSize
      runOnJS(onDrop)(rowId, fx, fy)
    })
    .onFinalize(() => {
      lift.value = withTiming(0, { duration: 150 })
      tx.value = 0
      ty.value = 0
      runOnJS(onDragActive)(false)
    })

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)(rowId)
  })

  const gesture = Gesture.Exclusive(pan, tap)

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: (1 + lift.value * 0.1) * land.value },
    ],
    shadowOpacity: 0.15 + lift.value * 0.2,
    shadowRadius: 4 + lift.value * 8,
    zIndex: lift.value > 0 ? 99 : undefined,
  }))

  const w = DECORATION_WIDTH * cell.depthScale
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: `${(cell.x - w / 2) * 100}%`,
            top: `${(cell.y - w) * 100}%`,
            width: `${w * 100}%`,
            aspectRatio: 1,
            shadowColor: '#3f2d20',
            shadowOffset: { width: 0, height: 4 },
          },
          style,
        ]}
      >
        <Animated.Image source={image} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      </Animated.View>
    </GestureDetector>
  )
}
