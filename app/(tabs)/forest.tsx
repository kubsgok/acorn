import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  FadeInDown,
  SlideInDown,
  runOnJS,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { supabase } from '../../src/lib/supabase'
import { recomputeStreak } from '../../src/lib/streaks'
import { mainTreeStage, loadGrove, GroveTree, UnplacedTree, MAX_PLANTED_STAGE } from '../../src/lib/treeGrowth'
import { MAIN_TREE_IMAGES, GROVE_BG, TREE_IDS, treeById, TreeSpecies } from '../../src/lib/treeCatalog'
import { MAIN_TREE_POS, clampToGround, DEFAULT_TREE_SPOTS, ScenePos } from '../../src/lib/groveLayout'
import { DraggableDecoration, DECORATION_WIDTH } from '../../src/components/DraggableDecoration'
import { StageCelebration } from '../../src/components/StageCelebration'
import { ForestIntroContent } from '../../src/components/ForestIntro'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'
import { useT } from '../../src/lib/i18n'

const REWARDED_STAGE_KEY = 'acorn:lastRewardedTreeStage'
const FOREST_INTRO_SEEN_KEY = 'acorn:forestIntroSeen'
// Per-stage emoji + one-time bonus acorns, indexed by main-tree stage (0..5).
// Stages 2/3/4/5 (streak days 3/7/14/30) award a bonus the first time reached.
const STAGE_EMOJI = ['🌰', '🌱', '🌿', '🌲', '🌳', '🌸']
const STAGE_BONUS = [0, 0, 15, 25, 40, 60]

// The main-tree art fills its canvas by different amounts per stage (stage 3 is
// the tallest sprite, 4–5 are wide-but-short canopies), so a single frame width
// makes the tree appear to shrink as it "grows". These per-stage frame widths
// are tuned so the RENDERED tree height increases monotonically 0→5.
const MAIN_STAGE_WIDTH = [0.467, 0.415, 0.399, 0.337, 0.570, 0.593]

// Planted trees reuse the den's DraggableDecoration, whose base is
// DECORATION_WIDTH (0.16). Different species fill their sprite canvas by very
// different amounts, so a flat scale made saplings look wildly inconsistent.
// Instead, target a fixed on-screen HEIGHT per stage (as a fraction of the
// scene) and derive each tree's frame width from its sprite's content-height
// fraction — so every sapling renders the same size, every mature tree the
// same size, regardless of species or position.
const TREE_TARGET_HEIGHT = [0.16, 0.26, 0.4] // sapling → young → mature
function treeDepthScale(species: TreeSpecies, stage: number): number {
  const hfrac = species.heightFrac[stage] ?? 0.5
  const targetH = TREE_TARGET_HEIGHT[stage] ?? 0.3
  // DraggableDecoration multiplies this by DECORATION_WIDTH, and the sprite is
  // `contain`ed in a square frame, so rendered height = hfrac * frameWidth.
  return targetH / hfrac / DECORATION_WIDTH
}

// Soft, diffused, color-tinted ambient shadow (no harsh dark drop shadows).
const softShadow = {
  shadowColor: '#2f5d2a',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.13,
  shadowRadius: 20,
  elevation: 6,
}

// A card that springs slightly on press (physical tap feedback).
function PressableScale({ onPress, style, children }: { onPress: () => void; style?: any; children: React.ReactNode }) {
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <Animated.View style={[style, anim]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.975, { duration: 120, easing: Easing.out(Easing.quad) }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }) }}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

// Inventory tile in "Your Trees": tap to plant, or hold-and-drag into the grove
// (a ghost follows the finger). Mirrors the den's decoration inventory.
function TreeInventoryTile({
  row, name, image, ghostX, ghostY, onDragStart, onDragEnd, onDrop, onTap,
}: {
  row: UnplacedTree
  name: string
  image: number
  ghostX: SharedValue<number>
  ghostY: SharedValue<number>
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDrop: (id: string, absX: number, absY: number) => void
  onTap: (id: string) => void
}) {
  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart((e) => { ghostX.value = e.absoluteX; ghostY.value = e.absoluteY; runOnJS(onDragStart)(row.id) })
    .onUpdate((e) => { ghostX.value = e.absoluteX; ghostY.value = e.absoluteY })
    .onEnd((e) => { runOnJS(onDrop)(row.id, e.absoluteX, e.absoluteY) })
    .onFinalize(() => { runOnJS(onDragEnd)() })
  const tap = Gesture.Tap().onEnd(() => { runOnJS(onTap)(row.id) })
  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View style={{ alignItems: 'center', gap: 6, backgroundColor: '#eef5e5', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, minWidth: 76 }}>
        <Image source={image} style={{ width: 44, height: 44 }} resizeMode="contain" />
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#3f5533', textAlign: 'center' }}>{name}</Text>
      </View>
    </GestureDetector>
  )
}

