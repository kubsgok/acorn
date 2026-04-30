import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../src/lib/supabase'
import { useAuthStore } from '../../src/stores/authStore'

interface Med {
  id: string
  name: string
  dose: string | null
  color: string
  schedules: { id: string; time_of_day: string }[]
  todayStatus?: 'taken' | 'pending' | 'none'
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const squirrelName = useAuthStore((s) => s.squirrelName)
  const setSquirrelName = useAuthStore((s) => s.setSquirrelName)
  const avatarUri = useAuthStore((s) => s.avatarUri)
  const setAvatarUri = useAuthStore((s) => s.setAvatarUri)
  const signOut = useAuthStore((s) => s.signOut)
  const [meds, setMeds] = useState<Med[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const initials = squirrelName ? squirrelName.slice(0, 1).toUpperCase() : '?'

  async function pickAvatar() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!granted) {
      Alert.alert('Permission required', 'Allow photo library access to set a profile photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0].uri) {
      await setAvatarUri(result.assets[0].uri)
    }
  }

  function openNameEdit() {
    setNameInput(squirrelName ?? '')
    setEditingName(true)
  }

  async function saveName() {
    const trimmed = nameInput.trim()
    if (!trimmed) { Alert.alert('Enter a name.'); return }
    if (!user) return
    await supabase.from('users').update({ squirrel_name: trimmed }).eq('id', user.id)
    setSquirrelName(trimmed)
    setEditingName(false)
  }

  useFocusEffect(useCallback(() => { loadMeds() }, []))

  async function loadMeds() {
    if (!user) return
    setLoading(true)

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

    const [{ data: medsData }, { data: logsData }] = await Promise.all([
      supabase
        .from('medications')
        .select('*, schedules:medication_schedules(*)')
        .eq('user_id', user.id)
        .order('created_at'),
      supabase
        .from('medication_logs')
        .select('medication_id, status')
        .eq('user_id', user.id)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString()),
    ])

    // Build today's status per medication
    const statusMap: Record<string, 'taken' | 'pending'> = {}
    for (const log of logsData ?? []) {
      if (log.status === 'on_time' || log.status === 'late') {
        statusMap[log.medication_id] = 'taken'
      } else if (!statusMap[log.medication_id]) {
        statusMap[log.medication_id] = 'pending'
      }
    }

    const enriched: Med[] = (medsData ?? []).map((m: any) => ({
      ...m,
      todayStatus: statusMap[m.id] ?? 'none',
    }))

