import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Screen } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { colors, spacing, typography } from '@/theme'

/** Placeholder signed-in screen; replaced by the real home in a later feature. */
export function HomeScreen() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const router = useRouter()

  const [failed, setFailed] = useState(false)

  async function handleSignOut() {
    setFailed(false)
    // If sign-out fails (e.g. offline) the session is still active, so say so instead of pretending.
    const error = await signOut()
    if (error) setFailed(true)
    else router.replace('/')
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        {t('home.title')}
      </Text>
      {failed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('home.signOutFailed')}
        </Text>
      ) : null}
      <Button label={t('home.signOut')} variant="outline" onPress={handleSignOut} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: { ...typography.label, color: colors.error, marginBottom: spacing.lg },
  title: { ...typography.heading, color: colors.textStrong, marginVertical: spacing['3xl'] },
})
