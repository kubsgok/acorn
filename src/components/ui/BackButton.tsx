import { Pressable, StyleSheet, View } from 'react-native'
import { minTouchTarget } from '@/theme'
import BackChevron from '../../../assets/svg/back-chevron.svg'

// Figma navigation bar height (Login frame 141:370).
const NAV_HEIGHT = 64

type Props = {
  /** Accessible name, e.g. "Go back". */
  label: string
  onPress: () => void
}

/** Top navigation row with the back chevron. */
export function BackButton({ label, onPress }: Props) {
  return (
    <View style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={styles.back}
      >
        <BackChevron />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  nav: { height: NAV_HEIGHT, justifyContent: 'center' },
  back: { width: minTouchTarget, height: minTouchTarget, justifyContent: 'center' },
})
