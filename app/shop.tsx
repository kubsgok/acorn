import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../src/lib/supabase'
import { SHOP_CATALOG, ShopItem } from '../src/lib/shopCatalog'
import { ITEM_IMAGES } from '../src/lib/forestStages'
import { useAuthStore } from '../src/stores/authStore'
import { useAcornStore } from '../src/stores/acornStore'

export default function ShopScreen() {
  const user = useAuthStore((s) => s.user)
  const balance = useAcornStore((s) => s.balance)
  const loadAcorns = useAcornStore((s) => s.load)
  const spendAcorns = useAcornStore((s) => s.spendAcorns)
  const addAcorns = useAcornStore((s) => s.addAcorns)
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([])
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null)
  const [buying, setBuying] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadAcorns(user.id)
    supabase
      .from('forest_items')
      .select('item_id')
      .eq('user_id', user.id)
      .then(({ data }) => setOwnedItemIds((data ?? []).map((r) => r.item_id)))
  }, [user, loadAcorns])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  async function buy(item: ShopItem) {
    if (!user || buying) return
    setBuying(true)
    const ok = await spendAcorns(user.id, item.price)
    if (ok) {
      await supabase.from('forest_items').insert({ user_id: user.id, item_id: item.id })
      setOwnedItemIds((prev) => [...prev, item.id])
      showToast(`${item.emoji} ${item.name} added to your den!`)
    } else {
      showToast('Not enough acorns yet — keep logging!')
    }
    setBuying(false)
    setConfirmItem(null)
  }

  // DEV/demo: long-press an owned item to un-buy it (refunds acorns) — remove before release
  async function unpurchase(item: ShopItem) {
    if (!user) return
    await supabase.from('forest_items').delete().eq('user_id', user.id).eq('item_id', item.id)
    await addAcorns(user.id, item.price)
    setOwnedItemIds((prev) => prev.filter((id) => id !== item.id))
    showToast(`↩︎ ${item.name} refunded (demo)`)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      {/* Toast */}
      {toast && (
        <View style={{
          position: 'absolute', top: 70, alignSelf: 'center', zIndex: 99,
          backgroundColor: '#5b4332', borderRadius: 24,
          paddingHorizontal: 20, paddingVertical: 10,
        }}>
          <Text style={{ color: '#f7ede2', fontWeight: '700', fontSize: 14 }}>{toast}</Text>
        </View>
      )}

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="chevron-down" size={24} color="#554336" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1f1b17' }}>Shop</Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          backgroundColor: '#fef3c7', borderRadius: 20,
          paddingHorizontal: 12, paddingVertical: 6,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>🌰 {balance}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 14, color: '#554336', marginBottom: 16 }}>
          Spend your acorns on cozy decorations for your den.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {SHOP_CATALOG.map((item) => {
            const owned = ownedItemIds.includes(item.id)
            const affordable = balance >= item.price
            return (
              <View key={item.id} style={{
                width: '48%', backgroundColor: '#fff', borderRadius: 20,
                padding: 16, marginBottom: 14, alignItems: 'center',
                borderWidth: 1, borderColor: '#dbc2b0',
              }}>
                <Image source={ITEM_IMAGES[item.id]} style={{ width: 72, height: 72, marginBottom: 8 }} resizeMode="contain" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1f1b17', textAlign: 'center' }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#8d4b00', marginTop: 4, marginBottom: 12 }}>
                  🌰 {item.price}
                </Text>
                {owned ? (
                  <TouchableOpacity
                    onLongPress={() => unpurchase(item)}
                    delayLongPress={500}
                    style={{
                      backgroundColor: '#dcfce7', borderRadius: 12,
                      paddingVertical: 9, alignSelf: 'stretch', alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#006e2d' }}>Owned</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setConfirmItem(item)}
                    disabled={!affordable}
                    style={{
                      backgroundColor: affordable ? '#b15f00' : '#e7dbd0',
                      borderRadius: 12, paddingVertical: 9,
                      alignSelf: 'stretch', alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: affordable ? '#fff' : '#a8a29e' }}>
                      Buy
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* Confirm purchase sheet */}
      <Modal visible={!!confirmItem} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: 40,
          }}>
            {confirmItem && (
              <Image
                source={ITEM_IMAGES[confirmItem.id]}
                style={{ width: 84, height: 84, alignSelf: 'center', marginBottom: 12 }}
                resizeMode="contain"
              />
            )}
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1c1917', textAlign: 'center' }}>
              Buy {confirmItem?.name}?
            </Text>
            <Text style={{ fontSize: 14, color: '#78716c', textAlign: 'center', marginTop: 8, marginBottom: 28, lineHeight: 20 }}>
              This will spend 🌰 {confirmItem?.price} of your {balance} acorns.
            </Text>
            <TouchableOpacity
              onPress={() => confirmItem && buy(confirmItem)}
              disabled={buying}
              style={{
                backgroundColor: '#b15f00', borderRadius: 14,
                padding: 16, alignItems: 'center', marginBottom: 10,
              }}
            >
              {buying
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Yes, buy it</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setConfirmItem(null)}
              style={{ padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#a8a29e', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
