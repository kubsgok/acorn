import { parseHttpsUrl, parsePublicSupabaseKey, parseSupabaseConfig } from '@/lib/config'

describe('parseHttpsUrl', () => {
  it('accepts https URLs', () => {
    expect(parseHttpsUrl('https://example.com/terms')).toBe('https://example.com/terms')
  })

  it.each([undefined, '', 'http://example.com', 'javascript:alert(1)', 'not a url'])(
    'rejects %p',
    (value) => {
      expect(parseHttpsUrl(value)).toBeNull()
    },
  )
})

const jwt = (payload: object) =>
  `h.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.s`

describe('parsePublicSupabaseKey', () => {
  it.each([jwt({ role: 'anon' }), 'sb_publishable_abc123', '  sb_publishable_abc  '])(
    'accepts public key %p',
    (key) => expect(parsePublicSupabaseKey(key)).toBe(key.trim()),
  )

  it('refuses a service_role JWT', () => {
    expect(() => parsePublicSupabaseKey(jwt({ role: 'service_role' }))).toThrow(/secret/i)
  })

  it('refuses an sb_secret_ key', () => {
    expect(() => parsePublicSupabaseKey('sb_secret_abc')).toThrow(/secret/i)
  })

  it.each([undefined, '', '   '])('requires a key (%p)', (key) => {
    expect(() => parsePublicSupabaseKey(key)).toThrow(/missing/i)
  })
})

describe('parseSupabaseConfig', () => {
  it('returns url and key when valid', () => {
    expect(
      parseSupabaseConfig({ url: 'https://abc.supabase.co', anonKey: 'sb_publishable_x' }),
    ).toEqual({ url: 'https://abc.supabase.co/', anonKey: 'sb_publishable_x' })
  })

  it.each([undefined, 'http://abc.supabase.co', 'nonsense'])('rejects url %p', (url) => {
    expect(() => parseSupabaseConfig({ url, anonKey: 'sb_publishable_x' })).toThrow(/https/)
  })
})
