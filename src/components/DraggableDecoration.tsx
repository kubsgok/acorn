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
import { PlacementKind, ScenePos, wallSide } from '../lib/forestGrid'
import { ShadowSpec } from '../lib/forestStages'
import { ContactShadow } from './ContactShadow'

export const DECORATION_WIDTH = 0.16 // base fraction of scene, scaled by depth
const HOVER_PX = 12 // how far the sprite floats above its shadow while dragged

interface Props {
  rowId: string
  image: number
  pos: ScenePos
  kind: PlacementKind
  depthScale: number
  sceneSize: number
  shadow?: ShadowSpec
  onDragActive: (active: boolean) => void
  onDrop: (rowId: string, fx: number, fy: number) => void
  onTap: (rowId: string) => void
}

// A freely-placed decoration: drag to move it anywhere in its region (the
// parent clamps to floor/wall), tap to put away. Two layers — the contact
// shadow stays on the ground plane while the sprite lifts above it.
export function DraggableDecoration({ rowId, image, pos, kind, depthScale, sceneSize, shadow, onDragActive, onDrop, onTap }: Props) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const lift = useSharedValue(0)
  const land = useSharedValue(1)
  const grow = useSharedValue(1)
  const posKey = `${pos.x.toFixed(3)},${pos.y.toFixed(3)}`
  const prevKey = useRef(posKey)
  const prevImage = useRef(image)

  useEffect(() => {
    if (posKey !== prevKey.current) {
      prevKey.current = posKey
      land.value = withSequence(
        withTiming(0.85, { duration: 90 }),
        withSpring(1, { damping: 6, stiffness: 220 })
      )
    }
  }, [posKey, land])

  // Grow up from the ground when the sprite advances a stage.
  useEffect(() => {
    if (image !== prevImage.current) {
      prevImage.current = image
      grow.value = 0.55
      grow.value = withSpring(1, { damping: 9, stiffness: 120, mass: 0.9 })
    }
  }, [image, grow])

  const pan = Gesture.Pan()
    .minDistance(6)
    .onStart(() => {
      lift.value = withTiming(1, { duration: 140 })
      runOnJS(onDragActive)(true)
    })
    .onUpdate((e) => {
      tx.value = e.translationX
      ty.value = e.translationY
    })
    .onEnd((e) => {
      const fx = pos.x + e.translationX / sceneSize
      const fy = pos.y + e.translationY / sceneSize
      runOnJS(onDrop)(rowId, fx, fy)
    })
    .onFinalize(() => {
      lift.value = withTiming(0, { duration: 160 })
      tx.value = 0
      ty.value = 0
      runOnJS(onDragActive)(false)
    })

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)(rowId)
  })

  const gesture = Gesture.Exclusive(pan, tap)

  const wrapperStyle = useAnimatedStyle(() => ({
    zIndex: lift.value > 0 ? 99 : undefined,
  }))

  // Shadow tracks the finger on the ground plane
  const shadowLayerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }))

  // Wall sprites are skewed to lie in the receding wall plane (~31° matches
  // the room art's wall lines); left wall tilts up-right, right wall down-right.
  const wallSkew = kind === 'wall' ? (wallSide(pos) === 'left' ? '-31deg' : '31deg') : null

  // Sprite tracks the finger but hovers above the shadow while lifted
  const spriteLayerStyle = useAnimatedStyle(() => {
    const transform: any[] = [
      { translateX: tx.value },
      { translateY: ty.value - lift.value * HOVER_PX },
      { scale: (1 + lift.value * 0.08) * land.value * grow.value },
    ]
    if (wallSkew) {
      transform.push({ skewY: wallSkew }, { scaleX: 0.92 })
    }
    return { transform }
  })

  const w = DECORATION_WIDTH * depthScale
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: `${(pos.x - w / 2) * 100}%`,
            top: `${(pos.y - w) * 100}%`,
            width: `${w * 100}%`,
            aspectRatio: 1,
          },
          wrapperStyle,
        ]}
      >
        {kind === 'floor' && shadow && (
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, shadowLayerStyle]}>
            <ContactShadow lift={lift} spec={shadow} />
          </Animated.View>
        )}
        <Animated.View style={[{ width: '100%', height: '100%', transformOrigin: '50% 100%' }, spriteLayerStyle]}>
          <Animated.Image source={image} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  )
}
