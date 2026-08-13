import { ReactNode } from 'react'
import { View, Text, Pressable, ActivityIndicator, ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'

// Premium onboarding primitives — the RN translation of the high-end design
// language: soft tinted ambient shadows (never gray borders), eyebrow tags,
// a step indicator, and a pill CTA with a "button-in-button" trailing chevron
// that springs on press.

export const PRIMARY = '#b15f00'

// Soft, warm, diffused ambient shadow (replaces flat gray borders on cards).
export const softShadow = {
  shadowColor: '#7a4f2e',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.12,
  shadowRadius: 22,
  elevation: 6,
}

// Warm glow under the primary CTA.
const ctaShadow = {
  shadowColor: PRIMARY,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 6,
}

const SPRING = { damping: 13, stiffness: 220 }

// Microscopic pill-shaped eyebrow above a heading.
export function Eyebrow({ label, bg = '#fef3c7', tint = '#8d4b00' }: { label: string; bg?: string; tint?: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: tint, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  )
}

// Progress indicator — the active step is an elongated pill, past steps filled.
export function StepDots({ step, total, style }: { step: number; total: number; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 6 }, style]}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            borderRadius: 3,
            width: i === step ? 24 : 6,
            backgroundColor: i <= step ? PRIMARY : '#ecdfce',
          }}
        />
      ))}
    </View>
  )
}

// A rounded icon tile with a soft ambient shadow (onboarding hero mark).
export function IconTile({ children, bg = '#fef3c7', size = 72 }: { children: ReactNode; bg?: string; size?: number }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, softShadow]}>
      {children}
    </View>
  )
}

// A spring-press wrapper for tappable cards/pills.
export function PressableScale({ onPress, disabled, style, children }: { onPress?: () => void; disabled?: boolean; style?: ViewStyle | ViewStyle[]; children: ReactNode }) {
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <Animated.View style={[anim, style as ViewStyle]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => { scale.value = withTiming(0.975, { duration: 120, easing: Easing.out(Easing.quad) }) }}
        onPressOut={() => { scale.value = withSpring(1, SPRING) }}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

// Primary CTA: a fully-rounded pill with the label centered and a trailing
// chevron nested in its own translucent circle that shifts on press.
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon = 'arrow-right',
  style,
}: {
  label: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  style?: ViewStyle
}) {
  const scale = useSharedValue(1)
  const shift = useSharedValue(0)
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }))
  const inactive = disabled || loading

  return (
    <Animated.View style={[btnStyle, style]}>
      <Pressable
        onPress={onPress}
        disabled={inactive}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 120, easing: Easing.out(Easing.quad) }); shift.value = withTiming(4, { duration: 180 }) }}
        onPressOut={() => { scale.value = withSpring(1, SPRING); shift.value = withSpring(0, SPRING) }}
        style={[
          {
            backgroundColor: inactive ? '#e7d8c8' : PRIMARY,
            borderRadius: 999,
            paddingVertical: 17,
            paddingHorizontal: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          },
          inactive ? null : ctaShadow,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 }}>{label}</Text>
            <Animated.View
              style={[
                { position: 'absolute', right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
                iconStyle,
              ]}
            >
              <MaterialCommunityIcons name={icon} size={18} color="#fff" />
            </Animated.View>
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}
