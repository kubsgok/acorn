import { createElement, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import DateTimePicker from '@react-native-community/datetimepicker'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useAuthStore } from '../../src/stores/authStore'
import { supabase } from '../../src/lib/supabase'
import { useT } from '../../src/lib/i18n'
import { Eyebrow, IconTile, StepDots, PrimaryButton } from '../../src/components/onboardingUI'

// `value` is the canonical English stored in the DB; `key` is the display label.
const SEX_OPTIONS = [
  { value: 'Female', key: 'sex.female' },
  { value: 'Male', key: 'sex.male' },
  { value: 'Other', key: 'sex.other' },
  { value: 'Prefer not to say', key: 'sex.na' },
]
const GOAL_OPTIONS = [
  { value: 'Never miss a dose', key: 'goal.neverMiss' },
  { value: 'Build a daily routine', key: 'goal.routine' },
  { value: 'Track my adherence', key: 'goal.track' },
  { value: 'Stay motivated', key: 'goal.motivated' },
  { value: 'Manage multiple meds', key: 'goal.multiple' },
  { value: 'Support a loved one', key: 'goal.support' },
]

const LABEL = { fontSize: 12, fontWeight: '600' as const, color: '#554336', letterSpacing: 0.3, marginBottom: 8, marginLeft: 4 }
const INPUT = {
  backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbc2b0',
  borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  fontSize: 15, color: '#1f1b17',
}

