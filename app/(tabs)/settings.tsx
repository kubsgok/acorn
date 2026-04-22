import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'

interface Med { id: string; name: string; dose: string | null; color: string; schedules: { id: string; time_of_day: string }[] }

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const squirrelName = useAuthStore((s) => s.squirrelName)
  const signOut = useAuthStore((s) => s.signOut)
  const [meds, setMeds] = useState<Med[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => { loadMeds() }, []))

  async function loadMeds() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('medications')
      .select('*, schedules:medication_schedules(*)')
      .eq('user_id', user.id)
      .order('created_at')
    setMeds((data as Med[]) ?? [])
    setLoading(false)
  }

  async function deleteMed(id: string) {
    Alert.alert('Delete medication?', 'This will remove all logs and schedules for this medication.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('medications').delete().eq('id', id)
          setMeds((prev) => prev.filter((m) => m.id !== id))
        }
      }
    ])
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/(auth)/login')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1c1917', marginBottom: 24 }}>Settings</Text>

        {/* Squirrel */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e7e5e4', marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: '#a8a29e', marginBottom: 4 }}>Your squirrel</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1917' }}>🐿️ {squirrelName}</Text>
        </View>

        {/* Medications */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1917' }}>Medications</Text>
            <TouchableOpacity onPress={() => router.push('/medication/new')}>
              <Text style={{ color: '#d97706', fontWeight: '600', fontSize: 14 }}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator color="#d97706" /> : meds.length === 0 ? (
            <Text style={{ color: '#a8a29e', fontSize: 14 }}>No medications added yet.</Text>
          ) : (
            meds.map((med) => (
              <View key={med.id} style={{
                backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
                borderWidth: 1, borderColor: '#e7e5e4', borderLeftWidth: 4, borderLeftColor: med.color
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 15, color: '#1c1917' }}>{med.name}</Text>
                    {med.dose && <Text style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>{med.dose}</Text>}
                    <Text style={{ fontSize: 12, color: '#a8a29e', marginTop: 4 }}>
                      {med.schedules.map((s) => s.time_of_day.slice(0, 5)).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteMed(med.id)} style={{ padding: 4 }}>
                    <Text style={{ color: '#dc2626', fontSize: 18 }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{ borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 14, padding: 14, alignItems: 'center' }}
        >
          <Text style={{ color: '#dc2626', fontWeight: '600' }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
