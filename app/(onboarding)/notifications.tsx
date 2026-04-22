import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'

export default function NotificationsScreen() {
  const user = useAuthStore((s) => s.user)
  const setOnboardingDone = useAuthStore((s) => s.setOnboardingDone)
  const addAcorns = useAcornStore((s) => s.addAcorns)
  const squirrelName = useAuthStore((s) => s.squirrelName)

  async function handleAllow() {
    await Notifications.requestPermissionsAsync()
    await finish()
  }

  async function handleSkip() {
    await finish()
  }

  async function finish() {
    if (user) await addAcorns(user.id, 10)
    await AsyncStorage.setItem('onboarding_done', 'true')
    setOnboardingDone(true)
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 48 }}>
        <Text style={{ fontSize: 40 }}>🔔</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#1c1917', marginTop: 16 }}>
          Let {squirrelName} nudge you
        </Text>
        <Text style={{ fontSize: 15, color: '#78716c', marginTop: 8, marginBottom: 40, lineHeight: 24 }}>
          {squirrelName} will send you a reminder when it's time to take your medication, and check in if you haven't logged it yet.
        </Text>

        <View style={{
          backgroundColor: '#fff', borderRadius: 16, padding: 20,
          borderWidth: 1, borderColor: '#e7e5e4', marginBottom: 32
        }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 8 }}>
            What to expect:
          </Text>
          <Text style={{ fontSize: 14, color: '#78716c', lineHeight: 22 }}>
            • A reminder at your scheduled time{'\n'}
            • A follow-up 2 hours later if you haven't logged it{'\n'}
            • No more than 2 notifications per medication per day
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={handleAllow}
          style={{ backgroundColor: '#d97706', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Allow notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={{ padding: 12, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#a8a29e', fontSize: 14 }}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
