import * as ExpoCrypto from 'expo-crypto'

type CryptoHost = {
  crypto?: {
    getRandomValues?: typeof ExpoCrypto.getRandomValues
    subtle?: { digest: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer> }
  }
}

/**
 * Hermes has no WebCrypto. Without it Supabase's PKCE sends the secret verifier as the challenge
 * ("plain") and builds it with Math.random. Fill in the two functions it needs from expo-crypto.
 */
export function installWebCrypto(host: CryptoHost = globalThis as CryptoHost): void {
  const webCrypto = (host.crypto ??= {})
  webCrypto.getRandomValues ??= ExpoCrypto.getRandomValues
  webCrypto.subtle ??= {
    digest: (algorithm, data) =>
      ExpoCrypto.digest(algorithm as ExpoCrypto.CryptoDigestAlgorithm, data),
  }
}
