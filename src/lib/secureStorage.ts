import * as SecureStore from 'expo-secure-store'

// SecureStore keeps each value in the iOS Keychain / Android Keystore, but a Supabase session
// (access + refresh token) can exceed its ~2 KB per-value limit. We split it across chunks.
const CHUNK_SIZE = 1500

const countKey = (key: string) => `${key}.chunks`
const chunkKey = (key: string, index: number) => `${key}.${index}`

async function removeChunks(key: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(countKey(key)))
  if (Number.isInteger(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i))),
    )
  }
  await SecureStore.deleteItemAsync(countKey(key))
}

/** Storage adapter for the Supabase client: encrypted at rest, never AsyncStorage. */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = Number(await SecureStore.getItemAsync(countKey(key)))
    if (!Number.isInteger(count) || count <= 0) return null
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i))),
    )
    // A missing chunk means a torn write; treat as signed out rather than return corrupt JSON.
    return chunks.some((c) => c === null) ? null : chunks.join('')
  },

  async setItem(key: string, value: string): Promise<void> {
    await removeChunks(key)
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? []
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(chunkKey(key, i), c)))
    await SecureStore.setItemAsync(countKey(key), String(chunks.length))
  },

  async removeItem(key: string): Promise<void> {
    await removeChunks(key)
  },
}
