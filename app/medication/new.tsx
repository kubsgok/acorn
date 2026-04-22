import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { pickImage, extractMedInfo } from '../../src/lib/ocr'

const COLORS = ['#d97706', '#16a34a', '#2563eb', '#9333ea', '#dc2626', '#0891b2']

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function NewMedication() {
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [times, setTimes] = useState<Date[]>([new Date()])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
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
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Could not read the label.')
    } finally {
      setScanning(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Enter a medication name.'); return }
    if (!user) return
    setLoading(true)

    const { data: med, error } = await supabase
      .from('medications')
      .insert({ user_id: user.id, name: name.trim(), dose: dose.trim() || null, notes: notes.trim() || null, color })
      .select().single()

    if (error) { Alert.alert('Error', error.message); setLoading(false); return }

    const rows = times.map((t) => ({ medication_id: med.id, time_of_day: toTimeString(t) }))
    await supabase.from('medication_schedules').insert(rows)

    setLoading(false)
    router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#d97706', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1917' }}>Add Medication</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <TouchableOpacity
          onPress={handleScan}
          disabled={scanning}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderWidth: 1.5, borderColor: '#d97706', borderRadius: 12, borderStyle: 'dashed',
            padding: 14, marginTop: 8, marginBottom: 20, opacity: scanning ? 0.6 : 1,
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

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 6, marginTop: 4 }}>Name</Text>
        <TextInput
          value={name} onChangeText={setName}
          placeholder="e.g. Metformin" placeholderTextColor="#a8a29e"
          style={{ borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 16 }}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 6 }}>Dose (optional)</Text>
        <TextInput
          value={dose} onChangeText={setDose}
          placeholder="e.g. 500mg" placeholderTextColor="#a8a29e"
          style={{ borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 16 }}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 6 }}>Additional info (optional)</Text>
        <TextInput
          value={notes} onChangeText={setNotes}
          placeholder="e.g. Take with food. Prescribed by Dr. Smith."
          placeholderTextColor="#a8a29e"
          multiline
          numberOfLines={3}
          style={{
            borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
            padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 20,
            minHeight: 80, textAlignVertical: 'top',
          }}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 12 }}>Color</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          {COLORS.map((c) => (
            <TouchableOpacity key={c} onPress={() => setColor(c)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#1c1917' }}
            />
          ))}
        </View>

        <Text style={{ fontSize: 13, fontWeight: '600', color: '#44403c', marginBottom: 12 }}>Schedule</Text>
        {times.map((time, index) => (
          <View key={index} style={{ marginBottom: 12 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e7e5e4'
            }}>
              <TouchableOpacity onPress={() => setEditingIndex(editingIndex === index ? null : index)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1917' }}>{formatTime(time)}</Text>
                <Text style={{ fontSize: 12, color: '#a8a29e', marginTop: 2 }}>Tap to change</Text>
              </TouchableOpacity>
              {times.length > 1 && (
                <TouchableOpacity onPress={() => setTimes((p) => p.filter((_, i) => i !== index))}>
                  <Text style={{ color: '#dc2626', fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingIndex === index && (
              <DateTimePicker
                value={time} mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => { if (date) setTimes((p) => p.map((t, i) => i === index ? date : t)) }}
                style={{ backgroundColor: '#fff' }}
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          onPress={() => setTimes((p) => [...p, new Date()])}
          style={{ borderWidth: 1.5, borderColor: '#d97706', borderRadius: 12, borderStyle: 'dashed', padding: 14, alignItems: 'center', marginBottom: 32 }}
        >
          <Text style={{ color: '#d97706', fontWeight: '600' }}>+ Add another time</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave} disabled={loading}
          style={{ backgroundColor: '#d97706', borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{loading ? 'Saving...' : 'Save medication'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
