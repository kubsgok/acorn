import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'
import { useT } from '../../src/lib/i18n'
import { syncMedicationReminders } from '../../src/lib/notifications'
import { Eyebrow, IconTile, StepDots, PrimaryButton, softShadow } from '../../src/components/onboardingUI'

const BULLETS = [
  { icon: 'clock-outline' as const, key: 'notif.b1' },
  { icon: 'bell-ring-outline' as const, key: 'notif.b2' },
  { icon: 'tune-variant' as const, key: 'notif.b3' },
]

export default function NotificationsScreen() {
  const { t } = useT()
  const user = useAuthStore((s) => s.user)
  const setOnboardingDone = useAuthStore((s) => s.setOnboardingDone)
  const addAcorns = useAcornStore((s) => s.addAcorns)
  const squirrelName = useAuthStore((s) => s.squirrelName)

  async function handleAllow() {
    await Notifications.requestPermissionsAsync()
    if (user) syncMedicationReminders(user.id) // schedule reminders now that we (may) have permission
    await finish()
  }

  async function finish() {
    if (user) await addAcorns(user.id, 10)
    await AsyncStorage.setItem('onboarding_done', 'true')
    setOnboardingDone(true)
    router.replace('/(onboarding)/forest-intro')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 56 }}>

        {/* Header */}
        <StepDots step={4} total={5} style={{ marginBottom: 28 }} />
        <Animated.View entering={FadeInDown.duration(600)}>
          <IconTile><MaterialCommunityIcons name="bell-outline" size={34} color="#b15f00" /></IconTile>
          <View style={{ marginTop: 22 }}>
            <Eyebrow label={t('ob.step', { n: 5, total: 5 })} />
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.5 }}>
            {t('notif.title', { name: squirrelName })}
          </Text>
          <Text style={{ fontSize: 15, color: '#554336', marginTop: 8, marginBottom: 32, lineHeight: 22 }}>
            {t('notif.subtitle', { name: squirrelName })}
          </Text>
        </Animated.View>

        {/* Info card */}
        <Animated.View entering={FadeInDown.duration(600).delay(140)} style={[{
          backgroundColor: '#fff', borderRadius: 20, padding: 20,
          marginBottom: 20, gap: 16,
        }, softShadow]}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#554336', letterSpacing: 0.3, textTransform: 'uppercase' }}>
            {t('notif.whatToExpect')}
          </Text>
          {BULLETS.map((b) => (
            <View key={b.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: '#fef3c7',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <MaterialCommunityIcons name={b.icon} size={18} color="#b15f00" />
              </View>
              <Text style={{ fontSize: 14, color: '#554336', flex: 1, lineHeight: 20 }}>{t(b.key)}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Bonus acorn reward */}
        <Animated.View entering={FadeInDown.duration(600).delay(240)} style={{
          backgroundColor: '#fef3c7', borderRadius: 16, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32,
        }}>
          <Text style={{ fontSize: 24 }}>🌰</Text>
          <Text style={{ fontSize: 14, color: '#8d4b00', fontWeight: '600', flex: 1 }}>
            {t('notif.bonus')}
          </Text>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <PrimaryButton label={t('notif.allow')} onPress={handleAllow} icon="bell-ring-outline" style={{ marginBottom: 12 }} />

        <TouchableOpacity onPress={finish} style={{ padding: 12, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#a8a29e', fontSize: 14, fontWeight: '600' }}>{t('notif.skip')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