// Non-interactive centerpiece tree that grows with the streak and sways.
function MainTree({ stage }: { stage: number }) {
  const sway = useSharedValue(0)
  const grow = useSharedValue(1)
  const prevStage = useRef(stage)
  useFocusEffect(useCallback(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 2400, easing: Easing.inOut(Easing.quad) })
      ), -1, true
    )
    return () => { sway.value = 0 }
  }, [sway]))
  // When the tree levels up, spring it up from the ground so it looks like it's
  // actually growing rather than snapping to the next sprite.
  useEffect(() => {
    if (stage > prevStage.current) {
      grow.value = 0.55
      grow.value = withSpring(1, { damping: 9, stiffness: 110, mass: 0.9 })
    }
    prevStage.current = stage
  }, [stage, grow])
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sway.value * 1.1}deg` }, { scale: grow.value }],
  }))
  const w = MAIN_STAGE_WIDTH[stage] ?? 0.42
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${(MAIN_TREE_POS.x - w / 2) * 100}%`,
        top: `${(MAIN_TREE_POS.y - w * 1.25) * 100}%`,
        width: `${w * 100}%`,
        aspectRatio: 560 / 700,
      }}
    >
      <Animated.Image
        source={MAIN_TREE_IMAGES[stage]}
        resizeMode="contain"
        style={[{ width: '100%', height: '100%', transformOrigin: '50% 100%' }, style]}
      />
    </View>
  )
}

