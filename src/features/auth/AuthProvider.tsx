import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut'

type AuthContextValue = {
  status: AuthStatus
  session: Session | null
  /** Resolves with the auth error, or null on success. */
  signIn: (email: string, password: string) => Promise<AuthError | null>
  /** Signs out this device only. Resolves with the error, or null on success. */
  signOut: () => Promise<AuthError | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // INITIAL_SESSION fires on subscribe with whatever is in secure storage (or null).
    // Keep this callback synchronous: calling other Supabase methods inside it can deadlock.
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoaded(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    return error
  }, [])

  const signOut = useCallback(async () => {
    // 'local' ends only this device's session; other devices stay signed in.
    const { error } = await getSupabase().auth.signOut({ scope: 'local' })
    return error
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: !loaded ? 'loading' : session ? 'signedIn' : 'signedOut',
      session,
      signIn,
      signOut,
    }),
    [loaded, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.')
  return value
}
