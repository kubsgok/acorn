import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../../src/stores/authStore'
import { supabase } from '../../src/lib/supabase'
import { pickImage, extractMedInfo } from '../../src/lib/ocr'

const COLORS = ['#d97706', '#16a34a', '#2563eb', '#9333ea', '#dc2626', '#0891b2']

export default function AddMedication() {
  const user = useAuthStore((s) => s.user)
  const squirrelName = useAuthStore((s) => s.squirrelName)
  const setOnboardingDone = useAuthStore((s) => s.setOnboardingDone)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  function handleScan() {
    Alert.alert('Scan medication label', 'Choose a source', [
      { text: 'Camera', onPress: () => runScan('camera') },
      { text: 'Photo Library', onPress: () => runScan('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function runScan(source: 'camera' | 'gallery') {
    const image = await pickImage(source)
    if (!image) return
    setScanning(true)
    try {
      const result = await extractMedInfo(image.base64)
      if (result.name) setName(result.name)
      if (result.dose) setDose(result.dose)
      if (result.notes) setNotes(result.notes)
      if (result.frequency) await AsyncStorage.setItem('onboarding_frequency', result.frequency)
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Could not read the label.')
    } finally {
      setScanning(false)
    }
  }

  async function handleContinue() {
    if (!name.trim()) { Alert.alert('Add a medication name to continue.'); return }
    if (!user) return
    setLoading(true)

    try {
      // Ensure user profile row exists
      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: user.id, email: user.email, squirrel_name: squirrelName })
      if (userError) { Alert.alert('Error', userError.message); setLoading(false); return }

      // Insert medication
      const { data: med, error } = await supabase
        .from('medications')
        .insert({ user_id: user.id, name: name.trim(), dose: dose.trim() || null, notes: notes.trim() || null, color })
        .select()
        .single()

      if (error) { Alert.alert('Error', error.message); setLoading(false); return }

      // Initialize acorn balance + streak
      await Promise.all([
        supabase.from('acorn_balance').upsert({ user_id: user.id, balance: 0, lifetime_earned: 0 }),
        supabase.from('streaks').upsert({ user_id: user.id, current_streak: 0, longest_streak: 0 }),
      ])

      await AsyncStorage.setItem('onboarding_med_id', med.id)
      router.push('/(onboarding)/set-schedule')
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 48 }}>
        <Text style={{ fontSize: 40 }}>💊</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#1c1917', marginTop: 16 }}>
          Add your first medication
        </Text>
        <Text style={{ fontSize: 15, color: '#78716c', marginTop: 8, marginBottom: 24 }}>
          You can add more later.
        </Text>

        <TouchableOpacity
          onPress={handleScan}
          disabled={scanning}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderWidth: 1.5, borderColor: '#d97706', borderRadius: 12, borderStyle: 'dashed',
            padding: 14, marginBottom: 28, opacity: scanning ? 0.6 : 1,
          }}
        >
          {scanning
            ? <ActivityIndicator size="small" color="#d97706" />
            : <Text style={{ fontSize: 18 }}>📷</Text>
          }
          <Text style={{ color: '#d97706', fontWeight: '600', fontSize: 15 }}>
            {scanning ? 'Scanning label...' : 'Scan medication label'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 6 }}>Medication name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Metformin"
          placeholderTextColor="#a8a29e"
          style={{
            borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
            padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 16
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 6 }}>Dose (optional)</Text>
        <TextInput
          value={dose}
          onChangeText={setDose}
          placeholder="e.g. 500mg"
          placeholderTextColor="#a8a29e"
          style={{
            borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
            padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 16
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 6 }}>Additional info (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Take with food. Prescribed by Dr. Smith."
          placeholderTextColor="#a8a29e"
          multiline
          numberOfLines={3}
          style={{
            borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
            padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 24,
            minHeight: 80, textAlignVertical: 'top',
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 12 }}>Color</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: c,
                borderWidth: color === c ? 3 : 0,
                borderColor: '#1c1917',
              }}
            />
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          style={{
            backgroundColor: '#d97706', borderRadius: 14, padding: 16,
            alignItems: 'center', marginBottom: 16, opacity: loading ? 0.7 : 1
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
