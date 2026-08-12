import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useT } from '../../src/lib/i18n'

const FEATURES = [
  { icon: 'pill' as const, color: '#b15f00', bg: '#fef3c7', key: 'welcome.f1' },
  { icon: 'tree-outline' as const, color: '#006e2d', bg: '#dcfce7', key: 'welcome.f2' },
  { icon: 'chat-outline' as const, color: '#0058be', bg: '#dbeafe', key: 'welcome.f3' },
]

export default function Welcome() {
  const { t } = useT()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}>

        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 32,
            backgroundColor: '#fef3c7',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            shadowColor: '#b15f00', shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
          }}>
            <Text style={{ fontSize: 54 }}>🐿️</Text>
          </View>
          <Text style={{ fontSize: 34, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.5, textAlign: 'center' }}>
            {t('welcome.title')}
          </Text>
          <Text style={{ fontSize: 16, color: '#554336', marginTop: 10, textAlign: 'center', lineHeight: 24 }}>
            {t('welcome.subtitle')}
          </Text>
        </View>

        {/* Feature list */}
        <View style={{ gap: 12, marginBottom: 48 }}>
          {FEATURES.map((f) => (
            <View key={f.key} style={{
              flexDirection: 'row', alignItems: 'center', gap: 16,
              backgroundColor: '#fff', borderRadius: 16,
              borderWidth: 1, borderColor: '#dbc2b0',
              padding: 16,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: f.bg,
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={{ fontSize: 14, color: '#1f1b17', fontWeight: '500', flex: 1, lineHeight: 20 }}>
                {t(f.key)}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/about-you')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#b15f00', borderRadius: 20,
            paddingVertical: 18, alignItems: 'center',
            shadowColor: '#b15f00', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>{t('welcome.cta')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
