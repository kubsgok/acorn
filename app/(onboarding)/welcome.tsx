import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

const FEATURES = [
  { icon: 'pill' as const, color: '#b15f00', bg: '#fef3c7', text: 'Log every dose and build a streak' },
  { icon: 'tree-outline' as const, color: '#006e2d', bg: '#dcfce7', text: 'Grow a living forest as you stay on track' },
  { icon: 'chat-outline' as const, color: '#0058be', bg: '#dbeafe', text: 'Chat with your squirrel companion anytime' },
]

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}>

        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{
            width: 100, height: 100, borderRadius: 32,
            backgroundColor: '#fef3c7',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            shadowColor: '#b15f00', shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
          }}>
            <Text style={{ fontSize: 54 }}>🐿️</Text>
          </View>
          <Text style={{ fontSize: 34, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.5, textAlign: 'center' }}>
            Meet Acorn
          </Text>
          <Text style={{ fontSize: 16, color: '#554336', marginTop: 10, textAlign: 'center', lineHeight: 24 }}>
            Your squirrel companion who helps you{'\n'}stay on top of your medications.
          </Text>
        </View>

        {/* Feature list */}
        <View style={{ gap: 12, marginBottom: 48 }}>
          {FEATURES.map((f) => (
            <View key={f.text} style={{
              flexDirection: 'row', alignItems: 'center', gap: 16,
              backgroundColor: '#fff', borderRadius: 16,
              borderWidth: 1, borderColor: '#dbc2b0',
              padding: 16,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: f.bg,
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={{ fontSize: 14, color: '#1f1b17', fontWeight: '500', flex: 1, lineHeight: 20 }}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/name-squirrel')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#b15f00', borderRadius: 20,
            paddingVertical: 18, alignItems: 'center',
            shadowColor: '#b15f00', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Get started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
