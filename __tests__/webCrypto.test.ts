import { installWebCrypto } from '@/lib/webCrypto'

const mockDigest = jest.fn()
const mockGetRandomValues = jest.fn()
jest.mock('expo-crypto', () => ({
  digest: (...args: unknown[]) => mockDigest(...args),
  getRandomValues: (...args: unknown[]) => mockGetRandomValues(...args),
}))

describe('installWebCrypto', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fills in digest and getRandomValues when the runtime has no WebCrypto', async () => {
    const host: Parameters<typeof installWebCrypto>[0] = {}
    const hashed = new ArrayBuffer(32)
    mockDigest.mockResolvedValue(hashed)
    installWebCrypto(host)

    const data = new Uint8Array([1, 2, 3])
    await expect(host.crypto?.subtle?.digest('SHA-256', data)).resolves.toBe(hashed)
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', data)

    host.crypto?.getRandomValues?.(new Uint8Array(4))
    expect(mockGetRandomValues).toHaveBeenCalled()
  })

  it('leaves an existing implementation alone', () => {
    const existing = { digest: jest.fn() }
    const getRandomValues = jest.fn()
    const host: Parameters<typeof installWebCrypto>[0] = {
      crypto: { subtle: existing, getRandomValues },
    }
    installWebCrypto(host)
    expect(host.crypto?.subtle).toBe(existing)
    expect(host.crypto?.getRandomValues).toBe(getRandomValues)
  })
})
