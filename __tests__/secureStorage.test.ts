import { secureStorage } from '@/lib/secureStorage'

const mockStore = new Map<string, string>()
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}))

describe('secureStorage', () => {
  beforeEach(() => mockStore.clear())

  it('round-trips a value larger than one SecureStore entry', async () => {
    const value = 'x'.repeat(4200)
    await secureStorage.setItem('session', value)
    expect(await secureStorage.getItem('session')).toBe(value)
    expect(mockStore.size).toBeGreaterThan(2) // split into several chunks + the count
  })

  it('returns null when nothing is stored', async () => {
    expect(await secureStorage.getItem('missing')).toBeNull()
  })

  it('replaces a longer old value without leaving stale chunks', async () => {
    await secureStorage.setItem('session', 'a'.repeat(4000))
    await secureStorage.setItem('session', 'short')
    expect(await secureStorage.getItem('session')).toBe('short')
    expect([...mockStore.keys()].sort()).toEqual(['session.0', 'session.chunks'])
  })

  it('removes every chunk', async () => {
    await secureStorage.setItem('session', 'a'.repeat(4000))
    await secureStorage.removeItem('session')
    expect(mockStore.size).toBe(0)
    expect(await secureStorage.getItem('session')).toBeNull()
  })

  it('treats a torn write (missing chunk) as signed out', async () => {
    await secureStorage.setItem('session', 'a'.repeat(4000))
    mockStore.delete('session.1')
    expect(await secureStorage.getItem('session')).toBeNull()
  })
})
