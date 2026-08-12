import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DenIntroContent } from '../../src/components/DenIntro'
import { useT } from '../../src/lib/i18n'

// Onboarding step: introduces the den (decorate-your-room) feature, then lands
// the user on the Forest tab.
export default function DenIntroScreen() {
  const { t } = useT()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 40, justifyContent: 'center' }}>
        <DenIntroContent />
      </ScrollView>
      <View style={{ paddingHorizontal: 28, paddingBottom: 32 }}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/forest')}
          style={{ backgroundColor: '#b15f00', borderRadius: 16, padding: 18, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{t('intro.den.cta')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
