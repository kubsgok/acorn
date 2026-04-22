import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 80 }}>🐿️</Text>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#1c1917', marginTop: 24, textAlign: 'center' }}>
          Meet Acorn
        </Text>
        <Text style={{ fontSize: 17, color: '#78716c', marginTop: 12, textAlign: 'center', lineHeight: 26 }}>
          Your squirrel companion who helps you stay on top of your medications. Every dose earns acorns. Every streak grows your forest.
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/name-squirrel')}
          style={{
            backgroundColor: '#d97706', borderRadius: 16, paddingVertical: 18,
            paddingHorizontal: 48, marginTop: 48
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Get started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
