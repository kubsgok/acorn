import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'

const DAYS = [
  { label: 'Su', value: 0 },
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
]

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
}

function defaultTime(hour = 8) {
  const d = new Date(); d.setHours(hour, 0, 0, 0); return d
}

export default function SetSchedule() {
  const [times, setTimes] = useState<Date[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('onboarding_frequency').then((freq) => {
      if (freq === 'daily') setSelectedDays([0, 1, 2, 3, 4, 5, 6])
      else if (freq === 'weekdays') setSelectedDays([1, 2, 3, 4, 5])
      else if (freq === 'weekends') setSelectedDays([0, 6])
      AsyncStorage.removeItem('onboarding_frequency')
    })
  }, [])

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day).sort((a, b) => a - b) : [...prev, day].sort((a, b) => a - b)
    )
  }

  async function handleContinue() {
    if (selectedDays.length === 0) {
      Alert.alert('Select at least one day', 'Choose which days you take this medication.')
      return
    }
    if (times.length === 0) {
      Alert.alert('Add at least one time', 'Tap "Add Notification" to set when you take this medication.')
      return
    }
    setLoading(true)
    try {
      const medId = await AsyncStorage.getItem('onboarding_med_id')
      if (!medId) { Alert.alert('Something went wrong. Try again.'); return }

      const [{ error: scheduleError }, { error: freqError }] = await Promise.all([
        supabase.from('medication_schedules').insert(
          times.map((t) => ({ medication_id: medId, time_of_day: toTimeString(t) }))
        ),
        supabase.from('medications').update({ days_of_week: JSON.stringify(selectedDays) }).eq('id', medId),
      ])

      if (scheduleError) { Alert.alert('Error', scheduleError.message); return }
      if (freqError) { Alert.alert('Error', freqError.message); return }

      router.push('/(onboarding)/notifications')
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
          <MaterialCommunityIcons name="clock-outline" size={34} color="#b15f00" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.3 }}>
          When do you take it?
        </Text>
        <Text style={{ fontSize: 15, color: '#554336', marginTop: 8, marginBottom: 36, lineHeight: 22 }}>
          Set a schedule for your doses.
        </Text>

        {/* Day picker */}
        <View style={{ gap: 10, marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginLeft: 4 }}>
              Day Picker
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
              style={{ backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 }}
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
                    borderWidth: 1, borderColor: active ? '#d97706' : '#dbc2b0',
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
        <View style={{ gap: 10, marginBottom: 36 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginLeft: 4 }}>
            Notification Times
          </Text>

          <View style={{ gap: 8 }}>
            {times.map((time, index) => (
              <View key={index}>
                <View style={{
                  backgroundColor: '#fff', borderRadius: 14,
                  borderWidth: 1, borderColor: editingIndex === index ? '#b15f00' : '#dbc2b0',
                  paddingHorizontal: 16, paddingVertical: 14,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <TouchableOpacity
                    onPress={() => setEditingIndex(editingIndex === index ? null : index)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
                  >
                    <MaterialCommunityIcons name="clock-outline" size={22} color="#b15f00" />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f1b17' }}>
                      {formatTime(time)}
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
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
