import { useCallback, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Pressable, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import Svg, { Circle } from 'react-native-svg'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { supabase } from '../../src/lib/supabase'
import { recomputeStreak } from '../../src/lib/streaks'
import { STAGES, ROOM_IMAGE, ITEM_IMAGES, ITEM_SHADOWS, ITEM_SIZES, currentStageIndex, stageProgress } from '../../src/lib/forestStages'
import {
  ScenePos,
  SQUIRREL_ANCHOR,
  ROOM_ZOOM,
  ROOM_PIVOT_Y,
  toDisplay,
  fromDisplay,
  clampToRegion,
  depthFor,
  gridToPos,
  posToGrid,
  DEFAULT_FLOOR_SPOTS,
  DEFAULT_WALL_SPOTS,
} from '../../src/lib/forestGrid'
import { shopItemById } from '../../src/lib/shopCatalog'
import { ForestSquirrel } from '../../src/components/ForestSquirrel'
import { ContactShadow } from '../../src/components/ContactShadow'
import { StageCelebration } from '../../src/components/StageCelebration'
import { DraggableDecoration } from '../../src/components/DraggableDecoration'
import { DenIntroContent } from '../../src/components/DenIntro'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'
import { useT } from '../../src/lib/i18n'

const CELEBRATED_STAGE_KEY = 'acorn:lastCelebratedStage'
const DEN_INTRO_SEEN_KEY = 'acorn:denIntroSeen'
// Drop an item here (bottom-right corner while dragging) to put it away
const TRAY = { x: 0.74, y: 0.88 }

interface ForestItemRow {
  id: string
  item_id: string
  grid_x: number | null
  grid_y: number | null
}

function rowPos(row: ForestItemRow): ScenePos | null {
  return gridToPos(row.grid_x, row.grid_y)
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

// Inventory tile: tap to auto-place, hold briefly then drag to drop it
// anywhere in the scene (a ghost follows the finger).
function InventoryTile({
  row,
  name,
  image,
  ghostX,
  ghostY,
  onDragStart,
  onDragEnd,
  onDrop,
  onTap,
}: {
  row: ForestItemRow
  name: string
  image: number
  ghostX: SharedValue<number>
  ghostY: SharedValue<number>
  onDragStart: (rowId: string) => void
  onDragEnd: () => void
  onDrop: (rowId: string, absX: number, absY: number) => void
  onTap: (rowId: string) => void
}) {
  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart((e) => {
      ghostX.value = e.absoluteX
      ghostY.value = e.absoluteY
      runOnJS(onDragStart)(row.id)
    })
    .onUpdate((e) => {
      ghostX.value = e.absoluteX
      ghostY.value = e.absoluteY
    })
    .onEnd((e) => {
      runOnJS(onDrop)(row.id, e.absoluteX, e.absoluteY)
    })
    .onFinalize(() => {
      runOnJS(onDragEnd)()
    })

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)(row.id)
  })

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        style={{
          alignItems: 'center', gap: 6,
          backgroundColor: '#fdf6ec', borderRadius: 14,
          paddingHorizontal: 12, paddingVertical: 10, minWidth: 76,
        }}
      >
        <Image source={image} style={{ width: 44, height: 44 }} resizeMode="contain" />
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#554336', textAlign: 'center' }}>
          {name}
        </Text>
      </View>
    </GestureDetector>
  )
}

