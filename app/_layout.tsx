import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { supabase } from '../src/lib/supabase'
import { useAuthStore } from '../src/stores/authStore'

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession)
  const loadAvatar = useAuthStore((s) => s.loadAvatar)

  useEffect(() => {
    loadAvatar()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [setSession])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="medication/new" options={{ gestureEnabled: true }} />
        <Stack.Screen name="chat" options={{ gestureEnabled: true }} />
        <Stack.Screen name="shop" options={{ gestureEnabled: true, presentation: 'modal' }} />
        <Stack.Screen name="tree-shop" options={{ gestureEnabled: true, presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
