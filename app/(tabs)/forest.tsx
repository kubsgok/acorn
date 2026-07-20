import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { supabase } from '../../src/lib/supabase'
import { recomputeStreak } from '../../src/lib/streaks'
import {
  STAGES,
  SLOTS_BY_STAGE,
  SLOT_COUNT,
  SQUIRREL_ANCHORS,
  ITEM_IMAGES,
  currentStageIndex,
  stageProgress,
} from '../../src/lib/forestStages'
import { shopItemById } from '../../src/lib/shopCatalog'
import { ForestSquirrel } from '../../src/components/ForestSquirrel'
import { StageCelebration } from '../../src/components/StageCelebration'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'

const ITEM_WIDTH = 0.15 // placed decoration width, fraction of scene
const CELEBRATED_STAGE_KEY = 'acorn:lastCelebratedStage'

interface ForestItemRow {
  id: string
  item_id: string
  grid_x: number | null
}

function ProgressRing({ progress }: { progress: number }) {
  const size = 56
  const strokeWidth = 6
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#f3e3d3" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#b15f00" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(Math.max(progress, 0), 1))}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize: 18 }}>🍃</Text>
    </View>
  )
}

// Pulsing dashed circle shown at a free slot while in placement mode
function SlotMarker({ x, y, onPress }: { x: number; y: number; onPress: () => void }) {
  const pulse = useSharedValue(0.4)
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0.4, { duration: 600 })), -1, false)
  }, [pulse])
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }))
  const size = 0.13
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        left: `${(x - size / 2) * 100}%`,
        top: `${(y - size / 2) * 100}%`,
        width: `${size * 100}%`,
        aspectRatio: 1,
      }}
    >
      <Animated.View
        style={[
          {
            width: '100%', height: '100%', borderRadius: 999,
            borderWidth: 2.5, borderStyle: 'dashed', borderColor: '#fff',
            backgroundColor: 'rgba(255,255,255,0.3)',
          },
          style,
        ]}
      />
    </Pressable>
  )
}