export default function ForestScreen() {
  const { t } = useT()
  const user = useAuthStore((s) => s.user)
  const balance = useAcornStore((s) => s.balance)
  const currentStreak = useAcornStore((s) => s.currentStreak)
  const loadAcorns = useAcornStore((s) => s.load)
  const addAcorns = useAcornStore((s) => s.addAcorns)
  const [rows, setRows] = useState<ForestItemRow[]>([])
  const [dragKind, setDragKind] = useState<'floor' | 'wall' | null>(null)
  const [sceneSize, setSceneSize] = useState(0)
  const [celebration, setCelebration] = useState<{ from: number; to: number } | null>(null)
  const [introOpen, setIntroOpen] = useState(false)

  const sceneScale = useSharedValue(1)
  const sceneStyle = useAnimatedStyle(() => ({ transform: [{ scale: sceneScale.value }] }))

  // Drag-from-inventory: a ghost image follows the finger in window coords
  const sceneRef = useRef<View>(null)
  const rootRef = useRef<View>(null)
  const sceneRect = useRef<{ x: number; y: number; w: number } | null>(null)
  const rootOrigin = useSharedValue({ x: 0, y: 0 })
  const ghostX = useSharedValue(0)
  const ghostY = useSharedValue(0)
  const [ghostRow, setGhostRow] = useState<ForestItemRow | null>(null)
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value - rootOrigin.value.x - 36 },
      { translateY: ghostY.value - rootOrigin.value.y - 76 },
    ],
  }))

  useFocusEffect(useCallback(() => {
    if (!user) return
    let active = true
    ;(async () => {
      // Show the intro popup the first time the den is opened
      const seen = await AsyncStorage.getItem(DEN_INTRO_SEEN_KEY)
      if (active && seen === null) {
        setIntroOpen(true)
        await AsyncStorage.setItem(DEN_INTRO_SEEN_KEY, '1')
      }

      const [streak] = await Promise.all([recomputeStreak(user.id), loadAcorns(user.id)])
      const { data } = await supabase
        .from('forest_items')
        .select('id, item_id, grid_x, grid_y')
        .eq('user_id', user.id)
      if (!active) return

      // Migrate legacy placements (cell/slot indices from older builds) to
      // free positions at spread default spots
      const list = ((data ?? []) as ForestItemRow[]).map((r) => ({ ...r }))
      let floorSpot = 0
      let wallSpot = 0
      for (const r of list) {
        if (r.grid_x !== null && gridToPos(r.grid_x, r.grid_y) === null) {
          const item = shopItemById(r.item_id)
          const spot =
            item?.placement === 'wall'
              ? DEFAULT_WALL_SPOTS[wallSpot++ % DEFAULT_WALL_SPOTS.length]
              : DEFAULT_FLOOR_SPOTS[floorSpot++ % DEFAULT_FLOOR_SPOTS.length]
          const g = posToGrid(spot)
          r.grid_x = g.grid_x
          r.grid_y = g.grid_y
          await supabase.from('forest_items').update({ grid_x: r.grid_x, grid_y: r.grid_y }).eq('id', r.id)
        }
      }
      if (!active) return
      setRows(list)

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
    return () => { active = false; setDragKind(null) }
  }, [user, loadAcorns, sceneScale]))

  const { progress, nextStage } = stageProgress(currentStreak)

  const placedRows = rows.filter((r) => rowPos(r) && ITEM_IMAGES[r.item_id])
  const unplacedRows = rows.filter((r) => !rowPos(r) && shopItemById(r.item_id))

  async function moveToPos(row: ForestItemRow, pos: ScenePos | null) {
    const g = pos ? posToGrid(pos) : { grid_x: null, grid_y: null }
    await supabase.from('forest_items').update(g).eq('id', row.id)
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...g } : r)))
  }

  function handleDrop(rowId: string, fx: number, fy: number) {
    const row = rows.find((r) => r.id === rowId)
    if (!row) return
    const item = shopItemById(row.item_id)
    if (!item) return
    if (fx > TRAY.x && fy > TRAY.y) {
      moveToPos(row, null)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      return
    }
    moveToPos(row, clampToRegion(item.placement, fromDisplay({ x: fx, y: fy })))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function addToRoom(row: ForestItemRow) {
    if (currentStreak === 0) {
      Alert.alert('Start your streak first', "Log all of today's doses to start your streak, then decorate!")
      return
    }
    const item = shopItemById(row.item_id)
    if (!item) return
    const spots = item.placement === 'wall' ? DEFAULT_WALL_SPOTS : DEFAULT_FLOOR_SPOTS
    const sameKindCount = placedRows.filter((r) => shopItemById(r.item_id)?.placement === item.placement).length
    moveToPos(row, spots[sameKindCount % spots.length])
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function startInventoryDrag(rowId: string) {
    if (currentStreak === 0) return
    const row = rows.find((r) => r.id === rowId)
    const item = row && shopItemById(row.item_id)
    if (!row || !item) return
    sceneRef.current?.measureInWindow((x, y, w) => { sceneRect.current = { x, y, w } })
    rootRef.current?.measureInWindow((x, y) => { rootOrigin.value = { x, y } })
    setGhostRow(row)
    setDragKind(item.placement)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function endInventoryDrag() {
    setGhostRow(null)
    setDragKind(null)
  }

  function dropFromInventory(rowId: string, absX: number, absY: number) {
    const rect = sceneRect.current
    if (!rect || rect.w === 0) return
    const fx = (absX - rect.x) / rect.w
    const fy = (absY - rect.y) / rect.w
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return
    const row = rows.find((r) => r.id === rowId)
    const item = row && shopItemById(row.item_id)
    if (!row || !item) return
    moveToPos(row, clampToRegion(item.placement, fromDisplay({ x: fx, y: fy })))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function promptPutAway(rowId: string) {
    const row = rows.find((r) => r.id === rowId)
    if (!row) return
    const item = shopItemById(row.item_id)
    Alert.alert(item?.name ?? 'Decoration', 'Put this decoration away?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Put away', onPress: () => moveToPos(row, null) },
    ])
  }

  const rowKind = (r: ForestItemRow) => shopItemById(r.item_id)?.placement ?? 'floor'
  const wallRows = placedRows.filter((r) => rowKind(r) === 'wall')
  const floorObjects: ({ type: 'squirrel'; y: number } | { type: 'item'; row: ForestItemRow; y: number })[] = [
    { type: 'squirrel' as const, y: SQUIRREL_ANCHOR.y },
    ...placedRows
      .filter((r) => rowKind(r) === 'floor')
      .map((row) => ({ type: 'item' as const, row, y: rowPos(row)!.y })),
  ].sort((a, b) => a.y - b.y)

  return (
    <SafeAreaView ref={rootRef} style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={dragKind === null}
      >

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.3 }}>
              {t('den.header')}
            </Text>
            <Text style={{ fontSize: 14, color: '#554336', marginTop: 4 }}>
              {t('den.sub')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {/* DEV: long-press to grant +500 acorns for testing — remove before release */}
            <Pressable
              onLongPress={async () => {
                if (!user) return
                await addAcorns(user.id, 500)
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              }}
              delayLongPress={500}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: '#fef3c7', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>🌰 {balance}</Text>
            </Pressable>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: '#fff1e6', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 6,
            }}>
              <MaterialCommunityIcons name="fire" size={15} color="#b15f00" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>{currentStreak}d</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIntroOpen(true)}
              hitSlop={8}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#fdf1e6', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name="information-outline" size={18} color="#b15f00" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forest scene — matted "double-bezel" frame + soft ambient shadow */}
        <View style={{ padding: 6, borderRadius: 30, backgroundColor: '#fdfbf7', marginBottom: 18, shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6 }}>
        {currentStreak === 0 ? (
          <View style={{
            borderRadius: 24, overflow: 'hidden',
            aspectRatio: 1, backgroundColor: '#f0e6da',
          }}>
            <Image source={ROOM_IMAGE} style={{ width: '100%', height: '100%', opacity: 0.35, transform: [{ scale: ROOM_ZOOM }], transformOrigin: `50% ${ROOM_PIVOT_Y * 100}%` }} resizeMode="cover" />
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center', padding: 24,
            }}>
              <Text style={{ fontSize: 44 }}>🌱</Text>
              <Text style={{
                color: '#554336', fontWeight: '700', marginTop: 12,
                textAlign: 'center', fontSize: 15, lineHeight: 22,
              }}>
                Log all your doses today to{'\n'}open up your den
              </Text>
            </View>
          </View>
        ) : (
          <Animated.View
            ref={sceneRef}
            onLayout={(e) => setSceneSize(e.nativeEvent.layout.width)}
            style={[
              {
                borderRadius: 24, overflow: 'hidden',
                aspectRatio: 1, backgroundColor: '#f0e6da',
              },
              sceneStyle,
            ]}
          >
            <Image source={ROOM_IMAGE} style={{ width: '100%', height: '100%', transform: [{ scale: ROOM_ZOOM }], transformOrigin: `50% ${ROOM_PIVOT_Y * 100}%` }} resizeMode="cover" />

            {/* Wall decorations (always behind floor objects) */}
            {sceneSize > 0 && wallRows.map((row) => {
              const pos = rowPos(row)!
              return (
                <DraggableDecoration
                  key={row.id}
                  rowId={row.id}
                  image={ITEM_IMAGES[row.item_id]}
                  pos={toDisplay(pos)}
                  kind="wall"
                  depthScale={depthFor('wall', pos) * ROOM_ZOOM}
                  sceneSize={sceneSize}
                  onDragActive={(a) => setDragKind(a ? 'wall' : null)}
                  onDrop={handleDrop}
                  onTap={promptPutAway}
                />
              )
            })}

            {/* Floor: squirrel + items — drawn back-to-front */}
            {sceneSize > 0 && floorObjects.map((obj) => {
              if (obj.type === 'squirrel') {
                return (
                  <ForestSquirrel
                    key="squirrel"
                    anchor={{ ...toDisplay(SQUIRREL_ANCHOR), scale: SQUIRREL_ANCHOR.scale * ROOM_ZOOM }}
                  />
                )
              }
              const item = shopItemById(obj.row.item_id)!
              const pos = rowPos(obj.row)!
              return (
                <DraggableDecoration
                  key={obj.row.id}
                  rowId={obj.row.id}
                  image={ITEM_IMAGES[obj.row.item_id]}
                  pos={toDisplay(pos)}
                  kind="floor"
                  depthScale={depthFor('floor', pos) * ROOM_ZOOM * (ITEM_SIZES[obj.row.item_id] ?? 1)}
                  sceneSize={sceneSize}
                  shadow={ITEM_SHADOWS[obj.row.item_id]}
                  onDragActive={(a) => setDragKind(a ? item.placement : null)}
                  onDrop={handleDrop}
                  onTap={promptPutAway}
                />
              )
            })}

            {/* Put-away tray while dragging */}
            {dragKind && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute', right: 10, bottom: 10,
                  backgroundColor: 'rgba(91,67,50,0.9)', borderRadius: 14,
                  paddingHorizontal: 12, paddingVertical: 8,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                <MaterialCommunityIcons name="tray-arrow-down" size={16} color="#f7ede2" />
                <Text style={{ color: '#f7ede2', fontWeight: '700', fontSize: 12 }}>Put away</Text>
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
        </View>

        {/* Keep going card */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 16,
          marginBottom: 14,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
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
                'Your den is fully grown'
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
          activeOpacity={0.9}
          style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
            flexDirection: 'row', alignItems: 'center', gap: 14,
            shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
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
            <Text style={{ fontSize: 14, color: '#554336', marginTop: 3 }}>Decorate your den</Text>
          </View>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#fdf1e6', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#b15f00" />
          </View>
        </TouchableOpacity>

        {/* Your Decorations — tap or drag an item into the room */}
        {unplacedRows.length > 0 && (
          <View style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 16,
            shadowColor: '#7a4f2e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f1b17' }}>
              Your Decorations
            </Text>
            <Text style={{ fontSize: 13, color: '#554336', marginTop: 3, marginBottom: 14 }}>
              Tap to add to your room, then drag to arrange
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {unplacedRows.map((row) => {
                const item = shopItemById(row.item_id)!
                return (
                  <InventoryTile
                    key={row.id}
                    row={row}
                    name={item.name}
                    image={ITEM_IMAGES[row.item_id]}
                    ghostX={ghostX}
                    ghostY={ghostY}
                    onDragStart={startInventoryDrag}
                    onDragEnd={endInventoryDrag}
                    onDrop={dropFromInventory}
                    onTap={(rowId) => {
                      const r = rows.find((x) => x.id === rowId)
                      if (r) addToRoom(r)
                    }}
                  />
                )
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Ghost that follows the finger while dragging from the inventory */}
      {ghostRow && (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, left: 0, width: 72, height: 72, zIndex: 999 }, ghostStyle]}
        >
          {shopItemById(ghostRow!.item_id)?.placement === 'floor' && ITEM_SHADOWS[ghostRow!.item_id] && (
            <ContactShadow lift={1} spec={ITEM_SHADOWS[ghostRow!.item_id]} />
          )}
          <Image
            source={ITEM_IMAGES[ghostRow!.item_id]}
            resizeMode="contain"
            style={{ width: '100%', height: '100%', opacity: 0.9, transform: [{ translateY: -10 }] }}
          />
        </Animated.View>
      )}

      {/* Info modal */}
      <Modal visible={introOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 }}>
            <DenIntroContent />
            <TouchableOpacity
              onPress={() => setIntroOpen(false)}
              style={{ backgroundColor: '#b15f00', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('common.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
