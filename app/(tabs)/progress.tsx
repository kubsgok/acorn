import { useCallback, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'

interface DaySummary { date: string; rate: number; hasData: boolean }

const MILESTONES = [
  { days: 7,  name: '7 Day Sapling',  icon: 'trophy-outline' as const },
  { days: 14, name: '14 Day Grove',   icon: 'tree-outline' as const },
  { days: 30, name: '30 Day Elder',   icon: 'medal-outline' as const },
  { days: 60, name: '60 Day Ancient', icon: 'star-circle-outline' as const },
  { days: 90, name: '90 Day Legend',  icon: 'auto-fix' as const },
]

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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
        return {
          date: key,
          rate: day ? day.taken / day.total : 0,
          hasData: !!day,
        }
      })
      setWeekData(days)

      const total = logs.length
      const taken = logs.filter((l) => l.status === 'on_time' || l.status === 'late').length
      setOverallRate(total > 0 ? Math.round((taken / total) * 100) : null)
    }
    setLoading(false)
  }

  // Milestone logic using longestStreak so past achievements persist
  const completedMilestones = MILESTONES.filter((m) => longestStreak >= m.days)
  const nextMilestone = MILESTONES.find((m) => longestStreak < m.days)
  const futureMilestones = nextMilestone
    ? MILESTONES.filter((m) => m.days > (nextMilestone?.days ?? 0))
    : []

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
        <TouchableOpacity style={{
          width: 40, height: 40, borderRadius: 20,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <MaterialCommunityIcons name="calendar-today" size={22} color="#b15f00" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
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
                borderWidth: 1, borderColor: '#e7e5e4',
                padding: 16, alignItems: 'center', gap: 4,
              }}>
                <MaterialCommunityIcons name="piggy-bank-outline" size={24} color="#b15f00" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Balance
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#8d4b00' }}>{balance}</Text>
              </View>

              {/* Streak */}
              <View style={{
                flex: 1, backgroundColor: '#fff', borderRadius: 16,
                borderWidth: 1, borderColor: '#e7e5e4',
                padding: 16, alignItems: 'center', gap: 4,
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
                borderWidth: 1, borderColor: '#e7e5e4',
                padding: 16, alignItems: 'center', gap: 4,
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
              borderWidth: 1, borderColor: '#e7e5e4',
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

            {/* Streak Milestones */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f1b17' }}>Streak Milestones</Text>
                <MaterialCommunityIcons name="information-outline" size={20} color="#b15f00" />
              </View>

              {/* Completed milestones */}
              {completedMilestones.map((m) => (
                <View key={m.days} style={{
                  backgroundColor: '#fff', borderRadius: 16,
                  borderWidth: 1, borderColor: '#e7e5e4',
                  borderLeftWidth: 4, borderLeftColor: '#006e2d',
                  padding: 16, flexDirection: 'row',
                  alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: '#fef3c7',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <MaterialCommunityIcons name={m.icon} size={24} color="#b15f00" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f1b17' }}>{m.name}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#006e2d', marginTop: 2, letterSpacing: 0.5 }}>
                        COMPLETED
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#006e2d" />
                </View>
              ))}

              {/* Next milestone (in progress) */}
              {nextMilestone && (
                <View style={{
                  backgroundColor: '#fff', borderRadius: 16,
                  borderWidth: 1, borderColor: '#e7e5e4',
                  borderLeftWidth: 4, borderLeftColor: '#f59e0b',
                  padding: 16, flexDirection: 'row',
                  alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                    <View style={{
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: '#f5f5f4',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <MaterialCommunityIcons name={nextMilestone.icon} size={24} color="#a8a29e" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f1b17' }}>{nextMilestone.name}</Text>
                      <View style={{
                        height: 6, backgroundColor: '#f0e6e0',
                        borderRadius: 99, marginTop: 8, overflow: 'hidden',
                      }}>
                        <View style={{
                          height: '100%',
                          width: `${Math.min(100, Math.round((currentStreak / nextMilestone.days) * 100))}%`,
                          backgroundColor: '#f59e0b',
                          borderRadius: 99,
                        }} />
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#78716c', marginLeft: 12 }}>
                    {currentStreak}/{nextMilestone.days}
                  </Text>
                </View>
              )}

              {/* Future milestones — horizontal scroll */}
              {futureMilestones.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                >
                  {futureMilestones.map((m) => (
                    <View key={m.days} style={{
                      width: 120, backgroundColor: '#fff',
                      borderRadius: 16, borderWidth: 1, borderColor: '#e7e5e4',
                      padding: 16, alignItems: 'center', gap: 8, opacity: 0.55,
                    }}>
                      <MaterialCommunityIcons name={m.icon} size={28} color="#a8a29e" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#44403c', textAlign: 'center' }}>
                        {m.days} Days
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* All milestones done */}
              {!nextMilestone && (
                <View style={{
                  backgroundColor: '#f0fdf4', borderRadius: 16,
                  borderWidth: 1, borderColor: '#bbf7d0',
                  padding: 20, alignItems: 'center', gap: 8,
                }}>
                  <MaterialCommunityIcons name="star-circle" size={36} color="#006e2d" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1f1b17' }}>All milestones reached!</Text>
                  <Text style={{ fontSize: 13, color: '#554336', textAlign: 'center' }}>
                    You've completed every streak milestone. Incredible dedication.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
