import { Linking, StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { config } from '@/lib/config'
import { colors, typography } from '@/theme'

/** "By joining Acorn Labs, you agree to <link>…" — the link only opens a validated https URL. */
export function TermsNotice() {
  const { t } = useTranslation()
  const url = config.termsUrl
  return (
    <Text style={styles.text}>
      {t('welcome.terms.prefix')}
      <Text
        style={styles.link}
        accessibilityRole={url ? 'link' : undefined}
        onPress={url ? () => void Linking.openURL(url) : undefined}
      >
        {t('welcome.terms.link')}
      </Text>
      {t('welcome.terms.suffix')}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: { ...typography.caption, color: colors.textSubtle },
  link: { color: colors.primary, textDecorationLine: 'underline' },
})
