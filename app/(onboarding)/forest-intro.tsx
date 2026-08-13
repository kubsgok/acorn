import { View, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { ForestIntroContent } from '../../src/components/ForestIntro'
import { useT } from '../../src/lib/i18n'
import { PrimaryButton } from '../../src/components/onboardingUI'

// Onboarding step: introduces the tree-forest feature, then continues to the
// den explainer.
export default function ForestIntroScreen() {
  const { t } = useT()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 40, justifyContent: 'center' }}>
        <Animated.View entering={FadeInDown.duration(650)}>
          <ForestIntroContent />
        </Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: 28, paddingBottom: 32 }}>
        <PrimaryButton label={t('common.next')} onPress={() => router.push('/(onboarding)/den-intro')} />
      </View>
    </SafeAreaView>
  )
}
