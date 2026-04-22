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
  avatarUri: string | null
  onboardingDone: boolean
  setSession: (session: Session | null) => void
  setSquirrelName: (name: string) => void
  setAvatarUri: (uri: string | null) => Promise<void>
  loadAvatar: () => Promise<void>
  setOnboardingDone: (done: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  squirrelName: 'Acorn',
  avatarUri: null,
  onboardingDone: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setSquirrelName: (name) => set({ squirrelName: name }),
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
    set({ session: null, user: null, onboardingDone: false, avatarUri: null })
  },
}))