export default function ForestScreen() {
  const { t } = useT()
  const user = useAuthStore((s) => s.user)
  const balance = useAcornStore((s) => s.balance)
  const currentStreak = useAcornStore((s) => s.currentStreak)
  const loadAcorns = useAcornStore((s) => s.load)
  const addAcorns = useAcornStore((s) => s.addAcorns)
  const [trees, setTrees] = useState<GroveTree[]>([])
  const [unplacedTrees, setUnplacedTrees] = useState<UnplacedTree[]>([])
  const [sceneSize, setSceneSize] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [celebration, setCelebration] = useState<{ from: string; to: string; bonus: number } | null>(null)
  const [introOpen, setIntroOpen] = useState(false)

  // Drag-from-inventory: a ghost sapling follows the finger in window coords
  const sceneRef = useRef<View>(null)
  const rootRef = useRef<View>(null)
  const prevStageRef = useRef<number | null>(null)
  const sceneRect = useRef<{ x: number; y: number; w: number } | null>(null)
  const rootOrigin = useSharedValue({ x: 0, y: 0 })
  const ghostX = useSharedValue(0)
  const ghostY = useSharedValue(0)
  const [ghostRow, setGhostRow] = useState<UnplacedTree | null>(null)
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value - rootOrigin.value.x - 36 },
      { translateY: ghostY.value - rootOrigin.value.y - 60 },
    ],
  }))

  useFocusEffect(useCallback(() => {
    if (!user) return
    let active = true
    ;(async () => {
      // Show the intro popup the first time the forest is opened
      const seen = await AsyncStorage.getItem(FOREST_INTRO_SEEN_KEY)
      if (active && seen === null) {
        setIntroOpen(true)
        await AsyncStorage.setItem(FOREST_INTRO_SEEN_KEY, '1')
      }

      await recomputeStreak(user.id)
      const grove = await loadGrove(user.id, TREE_IDS)
      if (!active) return
      setTrees(grove.planted)
      setUnplacedTrees(grove.unplaced)
    })()
    return () => { active = false; setDragging(false) }
  }, [user, loadAcorns]))

  const stage = mainTreeStage(currentStreak)

  // Celebrate when the main tree advances a stage (real streak growth OR the
  // dev streak hack). Only a single-stage jump counts, which skips the initial
  // 0→N settle on first load. Bonus acorns for a stage are awarded once ever.
  useEffect(() => {
    const prev = prevStageRef.current
    prevStageRef.current = stage
    if (prev === null || stage !== prev + 1 || !user) return
    const newStage = stage
    ;(async () => {
      let bonus = STAGE_BONUS[newStage] ?? 0
      if (bonus > 0) {
        const rewarded = Number((await AsyncStorage.getItem(REWARDED_STAGE_KEY)) ?? 0)
        if (newStage > rewarded) {
          await addAcorns(user.id, bonus)
          await AsyncStorage.setItem(REWARDED_STAGE_KEY, String(newStage))
        } else {
          bonus = 0
        }
      }
      setCelebration({ from: STAGE_EMOJI[newStage - 1], to: STAGE_EMOJI[newStage], bonus })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    })()
  }, [stage, user, addAcorns])

  // Plant an inventory tree in the grove: it starts as a fresh sapling
  // (placed_at = now resets growth) at the given spot.
  async function plantFromInventory(id: string, at: ScenePos) {
    const row = unplacedTrees.find((t) => t.id === id)
    if (!row) return
    const pos = clampToGround(at)
    await supabase.from('forest_items').update({
      grid_x: Math.round(pos.x * 1000),
      grid_y: Math.round(pos.y * 1000),
      placed_at: new Date().toISOString(),
    }).eq('id', id)
    setUnplacedTrees((prev) => prev.filter((t) => t.id !== id))
    setTrees((prev) => [...prev, { id, item_id: row.item_id, x: pos.x, y: pos.y, stage: 0 }])
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // Tap an inventory tree → plant at a spread default spot.
  function plantTree(id: string) {
    plantFromInventory(id, DEFAULT_TREE_SPOTS[trees.length % DEFAULT_TREE_SPOTS.length])
  }

  function startInventoryDrag(id: string) {
    const row = unplacedTrees.find((t) => t.id === id)
    if (!row) return
    sceneRef.current?.measureInWindow((x, y, w) => { sceneRect.current = { x, y, w } })
    rootRef.current?.measureInWindow((x, y) => { rootOrigin.value = { x, y } })
    setGhostRow(row)
    setDragging(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function endInventoryDrag() {
    setGhostRow(null)
    setDragging(false)
  }

  function dropFromInventory(id: string, absX: number, absY: number) {
    const rect = sceneRect.current
    if (!rect || rect.w === 0) return
    const fx = (absX - rect.x) / rect.w
    const fy = (absY - rect.y) / rect.w
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return // dropped outside → stays in inventory
    plantFromInventory(id, { x: fx, y: fy })
  }

  // Tap a planted tree to put it back in "Your Trees" (the den's "put away").
  function promptPutAway(id: string) {
    const tree = trees.find((t) => t.id === id)
    const species = tree && treeById(tree.item_id)
    Alert.alert(species?.name ?? 'Tree', 'Put this tree back in Your Trees?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Put away',
        onPress: async () => {
          await supabase.from('forest_items').update({ grid_x: null, grid_y: null }).eq('id', id)
          setTrees((prev) => prev.filter((t) => t.id !== id))
          if (tree) setUnplacedTrees((prev) => [...prev, { id, item_id: tree.item_id }])
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        },
      },
    ])
  }

  async function moveTree(id: string, fx: number, fy: number) {
    const pos = clampToGround({ x: fx, y: fy })
    await supabase.from('forest_items').update({
      grid_x: Math.round(pos.x * 1000),
      grid_y: Math.round(pos.y * 1000),
    }).eq('id', id)
    setTrees((prev) => prev.map((t) => (t.id === id ? { ...t, x: pos.x, y: pos.y } : t)))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // Draw main tree + planted trees back-to-front by feet position
  const objects: ({ type: 'main'; y: number } | { type: 'tree'; tree: GroveTree; y: number })[] = [
    { type: 'main' as const, y: MAIN_TREE_POS.y },
    ...trees.map((t) => ({ type: 'tree' as const, tree: t, y: t.y })),
  ].sort((a, b) => a.y - b.y)

  return (
    <SafeAreaView ref={rootRef} style={{ flex: 1, backgroundColor: '#eaf4e0' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dragging}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 30, fontWeight: '800', color: '#1f3a1a', letterSpacing: -0.6 }}>{t('forest.header')}</Text>
            <Text style={{ fontSize: 14, color: '#4a6138', marginTop: 4 }}>{t('forest.sub')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexShrink: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>🌰 {balance}</Text>
            </View>
            {/* DEV: long-press to add a streak day for testing tree growth — remove before release */}
            <Pressable
              onLongPress={() => {
                // DEV: grow the main tree (streak) AND every planted tree a stage
                useAcornStore.setState((s) => ({ currentStreak: s.currentStreak + 1, longestStreak: Math.max(s.longestStreak, s.currentStreak + 1) }))
                setTrees((prev) => prev.map((t) => ({ ...t, stage: Math.min(t.stage + 1, MAX_PLANTED_STAGE) })))
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              }}
              delayLongPress={500}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff1e6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <MaterialCommunityIcons name="fire" size={15} color="#b15f00" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>{currentStreak}d</Text>
            </Pressable>
            <TouchableOpacity
              onPress={() => setIntroOpen(true)}
              hitSlop={8}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef5e5', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name="information-outline" size={18} color="#3f7d34" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Grove scene — matted "double-bezel" frame + soft ambient shadow */}
        <Animated.View entering={FadeInDown.duration(600)} style={[{ padding: 6, borderRadius: 30, backgroundColor: '#fdfdfb', marginBottom: 18 }, softShadow]}>
        <View
          ref={sceneRef}
          onLayout={(e) => setSceneSize(e.nativeEvent.layout.width)}
          style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#cfe6b8' }}
        >
          <Image source={GROVE_BG} style={{ width: '100%', height: '100%' }} resizeMode="cover" />

          {sceneSize > 0 && objects.map((obj) => {
            if (obj.type === 'main') return <MainTree key="main" stage={stage} />
            const species = treeById(obj.tree.item_id)
            if (!species) return null
            const pos: ScenePos = { x: obj.tree.x, y: obj.tree.y }
            return (
              <DraggableDecoration
                key={obj.tree.id}
                rowId={obj.tree.id}
                image={species.stages[obj.tree.stage]}
                pos={pos}
                kind="floor"
                depthScale={treeDepthScale(species, obj.tree.stage)}
                sceneSize={sceneSize}
                onDragActive={setDragging}
                onDrop={moveTree}
                onTap={promptPutAway}
              />
            )
          })}

          {celebration && (
            <StageCelebration
              fromEmoji={celebration.from}
              toEmoji={celebration.to}
              title="Your tree grew!"
              subtitle={celebration.bonus > 0 ? `+${celebration.bonus} 🌰 bonus` : 'Keep your streak alive'}
              onDone={() => setCelebration(null)}
            />
          )}
        </View>
        </Animated.View>

        {/* Plant a tree — soft card, spring press, button-in-button chevron */}
        <Animated.View entering={FadeInDown.duration(600).delay(120)}>
          <PressableScale
            onPress={() => router.push('/tree-shop')}
            style={[{ backgroundColor: '#fff', borderRadius: 22 }, softShadow]}
          >
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#e6f2d8', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="tree-outline" size={24} color="#3f7d34" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f3a1a' }}>{t('forest.plantTree')}</Text>
                <Text style={{ fontSize: 14, color: '#4a6138', marginTop: 3 }}>{t('forest.plantTreeSub')}</Text>
              </View>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef5e5', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#3f7d34" />
              </View>
            </View>
          </PressableScale>
        </Animated.View>

        {/* Your Trees — inventory of unplanted trees */}
        {unplacedTrees.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[{ backgroundColor: '#fff', borderRadius: 22, padding: 16, marginTop: 14 }, softShadow]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f3a1a' }}>{t('forest.yourTrees')}</Text>
            <Text style={{ fontSize: 14, color: '#4a6138', marginTop: 3, marginBottom: 14 }}>
              {t('forest.yourTreesSub')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {unplacedTrees.map((row) => {
                const species = treeById(row.item_id)
                if (!species) return null
                return (
                  <TreeInventoryTile
                    key={row.id}
                    row={row}
                    name={species.name}
                    image={species.stages[0]}
                    ghostX={ghostX}
                    ghostY={ghostY}
                    onDragStart={startInventoryDrag}
                    onDragEnd={endInventoryDrag}
                    onDrop={dropFromInventory}
                    onTap={plantTree}
                  />
                )
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Ghost sapling that follows the finger while dragging from Your Trees */}
      {ghostRow && (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, left: 0, width: 72, height: 72, zIndex: 999 }, ghostStyle]}
        >
          <Image source={treeById(ghostRow.item_id)!.stages[0]} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </Animated.View>
      )}

      {/* Info modal */}
      <Modal visible={introOpen} transparent animationType="fade" onRequestClose={() => setIntroOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }} onPress={() => setIntroOpen(false)}>
          <Animated.View entering={SlideInDown.duration(260)}>
            <Pressable style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 }}>
              <ForestIntroContent />
              <TouchableOpacity
                onPress={() => setIntroOpen(false)}
                style={{ backgroundColor: '#3f7d34', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('common.gotIt')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
