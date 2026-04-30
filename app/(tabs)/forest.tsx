import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAcornStore } from '../../src/stores/acornStore'

export default function ForestScreen() {
  const balance = useAcornStore((s) => s.balance)
  const currentStreak = useAcornStore((s) => s.currentStreak)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>

        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.3 }}>
          Your Forest
        </Text>
        <Text style={{ fontSize: 14, color: '#554336', marginTop: 4, marginBottom: 28 }}>
          Grows with every streak
        </Text>

        {/* Forest canvas */}
        <View style={{
          backgroundColor: '#f0fdf4',
          borderRadius: 24, padding: 24,
          alignItems: 'center', marginBottom: 20, minHeight: 220,
          borderWidth: 1, borderColor: '#bbf7d0', justifyContent: 'center',
        }}>
          {currentStreak === 0 ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 52 }}>🌱</Text>
              <Text style={{
                color: '#166534', fontWeight: '600', marginTop: 12,
                textAlign: 'center', fontSize: 15, lineHeight: 22,
              }}>
                Start your streak to grow{'\n'}your forest
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end' }}>
                {currentStreak >= 1  && <Text style={{ fontSize: 38 }}>🌱</Text>}
                {currentStreak >= 3  && <Text style={{ fontSize: 38 }}>🌿</Text>}
                {currentStreak >= 7  && <Text style={{ fontSize: 38 }}>🌲</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end' }}>
                {currentStreak >= 14 && <Text style={{ fontSize: 38 }}>🌳</Text>}
                {currentStreak >= 30 && <Text style={{ fontSize: 38 }}>🏡</Text>}
                <Text style={{ fontSize: 38 }}>🐿️</Text>
              </View>
            </View>
          )}
        </View>

        {/* Acorn balance chip */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#fef3c7', borderRadius: 99,
          paddingHorizontal: 18, paddingVertical: 10,
          alignSelf: 'center', marginBottom: 24,
          borderWidth: 1, borderColor: '#fde68a',
        }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#8d4b00' }}>🌰 {balance} acorns saved</Text>
        </View>

        {/* Unlocks list */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 20,
          borderWidth: 1, borderColor: '#dbc2b0',
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#554336', letterSpacing: 0.3,
            textTransform: 'uppercase', marginBottom: 16 }}>
            Forest unlocks
          </Text>
          {[
            { streak:  1, emoji: '🌱', label: 'Sprout' },
            { streak:  3, emoji: '🌿', label: 'Fern' },
            { streak:  7, emoji: '🌲', label: 'Pine tree' },
            { streak: 14, emoji: '🌳', label: 'Oak tree' },
            { streak: 30, emoji: '🏡', label: 'Cabin' },
          ].map((item, i, arr) => {
            const unlocked = currentStreak >= item.streak
            return (
              <View key={item.streak} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 10,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: '#f5f0ec',
              }}>
                <Text style={{ fontSize: 22, opacity: unlocked ? 1 : 0.3 }}>{item.emoji}</Text>
                <Text style={{
                  fontSize: 15, flex: 1, fontWeight: '600',
                  color: unlocked ? '#1f1b17' : '#a8a29e',
                }}>
                  {item.label}
                </Text>
                {unlocked ? (
                  <View style={{
                    backgroundColor: '#dcfce7', borderRadius: 99,
                    paddingHorizontal: 10, paddingVertical: 4,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#006e2d' }}>Unlocked</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: '#a8a29e', fontWeight: '500' }}>
                    {item.streak}d streak
                  </Text>
                )}
              </View>
            )
          })}
        </View>

      </View>
    </SafeAreaView>
  )
}