export default function ForestScreen() {
  const user = useAuthStore((s) => s.user)
  const balance = useAcornStore((s) => s.balance)
  const currentStreak = useAcornStore((s) => s.currentStreak)
  const loadAcorns = useAcornStore((s) => s.load)
  const [rows, setRows] = useState<ForestItemRow[]>([])
  const [placing, setPlacing] = useState<ForestItemRow | null>(null)
  const [celebration, setCelebration] = useState<{ from: number; to: number } | null>(null)

  const sceneScale = useSharedValue(1)
  const sceneStyle = useAnimatedStyle(() => ({ transform: [{ scale: sceneScale.value }] }))

  useFocusEffect(useCallback(() => {
    if (!user) return
    let active = true
    ;(async () => {
      const [streak] = await Promise.all([recomputeStreak(user.id), loadAcorns(user.id)])
      const { data } = await supabase
        .from('forest_items')
        .select('id, item_id, grid_x')
        .eq('user_id', user.id)
      if (!active) return
      setRows((data ?? []) as ForestItemRow[])

      // Celebrate crossing into a new growth stage (once per stage)
      const idx = currentStageIndex(streak)
      const stored = await AsyncStorage.getItem(CELEBRATED_STAGE_KEY)
      if (!active) return
      if (stored === null) {
        await AsyncStorage.setItem(CELEBRATED_STAGE_KEY, String(idx))
      } else if (streak > 0 && idx > Number(stored)) {
        setCelebration({ from: Number(stored), to: idx })
        sceneScale.value = withSequence(withTiming(0.96, { duration: 140 }), withSpring(1, { damping: 9 }))
        await AsyncStorage.setItem(CELEBRATED_STAGE_KEY, String(idx))
      }
    })()
    return () => { active = false; setPlacing(null) }
  }, [user, loadAcorns, sceneScale]))

  const stageIndex = currentStageIndex(currentStreak)
  const stage = STAGES[stageIndex]
  const { progress, nextStage } = stageProgress(currentStreak)
  const slots = SLOTS_BY_STAGE[stageIndex]

  // grid_x ≥ SLOT_COUNT comes from an older build with more slots — treat as unplaced
  const placedRows = rows.filter(
    (r) => r.grid_x !== null && r.grid_x < SLOT_COUNT && ITEM_IMAGES[r.item_id]
  )
  const unplacedRows = rows.filter(
    (r) => (r.grid_x === null || r.grid_x >= SLOT_COUNT) && shopItemById(r.item_id)
  )
  const occupiedSlots = new Set(placedRows.map((r) => r.grid_x as number))

  // Painter's algorithm: draw back-to-front by feet position so items in
  // front of the squirrel correctly overlap it (and vice versa)
  const sceneObjects: ({ kind: 'squirrel'; y: number } | { kind: 'item'; row: ForestItemRow; y: number })[] = [
    { kind: 'squirrel' as const, y: SQUIRREL_ANCHORS[stageIndex].y },
    ...placedRows.map((row) => ({ kind: 'item' as const, row, y: slots[row.grid_x as number].y })),
  ].sort((a, b) => a.y - b.y)

  async function placeAt(slotIndex: number) {
    if (!placing) return
    await supabase.from('forest_items').update({ grid_x: slotIndex }).eq('id', placing.id)
    setRows((prev) => prev.map((r) => (r.id === placing.id ? { ...r, grid_x: slotIndex } : r)))
    setPlacing(null)
  }

  function promptPutAway(row: ForestItemRow) {
    if (placing) return
    const item = shopItemById(row.item_id)
    Alert.alert(item?.name ?? 'Decoration', 'Put this decoration away?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Put away',
        onPress: async () => {
          await supabase.from('forest_items').update({ grid_x: null }).eq('id', row.id)
          setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, grid_x: null } : r)))
        },
      },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.3 }}>
              Your Forest
            </Text>
            <Text style={{ fontSize: 14, color: '#554336', marginTop: 4 }}>
              Grows with every streak
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: '#fef3c7', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 6,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>🌰 {balance}</Text>
            </View>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: '#fff1e6', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 6,
            }}>
              <MaterialCommunityIcons name="fire" size={15} color="#b15f00" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>{currentStreak}d</Text>
            </View>
          </View>
        </View>

        {/* Forest scene */}
        {currentStreak === 0 ? (
          <View
            style={{
              borderRadius: 24, overflow: 'hidden', marginBottom: 20,
              aspectRatio: 1, backgroundColor: '#f0e6da',
            }}
          >
            <Image
              source={stage.image}
              style={{ width: '100%', height: '100%', opacity: 0.35 }}
              resizeMode="cover"
            />
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center', padding: 24,
            }}>
              <Text style={{ fontSize: 44 }}>🌱</Text>
              <Text style={{
                color: '#554336', fontWeight: '700', marginTop: 12,
                textAlign: 'center', fontSize: 15, lineHeight: 22,
              }}>
                Log all your doses today to{'\n'}start growing your forest
              </Text>
            </View>
          </View>
        ) : (
          <Animated.View style={[
            {
              borderRadius: 24, overflow: 'hidden', marginBottom: 20,
              aspectRatio: 1, backgroundColor: '#f0e6da',
            },
            sceneStyle,
          ]}>
            <Image source={stage.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />

            {/* Placed decorations + squirrel, back-to-front */}
            {sceneObjects.map((obj) => {
              if (obj.kind === 'squirrel') {
                return <ForestSquirrel key="squirrel" anchor={SQUIRREL_ANCHORS[stageIndex]} />
              }
              const slot = slots[obj.row.grid_x as number]
              return (
                <Pressable
                  key={obj.row.id}
                  onPress={() => promptPutAway(obj.row)}
                  style={{
                    position: 'absolute',
                    left: `${(slot.x - ITEM_WIDTH / 2) * 100}%`,
                    top: `${(slot.y - ITEM_WIDTH) * 100}%`,
                    width: `${ITEM_WIDTH * 100}%`,
                    aspectRatio: 1,
                  }}
                >
                  <Image
                    source={ITEM_IMAGES[obj.row.item_id]}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </Pressable>
              )
            })}

            {/* Placement targets */}
            {placing && slots.map((slot, i) =>
              occupiedSlots.has(i) ? null : (
                <SlotMarker key={i} x={slot.x} y={slot.y} onPress={() => placeAt(i)} />
              )
            )}

            {/* Placement banner */}
            {placing && (
              <View style={{
                position: 'absolute', top: 12, left: 12, right: 12,
                backgroundColor: 'rgba(91,67,50,0.92)', borderRadius: 14,
                paddingHorizontal: 14, paddingVertical: 10,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Text style={{ color: '#f7ede2', fontWeight: '700', fontSize: 13, flex: 1 }}>
                  Placing {shopItemById(placing.item_id)?.emoji} {shopItemById(placing.item_id)?.name} — tap a glowing spot
                </Text>
                <TouchableOpacity onPress={() => setPlacing(null)} style={{ marginLeft: 10 }}>
                  <Text style={{ color: '#f7ede2', fontWeight: '800', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Streak badge */}
            {!placing && (
              <View style={{
                position: 'absolute', bottom: 14, left: 14,
                backgroundColor: '#5b4332', borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 7,
                borderWidth: 2, borderColor: '#3f2d20',
              }}>
                <Text style={{ color: '#f7ede2', fontWeight: '800', fontSize: 12, letterSpacing: 0.8 }}>
                  {currentStreak} DAY STREAK
                </Text>
              </View>
            )}

            {celebration && (
              <StageCelebration
                fromEmoji={STAGES[celebration.from].emoji}
                toEmoji={STAGES[celebration.to].emoji}
                onDone={() => setCelebration(null)}
              />
            )}
          </Animated.View>
        )}

        {/* Keep going card */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 16,
          borderWidth: 1, borderColor: '#dbc2b0', marginBottom: 14,
          flexDirection: 'row', alignItems: 'center', gap: 14,
        }}>
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: '#fdf6ec', alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24 }}>🌱</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f1b17' }}>
              {currentStreak === 0 ? 'Start today!' : 'Keep going!'}
            </Text>
            <Text style={{ fontSize: 14, color: '#554336', marginTop: 3 }}>
              {nextStage === null ? (
                'Your forest is fully grown'
              ) : currentStreak === 0 ? (
                'One perfect day plants your sprout'
              ) : (
                <>You're on a <Text style={{ color: '#b15f00', fontWeight: '700' }}>{currentStreak} day streak</Text></>
              )}
            </Text>
          </View>
          <ProgressRing progress={progress} />
        </View>

        {/* Shop card */}
        <TouchableOpacity
          onPress={() => router.push('/shop')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 16,
            borderWidth: 1, borderColor: '#dbc2b0', marginBottom: 14,
            flexDirection: 'row', alignItems: 'center', gap: 14,
          }}
        >
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: '#fff1e6', alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialCommunityIcons name="shopping-outline" size={22} color="#b15f00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f1b17' }}>Shop</Text>
            <Text style={{ fontSize: 14, color: '#554336', marginTop: 3 }}>Decorate your forest</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#a8a29e" />
        </TouchableOpacity>

        {/* Forest progress */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 16,
          borderWidth: 1, borderColor: '#dbc2b0', marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f1b17' }}>Forest Progress</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#8d4b00' }}>🌰 {balance} acorns saved</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {STAGES.map((s, i) => {
              const isCurrent = i === stageIndex && currentStreak > 0
              const reached = currentStreak >= s.minStreak
              return (
                <View key={s.minStreak} style={{ flexDirection: 'row', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 0 }}>
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{
                      width: 46, height: 46, borderRadius: 14,
                      backgroundColor: isCurrent ? '#fdeed8' : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 24, opacity: reached ? 1 : 0.35 }}>{s.emoji}</Text>
                    </View>
                    <Text style={{
                      fontSize: 11, fontWeight: isCurrent ? '700' : '500',
                      color: isCurrent ? '#b15f00' : reached ? '#554336' : '#a8a29e',
                    }}>
                      {s.label}
                    </Text>
                  </View>
                  {i < STAGES.length - 1 && (
                    <View style={{ flex: 1, alignItems: 'center', marginBottom: 18 }}>
                      <MaterialCommunityIcons name="chevron-right" size={14} color="#d6c7ba" />
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Unplaced decorations */}
        {unplacedRows.length > 0 && (
          <View style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 16,
            borderWidth: 1, borderColor: '#dbc2b0',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f1b17' }}>
              Your Decorations
            </Text>
            <Text style={{ fontSize: 13, color: '#554336', marginTop: 3, marginBottom: 14 }}>
              Tap an item, then tap a glowing spot in your forest
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {unplacedRows.map((row) => {
                const item = shopItemById(row.item_id)!
                const selected = placing?.id === row.id
                return (
                  <Pressable
                    key={row.id}
                    onPress={() => {
                      if (currentStreak === 0) {
                        Alert.alert('Grow your forest first', 'Log all of today\'s doses to start your streak, then decorate!')
                        return
                      }
                      setPlacing(selected ? null : row)
                    }}
                    style={{
                      alignItems: 'center', gap: 6,
                      backgroundColor: selected ? '#fdeed8' : '#fdf6ec',
                      borderRadius: 14,
                      borderWidth: selected ? 2 : 0, borderColor: '#b15f00',
                      paddingHorizontal: 12, paddingVertical: 10, minWidth: 76,
                    }}
                  >
                    <Image source={ITEM_IMAGES[row.item_id]} style={{ width: 44, height: 44 }} resizeMode="contain" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#554336', textAlign: 'center' }}>
                      {item.name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
