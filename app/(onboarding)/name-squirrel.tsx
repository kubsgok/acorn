import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/stores/authStore'

const SUGGESTIONS = ['Pip', 'Hazel', 'Walnut', 'Chester', 'Nutmeg', 'Ember']

export default function NameSquirrel() {
  const setSquirrelName = useAuthStore((s) => s.setSquirrelName)
  const [name, setName] = useState('')

  function handleContinue() {
    const finalName = name.trim() || 'Acorn'
    setSquirrelName(finalName)
    router.push('/(onboarding)/add-medication')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 56 }}>

        {/* Header */}
        <View style={{
          width: 72, height: 72, borderRadius: 24,
          backgroundColor: '#fef3c7',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Text style={{ fontSize: 38 }}>🐿️</Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.3 }}>
          Name your squirrel
        </Text>
        <Text style={{ fontSize: 15, color: '#554336', marginTop: 8, marginBottom: 32, lineHeight: 22 }}>
          They'll cheer you on every single day.
        </Text>

        {/* Input */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginBottom: 8, marginLeft: 4 }}>
          Squirrel name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter a name..."
          placeholderTextColor="#a8a29e"
          maxLength={20}
          style={{
            backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
            fontSize: 16, color: '#1f1b17', marginBottom: 20,
          }}
        />

        {/* Suggestions */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#a8a29e', letterSpacing: 0.3, marginBottom: 12, marginLeft: 4 }}>
          Or pick one
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {SUGGESTIONS.map((s) => {
            const active = name === s
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setName(s)}
                style={{
                  paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99,
                  backgroundColor: active ? '#b15f00' : '#fff',
                  borderWidth: 1, borderColor: active ? '#b15f00' : '#dbc2b0',
                }}
              >
                <Text style={{ color: active ? '#fff' : '#554336', fontWeight: '600', fontSize: 14 }}>{s}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#b15f00', borderRadius: 20,
            paddingVertical: 16, alignItems: 'center', marginBottom: 16,
            shadowColor: '#b15f00', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
