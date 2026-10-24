export type FieldError = 'required' | 'invalid'

// Deliberately simple: the server is the source of truth for whether an address can sign in.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): FieldError | null {
  const value = email.trim()
  if (value.length === 0) return 'required'
  return EMAIL_PATTERN.test(value) ? null : 'invalid'
}

export function validatePassword(password: string): FieldError | null {
  return password.length === 0 ? 'required' : null
}
