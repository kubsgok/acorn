import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '../../src/lib/supabase'
import DayPicker from '../../src/components/DayPicker'

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
}

export default function SetSchedule() {
  const [times, setTimes] = useState<Date[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  function addTime() {
    const newDate = new Date()
    newDate.setSeconds(0, 0)
    setTimes((prev) => [...prev, newDate])
    setEditingIndex(times.length)
  }

  function removeTime(index: number) {
    setTimes((prev) => prev.filter((_, i) => i !== index))
    setEditingIndex(null)
  }

  function updateTime(index: number, date: Date) {
    setTimes((prev) => prev.map((t, i) => (i === index ? date : t)))
  }

  async function handleContinue() {
    if (selectedDays.length === 0) {
      Alert.alert('Select at least one day', 'Choose which days you take this medication.')
      return
    }
    if (times.length === 0) {
      Alert.alert('Add at least one time', 'Tap "+ Add a time" to set when you take this medication.')
      return
    }
    setLoading(true)
    try {
      const medId = await AsyncStorage.getItem('onboarding_med_id')
      if (!medId) { Alert.alert('Something went wrong. Try again.'); setLoading(false); return }

      const [{ error: scheduleError }, { error: freqError }] = await Promise.all([
        supabase.from('medication_schedules').insert(
          times.map((t) => ({ medication_id: medId, time_of_day: toTimeString(t) }))
        ),
        supabase.from('medications').update({ days_of_week: JSON.stringify(selectedDays) }).eq('id', medId),
      ])

      if (scheduleError) { Alert.alert('Error', scheduleError.message); setLoading(false); return }
      if (freqError) { Alert.alert('Error', freqError.message); setLoading(false); return }

      router.push('/(onboarding)/notifications')
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32 }}>
        <Text style={{ fontSize: 40 }}>⏰</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#1c1917', marginTop: 16 }}>
          When do you take it?
        </Text>
        <Text style={{ fontSize: 15, color: '#78716c', marginTop: 8, marginBottom: 32 }}>
          Set a time for each dose.
        </Text>

        {/* Day picker */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 12 }}>
          Which days?
        </Text>
        <View style={{ marginBottom: 32 }}>
          <DayPicker selected={selectedDays} onChange={setSelectedDays} />
        </View>

        {/* Time slots */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 12 }}>
          Reminder times
        </Text>

        {times.length === 0 && (
          <View style={{
            backgroundColor: '#fff', borderRadius: 12, padding: 20,
            alignItems: 'center', borderWidth: 1, borderColor: '#e7e5e4', marginBottom: 12
          }}>
            <Text style={{ color: '#a8a29e', fontSize: 14 }}>No times added yet</Text>
          </View>
        )}

        {times.map((time, index) => (
          <View key={index} style={{ marginBottom: 12 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#fff', borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: editingIndex === index ? '#d97706' : '#e7e5e4',
            }}>
              <TouchableOpacity onPress={() => setEditingIndex(editingIndex === index ? null : index)}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1917' }}>{formatTime(time)}</Text>
                <Text style={{ fontSize: 12, color: '#a8a29e', marginTop: 2 }}>Tap to change</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeTime(index)} style={{ padding: 4 }}>
                <Text style={{ color: '#dc2626', fontSize: 20 }}>×</Text>
              </TouchableOpacity>
            </View>
            {editingIndex === index && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => { if (date) updateTime(index, date) }}
                style={{ backgroundColor: '#fff' }}
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          onPress={addTime}
          style={{
            borderWidth: 1.5, borderColor: '#d97706', borderRadius: 12, borderStyle: 'dashed',
            padding: 14, alignItems: 'center', marginBottom: 32
          }}
        >
          <Text style={{ color: '#d97706', fontWeight: '600' }}>+ Add a time</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          style={{
            backgroundColor: '#d97706', borderRadius: 14, padding: 16,
            alignItems: 'center', opacity: loading ? 0.7 : 1
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
