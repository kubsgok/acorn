import { fireEvent, render, screen } from '@testing-library/react-native'
import { PasswordField, TextField } from '@/components/ui'

describe('TextField', () => {
  it('exposes the label and reports typed text', async () => {
    const onChangeText = jest.fn()
    await render(
      <TextField label="Email address" placeholder="you@example.com" onChangeText={onChangeText} />,
    )
    await fireEvent.changeText(screen.getByLabelText('Email address'), 'a@b.co')
    expect(onChangeText).toHaveBeenCalledWith('a@b.co')
  })
})

describe('PasswordField', () => {
  it('hides the password by default and toggles visibility with accessible labels', async () => {
    await render(
      <PasswordField label="Password" showLabel="Show password" hideLabel="Hide password" />,
    )
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true)

    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false)
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen()
  })
})
