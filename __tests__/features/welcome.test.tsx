import { fireEvent, render, screen } from '@testing-library/react-native'
import '@/i18n'
import { WelcomeScreen } from '@/features/welcome/WelcomeScreen'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
)

describe('WelcomeScreen', () => {
  beforeEach(() => mockPush.mockClear())

  it('shows the heading, subtitle and terms notice', async () => {
    await render(<WelcomeScreen />)
    expect(screen.getByRole('header')).toHaveTextContent('Welcome to Acorn Labs')
    expect(screen.getByText('Your free online visit and treatment starts here.')).toBeOnTheScreen()
    expect(screen.getByText(/Program Terms and Sensitive Data Content/)).toBeOnTheScreen()
  })

  it('navigates to register and login', async () => {
    await render(<WelcomeScreen />)
    await fireEvent.press(screen.getByRole('button', { name: 'Create your free account' }))
    expect(mockPush).toHaveBeenLastCalledWith('/register')
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
    expect(mockPush).toHaveBeenLastCalledWith('/login')
  })

  it('hides the decorative illustration from screen readers', async () => {
    await render(<WelcomeScreen />)
    expect(screen.queryByRole('image')).not.toBeOnTheScreen()
  })
})