function ageFromBirthday(d: Date): number {
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AboutYou() {
  const { t } = useT()
  const user = useAuthStore((s) => s.user)
  const setPreferredName = useAuthStore((s) => s.setPreferredName)

  const [fullName, setFullName] = useState('')
  const [preferred, setPreferred] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<string | null>(null)
  const [birthday, setBirthday] = useState<Date | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [country, setCountry] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [goalOther, setGoalOther] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  function setBirthdayFrom(picked: Date) {
    setBirthday(picked)
    setAge(String(ageFromBirthday(picked)))
    Haptics.selectionAsync()
  }

  function onPickDate(_: unknown, picked?: Date) {
    if (Platform.OS !== 'ios') setShowPicker(false)
    if (picked) setBirthdayFrom(picked)
  }

  async function handleContinue() {
    const finalPreferred = preferred.trim() || fullName.trim().split(' ')[0]
    if (!finalPreferred) {
      Alert.alert(t('about.nameRequiredTitle'), t('about.nameRequiredBody'))
      return
    }
    if (!user) { router.push('/(onboarding)/name-squirrel'); return }
    setSaving(true)
    try {
      const ageNum = age.trim() ? parseInt(age.trim(), 10) : null
      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        full_name: fullName.trim() || null,
        preferred_name: finalPreferred,
        age: ageNum !== null && !Number.isNaN(ageNum) ? ageNum : null,
        sex,
        birthday: birthday ? localDateStr(birthday) : null,
        country: country.trim() || null,
        acorn_goals: goals.length > 0 ? goals : null,
        acorn_goals_other: goalOther.trim() || null,
      })
      setPreferredName(finalPreferred)
    } catch {
      // Non-blocking: continue onboarding even if the save hiccups
    } finally {
      setSaving(false)
      router.push('/(onboarding)/name-squirrel')
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 56, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <StepDots step={0} total={5} style={{ marginBottom: 28 }} />
        <Animated.View entering={FadeInDown.duration(600)}>
          <IconTile><MaterialCommunityIcons name="account-heart-outline" size={34} color="#b15f00" /></IconTile>
          <View style={{ marginTop: 22 }}>
            <Eyebrow label={t('ob.step', { n: 1, total: 5 })} />
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#1f1b17', letterSpacing: -0.5 }}>
            {t('about.title')}
          </Text>
          <Text style={{ fontSize: 15, color: '#554336', marginTop: 8, marginBottom: 32, lineHeight: 22 }}>
            {t('about.subtitle')}
          </Text>
        </Animated.View>

        {/* Full name */}
        <Text style={LABEL}>{t('about.fullName')}</Text>
        <TextInput
          value={fullName} onChangeText={setFullName}
          placeholder="e.g. Alex Morgan" placeholderTextColor="#a8a29e"
          style={[INPUT, { marginBottom: 20 }]}
        />

        {/* Preferred name */}
        <Text style={LABEL}>{t('about.preferred')}</Text>
        <TextInput
          value={preferred} onChangeText={setPreferred}
          placeholder="e.g. Alex" placeholderTextColor="#a8a29e"
          maxLength={30}
          style={[INPUT, { marginBottom: 20 }]}
        />

        {/* Birthday + Age */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1.4 }}>
            <Text style={LABEL}>{t('about.birthday')}</Text>
            {Platform.OS === 'web' ? (
              // The native date picker doesn't render on web — use a real
              // <input type="date"> (react-native-web renders to the DOM).
              createElement('input', {
                type: 'date',
                max: localDateStr(new Date()),
                value: birthday ? localDateStr(birthday) : '',
                onChange: (e: any) => {
                  const v = e.target.value
                  if (v) setBirthdayFrom(new Date(v + 'T00:00:00'))
                },
                style: {
                  backgroundColor: '#fff', border: '1px solid #dbc2b0', borderRadius: 14,
                  padding: '13px 16px', fontSize: 15, color: '#1f1b17', width: '100%',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                },
              })
            ) : (
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); setShowPicker((s) => !s) }}
                style={[INPUT, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              >
                <Text style={{ fontSize: 15, color: birthday ? '#1f1b17' : '#a8a29e' }}>
                  {birthday ? birthday.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : t('about.selectDate')}
                </Text>
                <MaterialCommunityIcons name="calendar" size={18} color="#b15f00" />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={LABEL}>{t('about.age')}</Text>
            <TextInput
              value={age} onChangeText={setAge}
              placeholder="—" placeholderTextColor="#a8a29e"
              keyboardType="number-pad" maxLength={3}
              style={INPUT}
            />
          </View>
        </View>

        {showPicker && Platform.OS !== 'web' && (
          <View style={{ marginBottom: 20, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbc2b0', overflow: 'hidden' }}>
            <DateTimePicker
              value={birthday ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onPickDate}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity onPress={() => setShowPicker(false)} style={{ padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0e9e3' }}>
                <Text style={{ color: '#b15f00', fontWeight: '700', fontSize: 15 }}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sex */}
        <Text style={LABEL}>{t('about.sex')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {SEX_OPTIONS.map((s) => {
            const active = sex === s.value
            return (
              <TouchableOpacity
                key={s.value}
                onPress={() => setSex(active ? null : s.value)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99,
                  backgroundColor: active ? '#b15f00' : '#fff',
                  borderWidth: 1, borderColor: active ? '#b15f00' : '#dbc2b0',
                }}
              >
                <Text style={{ color: active ? '#fff' : '#554336', fontWeight: '600', fontSize: 14 }}>{t(s.key)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Country */}
        <Text style={LABEL}>{t('about.country')}</Text>
        <TextInput
          value={country} onChangeText={setCountry}
          placeholder="e.g. United States" placeholderTextColor="#a8a29e"
          style={[INPUT, { marginBottom: 28 }]}
        />

        {/* Goals */}
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f1b17', marginBottom: 4 }}>
          {t('about.goalsTitle')}
        </Text>
        <Text style={{ fontSize: 13, color: '#a8a29e', marginBottom: 14 }}>
          {t('about.goalsSubtitle')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {GOAL_OPTIONS.map((g) => {
            const active = goals.includes(g.value)
            return (
              <TouchableOpacity
                key={g.value}
                onPress={() => toggleGoal(g.value)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99,
                  backgroundColor: active ? '#dcfce7' : '#fff',
                  borderWidth: 1, borderColor: active ? '#006e2d' : '#dbc2b0',
                }}
              >
                {active && <MaterialCommunityIcons name="check" size={15} color="#006e2d" />}
                <Text style={{ color: active ? '#006e2d' : '#554336', fontWeight: '600', fontSize: 14 }}>{t(g.key)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <TextInput
          value={goalOther} onChangeText={setGoalOther}
          placeholder={t('about.goalOther')}
          placeholderTextColor="#a8a29e"
          multiline
          style={[INPUT, { minHeight: 72, textAlignVertical: 'top', marginBottom: 36 }]}
        />

        <PrimaryButton
          label={saving ? `${t('common.save')}…` : t('common.continue')}
          onPress={handleContinue}
          loading={saving}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
