import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'

interface DaySummary { date: string; rate: number }

export default function ProgressScreen() {
  const user = useAuthStore((s) => s.user)
  const { balance, lifetimeEarned, currentStreak, longestStreak, load } = useAcornStore()
  const [weekData, setWeekData] = useState<DaySummary[]>([])
  const [overallRate, setOverallRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    if (!user) return
    load(user.id)
    loadStats()
  }, [user]))

  async function loadStats() {
    if (!user) return
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - 7)

    const { data: logs } = await supabase
      .from('medication_logs')
      .select('scheduled_at, status')
      .eq('user_id', user.id)
      .gte('scheduled_at', since.toISOString())
      .neq('status', 'pending')

    if (logs) {
      const byDay: Record<string, { total: number; taken: number }> = {}
      for (const log of logs) {
        const day = log.scheduled_at.split('T')[0]
        if (!byDay[day]) byDay[day] = { total: 0, taken: 0 }
        byDay[day].total++
        if (log.status === 'on_time' || log.status === 'late') byDay[day].taken++
      }
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        const key = d.toISOString().split('T')[0]
        const day = byDay[key]
        return { date: key, rate: day ? day.taken / day.total : 0 }
      })
      setWeekData(days)

      const total = logs.length
      const taken = logs.filter((l) => l.status === 'on_time' || l.status === 'late').length
      setOverallRate(total > 0 ? Math.round((taken / total) * 100) : null)
    }
    setLoading(false)
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1c1917', marginBottom: 24 }}>Progress</Text>

        {loading ? <ActivityIndicator color="#d97706" /> : (
          <>
            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Acorns', value: `🌰 ${balance}` },
                { label: 'Streak', value: `🔥 ${currentStreak}d` },
                { label: '7-day rate', value: overallRate !== null ? `${overallRate}%` : 'N/A' },
              ].map((s) => (
                <View key={s.label} style={{
                  flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: '#e7e5e4', alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1c1917' }}>{s.value}</Text>
                  <Text style={{ fontSize: 11, color: '#a8a29e', marginTop: 4 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Week chart */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e7e5e4', marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 16 }}>Last 7 days</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80 }}>
                {weekData.map((day, i) => (
                  <View key={day.date} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 28, height: Math.max(4, day.rate * 64),
                      backgroundColor: day.rate === 0 ? '#f5f5f4' : day.rate >= 1 ? '#16a34a' : '#d97706',
                      borderRadius: 6
                    }} />
                    <Text style={{ fontSize: 10, color: '#a8a29e', marginTop: 6 }}>
                      {dayLabels[(new Date(day.date).getDay())]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Milestones */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e7e5e4' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 14 }}>Streak milestones</Text>
              {[7, 14, 30, 60, 90].map((days) => {
                const reached = longestStreak >= days
                return (
                  <View key={days} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Text style={{ fontSize: 20 }}>{reached ? '🏆' : '⬜️'}</Text>
                    <Text style={{ fontSize: 14, color: reached ? '#1c1917' : '#a8a29e', fontWeight: reached ? '600' : '400' }}>
                      {days}-day streak
                    </Text>
                    {reached && <Text style={{ marginLeft: 'auto', fontSize: 12, color: '#d97706', fontWeight: '600' }}>Unlocked</Text>}
                  </View>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
