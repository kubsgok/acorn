import { View, Text } from 'react-native'
import { useT } from '../lib/i18n'

// Shared explainer content for the tree-forest feature. Used both as an
// onboarding step and as the (i) info modal on the Forest tab.
export function ForestIntroContent() {
  const { t } = useT()
  const rows = [
    { emoji: '🌱', title: t('intro.forest.r1t'), body: t('intro.forest.r1b') },
    { emoji: '🌰', title: t('intro.forest.r2t'), body: t('intro.forest.r2b') },
    { emoji: '🌳', title: t('intro.forest.r3t'), body: t('intro.forest.r3b') },
  ]
  return (
    <View>
      <Text style={{ fontSize: 40, textAlign: 'center' }}>🌲</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#1f1b17', textAlign: 'center', marginTop: 8 }}>
        {t('intro.forest.title')}
      </Text>
      <Text style={{ fontSize: 14, color: '#78716c', textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 }}>
        {t('intro.forest.lead')}
      </Text>
      <View style={{ gap: 16 }}>
        {rows.map((r) => (
          <View key={r.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 26 }}>{r.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1f1b17' }}>{r.title}</Text>
              <Text style={{ fontSize: 13, color: '#554336', marginTop: 2, lineHeight: 19 }}>{r.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
