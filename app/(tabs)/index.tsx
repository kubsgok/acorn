import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, router } from 'expo-router'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
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

function isOverdue(log: MedLog): boolean {
  if (log.status !== 'pending') return false
  const diffMins = (Date.now() - new Date(log.scheduled_at).getTime()) / 60000
  return diffMins > 60
}

function getSquirrelMood(currentStreak: number, allDone: boolean, hasOverdue: boolean, hasPending: boolean): string {
  if (allDone) return '🐿️'       // all taken — excited
  if (hasOverdue) return '😟'     // overdue doses — worried
  if (hasPending) return '😊'    // upcoming doses, nothing wrong yet — happy/idle
  if (currentStreak === 0) return '😔'  // no meds today, no streak — sad
  return '😊'
}

function getMoodMessage(squirrelName: string, allDone: boolean, overdueLogs: MedLog[], currentStreak: number): string {
  if (allDone) return `All done for today! ${squirrelName} is proud of you.`
  if (overdueLogs.length > 0) return `You have ${overdueLogs.length} overdue dose${overdueLogs.length > 1 ? 's' : ''}. Log them now!`
  if (currentStreak > 0) return `${currentStreak} day streak going strong. Keep it up!`
  return 'Take your medication to start a streak.'
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

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const todayDay = new Date().getDay()

    const { data: existingLogs } = await supabase
      .from('medication_logs')
      .select('*, medication:medications(name, dose, color)')
      .eq('user_id', user.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())

    const { data: schedules } = await supabase
      .from('medication_schedules')
      .select('*, medication:medications!inner(id, name, dose, color, user_id, days_of_week)')
      .eq('medication.user_id', user.id)

    if (!schedules) { setLoading(false); return }

    const todaySchedules = schedules.filter((s) => {
      try {
        const days: number[] = JSON.parse(s.medication.days_of_week ?? '[0,1,2,3,4,5,6]')
        return days.includes(todayDay)
      } catch {
        return true
      }
    })

    const existingScheduleIds = new Set((existingLogs ?? []).map((l: any) => l.schedule_id))
    const toCreate = todaySchedules
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

    const activeScheduleIds = new Set(todaySchedules.map((s) => s.id))
    const { data: allLogs } = await supabase
      .from('medication_logs')
      .select('*, medication:medications(name, dose, color)')
      .eq('user_id', user.id)
      .gte('scheduled_at', todayStart.toISOString())
      .lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at')

    const filtered = ((allLogs ?? []) as MedLog[]).filter((l) => activeScheduleIds.has(l.schedule_id))
    setLogs(filtered)
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

  const overdueLogs = logs.filter((l) => isOverdue(l))
  const upcomingLogs = logs.filter((l) => l.status === 'pending' && !isOverdue(l))
  const doneLogs = logs.filter((l) => l.status !== 'pending')
  const allDone = logs.length > 0 && logs.every((l) => l.status !== 'pending')

  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  function renderLog(log: MedLog, overdue = false) {
    const isPending = log.status === 'pending'

    if (!isPending) {
      // Done card
      return (
        <View key={log.id} style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: '#e7e5e4',
          borderLeftWidth: 4,
          borderLeftColor: log.medication.color,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#a8a29e', textDecorationLine: 'line-through' }}>
                {log.medication.name}
              </Text>
              {log.medication.dose && (
                <Text style={{ fontSize: 12, color: '#c4bfbc', marginTop: 2 }}>{log.medication.dose}</Text>
              )}
              <Text style={{ fontSize: 11, color: '#c4bfbc', marginTop: 4 }}>
                {new Date(log.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#166534" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534' }}>
                {log.status === 'on_time' ? 'On time' : 'Taken'}
              </Text>
            </View>
          </View>
          {log.acorns_earned > 0 && (
            <Text style={{ fontSize: 12, color: '#d97706', marginTop: 8, fontWeight: '600' }}>
              +{log.acorns_earned} acorns earned
            </Text>
          )}
        </View>
      )
    }

    // Pending / Overdue card
    return (
      <View key={log.id} style={{
        backgroundColor: overdue ? '#fff5f5' : '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: overdue ? '#fca5a5' : '#e7e5e4',
        borderLeftWidth: 4,
        borderLeftColor: overdue ? '#ba1a1a' : log.medication.color,
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
              {new Date(log.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={{
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
            backgroundColor: overdue ? '#ffdad6' : '#fef3c7',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: overdue ? '#ba1a1a' : '#92400e' }}>
              {overdue ? 'Overdue' : 'Scheduled'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowConfirm(log)}
          disabled={logging === log.id}
          style={{
            marginTop: 14,
            backgroundColor: overdue ? '#ba1a1a' : '#b15f00',
            borderRadius: 12, paddingVertical: 11, alignItems: 'center',
            flexDirection: 'row', justifyContent: 'center', gap: 6,
          }}
        >
          {logging === log.id
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <MaterialCommunityIcons name="pill" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>I took it</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top']}>
      {/* Acorn earned toast */}
      {lastEarned && (
        <View style={{
          position: 'absolute', top: 60, alignSelf: 'center', zIndex: 99,
          backgroundColor: '#b15f00', borderRadius: 24,
          paddingHorizontal: 20, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>+{lastEarned} 🌰</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#1c1917', letterSpacing: -0.5 }}>
                Acorn
              </Text>
              <Text style={{ fontSize: 13, color: '#a8a29e', marginTop: 2 }}>{today}</Text>
            </View>

            {/* Pills */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {/* Acorn balance */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: '#fef3c7', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>🌰 {balance}</Text>
              </View>

              {/* Streak */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: '#fff1e6', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}>
                <MaterialCommunityIcons name="fire" size={15} color="#b15f00" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>{currentStreak}d</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Squirrel mood card */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.push('/chat')}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#fcf2eb',
              borderRadius: 20,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: '#fde68a',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 30 }}>
                {getSquirrelMood(currentStreak, allDone, overdueLogs.length > 0, upcomingLogs.length > 0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1c1917' }}>
                {squirrelName ?? 'Nutmeg'}
              </Text>
              <Text style={{ fontSize: 13, color: '#78716c', marginTop: 3, lineHeight: 18 }}>
                {getMoodMessage(squirrelName ?? 'Nutmeg', allDone, overdueLogs, currentStreak)}
              </Text>
            </View>
            <MaterialCommunityIcons name="message-outline" size={20} color="#b15f00" />
          </TouchableOpacity>
        </View>

        {/* Medication sections */}
        <View style={{ paddingHorizontal: 20 }}>
          {loading ? (
            <ActivityIndicator color="#b15f00" style={{ marginTop: 40 }} />
          ) : logs.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 48, paddingHorizontal: 20 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: '#fef3c7',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <MaterialCommunityIcons name="pill" size={34} color="#b15f00" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1c1917', textAlign: 'center' }}>
                No medications today
              </Text>
              <Text style={{ color: '#78716c', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                Add a medication in Settings to get started.
              </Text>
            </View>
          ) : (
            <>
              {/* Overdue */}
              {overdueLogs.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ba1a1a' }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#ba1a1a', letterSpacing: 1, textTransform: 'uppercase' }}>
                      Overdue
                    </Text>
                  </View>
                  {overdueLogs.map((log) => renderLog(log, true))}
                </View>
              )}

              {/* Upcoming */}
              {upcomingLogs.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#b15f00' }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#8d4b00', letterSpacing: 1, textTransform: 'uppercase' }}>
                      Upcoming
                    </Text>
                  </View>
                  {upcomingLogs.map((log) => renderLog(log, false))}
                </View>
              )}

              {/* Done */}
              {doneLogs.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#006e2d' }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#006e2d', letterSpacing: 1, textTransform: 'uppercase' }}>
                      Done
                    </Text>
                  </View>
                  {doneLogs.map((log) => renderLog(log, false))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/medication/new')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: '#b15f00',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#b15f00',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Confirm modal */}
      <Modal visible={!!showConfirm} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: 40,
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: '#fef3c7',
              alignItems: 'center', justifyContent: 'center',
              alignSelf: 'center', marginBottom: 16,
            }}>
              <MaterialCommunityIcons name="pill" size={30} color="#b15f00" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1c1917', textAlign: 'center' }}>
              Log {showConfirm?.medication.name}?
            </Text>
            <Text style={{ fontSize: 14, color: '#78716c', textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 20 }}>
              This will record your dose and earn you acorns.
            </Text>
            <TouchableOpacity
              onPress={() => showConfirm && logDose(showConfirm)}
              style={{
                backgroundColor: '#b15f00', borderRadius: 14,
                padding: 16, alignItems: 'center', marginBottom: 10,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Yes, I took it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowConfirm(null)}
              style={{ padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#a8a29e', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
