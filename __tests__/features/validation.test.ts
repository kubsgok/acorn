import { validateEmail, validatePassword } from '@/features/auth/validation'

describe('validateEmail', () => {
  it.each(['a@b.co', '  user@example.com  ', 'first.last+tag@sub.example.org'])(
    'accepts %p',
    (value) => expect(validateEmail(value)).toBeNull(),
  )

  it.each(['', '   '])('requires a value (%p)', (value) =>
    expect(validateEmail(value)).toBe('required'),
  )

  it.each(['plain', 'a@b', '@b.co', 'a b@c.co', 'a@@b.co'])('rejects %p', (value) =>
    expect(validateEmail(value)).toBe('invalid'),
  )
})

describe('validatePassword', () => {
  it('requires a value', () => expect(validatePassword('')).toBe('required'))
  it('accepts any non-empty value, including spaces', () =>
    expect(validatePassword(' ')).toBeNull())
})
