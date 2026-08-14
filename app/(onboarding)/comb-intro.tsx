import { View, Text, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Eyebrow, IconTile, PrimaryButton, softShadow } from '../../src/components/onboardingUI'

// The three COM-B levers, explained in plain language.
const PILLARS = [
  { icon: 'book-open-outline' as const, tint: '#b15f00', bg: '#fef3c7', title: 'Capability', body: 'Knowing what your medication does and remembering to take it' },
  { icon: 'account-heart-outline' as const, tint: '#0058be', bg: '#dbeafe', title: 'Opportunity', body: 'The support, time, and resources around you' },
  { icon: 'lightning-bolt-outline' as const, tint: '#006e2d', bg: '#dcfce7', title: 'Motivation', body: 'The drive to stay consistent day after day' },
]

export default function CombIntro() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(650)}>
          <IconTile><MaterialCommunityIcons name="clipboard-text-outline" size={34} color="#b15f00" /></IconTile>
          <View style={{ marginTop: 22 }}>
            <Eyebrow label="Quick assessment" />
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.5, lineHeight: 36 }}>
            An app that truly works for you
          </Text>
          <Text style={{ fontSize: 15, color: '#554336', marginTop: 10, lineHeight: 23 }}>
            Everyone deserves an adherence app that actually works. That's why Acorn starts with a short assessment based on the COM-B framework — so your experience is tailored to you.
          </Text>
        </Animated.View>

        <View style={{ gap: 12, marginTop: 30 }}>
          {PILLARS.map((p, i) => (
            <Animated.View
              key={p.title}
              entering={FadeInDown.duration(600).delay(180 + i * 110)}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 20, padding: 16 }, softShadow]}
            >
              <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MaterialCommunityIcons name={p.icon} size={22} color={p.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1f1b17' }}>{p.title}</Text>
                <Text style={{ fontSize: 13, color: '#554336', marginTop: 2, lineHeight: 18 }}>{p.body}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <Animated.View entering={FadeInDown.duration(600).delay(540)} style={{ marginTop: 28 }}>
          <PrimaryButton label="Start assessment" onPress={() => router.push('/(onboarding)/comb-assessment')} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}
