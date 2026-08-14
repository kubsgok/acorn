import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useAuthStore } from '../../src/stores/authStore'
import { supabase } from '../../src/lib/supabase'
import { Eyebrow, IconTile, PrimaryButton, PressableScale, softShadow } from '../../src/components/onboardingUI'

// Each barrier maps to a COM-B component so the response can tailor the
// experience later. `id` is the stable value stored in users.comb_barriers.
const BARRIERS: { id: string; comb: 'capability' | 'opportunity' | 'motivation'; text: string }[] = [
  { id: 'reliance', comb: 'opportunity', text: 'I rely on someone else to give me my medications' },
  { id: 'purpose', comb: 'capability', text: "I don't understand what the medication is for" },
  { id: 'belief', comb: 'motivation', text: "I don't think the medication will help me" },
  { id: 'no-teacher', comb: 'capability', text: "I don't have anyone to teach me about my medication" },
  { id: 'forget-restock', comb: 'capability', text: 'I forget to restock my supply' },
  { id: 'restock-physical', comb: 'opportunity', text: "It's difficult to restock because of my physical condition" },
  { id: 'restock-financial', comb: 'opportunity', text: "It's difficult to restock because of financial struggles" },
  { id: 'help-discomfort', comb: 'opportunity', text: "I don't feel comfortable asking for help with my medication" },
  { id: 'low-motivation', comb: 'motivation', text: "I'm not motivated to stay consistent" },
  { id: 'no-need', comb: 'motivation', text: "I don't think I need to be consistent" },
  { id: 'lifestyle', comb: 'motivation', text: "It's hard to stay consistent with my current lifestyle and habits" },
]

export default function CombAssessment() {
  const user = useAuthStore((s) => s.user)
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleContinue() {
    setSaving(true)
    try {
      if (user) {
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          comb_barriers: selected.length > 0 ? selected : null,
        })
      }
    } catch {
      // Non-blocking — continue onboarding even if the save hiccups.
    } finally {
      setSaving(false)
      router.push('/(onboarding)/about-you')
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 44, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <IconTile><MaterialCommunityIcons name="head-heart-outline" size={34} color="#b15f00" /></IconTile>
          <View style={{ marginTop: 20 }}>
            <Eyebrow label="Select all that apply" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.4, lineHeight: 32 }}>
            I sometimes miss my doses because…
          </Text>
          <Text style={{ fontSize: 14, color: '#a8a29e', marginTop: 8, marginBottom: 22 }}>
            There are no wrong answers — this just helps us understand you.
          </Text>
        </Animated.View>

        {BARRIERS.map((b, i) => {
          const active = selected.includes(b.id)
          return (
            <Animated.View key={b.id} entering={FadeInDown.duration(420).delay(Math.min(i * 45, 380))}>
              <PressableScale
                onPress={() => toggle(b.id)}
                style={[
                  {
                    backgroundColor: active ? '#fdf1e2' : '#fff',
                    borderRadius: 18, marginBottom: 10,
                    borderWidth: 1.5, borderColor: active ? '#e6b877' : '#f1e7db',
                  },
                  active ? null : softShadow,
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 16 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    borderWidth: 2, borderColor: active ? '#b15f00' : '#e2d6c9',
                    backgroundColor: active ? '#b15f00' : 'transparent',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {active && <MaterialCommunityIcons name="check" size={15} color="#fff" />}
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: '#1f1b17', fontWeight: active ? '600' : '500' }}>
                    {b.text}
                  </Text>
                </View>
              </PressableScale>
            </Animated.View>
          )
        })}

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ marginTop: 18 }}>
          <PrimaryButton label={saving ? 'Saving…' : 'Continue'} onPress={handleContinue} loading={saving} />
          <Text style={{ fontSize: 12, color: '#a8a29e', textAlign: 'center', marginTop: 12 }}>
            {selected.length > 0 ? `${selected.length} selected` : 'You can skip if none apply'}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}
