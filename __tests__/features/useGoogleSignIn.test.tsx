import { act, renderHook } from '@testing-library/react-native'
import { useGoogleSignIn } from '@/features/auth/useGoogleSignIn'

const REDIRECT = 'acornlabs://auth/callback'
const mockSignInWithOAuth = jest.fn()
const mockExchange = jest.fn()
const mockOpenAuthSession = jest.fn()
const mockReplace = jest.fn()
jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    auth: { signInWithOAuth: mockSignInWithOAuth, exchangeCodeForSession: mockExchange },
  }),
}))
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSession(...args),
}))
jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  createURL: () => 'acornlabs://auth/callback',
}))
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))

const run = async () => {
  const { result } = await renderHook(() => useGoogleSignIn())
  await act(async () => result.current.signIn())
  return result
}

describe('useGoogleSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://google.test/auth' },
      error: null,
    })
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: `${REDIRECT}?code=abc` })
    mockExchange.mockResolvedValue({ error: null })
  })

  it('opens the Google page, exchanges the returned code and goes to the root', async () => {
    const result = await run()
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
    })
    expect(mockOpenAuthSession).toHaveBeenCalledWith('https://google.test/auth', REDIRECT)
    expect(mockExchange).toHaveBeenCalledWith('abc')
    expect(mockReplace).toHaveBeenCalledWith('/')
    expect(result.current.errorKey).toBeNull()
    expect(result.current.submitting).toBe(false)
  })

  it('does nothing when the user closes the browser', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' })
    const result = await run()
    expect(mockExchange).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
    expect(result.current.errorKey).toBeNull()
  })

  it('shows a generic error when Supabase cannot start the sign-in', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: null }, error: { code: 'x' } })
    const result = await run()
    expect(mockOpenAuthSession).not.toHaveBeenCalled()
    expect(result.current.errorKey).toBe('generic')
  })

  it('shows a generic error when the redirect carries no code', async () => {
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: `${REDIRECT}?error=access_denied&error_description=raw`,
    })
    const result = await run()
    expect(mockExchange).not.toHaveBeenCalled()
    expect(result.current.errorKey).toBe('generic')
  })

  it('exposes a safe error key when the code exchange fails', async () => {
    mockExchange.mockResolvedValue({ error: { code: 'bad_code', message: 'raw' } })
    const result = await run()
    expect(result.current.errorKey).toBe('generic')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('maps a thrown error instead of crashing', async () => {
    mockOpenAuthSession.mockRejectedValue(new Error('browser unavailable'))
    const result = await run()
    expect(result.current.errorKey).toBe('generic')
    expect(result.current.submitting).toBe(false)
  })
})
