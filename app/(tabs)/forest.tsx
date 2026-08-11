import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import Animated, {
  Easing,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { supabase } from '../../src/lib/supabase'
import { recomputeStreak } from '../../src/lib/streaks'
import { mainTreeStage, loadGrove, GroveTree } from '../../src/lib/treeGrowth'
import { MAIN_TREE_IMAGES, GROVE_BG, TREE_IDS, treeById } from '../../src/lib/treeCatalog'
import { MAIN_TREE_POS, clampToGround, depthFor, ScenePos } from '../../src/lib/groveLayout'
import { DraggableDecoration } from '../../src/components/DraggableDecoration'
import { ContactShadow } from '../../src/components/ContactShadow'
import { StageCelebration } from '../../src/components/StageCelebration'
import { ForestIntroContent } from '../../src/components/ForestIntro'
import { useAuthStore } from '../../src/stores/authStore'
import { useAcornStore } from '../../src/stores/acornStore'

const REWARDED_MILESTONE_KEY = 'acorn:lastRewardedMilestone'
const MILESTONES = [
  { days: 3, bonus: 15, emoji: '🌿' },
  { days: 7, bonus: 25, emoji: '🌲' },
  { days: 14, bonus: 40, emoji: '🌳' },
  { days: 30, bonus: 60, emoji: '🌸' },
]
const TREE_SHADOW = { centerX: 0.5, baseY: 0.92, widthPct: 0.5 }
const MAIN_WIDTH = 0.42 // main tree width as a fraction of the scene

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

// Non-interactive centerpiece tree that grows with the streak and sways.
function MainTree({ stage }: { stage: number }) {
  const sway = useSharedValue(0)
  useFocusEffect(useCallback(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 2400, easing: Easing.inOut(Easing.quad) })
      ), -1, true
    )
    return () => { sway.value = 0 }
  }, [sway]))
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value * 1.1}deg` }] }))
  const w = MAIN_WIDTH
  return (
    <View style={{
      position: 'absolute',
      left: `${(MAIN_TREE_POS.x - w / 2) * 100}%`,
      top: `${(MAIN_TREE_POS.y - w * 1.25) * 100}%`,
      width: `${w * 100}%`,
      aspectRatio: 512 / 640,
    }}>
      <ContactShadow spec={{ centerX: 0.5, baseY: 0.93, widthPct: 0.42 }} />
      <Animated.Image source={MAIN_TREE_IMAGES[stage]} resizeMode="contain" style={[{ width: '100%', height: '100%' }, style]} />
    </View>
  )
}

export default function ForestScreen() {
  const user = useAuthStore((s) => s.user)
  const balance = useAcornStore((s) => s.balance)
  const currentStreak = useAcornStore((s) => s.currentStreak)
  const loadAcorns = useAcornStore((s) => s.load)
  const addAcorns = useAcornStore((s) => s.addAcorns)
  const [trees, setTrees] = useState<GroveTree[]>([])
  const [sceneSize, setSceneSize] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [celebration, setCelebration] = useState<{ from: string; to: string; bonus: number } | null>(null)
  const [introOpen, setIntroOpen] = useState(false)

  useFocusEffect(useCallback(() => {
    if (!user) return
    let active = true
    ;(async () => {
      const streak = await recomputeStreak(user.id)
      const grove = await loadGrove(user.id, TREE_IDS)
      if (!active) return
      setTrees(grove)

      // Milestone reward — once ever, gated on longest streak
      const longest = useAcornStore.getState().longestStreak
      const stored = Number((await AsyncStorage.getItem(REWARDED_MILESTONE_KEY)) ?? 0)
      const reached = MILESTONES.filter((m) => longest >= m.days && m.days > stored)
      if (active && reached.length > 0) {
        const m = reached[reached.length - 1]
        await addAcorns(user.id, m.bonus)
        await AsyncStorage.setItem(REWARDED_MILESTONE_KEY, String(m.days))
        setCelebration({ from: '🌱', to: m.emoji, bonus: m.bonus })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    })()
    return () => { active = false; setDragging(false) }
  }, [user, loadAcorns, addAcorns]))

  const stage = mainTreeStage(currentStreak)

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#eaf4e0' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dragging}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#1f3a1a', letterSpacing: -0.6 }}>Your Forest</Text>
            <Text style={{ fontSize: 14, color: '#4a6138', marginTop: 4 }}>Grows with every streak</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>🌰 {balance}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff1e6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
              <MaterialCommunityIcons name="fire" size={15} color="#b15f00" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8d4b00' }}>{currentStreak}d</Text>
            </View>
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
                depthScale={depthFor(obj.tree.y)}
                sceneSize={sceneSize}
                shadow={TREE_SHADOW}
                onDragActive={setDragging}
                onDrop={moveTree}
                onTap={() => {}}
              />
            )
          })}

          {celebration && (
            <StageCelebration
              fromEmoji={celebration.from}
              toEmoji={celebration.to}
              title="Milestone reached!"
              subtitle={`+${celebration.bonus} 🌰 bonus`}
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
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f3a1a' }}>Plant a tree</Text>
                <Text style={{ fontSize: 14, color: '#4a6138', marginTop: 3 }}>Spend acorns to grow your forest</Text>
              </View>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef5e5', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#3f7d34" />
              </View>
            </View>
          </PressableScale>
        </Animated.View>
      </ScrollView>

      {/* Info modal */}
      <Modal visible={introOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 }}>
            <ForestIntroContent />
            <TouchableOpacity
              onPress={() => setIntroOpen(false)}
              style={{ backgroundColor: '#3f7d34', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
