import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ForestIntroContent } from '../../src/components/ForestIntro'

// Final onboarding step: introduces the tree-forest feature, then lands the
// user on the Forest tab.
export default function ForestIntroScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 40, justifyContent: 'center' }}>
        <ForestIntroContent />
      </ScrollView>
      <View style={{ paddingHorizontal: 28, paddingBottom: 32 }}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/forest')}
          style={{ backgroundColor: '#b15f00', borderRadius: 16, padding: 18, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Enter your forest</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
