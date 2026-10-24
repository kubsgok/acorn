import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { colors, spacing, typography } from '@/theme'
import { useCanvasScale } from './canvas'
import { TermsNotice } from './TermsNotice'
import { WelcomeHero } from './WelcomeHero'

/** Figma: heading top edge, and gap from the buttons' bottom edge to the frame bottom (minus safe area). */
const HEADING_TOP = 367
const BOTTOM_GAP = 76

export function WelcomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const scale = useCanvasScale()

  return (
    <View style={styles.root}>
      <WelcomeHero />
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: HEADING_TOP * scale, paddingBottom: insets.bottom + BOTTOM_GAP },
        ]}
      >
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('welcome.title')}
          </Text>
          <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
        </View>
        <View style={styles.actions}>
          <TermsNotice />
          <View style={styles.buttons}>
            <Button label={t('welcome.createAccount')} onPress={() => router.push('/register')} />
            <Button
              label={t('welcome.logIn')}
              variant="outline"
              onPress={() => router.push('/login')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  intro: { gap: 13 },
  title: { ...typography.heading, color: colors.textStrong, textAlign: 'center' },
  subtitle: { ...typography.bodyLarge, color: colors.textBody, textAlign: 'center' },
  actions: { gap: spacing.xl, marginTop: spacing['3xl'] },
  buttons: { gap: 15 },
})
