import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/stores/authStore'

const SUGGESTIONS = ['Pip', 'Hazel', 'Walnut', 'Chester']

export default function NameSquirrel() {
  const setSquirrelName = useAuthStore((s) => s.setSquirrelName)
  const [name, setName] = useState('')

  function handleContinue() {
    const finalName = name.trim() || 'Acorn'
    setSquirrelName(finalName)
    router.push('/(onboarding)/add-medication')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 48 }}>
        <Text style={{ fontSize: 40 }}>🐿️</Text>
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#1c1917', marginTop: 16 }}>
          Name your squirrel
        </Text>
        <Text style={{ fontSize: 15, color: '#78716c', marginTop: 8, marginBottom: 32 }}>
          They'll cheer you on every day.
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter a name..."
          placeholderTextColor="#a8a29e"
          maxLength={20}
          style={{
            borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12,
            padding: 14, fontSize: 16, backgroundColor: '#fff', marginBottom: 16
          }}
        />

        <Text style={{ fontSize: 13, color: '#a8a29e', marginBottom: 10 }}>Or pick one:</Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setName(s)}
              style={{
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                backgroundColor: name === s ? '#d97706' : '#fff',
                borderWidth: 1, borderColor: name === s ? '#d97706' : '#e7e5e4'
              }}
            >
              <Text style={{ color: name === s ? '#fff' : '#44403c', fontWeight: '600' }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleContinue}
          style={{ backgroundColor: '#d97706', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
