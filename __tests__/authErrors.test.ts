import { toLoginErrorKey } from '@/features/auth/authErrors'

describe('toLoginErrorKey', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'invalidCredentials'],
    [{ code: 'email_not_confirmed' }, 'emailNotConfirmed'],
    [{ code: 'over_request_rate_limit', status: 429 }, 'tooManyAttempts'],
    [{ status: 429 }, 'tooManyAttempts'],
    [{ name: 'AuthRetryableFetchError', status: 0 }, 'network'],
    [{ code: 'something_new', message: 'user alice@example.com not found' }, 'generic'],
    [new Error('boom'), 'generic'],
    [null, 'generic'],
    [undefined, 'generic'],
  ])('maps %p to %s', (error, expected) => {
    expect(toLoginErrorKey(error)).toBe(expected)
  })
})
