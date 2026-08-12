import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'
import { useT } from '../../src/lib/i18n'

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
        <View style={{
          width: 72, height: 72, borderRadius: 24,
          backgroundColor: '#fef3c7',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <MaterialCommunityIcons name="bell-outline" size={34} color="#b15f00" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.3 }}>
          {t('notif.title', { name: squirrelName })}
        </Text>
        <Text style={{ fontSize: 15, color: '#554336', marginTop: 8, marginBottom: 32, lineHeight: 22 }}>
          {t('notif.subtitle', { name: squirrelName })}
        </Text>

        {/* Info card */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, padding: 20,
          borderWidth: 1, borderColor: '#dbc2b0', marginBottom: 40, gap: 16,
        }}>
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
        </View>

        {/* Bonus acorn reward */}
        <View style={{
          backgroundColor: '#fef3c7', borderRadius: 14, padding: 14,
          flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32,
        }}>
          <Text style={{ fontSize: 24 }}>🌰</Text>
          <Text style={{ fontSize: 14, color: '#8d4b00', fontWeight: '600', flex: 1 }}>
            {t('notif.bonus')}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={handleAllow}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#b15f00', borderRadius: 20,
            paddingVertical: 16, alignItems: 'center', marginBottom: 12,
            shadowColor: '#b15f00', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('notif.allow')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={finish} style={{ padding: 12, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#a8a29e', fontSize: 14, fontWeight: '600' }}>{t('notif.skip')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
