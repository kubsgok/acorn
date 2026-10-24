import { act, render, renderHook, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'

type Listener = (event: string, session: unknown) => void
let listener: Listener
const mockAuth = {
  onAuthStateChange: jest.fn((cb: Listener) => {
    listener = cb
    return { data: { subscription: { unsubscribe: jest.fn() } } }
  }),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
}
jest.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: mockAuth }) }))

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

describe('AuthProvider', () => {
  beforeEach(() => jest.clearAllMocks())

  it('starts loading, then reports signed out when there is no stored session', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper })
    expect(result.current.status).toBe('loading')
    await act(async () => listener('INITIAL_SESSION', null))
    expect(result.current.status).toBe('signedOut')
  })

  it('reports signed in for a restored session and signed out after sign-out', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper })
    await act(async () => listener('INITIAL_SESSION', { user: { id: 'u1' } }))
    expect(result.current.status).toBe('signedIn')
    await act(async () => listener('SIGNED_OUT', null))
    expect(result.current.status).toBe('signedOut')
  })

  it('signIn forwards credentials and returns the error (or null)', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    const { result } = await renderHook(() => useAuth(), { wrapper })
    let error: unknown
    await act(async () => {
      error = await result.current.signIn('a@b.co', 'pw')
    })
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' })
    expect(error).toEqual({ code: 'invalid_credentials' })
  })

  it('refuses to be used outside the provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    function Probe() {
      useAuth()
      return <Text>x</Text>
    }
    await expect(render(<Probe />)).rejects.toThrow(/AuthProvider/)
    spy.mockRestore()
  })
})
