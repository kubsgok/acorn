import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, controlHeight, pressedOpacity, radius, typography } from '@/theme'

type Props = {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline'
  loading?: boolean
  disabled?: boolean
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled }: Props) {
  const inactive = disabled || loading
  const outline = variant === 'outline'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.primary,
        (pressed || inactive) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : colors.onPrimary} />
      ) : (
        <Text style={[styles.label, { color: outline ? colors.primary : colors.onPrimary }]}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    height: controlHeight,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary },
  dimmed: { opacity: pressedOpacity },
  label: typography.button,
})
