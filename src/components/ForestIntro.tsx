import { View, Text } from 'react-native'

// Shared explainer content for the tree-forest feature. Used both as an
// onboarding step and as the (i) info modal on the Forest tab.
export function ForestIntroContent() {
  const rows = [
    { emoji: '🌱', title: 'Stay consistent, grow your tree', body: 'Take all your meds each day and your tree grows through the seasons. Miss a day and it wilts back — so keep the streak alive.' },
    { emoji: '🌰', title: 'Earn acorns', body: 'Every dose you log earns acorns, and streak milestones award bonus acorns.' },
    { emoji: '🌳', title: 'Plant a forest', body: 'Spend acorns on tree species and plant them in your grove. Planted trees grow a stage for every day you stay on track.' },
  ]
  return (
    <View>
      <Text style={{ fontSize: 40, textAlign: 'center' }}>🌲</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#1f1b17', textAlign: 'center', marginTop: 8 }}>
        Grow your Forest
      </Text>
      <Text style={{ fontSize: 14, color: '#78716c', textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 }}>
        Your forest is a living reward for taking care of yourself.
      </Text>
      <View style={{ gap: 16 }}>
        {rows.map((r) => (
          <View key={r.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 26 }}>{r.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1f1b17' }}>{r.title}</Text>
              <Text style={{ fontSize: 13, color: '#554336', marginTop: 2, lineHeight: 19 }}>{r.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
