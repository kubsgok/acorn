import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, typography } from '@/theme'

// Link text is ~17pt tall; the extra slop brings the tap target to the 44pt minimum.
const HIT_SLOP = { top: 14, bottom: 14, left: 12, right: 12 }

type Props = {
  label: string
  onPress: () => void
  strong?: boolean
}

export function TextLink({ label, onPress, strong = false }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={HIT_SLOP}
      onPress={onPress}
    >
      <Text style={strong ? styles.strong : styles.regular}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  regular: { ...typography.link, color: colors.link },
  strong: { ...typography.linkStrong, color: colors.link },
})
