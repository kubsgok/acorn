import { useEffect } from 'react'
import { Redirect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../src/stores/authStore'
import { useState } from 'react'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const session = useAuthStore((s) => s.session)
  const setOnboardingDone = useAuthStore((s) => s.setOnboardingDone)
  const onboardingDone = useAuthStore((s) => s.onboardingDone)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setOnboardingDone(val === 'true')
      setLoading(false)
    })
  }, [setOnboardingDone])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf8f0' }}>
        <ActivityIndicator color="#d97706" />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/login" />
  if (!onboardingDone) return <Redirect href="/(onboarding)/welcome" />
  return <Redirect href="/(tabs)" />
}
