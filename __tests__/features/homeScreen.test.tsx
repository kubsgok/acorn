import { fireEvent, render, screen } from '@testing-library/react-native'
import '@/i18n'
import { HomeScreen } from '@/features/home/HomeScreen'

const mockSignOut = jest.fn()
const mockReplace = jest.fn()
jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ signOut: mockSignOut }) }))
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
)

describe('HomeScreen', () => {
  beforeEach(() => jest.clearAllMocks())

  it('signs out and returns to the root', async () => {
    mockSignOut.mockResolvedValue(null)
    await render(<HomeScreen />)
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }))
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  it('tells the user when sign-out fails and does not navigate away', async () => {
    mockSignOut.mockResolvedValue({ message: 'network' })
    await render(<HomeScreen />)
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByText(/Couldn't sign you out/)).toBeOnTheScreen()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
