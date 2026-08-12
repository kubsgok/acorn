import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { supabase } from '../src/lib/supabase'
import { TREE_CATALOG, TreeSpecies } from '../src/lib/treeCatalog'
import { useAuthStore } from '../src/stores/authStore'
import { useAcornStore } from '../src/stores/acornStore'

// Buy a tree → it's planted in the grove immediately (placed_at = now starts
// its growth) at a free spot; the user can reposition it on the Forest tab.
export default function TreeShopScreen() {
  const user = useAuthStore((s) => s.user)
  const balance = useAcornStore((s) => s.balance)
  const loadAcorns = useAcornStore((s) => s.load)
  const spendAcorns = useAcornStore((s) => s.spendAcorns)
  const [plantedCount, setPlantedCount] = useState(0)
  const [confirm, setConfirm] = useState<TreeSpecies | null>(null)
  const [buying, setBuying] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadAcorns(user.id)
    supabase
      .from('forest_items')
      .select('item_id')
      .eq('user_id', user.id)
      .then(({ data }) => setPlantedCount((data ?? []).filter((r) => r.item_id.startsWith('tree-')).length))
  }, [user, loadAcorns])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  async function buy(species: TreeSpecies) {
    if (!user || buying) return
    setBuying(true)
    const ok = await spendAcorns(user.id, species.price)
    if (ok) {
      // Goes to the "Your Trees" inventory (grid null); the user plants it in the grove.
      await supabase.from('forest_items').insert({
        user_id: user.id,
        item_id: species.id,
        grid_x: null,
        grid_y: null,
      })
      setPlantedCount((c) => c + 1)
      showToast(`${species.emoji} ${species.name} added to Your Trees!`)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      showToast('Not enough acorns yet — keep logging!')
    }
    setBuying(false)
    setConfirm(null)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      {toast && (
        <View style={{
          position: 'absolute', top: 70, alignSelf: 'center', zIndex: 99,
          backgroundColor: '#3f5533', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 10,
        }}>
          <Text style={{ color: '#f2f7ec', fontWeight: '700', fontSize: 14 }}>{toast}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0', alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="chevron-down" size={24} color="#554336" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1f1b17' }}>Plant a Tree</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>🌰 {balance}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 14, color: '#554336', marginBottom: 16 }}>
          Buy a tree and it's planted in your grove. Stay consistent and it grows.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {TREE_CATALOG.map((species) => {
            const affordable = balance >= species.price
            return (
              <View key={species.id} style={{ width: '48%', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: '#dbc2b0' }}>
                <Image source={species.stages[0]} style={{ width: 72, height: 72, marginBottom: 8 }} resizeMode="contain" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1f1b17', textAlign: 'center' }}>{species.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#8d4b00', marginTop: 4, marginBottom: 12 }}>🌰 {species.price}</Text>
                <TouchableOpacity
                  onPress={() => setConfirm(species)}
                  disabled={!affordable}
                  style={{ backgroundColor: affordable ? '#3f7d34' : '#e7dbd0', borderRadius: 12, paddingVertical: 9, alignSelf: 'stretch', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: affordable ? '#fff' : '#a8a29e' }}>Plant</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <Modal visible={!!confirm} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 }}>
            {confirm && (
              <Image source={confirm.stages[0]} style={{ width: 84, height: 84, alignSelf: 'center', marginBottom: 12 }} resizeMode="contain" />
            )}
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1c1917', textAlign: 'center' }}>Plant {confirm?.name}?</Text>
            <Text style={{ fontSize: 14, color: '#78716c', textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 20 }}>
              This spends 🌰 {confirm?.price} of your {balance} acorns and plants a sapling in your grove.
            </Text>
            <TouchableOpacity
              onPress={() => confirm && buy(confirm)}
              disabled={buying}
              style={{ backgroundColor: '#3f7d34', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 }}
            >
              {buying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Yes, plant it</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConfirm(null)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#a8a29e', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
