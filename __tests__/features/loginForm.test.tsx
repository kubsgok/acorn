import { fireEvent, render, screen } from '@testing-library/react-native'
import '@/i18n'
import { LoginForm } from '@/features/auth/LoginForm'

async function setup(props: Partial<React.ComponentProps<typeof LoginForm>> = {}) {
  const onSubmit = jest.fn()
  const onForgotPassword = jest.fn()
  await render(<LoginForm onSubmit={onSubmit} onForgotPassword={onForgotPassword} {...props} />)
  return { onSubmit, onForgotPassword }
}

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('Email address'), email)
  await fireEvent.changeText(screen.getByLabelText('Password'), password)
}

describe('LoginForm', () => {
  it('submits trimmed credentials when valid', async () => {
    const { onSubmit } = await setup()
    await fill('  user@example.com ', 'secret')
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' })
  })

  it('shows required errors and does not submit an empty form', async () => {
    const { onSubmit } = await setup()
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Enter your email address.')).toBeOnTheScreen()
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen()
  })

  it('shows an invalid-email error on blur and clears it when typing', async () => {
    await setup()
    const email = screen.getByLabelText('Email address')
    await fireEvent.changeText(email, 'nope')
    await fireEvent(email, 'blur')
    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen()
    await fireEvent.changeText(email, 'nope@')
    expect(screen.queryByText('Enter a valid email address.')).not.toBeOnTheScreen()
  })

  it('does not nag about an untouched empty email on blur', async () => {
    await setup()
    await fireEvent(screen.getByLabelText('Email address'), 'blur')
    expect(screen.queryByText('Enter your email address.')).not.toBeOnTheScreen()
  })

  it('ignores presses while submitting', async () => {
    const { onSubmit } = await setup({ submitting: true })
    await fill('user@example.com', 'secret')
    await fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('opens password recovery', async () => {
    const { onForgotPassword } = await setup()
    await fireEvent.press(screen.getByRole('link', { name: 'Forgot password?' }))
    expect(onForgotPassword).toHaveBeenCalledTimes(1)
  })
})
