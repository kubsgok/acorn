import { View, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { DenIntroContent } from '../../src/components/DenIntro'
import { useT } from '../../src/lib/i18n'
import { PrimaryButton } from '../../src/components/onboardingUI'

// Onboarding step: introduces the den (decorate-your-room) feature, then lands
// the user on the Forest tab.
export default function DenIntroScreen() {
  const { t } = useT()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 40, justifyContent: 'center' }}>
        <Animated.View entering={FadeInDown.duration(650)}>
          <DenIntroContent />
        </Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: 28, paddingBottom: 32 }}>
        <PrimaryButton label={t('intro.den.cta')} onPress={() => router.replace('/(tabs)/forest')} />
      </View>
    </SafeAreaView>
  )
}
