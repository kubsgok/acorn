import { Pressable, StyleSheet } from 'react-native'
import { colors, pressedOpacity, radius } from '@/theme'
import AppleSignIn from '../../../assets/svg/apple-sign-in.svg'
import GoogleLogo from '../../../assets/svg/google-logo.svg'

type Props = {
  provider: 'apple' | 'google'
  /** Accessible name, e.g. "Continue with Apple". */
  label: string
  onPress: () => void
}

export function SocialButton({ provider, label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        provider === 'google' && styles.google,
        pressed && styles.pressed,
      ]}
    >
      {provider === 'apple' ? <AppleSignIn /> : <GoogleLogo />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  google: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.pill,
  },
  pressed: { opacity: pressedOpacity },
})
