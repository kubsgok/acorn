import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { useAcornStore } from './acornStore'

const AVATAR_KEY = 'user_avatar_uri'

interface AuthStore {
  session: Session | null
  user: User | null
  squirrelName: string
  fullName: string | null
  preferredName: string | null
  avatarUri: string | null
  onboardingDone: boolean
  setSession: (session: Session | null) => void
  setSquirrelName: (name: string) => void
  setPreferredName: (name: string | null) => void
  loadProfile: (userId: string) => Promise<void>
  setAvatarUri: (uri: string | null) => Promise<void>
  loadAvatar: () => Promise<void>
  setOnboardingDone: (done: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  squirrelName: 'Acorn',
  fullName: null,
  preferredName: null,
  avatarUri: null,
  onboardingDone: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setSquirrelName: (name) => set({ squirrelName: name }),
  setPreferredName: (name) => set({ preferredName: name }),
  loadProfile: async (userId) => {
    // Hydrate the user's saved profile (name + squirrel name) from Supabase.
    // Tolerates the demographic columns not existing yet (pre-migration).
    const { data, error } = await supabase
      .from('users')
      .select('squirrel_name, full_name, preferred_name')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return
    set({
      squirrelName: data.squirrel_name ?? 'Acorn',
      fullName: data.full_name ?? null,
      preferredName: data.preferred_name ?? null,
    })
  },
  setAvatarUri: async (uri) => {
    if (uri) {
      await AsyncStorage.setItem(AVATAR_KEY, uri)
    } else {
      await AsyncStorage.removeItem(AVATAR_KEY)
    }
    set({ avatarUri: uri })
  },
  loadAvatar: async () => {
    const uri = await AsyncStorage.getItem(AVATAR_KEY)
    if (uri) set({ avatarUri: uri })
  },
  setOnboardingDone: (done) => set({ onboardingDone: done }),
  signOut: async () => {
    await supabase.auth.signOut()
    await AsyncStorage.removeItem(AVATAR_KEY)
    set({ session: null, user: null, onboardingDone: false, avatarUri: null, fullName: null, preferredName: null, squirrelName: 'Acorn' })
  },
}))
