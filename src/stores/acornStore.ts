import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface AcornStore {
  balance: number
  lifetimeEarned: number
  currentStreak: number
  longestStreak: number
  setBalance: (balance: number, lifetime: number) => void
  setStreak: (current: number, longest: number) => void
  load: (userId: string) => Promise<void>
  addAcorns: (userId: string, amount: number) => Promise<void>
  reset: () => void
}

export const useAcornStore = create<AcornStore>((set, get) => ({
  balance: 0,
  lifetimeEarned: 0,
  currentStreak: 0,
  longestStreak: 0,
  setBalance: (balance, lifetimeEarned) => set({ balance, lifetimeEarned }),
  setStreak: (currentStreak, longestStreak) => set({ currentStreak, longestStreak }),

  load: async (userId: string) => {
    const [{ data: acorn }, { data: streak }] = await Promise.all([
      supabase.from('acorn_balance').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('streaks').select('*').eq('user_id', userId).maybeSingle(),
    ])
    if (acorn) set({ balance: acorn.balance, lifetimeEarned: acorn.lifetime_earned })
    if (streak) set({ currentStreak: streak.current_streak, longestStreak: streak.longest_streak })
  },

  reset: () => set({ balance: 0, lifetimeEarned: 0, currentStreak: 0, longestStreak: 0 }),

  addAcorns: async (userId: string, amount: number) => {
    // Always read from DB so stale local state can't corrupt the value
    const { data } = await supabase
      .from('acorn_balance')
      .select('balance, lifetime_earned')
      .eq('user_id', userId)
      .maybeSingle()
    const currentBalance = data?.balance ?? 0
    const currentLifetime = data?.lifetime_earned ?? 0
    const newBalance = currentBalance + amount
    const newLifetime = currentLifetime + amount
    await supabase.from('acorn_balance').upsert(
      { user_id: userId, balance: newBalance, lifetime_earned: newLifetime },
      { onConflict: 'user_id' }
    )
    set({ balance: newBalance, lifetimeEarned: newLifetime })
  },
}))
