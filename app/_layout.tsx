import '@/i18n'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import { useAppFonts } from '@/theme'

void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const { status } = useAuth()
  const fontsReady = useAppFonts()
  const ready = fontsReady && status !== 'loading'

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  const signedIn = status === 'signedIn'
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* Auth gate: each group is only reachable in its own state. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(public)" />
        </Stack.Protected>
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
