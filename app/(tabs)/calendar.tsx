import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'

type DayStatus = 'perfect' | 'partial' | 'missed' | 'none' | 'future'

interface DoseEntry {
  name: string
  dose: string | null
  color: string | null
  status: string // on_time | late | missed | pending | skipped
  time: string   // scheduled_at ISO
}

interface DayData {
  date: string // YYYY-MM-DD
  status: DayStatus
  taken: number
  total: number
  doses: DoseEntry[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function statusColor(status: DayStatus): string {
  switch (status) {
    case 'perfect': return '#006e2d'
    case 'partial':  return '#d97706'
    case 'missed':   return '#ba1a1a'
    default:         return 'transparent'
  }
}

function statusBg(status: DayStatus): string {
  switch (status) {
    case 'perfect': return '#dcfce7'
    case 'partial':  return '#fef3c7'
    case 'missed':   return '#fce8e8'
    default:         return 'transparent'
  }
}

const cardShadow = {
  shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.09, shadowRadius: 16, elevation: 4,
}

// Calendar content only (no ScrollView / SafeAreaView) so it can embed inside
// the Progress tab's toggle as well as stand alone as a route.
export function CalendarView() {
  const user = useAuthStore((s) => s.user)

  const today = new Date()
  const [year, setYear]       = useState(today.getFullYear())
  const [month, setMonth]     = useState(today.getMonth())
  const [dayMap, setDayMap]   = useState<Record<string, DayData>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DayData | null>(null)

  useFocusEffect(useCallback(() => {
    loadMonth(year, month)
  }, [user, year, month]))

  async function loadMonth(y: number, m: number) {
    if (!user) return
    setLoading(true)
    const start = new Date(y, m, 1)
    const end   = new Date(y, m + 1, 0, 23, 59, 59)

    const { data } = await supabase
      .from('medication_logs')
      .select('scheduled_at, status, medication:medications(name, dose, color)')
      .eq('user_id', user.id)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at')

    const map: Record<string, DayData> = {}
    const todayStr = toDateStr(today)

    for (const row of (data ?? []) as any[]) {
      const dateStr = row.scheduled_at.slice(0, 10)
      if (!map[dateStr]) map[dateStr] = { date: dateStr, status: 'none', taken: 0, total: 0, doses: [] }
      map[dateStr].total++
      if (row.status === 'on_time' || row.status === 'late') map[dateStr].taken++
      map[dateStr].doses.push({
        name: row.medication?.name ?? 'Medication',
        dose: row.medication?.dose ?? null,
        color: row.medication?.color ?? null,
        status: row.status,
        time: row.scheduled_at,
      })
    }

    for (const d of Object.values(map)) {
      if (d.date > todayStr) d.status = 'future'
      else if (d.total === 0) d.status = 'none'
      else if (d.taken === d.total) d.status = 'perfect'
      else if (d.taken === 0) d.status = 'missed'
      else d.status = 'partial'
    }

    setDayMap(map)
    setLoading(false)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelected(null)
  }

  function nextMonth() {
    const next = new Date(year, month + 1, 1)
    if (next > today) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = toDateStr(today)
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const canGoNext = !isCurrentMonth

  const allDays = Object.values(dayMap)
  const scheduledDays = allDays.filter(d => d.total > 0 && d.date <= todayStr)
  const perfectDays   = scheduledDays.filter(d => d.status === 'perfect').length
  const adherencePct  = scheduledDays.length > 0
    ? Math.round((scheduledDays.filter(d => d.taken > 0).length / scheduledDays.length) * 100)
    : null

  return (
    <>
      {/* Month navigator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <TouchableOpacity onPress={prevMonth} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...cardShadow }}>
          <Ionicons name="chevron-back" size={18} color="#554336" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f1b17' }}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity
          onPress={nextMonth}
          disabled={!canGoNext}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: canGoNext ? '#fff' : '#f5f0ec', alignItems: 'center', justifyContent: 'center', opacity: canGoNext ? 1 : 0.4, ...cardShadow }}
        >
          <Ionicons name="chevron-forward" size={18} color="#554336" />
        </TouchableOpacity>
      </View>

      {/* Calendar grid */}
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, ...cardShadow }}>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#a8a29e' }}>{d}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#b15f00" />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const data = dayMap[dateStr]
              const status: DayStatus = dateStr > todayStr ? 'future' : (data?.status ?? 'none')
              const isToday = dateStr === todayStr
              const isSelected = selected?.date === dateStr
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => {
                    if (data && data.total > 0) setSelected(isSelected ? null : data)
                    else setSelected(null)
                  }}
                  style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}
                  activeOpacity={0.7}
                >
                  <View style={{
                    flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10,
                    backgroundColor: status !== 'none' && status !== 'future' ? statusBg(status) : 'transparent',
                    borderWidth: isToday ? 2 : 0, borderColor: '#b15f00',
                  }}>
                    <Text style={{
                      fontSize: 13, fontWeight: isToday ? '800' : '500',
                      color: status !== 'none' && status !== 'future' ? statusColor(status) : dateStr > todayStr ? '#d4cdc9' : '#1f1b17',
                    }}>
                      {day}
                    </Text>
                    {status !== 'none' && status !== 'future' && (
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: statusColor(status), marginTop: 1 }} />
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
        {[
          { status: 'perfect' as DayStatus, label: 'All taken' },
          { status: 'partial' as DayStatus,  label: 'Partial' },
          { status: 'missed' as DayStatus,   label: 'Missed' },
        ].map(({ status, label }) => (
          <View key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor(status) }} />
            <Text style={{ fontSize: 12, color: '#554336', fontWeight: '500' }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Selected day detail */}
      {selected && (
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, ...cardShadow }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#554336', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 12 }}>
            {new Date(selected.date + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: statusBg(selected.status), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{selected.status === 'perfect' ? '✅' : selected.status === 'partial' ? '⚠️' : '❌'}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f1b17' }}>{selected.taken} of {selected.total} taken</Text>
              <Text style={{ fontSize: 13, color: '#554336', marginTop: 2 }}>
                {selected.status === 'perfect' ? 'All doses logged'
                  : selected.status === 'partial' ? `${selected.total - selected.taken} dose${selected.total - selected.taken > 1 ? 's' : ''} missed`
                  : 'No doses logged'}
              </Text>
            </View>
          </View>

          {/* Per-medication breakdown */}
          <View style={{ borderTopWidth: 1, borderTopColor: '#f0e9e3', paddingTop: 4 }}>
            {selected.doses.map((d, i) => {
              const taken = d.status === 'on_time' || d.status === 'late'
              const time = new Date(d.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < selected.doses.length - 1 ? 1 : 0, borderBottomColor: '#f5f0ec' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color || '#c9b8a8', marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1f1b17' }}>
                      {d.name}{d.dose ? <Text style={{ fontWeight: '400', color: '#8a7a6c' }}>  {d.dose}</Text> : null}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#a8a29e', marginTop: 1 }}>Scheduled {time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons
                      name={taken ? 'checkmark-circle' : d.status === 'pending' ? 'ellipse-outline' : 'close-circle'}
                      size={18}
                      color={taken ? '#006e2d' : d.status === 'pending' ? '#a8a29e' : '#ba1a1a'}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: taken ? '#006e2d' : d.status === 'pending' ? '#a8a29e' : '#ba1a1a' }}>
                      {d.status === 'on_time' ? 'On time' : d.status === 'late' ? 'Late' : d.status === 'pending' ? 'Pending' : d.status === 'skipped' ? 'Skipped' : 'Missed'}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* Month summary */}
      {!loading && scheduledDays.length > 0 && (
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, ...cardShadow }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#554336', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 16 }}>
            {MONTHS[month]} summary
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#006e2d' }}>{adherencePct}%</Text>
              <Text style={{ fontSize: 12, color: '#554336', fontWeight: '600', marginTop: 4, textAlign: 'center' }}>Adherence</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fef3c7', borderRadius: 16, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#8d4b00' }}>{perfectDays}</Text>
              <Text style={{ fontSize: 12, color: '#554336', fontWeight: '600', marginTop: 4, textAlign: 'center' }}>Perfect days</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff8f5', borderRadius: 16, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#1f1b17' }}>{scheduledDays.length}</Text>
              <Text style={{ fontSize: 12, color: '#554336', fontWeight: '600', marginTop: 4, textAlign: 'center' }}>Days tracked</Text>
            </View>
          </View>
        </View>
      )}
    </>
  )
}

// Standalone route (still reachable from Settings), hidden from the tab bar.
export default function CalendarScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.3, marginBottom: 4 }}>Calendar</Text>
        <Text style={{ fontSize: 14, color: '#554336', marginBottom: 28 }}>Your medication history</Text>
        <CalendarView />
      </ScrollView>
    </SafeAreaView>
  )
}
