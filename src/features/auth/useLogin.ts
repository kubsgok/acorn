import { useCallback, useState } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from './AuthProvider'
import { toLoginErrorKey, type LoginErrorKey } from './authErrors'
import type { Credentials } from './LoginForm'

/** Submits credentials, tracks the in-flight state and exposes a safe error key for the UI. */
export function useLogin() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [errorKey, setErrorKey] = useState<LoginErrorKey | null>(null)

  const submit = useCallback(
    async ({ email, password }: Credentials) => {
      setSubmitting(true)
      setErrorKey(null)
      try {
        const error = await signIn(email, password)
        if (error) setErrorKey(toLoginErrorKey(error))
        // The auth gate swaps navigators on sign-in; "/" then redirects to the signed-in home.
        else router.replace('/')
      } catch (error) {
        setErrorKey(toLoginErrorKey(error))
      } finally {
        setSubmitting(false)
      }
    },
    [signIn, router],
  )

  return { submit, submitting, errorKey }
}
