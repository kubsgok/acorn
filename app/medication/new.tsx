import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { pickImage, extractMedInfo } from '../../src/lib/ocr'

const COLORS = [
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#f43f5e', // rose-500
  '#6366f1', // indigo-500
  '#fb923c', // orange-400
]

const DAYS = [
  { label: 'Su', value: 0 },
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
]

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
}

function formatDisplayTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function defaultTime(hour = 8) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d
}

export default function NewMedication() {
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [times, setTimes] = useState<Date[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  const isAllDays = selectedDays.length === 7

  function toggleDay(day: number) {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day).sort((a, b) => a - b))
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b))
    }
  }

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
      if (result.frequency === 'daily') setSelectedDays([0, 1, 2, 3, 4, 5, 6])
      else if (result.frequency === 'weekdays') setSelectedDays([1, 2, 3, 4, 5])
      else if (result.frequency === 'weekends') setSelectedDays([0, 6])
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Could not read the label.')
    } finally {
      setScanning(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Enter a medication name.'); return }
    if (selectedDays.length === 0) { Alert.alert('Select at least one day', 'Choose which days you take this medication.'); return }
    if (!user) return
    setLoading(true)

    const { data: med, error } = await supabase
      .from('medications')
      .insert({
        user_id: user.id,
        name: name.trim(),
        dose: dose.trim() || null,
        notes: notes.trim() || null,
        color,
        days_of_week: JSON.stringify(selectedDays),
      })
      .select().single()

    if (error) { Alert.alert('Error', error.message); setLoading(false); return }

    if (times.length > 0) {
      const rows = times.map((t) => ({ medication_id: med.id, time_of_day: toTimeString(t) }))
      await supabase.from('medication_schedules').insert(rows)
    }

    setLoading(false)
    router.back()
  }

  const canSave = name.trim().length > 0 && selectedDays.length > 0 && !loading

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#e7e5e4',
        backgroundColor: '#fff8f5',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#78716c" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#b15f00' }}>Add Medication</Text>
        </View>
        <MaterialCommunityIcons name="help-circle-outline" size={22} color="#78716c" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Scan Label button */}
        <TouchableOpacity
          onPress={handleScan}
          disabled={scanning}
          activeOpacity={0.85}
          style={{
            height: 120,
            borderWidth: 2, borderColor: '#dbc2b0', borderStyle: 'dashed',
            borderRadius: 16, backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 28, opacity: scanning ? 0.6 : 1,
          }}
        >
          {scanning
            ? <ActivityIndicator size="large" color="#b15f00" />
            : <>
                <MaterialCommunityIcons name="camera-outline" size={32} color="#b15f00" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#b15f00' }}>Scan Label</Text>
              </>
          }
        </TouchableOpacity>

        {/* Basic info */}
        <View style={{ gap: 16, marginBottom: 24 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginLeft: 4 }}>
              Medication Name
            </Text>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="e.g. Vitamin D3" placeholderTextColor="#a8a29e"
              style={{
                backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 15, color: '#1f1b17',
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginLeft: 4 }}>
              Dose
            </Text>
            <TextInput
              value={dose} onChangeText={setDose}
              placeholder="e.g. 1000 IU" placeholderTextColor="#a8a29e"
              style={{
                backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 15, color: '#1f1b17',
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginLeft: 4 }}>
              Additional info / notes
            </Text>
            <TextInput
              value={notes} onChangeText={setNotes}
              placeholder="Take with food, avoid caffeine..."
              placeholderTextColor="#a8a29e"
              multiline numberOfLines={3}
              style={{
                backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 15, color: '#1f1b17', minHeight: 88, textAlignVertical: 'top',
              }}
            />
          </View>
        </View>

        {/* Color picker */}
        <View style={{ gap: 10, marginBottom: 24 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginLeft: 4 }}>
            Color
          </Text>
          <View style={{
            backgroundColor: '#fff', borderRadius: 20,
            borderWidth: 1, borderColor: '#dbc2b0',
            padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {COLORS.map((c) => {
              const active = color === c
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: c,
                    borderWidth: active ? 3 : 0,
                    borderColor: '#fff',
                    shadowColor: active ? c : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: active ? 0.6 : 0,
                    shadowRadius: 6,
                    elevation: active ? 4 : 0,
                  }}
                />
              )
            })}
          </View>
        </View>

        {/* Day picker */}
        <View style={{ gap: 10, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginLeft: 4 }}>
              Day Picker
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
              style={{
                backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#b15f00' }}>Every day</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {DAYS.map(({ label, value }) => {
              const active = selectedDays.includes(value)
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => toggleDay(value)}
                  style={{
                    flex: 1, aspectRatio: 1, borderRadius: 999,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: active ? '#d97706' : '#fff',
                    borderWidth: 1,
                    borderColor: active ? '#d97706' : '#dbc2b0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : '#a8a29e' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Notification times */}
        <View style={{ gap: 10, marginBottom: 32 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginLeft: 4 }}>
            Notification Times
          </Text>

          <View style={{ gap: 8 }}>
            {times.map((time, index) => (
              <View key={index}>
                <View style={{
                  backgroundColor: '#fff', borderRadius: 14,
                  borderWidth: 1, borderColor: '#dbc2b0',
                  paddingHorizontal: 16, paddingVertical: 14,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <TouchableOpacity
                    onPress={() => setEditingIndex(editingIndex === index ? null : index)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
                  >
                    <MaterialCommunityIcons name="clock-outline" size={22} color="#b15f00" />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f1b17' }}>
                      {formatDisplayTime(time)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setTimes((p) => p.filter((_, i) => i !== index))
                      if (editingIndex === index) setEditingIndex(null)
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="minus-circle-outline" size={22} color="#ba1a1a" />
                  </TouchableOpacity>
                </View>
                {editingIndex === index && (
                  <DateTimePicker
                    value={time} mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, date) => {
                      if (date) setTimes((p) => p.map((t, i) => i === index ? date : t))
                    }}
                    style={{ backgroundColor: '#fff' }}
                  />
                )}
              </View>
            ))}

            {/* Add notification button */}
            <TouchableOpacity
              onPress={() => setTimes((p) => [...p, defaultTime(8 + p.length * 8)])}
              style={{
                borderWidth: 1.5, borderColor: '#dbc2b0', borderStyle: 'dashed',
                borderRadius: 14, paddingVertical: 14,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: '#fcf2eb',
              }}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#554336" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3 }}>
                Add Notification
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#b15f00', borderRadius: 20,
            paddingVertical: 16, alignItems: 'center',
            opacity: canSave ? 1 : 0.4,
            shadowColor: '#b15f00', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
            {loading ? 'Saving...' : 'Save Medication'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
