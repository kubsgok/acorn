export type LoginErrorKey =
  'invalidCredentials' | 'emailNotConfirmed' | 'tooManyAttempts' | 'network' | 'generic'

type AuthErrorLike = { code?: string; status?: number; name?: string }

/**
 * Maps a Supabase auth error to a safe, generic UI message key.
 * Never surfaces the backend's raw message (it can reveal whether an account exists).
 * Trade-off: `email_not_confirmed` has its own message. Supabase only returns it after the password
 * was correct, so it does not let a stranger probe which emails are registered.
 */
export function toLoginErrorKey(error: unknown): LoginErrorKey {
  const e = (error ?? {}) as AuthErrorLike
  if (e.code === 'invalid_credentials') return 'invalidCredentials'
  if (e.code === 'email_not_confirmed') return 'emailNotConfirmed'
  if (e.code === 'over_request_rate_limit' || e.status === 429) return 'tooManyAttempts'
  if (e.name === 'AuthRetryableFetchError' || e.status === 0) return 'network'
  return 'generic'
}
