import { fireEvent, render, screen } from '@testing-library/react-native'
import { Button } from '@/components/ui'

describe('Button', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn()
    await render(<Button label="Log in" onPress={onPress} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('ignores presses and reports busy while loading', async () => {
    const onPress = jest.fn()
    await render(<Button label="Log in" onPress={onPress} loading />)
    const button = screen.getByRole('button', { name: 'Log in' })
    await fireEvent.press(button)
    expect(onPress).not.toHaveBeenCalled()
    expect(button).toBeBusy()
    expect(button).toBeDisabled()
  })

  it('ignores presses when disabled', async () => {
    const onPress = jest.fn()
    await render(<Button label="Log in" onPress={onPress} disabled variant="outline" />)
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
    expect(onPress).not.toHaveBeenCalled()
  })
})
