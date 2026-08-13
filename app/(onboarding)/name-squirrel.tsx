import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useAuthStore } from '../../src/stores/authStore'
import { useT } from '../../src/lib/i18n'
import { Eyebrow, IconTile, StepDots, PrimaryButton } from '../../src/components/onboardingUI'

const SUGGESTIONS = ['Pip', 'Hazel', 'Walnut', 'Chester', 'Nutmeg', 'Ember']

export default function NameSquirrel() {
  const { t } = useT()
  const setSquirrelName = useAuthStore((s) => s.setSquirrelName)
  const [name, setName] = useState('')

  function handleContinue() {
    const finalName = name.trim() || 'Acorn'
    setSquirrelName(finalName)
    router.push('/(onboarding)/add-medication')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 48 }}>

        {/* Header */}
        <StepDots step={1} total={5} style={{ marginBottom: 28 }} />
        <Animated.View entering={FadeInDown.duration(600)}>
          <IconTile><Text style={{ fontSize: 38 }}>🐿️</Text></IconTile>
          <View style={{ marginTop: 22 }}>
            <Eyebrow label={t('ob.step', { n: 2, total: 5 })} />
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.5 }}>
            {t('squirrel.title')}
          </Text>
          <Text style={{ fontSize: 15, color: '#554336', marginTop: 8, marginBottom: 32, lineHeight: 22 }}>
            {t('squirrel.subtitle')}
          </Text>
        </Animated.View>

        {/* Input */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#554336', letterSpacing: 0.3, marginBottom: 8, marginLeft: 4 }}>
          {t('squirrel.label')}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('squirrel.placeholder')}
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
          {t('squirrel.pickOne')}
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

        <PrimaryButton label={t('common.continue')} onPress={handleContinue} style={{ marginBottom: 16 }} />
      </View>
    </SafeAreaView>
  )
}
