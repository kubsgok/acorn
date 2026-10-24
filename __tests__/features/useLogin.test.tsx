import { act, renderHook } from '@testing-library/react-native'
import { useLogin } from '@/features/auth/useLogin'

const mockSignIn = jest.fn()
const mockReplace = jest.fn()
jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ signIn: mockSignIn }) }))
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))

const creds = { email: 'a@b.co', password: 'pw' }

describe('useLogin', () => {
  beforeEach(() => jest.clearAllMocks())

  it('signs in and goes to the root on success', async () => {
    mockSignIn.mockResolvedValue(null)
    const { result } = await renderHook(() => useLogin())
    await act(async () => result.current.submit(creds))
    expect(mockSignIn).toHaveBeenCalledWith('a@b.co', 'pw')
    expect(mockReplace).toHaveBeenCalledWith('/')
    expect(result.current.errorKey).toBeNull()
    expect(result.current.submitting).toBe(false)
  })

  it('exposes a safe error key on a rejected sign-in and does not navigate', async () => {
    mockSignIn.mockResolvedValue({ code: 'invalid_credentials', message: 'raw backend text' })
    const { result } = await renderHook(() => useLogin())
    await act(async () => result.current.submit(creds))
    expect(result.current.errorKey).toBe('invalidCredentials')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('maps a thrown error instead of crashing', async () => {
    mockSignIn.mockRejectedValue(new Error('network down'))
    const { result } = await renderHook(() => useLogin())
    await act(async () => result.current.submit(creds))
    expect(result.current.errorKey).toBe('generic')
    expect(result.current.submitting).toBe(false)
  })
})
