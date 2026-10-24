/** Returns the URL only if it is a valid https URL; anything else (missing, http, junk) is null. */
export function parseHttpsUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Reads the `role` claim from a JWT without verifying it (used only to refuse secret keys). */
function jwtRole(token: string): string | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const role = (JSON.parse(json) as { role?: unknown }).role
    return typeof role === 'string' ? role : null
  } catch {
    return null
  }
}

/**
 * Validates the Supabase client key. Only public keys may ship in the app:
 * refuses `sb_secret_…` keys and legacy JWTs whose role is `service_role`.
 */
export function parsePublicSupabaseKey(value: string | undefined): string {
  const key = value?.trim()
  if (!key) throw new Error('EXPO_PUBLIC_SUPABASE_KEY is missing. See .env.example.')
  if (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role') {
    throw new Error('A secret Supabase key was supplied. Use the publishable/anon key only.')
  }
  return key
}

export type SupabaseConfig = { url: string; anonKey: string }

export function parseSupabaseConfig(env: {
  url: string | undefined
  anonKey: string | undefined
}): SupabaseConfig {
  const url = parseHttpsUrl(env.url)
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL must be a valid https URL. See .env.example.')
  return { url, anonKey: parsePublicSupabaseKey(env.anonKey) }
}

// EXPO_PUBLIC_* values are bundled into the app: public values only, never secrets.
// They must be read as literal `process.env.EXPO_PUBLIC_X` so the bundler can inline them.
export const config = {
  termsUrl: parseHttpsUrl(process.env.EXPO_PUBLIC_TERMS_URL),
} as const

/** Validated lazily so screens and tests that don't touch Supabase never fail on missing env. */
export function getSupabaseConfig(): SupabaseConfig {
  return parseSupabaseConfig({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  })
}
