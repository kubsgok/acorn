import { useCallback, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, Easing, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useFocusEffect } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'
import { CalendarView } from './calendar'

interface DaySummary { date: string; rate: number; hasData: boolean }

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const cardShadow = {
  shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
}

function barColor(rate: number, hasData: boolean): string {
  if (!hasData) return '#e7e5e4'
  if (rate >= 1) return '#006e2d'
  if (rate > 0) return '#f59e0b'
  return '#e7e5e4'
}

export default function ProgressScreen() {
  const user = useAuthStore((s) => s.user)
  const squirrelName = useAuthStore((s) => s.squirrelName)
  const avatarUri = useAuthStore((s) => s.avatarUri)
  const { balance, lifetimeEarned, currentStreak, longestStreak, load } = useAcornStore()
  const [weekData, setWeekData] = useState<DaySummary[]>([])
  const [overallRate, setOverallRate] = useState<number | null>(null)
  const [taken, setTaken] = useState(0)
  const [missed, setMissed] = useState(0)
  const [medStats, setMedStats] = useState<{ id: string; name: string; color: string; taken: number; total: number }[]>([])
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
    since.setDate(since.getDate() - 30)

    const { data: logs } = await supabase
      .from('medication_logs')
      .select('scheduled_at, status, medication_id, medication:medications(name, color)')
      .eq('user_id', user.id)
      .gte('scheduled_at', since.toISOString())
      .neq('status', 'pending')

    const rows = (logs ?? []) as any[]
    const isTaken = (s: string) => s === 'on_time' || s === 'late'

    // Weekly bars (last 7 days)
    const byDay: Record<string, { total: number; taken: number }> = {}
    for (const log of rows) {
      const day = log.scheduled_at.split('T')[0]
      if (!byDay[day]) byDay[day] = { total: 0, taken: 0 }
      byDay[day].total++
      if (isTaken(log.status)) byDay[day].taken++
    }
    setWeekData(Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split('T')[0]
      const day = byDay[key]
      return { date: key, rate: day ? day.taken / day.total : 0, hasData: !!day }
    }))

    // Overall adherence — taken vs missed (last 30 days)
    const total = rows.length
    const takenCount = rows.filter((l) => isTaken(l.status)).length
    setTaken(takenCount)
    setMissed(total - takenCount)
    setOverallRate(total > 0 ? Math.round((takenCount / total) * 100) : null)

    // Per-medication breakdown
    const byMed: Record<string, { name: string; color: string; taken: number; total: number }> = {}
    for (const l of rows) {
      const id = l.medication_id
      if (!id) continue
      if (!byMed[id]) byMed[id] = { name: l.medication?.name ?? 'Medication', color: l.medication?.color ?? '#b15f00', taken: 0, total: 0 }
      byMed[id].total++
      if (isTaken(l.status)) byMed[id].taken++
    }
    setMedStats(Object.entries(byMed).map(([id, v]) => ({ id, ...v })))

    setLoading(false)
  }

  const adherenceLabel =
    overallRate === null ? 'N/A'
    : overallRate >= 85 ? 'On Track'
    : overallRate >= 60 ? 'Keep Going'
    : 'Needs Work'

  const adherenceBadgeColor =
    overallRate === null ? '#e7e5e4'
    : overallRate >= 85 ? '#7cf994'
    : overallRate >= 60 ? '#fef3c7'
    : '#ffdad6'

  const adherenceBadgeText =
    overallRate === null ? '#44403c'
    : overallRate >= 85 ? '#006e2d'
    : overallRate >= 60 ? '#92400e'
    : '#ba1a1a'

  const initials = squirrelName ? squirrelName.slice(0, 1).toUpperCase() : '?'
  const [tab, setTab] = useState<'overview' | 'calendar'>('overview')

  // Sliding segmented-control indicator
  const [segW, setSegW] = useState(0)
  const indicator = useSharedValue(0)
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicator.value }] }))

  function selectTab(next: 'overview' | 'calendar') {
    if (next === tab) return
    indicator.value = withTiming(next === 'overview' ? 0 : segW, {
      duration: 300,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
    })
    setTab(next)
  }

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
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: '#fde68a',
            overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={{ width: 40, height: 40 }} />
              : <Text style={{ fontSize: 18, fontWeight: '700', color: '#8d4b00' }}>{initials}</Text>
            }
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#b15f00', letterSpacing: -0.5 }}>Acorn</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Segmented toggle: Overview | Calendar — with a sliding indicator */}
        <View
          onLayout={(e) => setSegW((e.nativeEvent.layout.width - 8) / 2)}
          style={{ flexDirection: 'row', backgroundColor: '#f1ebe4', borderRadius: 14, padding: 4, marginBottom: 20 }}
        >
          {/* Sliding white pill */}
          {segW > 0 && (
            <Animated.View
              style={[
                {
                  position: 'absolute', top: 4, left: 4, width: segW, bottom: 4, borderRadius: 10,
                  backgroundColor: '#fff',
                  shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
                },
                indicatorStyle,
              ]}
            />
          )}
          {(['overview', 'calendar'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => selectTab(t)}
              activeOpacity={0.8}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t ? '#1f1b17' : '#a8907c' }}>
                {t === 'overview' ? 'Overview' : 'Calendar'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Animated.View key={tab} entering={FadeIn.duration(240)}>
        {tab === 'calendar' ? (
          <CalendarView />
        ) : (
        <>
        {/* Headline */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1f1b17', letterSpacing: -0.3 }}>
            Growth Overview
          </Text>
          <Text style={{ fontSize: 14, color: '#554336', marginTop: 4 }}>
            You're tending your forest well today.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#b15f00" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Bento stats grid */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              {/* Balance */}
              <View style={{
                flex: 1, backgroundColor: '#fff', borderRadius: 16,
                padding: 16, alignItems: 'center', gap: 4,
                shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
              }}>
                <Text style={{ fontSize: 22 }}>🌰</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Balance
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#8d4b00' }}>{balance}</Text>
              </View>

              {/* Streak */}
              <View style={{
                flex: 1, backgroundColor: '#fff', borderRadius: 16,
                padding: 16, alignItems: 'center', gap: 4,
                shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
              }}>
                <MaterialCommunityIcons name="fire" size={24} color="#f97316" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Streak
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#8d4b00' }}>{currentStreak}d</Text>
              </View>

              {/* Adherence */}
              <View style={{
                flex: 1, backgroundColor: '#fff', borderRadius: 16,
                padding: 16, alignItems: 'center', gap: 4,
                shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
              }}>
                <MaterialCommunityIcons name="check-decagram" size={24} color="#006e2d" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Adherence
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#8d4b00' }}>
                  {overallRate !== null ? `${overallRate}%` : '—'}
                </Text>
              </View>
            </View>

            {/* Weekly adherence chart */}
            <View style={{
              backgroundColor: '#fff', borderRadius: 16,
              shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
              padding: 16, marginBottom: 20,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f1b17' }}>Weekly Adherence</Text>
                  <Text style={{ fontSize: 13, color: '#554336', marginTop: 2 }}>Last 7 days performance</Text>
                </View>
                <View style={{
                  paddingHorizontal: 12, paddingVertical: 5,
                  backgroundColor: adherenceBadgeColor,
                  borderRadius: 99,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: adherenceBadgeText }}>
                    {adherenceLabel}
                  </Text>
                </View>
              </View>

              {/* Bars */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6, marginBottom: 12 }}>
                {weekData.map((day) => {
                  const barH = day.hasData ? Math.max(8, day.rate * 100) : 8
                  const color = barColor(day.rate, day.hasData)
                  return (
                    <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                      <View style={{
                        width: '100%',
                        height: barH,
                        backgroundColor: color,
                        borderRadius: 6,
                      }} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#a8a29e' }}>
                        {DAY_LABELS[new Date(day.date).getDay()]}
                      </Text>
                    </View>
                  )
                })}
              </View>

              {/* Legend */}
              <View style={{
                flexDirection: 'row', gap: 16, paddingTop: 12,
                borderTopWidth: 1, borderTopColor: '#e7e5e4',
              }}>
                {[
                  { color: '#006e2d', label: 'Full' },
                  { color: '#f59e0b', label: 'Partial' },
                  { color: '#e7e5e4', label: 'None' },
                ].map((item) => (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                    <Text style={{ fontSize: 12, color: '#554336' }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Adherence — taken vs missed (last 30 days) */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, ...cardShadow }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#554336', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Adherence · 30 days
                </Text>
                <View style={{ paddingHorizontal: 12, paddingVertical: 5, backgroundColor: adherenceBadgeColor, borderRadius: 99 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: adherenceBadgeText }}>{adherenceLabel}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 34, fontWeight: '800', color: '#1f1b17', marginTop: 8 }}>
                {overallRate !== null ? `${overallRate}%` : '—'}
              </Text>

              {taken + missed > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', height: 10, borderRadius: 99, overflow: 'hidden', marginTop: 12, backgroundColor: '#f0e6e0' }}>
                    <View style={{ flex: Math.max(taken, 0.0001), backgroundColor: '#16a34a' }} />
                    <View style={{ flex: Math.max(missed, 0.0001), backgroundColor: '#dc2626' }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#16a34a' }} />
                      <Text style={{ fontSize: 13, color: '#554336' }}><Text style={{ fontWeight: '700', color: '#1f1b17' }}>{taken}</Text> taken</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#dc2626' }} />
                      <Text style={{ fontSize: 13, color: '#554336' }}><Text style={{ fontWeight: '700', color: '#1f1b17' }}>{missed}</Text> missed</Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={{ fontSize: 13, color: '#a8a29e', marginTop: 8 }}>No doses logged in the last 30 days yet.</Text>
              )}
            </View>

            {/* Streaks — current + longest */}
            <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, ...cardShadow }}>
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="fire" size={26} color="#f97316" />
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#1f1b17' }}>{currentStreak}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c', letterSpacing: 0.3, textTransform: 'uppercase' }}>Current streak</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#f0e6e0', marginVertical: 4 }} />
              <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="trophy-outline" size={26} color="#b15f00" />
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#1f1b17' }}>{longestStreak}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c', letterSpacing: 0.3, textTransform: 'uppercase' }}>Longest streak</Text>
              </View>
            </View>

            {/* Per-medication breakdown */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#554336', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 2 }}>
                By medication · 30 days
              </Text>
              {medStats.length === 0 ? (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', gap: 6, ...cardShadow }}>
                  <MaterialCommunityIcons name="pill-off" size={28} color="#a8a29e" />
                  <Text style={{ fontSize: 13, color: '#78716c', textAlign: 'center' }}>No medication history yet.</Text>
                </View>
              ) : (
                medStats.map((m) => {
                  const rate = m.total > 0 ? Math.round((m.taken / m.total) * 100) : 0
                  return (
                    <View key={m.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, ...cardShadow }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: m.color }} />
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f1b17' }}>{m.name}</Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1f1b17' }}>{rate}%</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: '#f0e6e0', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${rate}%`, backgroundColor: m.color, borderRadius: 99 }} />
                      </View>
                      <Text style={{ fontSize: 12, color: '#a8a29e', marginTop: 6 }}>{m.taken} of {m.total} doses taken</Text>
                    </View>
                  )
                })
              )}
            </View>
          </>
        )}
        </>
        )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}
