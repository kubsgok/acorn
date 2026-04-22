import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/stores/authStore'
import { supabase } from '../../src/lib/supabase'
import { pickImage, extractMedInfo } from '../../src/lib/ocr'

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#6366f1', '#fb923c']

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

  async function handleSkip() {
    if (!user) return
    await Promise.all([
      supabase.from('users').upsert({ id: user.id, email: user.email, squirrel_name: squirrelName }),
      supabase.from('acorn_balance').upsert({ user_id: user.id, balance: 0, lifetime_earned: 0 }, { onConflict: 'user_id' }),
      supabase.from('streaks').upsert({ user_id: user.id, current_streak: 0, longest_streak: 0 }, { onConflict: 'user_id' }),
    ])
    router.push('/(onboarding)/notifications')
  }

  async function handleContinue() {
    if (!name.trim()) { Alert.alert('Add a medication name to continue.'); return }
    if (!user) return
    setLoading(true)

    try {
      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: user.id, email: user.email, squirrel_name: squirrelName })
      if (userError) { Alert.alert('Error', userError.message); return }

      const { data: med, error } = await supabase
        .from('medications')
        .insert({ user_id: user.id, name: name.trim(), dose: dose.trim() || null, notes: notes.trim() || null, color })
        .select().single()

      if (error) { Alert.alert('Error', error.message); return }

      await Promise.all([
        supabase.from('acorn_balance').upsert({ user_id: user.id, balance: 0, lifetime_earned: 0 }, { onConflict: 'user_id' }),
        supabase.from('streaks').upsert({ user_id: user.id, current_streak: 0, longest_streak: 0 }, { onConflict: 'user_id' }),
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 56, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{
          width: 72, height: 72, borderRadius: 24,
          backgroundColor: '#fef3c7',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <MaterialCommunityIcons name="pill" size={34} color="#b15f00" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.3 }}>
          Add your first medication
        </Text>
        <Text style={{ fontSize: 15, color: '#554336', marginTop: 8, marginBottom: 32, lineHeight: 22 }}>
          You can add more later in Settings.
        </Text>

        {/* Scan button */}
        <TouchableOpacity
          onPress={handleScan}
          disabled={scanning}
          activeOpacity={0.85}
          style={{
            height: 100, borderWidth: 2, borderColor: '#dbc2b0', borderStyle: 'dashed',
            borderRadius: 16, backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 28, opacity: scanning ? 0.6 : 1,
          }}
        >
          {scanning
            ? <ActivityIndicator size="large" color="#b15f00" />
            : <>
                <MaterialCommunityIcons name="camera-outline" size={28} color="#b15f00" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#b15f00' }}>Scan Label</Text>
              </>
          }
        </TouchableOpacity>

        {/* Name */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginBottom: 8, marginLeft: 4 }}>
          Medication name
        </Text>
        <TextInput
          value={name} onChangeText={setName}
          placeholder="e.g. Metformin" placeholderTextColor="#a8a29e"
          style={{
            backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
            fontSize: 15, color: '#1f1b17', marginBottom: 16,
          }}
        />

        {/* Dose */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginBottom: 8, marginLeft: 4 }}>
          Dose (optional)
        </Text>
        <TextInput
          value={dose} onChangeText={setDose}
          placeholder="e.g. 500mg" placeholderTextColor="#a8a29e"
          style={{
            backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
            fontSize: 15, color: '#1f1b17', marginBottom: 16,
          }}
        />

        {/* Notes */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginBottom: 8, marginLeft: 4 }}>
          Additional info (optional)
        </Text>
        <TextInput
          value={notes} onChangeText={setNotes}
          placeholder="e.g. Take with food. Prescribed by Dr. Smith."
          placeholderTextColor="#a8a29e"
          multiline numberOfLines={3}
          style={{
            backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
            fontSize: 15, color: '#1f1b17', minHeight: 88,
            textAlignVertical: 'top', marginBottom: 24,
          }}
        />

        {/* Color */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginBottom: 12, marginLeft: 4 }}>
          Color
        </Text>
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#dbc2b0',
          padding: 16, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 36,
        }}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: c,
                borderWidth: color === c ? 3 : 0,
                borderColor: '#fff',
                shadowColor: color === c ? c : 'transparent',
                shadowOpacity: color === c ? 0.6 : 0,
                shadowRadius: 6, elevation: color === c ? 4 : 0,
              }}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#b15f00', borderRadius: 20,
            paddingVertical: 16, alignItems: 'center',
            opacity: loading ? 0.7 : 1,
            shadowColor: '#b15f00', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={{ padding: 12, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#a8a29e', fontSize: 14, fontWeight: '600' }}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
