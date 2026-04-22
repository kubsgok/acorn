import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAcornStore } from '../../src/stores/acornStore'

export default function ForestScreen() {
  const balance = useAcornStore((s) => s.balance)
  const currentStreak = useAcornStore((s) => s.currentStreak)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1c1917', marginBottom: 8 }}>Your Forest</Text>
        <Text style={{ fontSize: 13, color: '#78716c', marginBottom: 32 }}>Grows with every streak</Text>

        {/* Placeholder forest grid */}
        <View style={{
          backgroundColor: '#dcfce7', borderRadius: 20, padding: 24,
          alignItems: 'center', marginBottom: 24, minHeight: 220,
          borderWidth: 1, borderColor: '#bbf7d0', justifyContent: 'center'
        }}>
          {currentStreak === 0 ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>🌱</Text>
              <Text style={{ color: '#166534', fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                Start your streak to grow your forest
              </Text>
            </View>
          ) : (
            <View>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                {currentStreak >= 1 && <Text style={{ fontSize: 36 }}>🌱</Text>}
                {currentStreak >= 3 && <Text style={{ fontSize: 36 }}>🌿</Text>}
                {currentStreak >= 7 && <Text style={{ fontSize: 36 }}>🌲</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {currentStreak >= 14 && <Text style={{ fontSize: 36 }}>🌳</Text>}
                {currentStreak >= 30 && <Text style={{ fontSize: 36 }}>🏡</Text>}
                <Text style={{ fontSize: 36 }}>🐿️</Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e7e5e4' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 12 }}>Forest unlocks</Text>
          {[
            { streak: 1, emoji: '🌱', label: 'Sprout' },
            { streak: 3, emoji: '🌿', label: 'Fern' },
            { streak: 7, emoji: '🌲', label: 'Pine tree' },
            { streak: 14, emoji: '🌳', label: 'Oak tree' },
            { streak: 30, emoji: '🏡', label: 'Cabin' },
          ].map((item) => {
            const unlocked = currentStreak >= item.streak
            return (
              <View key={item.streak} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 20, opacity: unlocked ? 1 : 0.3 }}>{item.emoji}</Text>
                <Text style={{ fontSize: 14, color: unlocked ? '#1c1917' : '#a8a29e', flex: 1 }}>{item.label}</Text>
                <Text style={{ fontSize: 12, color: '#a8a29e' }}>{item.streak}d streak</Text>
              </View>
            )
          })}
        </View>
      </View>
    </SafeAreaView>
  )
}
