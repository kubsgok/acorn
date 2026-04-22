import { View, Text, TouchableOpacity } from 'react-native'

// 0 = Sun, 1 = Mon, ..., 6 = Sat  (matches JS Date.getDay())
const DAYS = [
  { label: 'Su', value: 0 },
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
]

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

interface Props {
  selected: number[]
  onChange: (days: number[]) => void
}

export default function DayPicker({ selected, onChange }: Props) {
  const isDaily = selected.length === 7

  function toggleDay(day: number) {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day).sort((a, b) => a - b))
    } else {
      onChange([...selected, day].sort((a, b) => a - b))
    }
  }

  return (
    <View>
      {/* Day pills */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        {DAYS.map(({ label, value }) => {
          const active = selected.includes(value)
          return (
            <TouchableOpacity
              key={value}
              onPress={() => toggleDay(value)}
              style={{
                flex: 1,
                aspectRatio: 1,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? '#d97706' : '#fff',
                borderWidth: 1,
                borderColor: active ? '#d97706' : '#e7e5e4',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: active ? '#fff' : '#a8a29e',
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Daily shortcut */}
      <TouchableOpacity
        onPress={() => onChange(ALL_DAYS)}
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: isDaily ? '#fef3c7' : '#fff',
          borderWidth: 1,
          borderColor: isDaily ? '#d97706' : '#e7e5e4',
        }}
      >
        <View style={{
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: isDaily ? '#d97706' : 'transparent',
          borderWidth: 1.5,
          borderColor: isDaily ? '#d97706' : '#a8a29e',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {isDaily && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />}
        </View>
        <Text style={{
          fontSize: 13,
          fontWeight: '600',
          color: isDaily ? '#d97706' : '#78716c',
        }}>
          Every day
        </Text>
      </TouchableOpacity>
    </View>
  )
}
