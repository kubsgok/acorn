import { fireEvent, render, screen } from '@testing-library/react-native'
import '@/i18n'
import { ComingSoon } from '@/components/ComingSoon'

const mockRouter = { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() }
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
)

describe('ComingSoon', () => {
  beforeEach(() => jest.clearAllMocks())

  it('tells the user the screen is not ready and lets them go back', async () => {
    mockRouter.canGoBack.mockReturnValue(true)
    await render(<ComingSoon />)
    expect(screen.getByRole('header')).toHaveTextContent('This screen is coming soon.')
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }))
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('falls back to Welcome when there is no history', async () => {
    mockRouter.canGoBack.mockReturnValue(false)
    await render(<ComingSoon />)
    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }))
    expect(mockRouter.replace).toHaveBeenCalledWith('/welcome')
  })
})