    setMeds(enriched)
    setLoading(false)
  }

  async function deleteMed(id: string) {
    Alert.alert('Delete medication?', 'This will remove all logs and schedules for this medication.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('medications').delete().eq('id', id)
          setMeds((prev) => prev.filter((m) => m.id !== id))
        }
      }
    ])
  }

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive', onPress: async () => {
          await signOut()
          router.replace('/(auth)/login')
        }
      }
    ])
  }

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
  }

  const activeMeds = meds.length

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8f5' }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#e7e5e4',
        backgroundColor: '#fff8f5',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: '#fde68a',
              borderWidth: 2, borderColor: '#ffdcc3',
              overflow: 'hidden',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={{ width: 40, height: 40 }} />
                : <Text style={{ fontSize: 18, fontWeight: '700', color: '#8d4b00' }}>{initials}</Text>
              }
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#b15f00', letterSpacing: -0.5 }}>Acorn</Text>
        </View>
        <TouchableOpacity style={{ padding: 8, borderRadius: 20 }} onPress={() => router.push('/(tabs)/calendar')}>
          <MaterialCommunityIcons name="calendar-today" size={22} color="#b15f00" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity section */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#554336', marginBottom: 10, paddingHorizontal: 2 }}>
            Identity
          </Text>
          <TouchableOpacity
            onPress={openNameEdit}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: '#e7e5e4',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{
                backgroundColor: '#fef3c7', padding: 12, borderRadius: 14,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialCommunityIcons name="squirrel" size={22} color="#b15f00" />
              </View>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#78716c', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Squirrel Name
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f1b17', marginTop: 2 }}>
                  {squirrelName ?? 'Unnamed'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#a8a29e" />
          </TouchableOpacity>
        </View>

        {/* Medications section */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#554336' }}>My Medications</Text>
            {activeMeds > 0 && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#b15f00', letterSpacing: 0.5 }}>
                {activeMeds} ACTIVE
              </Text>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color="#b15f00" style={{ marginTop: 20 }} />
          ) : meds.length === 0 ? (
            <View style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 24,
              borderWidth: 1, borderColor: '#e7e5e4', alignItems: 'center', gap: 8,
            }}>
              <MaterialCommunityIcons name="pill-off" size={32} color="#a8a29e" />
              <Text style={{ color: '#78716c', fontSize: 14, textAlign: 'center' }}>
                No medications added yet.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {meds.map((med) => {
                const isTaken = med.todayStatus === 'taken'
                const isPending = med.todayStatus === 'pending'
                return (
                  <View key={med.id} style={{
                    backgroundColor: '#fff', borderRadius: 16, padding: 16,
                    borderWidth: 1, borderColor: '#e7e5e4',
                    borderLeftWidth: 4, borderLeftColor: med.color,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f1b17' }}>{med.name}</Text>
                        {isTaken && (
                          <View style={{ backgroundColor: '#7cf994', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#005320' }}>TAKEN</Text>
                          </View>
                        )}
                        {isPending && (
                          <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400e' }}>PENDING</Text>
                          </View>
                        )}
                      </View>
                      {med.dose && (
                        <Text style={{ fontSize: 13, color: '#78716c' }}>{med.dose}</Text>
                      )}
                      {med.schedules.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <MaterialCommunityIcons name="clock-outline" size={13} color="#b15f00" />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#b15f00' }}>
                            {med.schedules.map((s) => formatTime(s.time_of_day)).join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteMed(med.id)}
                      style={{ padding: 8, marginLeft: 8 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={22} color="#a8a29e" />
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}

          {/* Add medication button */}
          <TouchableOpacity
            onPress={() => router.push('/medication/new')}
            style={{
              backgroundColor: '#b15f00', borderRadius: 14,
              padding: 16, alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8, marginTop: 14,
              shadowColor: '#b15f00', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add Medication</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out + version */}
        <View style={{ paddingTop: 8, paddingBottom: 16, gap: 20 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              borderWidth: 1, borderColor: '#dbc2b0', borderRadius: 14,
              padding: 14, alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
            }}
          >
            <MaterialCommunityIcons name="logout" size={18} color="#554336" />
            <Text style={{ color: '#554336', fontSize: 15, fontWeight: '600' }}>Sign out</Text>
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#a8a29e', letterSpacing: 0.5 }}>
            ACORN • MADE WITH CARE
          </Text>
        </View>
      </ScrollView>

      {/* Edit name bottom sheet */}
      <Modal visible={editingName} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 28, paddingBottom: 40,
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: '#fef3c7',
              alignItems: 'center', justifyContent: 'center',
              alignSelf: 'center', marginBottom: 16,
            }}>
              <MaterialCommunityIcons name="squirrel" size={24} color="#b15f00" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1f1b17', textAlign: 'center' }}>
              Rename your squirrel
            </Text>
            <Text style={{ fontSize: 14, color: '#78716c', textAlign: 'center', marginTop: 6, marginBottom: 24 }}>
              What would you like to call them?
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              maxLength={20}
              placeholderTextColor="#a8a29e"
              placeholder="Enter a name..."
              style={{
                borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 14,
                padding: 14, fontSize: 16, backgroundColor: '#fff8f5', marginBottom: 16,
              }}
            />
            <TouchableOpacity
              onPress={saveName}
              style={{ backgroundColor: '#b15f00', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingName(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#a8a29e', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
