import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'

interface Med { id: string; name: string; dose: string | null; color: string; schedules: { id: string; time_of_day: string }[] }

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const squirrelName = useAuthStore((s) => s.squirrelName)
  const setSquirrelName = useAuthStore((s) => s.setSquirrelName)
  const signOut = useAuthStore((s) => s.signOut)
  const [meds, setMeds] = useState<Med[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  function openNameEdit() {
    setNameInput(squirrelName)
    setEditingName(true)
  }

  async function saveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) { Alert.alert('Enter a name.'); return }
    if (!user) return
    await supabase.from('users').update({ squirrel_name: trimmed }).eq('id', user.id)
    setSquirrelName(trimmed)
    setEditingName(false)
  }

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
        <TouchableOpacity
          onPress={openNameEdit}
          style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e7e5e4', marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text style={{ fontSize: 13, color: '#a8a29e', marginBottom: 4 }}>Your squirrel</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1917' }}>🐿️ {squirrelName}</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#d97706', fontWeight: '600' }}>Edit</Text>
        </TouchableOpacity>

        {/* Edit name modal */}
        <Modal visible={editingName} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 28 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1917', marginBottom: 4 }}>Rename your squirrel</Text>
              <Text style={{ fontSize: 14, color: '#78716c', marginBottom: 20 }}>What would you like to call them?</Text>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={20}
                placeholderTextColor="#a8a29e"
                placeholder="Enter a name..."
                style={{ borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fdf8f0', marginBottom: 20 }}
              />
              <TouchableOpacity
                onPress={saveName}
                style={{ backgroundColor: '#d97706', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#a8a29e' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
