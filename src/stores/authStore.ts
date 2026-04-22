import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthStore {
  session: Session | null
  user: User | null
  squirrelName: string
  onboardingDone: boolean
  setSession: (session: Session | null) => void
  setSquirrelName: (name: string) => void
  setOnboardingDone: (done: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  squirrelName: 'Acorn',
  onboardingDone: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setSquirrelName: (name) => set({ squirrelName: name }),
  setOnboardingDone: (done) => set({ onboardingDone: done }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, onboardingDone: false })
  },
}))
