import { useCallback, useState } from 'react'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { getSupabase } from '@/lib/supabase'
import { toLoginErrorKey, type LoginErrorKey } from './authErrors'

/**
 * Signs in with Google through Supabase's browser flow (works in Expo Go): Supabase hosts the
 * Google handshake and redirects back with a one-time code, which we trade for a session (PKCE).
 */
export function useGoogleSignIn() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<LoginErrorKey | null>(null)

  const signIn = useCallback(async () => {
    setSubmitting(true)
    setErrorKey(null)
    try {
      const auth = getSupabase().auth
      const redirectTo = Linking.createURL('auth/callback')
      const { data, error } = await auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data.url) {
        setErrorKey(toLoginErrorKey(error))
        return
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      // The user closing the browser is not an error.
      if (result.type !== 'success') return
      // `URL` is the polyfilled one: src/lib/supabase.ts loads react-native-url-polyfill.
      const code = new URL(result.url).searchParams.get('code')
      if (!code) {
        setErrorKey('generic')
        return
      }
      const { error: exchangeError } = await auth.exchangeCodeForSession(code)
      if (exchangeError) setErrorKey(toLoginErrorKey(exchangeError))
      else router.replace('/')
    } catch (error) {
      setErrorKey(toLoginErrorKey(error))
    } finally {
      setSubmitting(false)
    }
  }, [router])

  return { signIn, submitting, errorKey }
}
