import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'

interface MedLog {
  id: string
  medication_id: string
  schedule_id: string
  scheduled_at: string
  logged_at: string | null
  status: 'pending' | 'on_time' | 'late' | 'missed'
  acorns_earned: number
  medication: { name: string; dose: string | null; color: string }
}

function getScheduledToday(timeOfDay: string): Date {
  const [h, m] = timeOfDay.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

function calcStatus(scheduledAt: Date, loggedAt: Date): 'on_time' | 'late' {
  const diffMins = (loggedAt.getTime() - scheduledAt.getTime()) / 60000
  return diffMins <= 30 ? 'on_time' : 'late'
}

function calcAcorns(status: 'on_time' | 'late'): number {
  return status === 'on_time' ? 10 : 5
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  on_time: 'Taken on time',
  late: 'Taken late',
  missed: 'Missed',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  on_time: { bg: '#dcfce7', text: '#166534' },
  late: { bg: '#dbeafe', text: '#1e40af' },
  missed: { bg: '#fee2e2', text: '#991b1b' },
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const squirrelName = useAuthStore((s) => s.squirrelName)
  const { balance, currentStreak, load: loadAcorns, addAcorns } = useAcornStore()
  const [logs, setLogs] = useState<MedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<MedLog | null>(null)
  const [lastEarned, setLastEarned] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Load or generate today's logs
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

    // Fetch existing logs for today
    const { data: existingLogs } = await supabase
      .from('medication_logs')
      .select('*, medication:medications(name, dose, color)')
      .eq('user_id', user.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())

    // Fetch all schedules for this user
    const { data: schedules } = await supabase
      .from('medication_schedules')
      .select('*, medication:medications!inner(id, name, dose, color, user_id)')
      .eq('medication.user_id', user.id)

    if (!schedules) { setLoading(false); return }

    // Create missing logs for today
    const existingScheduleIds = new Set((existingLogs ?? []).map((l: MedLog) => l.schedule_id))
    const toCreate = schedules
      .filter((s) => !existingScheduleIds.has(s.id))
      .map((s) => ({
        user_id: user.id,
        medication_id: s.medication.id,
        schedule_id: s.id,
        scheduled_at: getScheduledToday(s.time_of_day).toISOString(),
        status: 'pending',
        acorns_earned: 0,
      }))

    if (toCreate.length > 0) {
      await supabase.from('medication_logs').insert(toCreate)
    }

    // Reload
    const { data: allLogs } = await supabase
      .from('medication_logs')
      .select('*, medication:medications(name, dose, color)')
      .eq('user_id', user.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at')

    setLogs((allLogs as MedLog[]) ?? [])
    await loadAcorns(user.id)
    setLoading(false)
  }, [user, loadAcorns])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function logDose(log: MedLog) {
    if (!user) return
    setLogging(log.id)
    const now = new Date()
    const scheduled = new Date(log.scheduled_at)
    const status = calcStatus(scheduled, now)
    const acorns = calcAcorns(status)

    await supabase.from('medication_logs').update({
      logged_at: now.toISOString(),
      status,
      acorns_earned: acorns,
    }).eq('id', log.id)

    await addAcorns(user.id, acorns)
    setLastEarned(acorns)
    setTimeout(() => setLastEarned(null), 2000)

    setLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, status, logged_at: now.toISOString(), acorns_earned: acorns } : l))
    setLogging(null)
    setShowConfirm(null)
  }

  const squirrelMood = currentStreak > 0 ? '😊' : '😔'
  const allDone = logs.length > 0 && logs.every((l) => l.status !== 'pending')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      {/* Acorn earn flash */}
      {lastEarned && (
        <View style={{
          position: 'absolute', top: 60, alignSelf: 'center', zIndex: 99,
          backgroundColor: '#d97706', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>+{lastEarned} 🌰</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1c1917' }}>Today</Text>
            <Text style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>
              {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#d97706' }}>🌰 {balance}</Text>
            <Text style={{ fontSize: 13, color: '#78716c' }}>🔥 {currentStreak} day streak</Text>
          </View>
        </View>

        {/* Squirrel mood */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 16, padding: 16,
          flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24,
          borderWidth: 1, borderColor: '#e7e5e4'
        }}>
          <Text style={{ fontSize: 32 }}>{squirrelMood}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: '#1c1917', fontSize: 14 }}>{squirrelName}</Text>
            <Text style={{ color: '#78716c', fontSize: 13, marginTop: 2 }}>
              {allDone
                ? 'All done for today! Great job.'
                : currentStreak > 0
                ? `${currentStreak} day streak going strong. Keep it up!`
                : 'Take your medication to start a streak.'}
            </Text>
          </View>
        </View>

        {/* Medication list */}
        {loading ? (
          <ActivityIndicator color="#d97706" style={{ marginTop: 40 }} />
        ) : logs.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40 }}>💊</Text>
            <Text style={{ color: '#78716c', marginTop: 12, textAlign: 'center' }}>
              No medications scheduled for today.{'\n'}Add one in Settings.
            </Text>
          </View>
        ) : (
          logs.map((log) => {
            const style = STATUS_COLORS[log.status]
            const isPending = log.status === 'pending'
            return (
              <View key={log.id} style={{
                backgroundColor: '#fff', borderRadius: 16, padding: 16,
                marginBottom: 12, borderWidth: 1, borderColor: '#e7e5e4',
                borderLeftWidth: 4, borderLeftColor: log.medication.color
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1917' }}>
                      {log.medication.name}
                    </Text>
                    {log.medication.dose && (
                      <Text style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>{log.medication.dose}</Text>
                    )}
                    <Text style={{ fontSize: 12, color: '#a8a29e', marginTop: 4 }}>
                      Scheduled: {new Date(log.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: style.bg }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: style.text }}>
                      {STATUS_LABELS[log.status]}
                    </Text>
                  </View>
                </View>

                {isPending && (
                  <TouchableOpacity
                    onPress={() => setShowConfirm(log)}
                    disabled={logging === log.id}
                    style={{
                      marginTop: 14, backgroundColor: '#d97706', borderRadius: 10,
                      paddingVertical: 10, alignItems: 'center'
                    }}
                  >
                    {logging === log.id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontWeight: '700' }}>I took it</Text>
                    }
                  </TouchableOpacity>
                )}

                {!isPending && log.acorns_earned > 0 && (
                  <Text style={{ fontSize: 12, color: '#d97706', marginTop: 10, fontWeight: '600' }}>
                    +{log.acorns_earned} 🌰 earned
                  </Text>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Confirm modal */}
      <Modal visible={!!showConfirm} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 28 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28 }}>
            <Text style={{ fontSize: 32, textAlign: 'center' }}>💊</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1917', textAlign: 'center', marginTop: 12 }}>
              Log {showConfirm?.medication.name}?
            </Text>
            <Text style={{ fontSize: 14, color: '#78716c', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
              This will record your dose and earn you acorns.
            </Text>
            <TouchableOpacity
              onPress={() => showConfirm && logDose(showConfirm)}
              style={{ backgroundColor: '#d97706', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Yes, I took it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowConfirm(null)}
              style={{ padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#a8a29e' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
