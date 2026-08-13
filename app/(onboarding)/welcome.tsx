import { View, Text } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useT } from '../../src/lib/i18n'
import { Eyebrow, IconTile, PrimaryButton, softShadow } from '../../src/components/onboardingUI'

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
        <Animated.View entering={FadeInDown.duration(700)} style={{ alignItems: 'center', marginBottom: 48 }}>
          <IconTile bg="#fef3c7" size={100}>
            <Text style={{ fontSize: 54 }}>🐿️</Text>
          </IconTile>
          <View style={{ marginTop: 22, alignItems: 'center' }}>
            <Eyebrow label={t('ob.welcomeTag')} />
          </View>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.8, textAlign: 'center' }}>
            {t('welcome.title')}
          </Text>
          <Text style={{ fontSize: 16, color: '#554336', marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
            {t('welcome.subtitle')}
          </Text>
        </Animated.View>

        {/* Feature list — soft floating cards, staggered entry */}
        <View style={{ gap: 12, marginBottom: 44 }}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.key}
              entering={FadeInDown.duration(600).delay(180 + i * 110)}
              style={[{
                flexDirection: 'row', alignItems: 'center', gap: 16,
                backgroundColor: '#fff', borderRadius: 20, padding: 16,
              }, softShadow]}
            >
              <View style={{
                width: 46, height: 46, borderRadius: 15,
                backgroundColor: f.bg,
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={{ fontSize: 14, color: '#1f1b17', fontWeight: '500', flex: 1, lineHeight: 20 }}>
                {t(f.key)}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.duration(600).delay(520)}>
          <PrimaryButton label={t('welcome.cta')} onPress={() => router.push('/(onboarding)/about-you')} />
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
