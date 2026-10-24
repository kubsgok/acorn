import { useCallback } from 'react'
import { useRouter } from 'expo-router'

/** Goes back, or to Welcome when there is no history (e.g. after a deep link). */
export function useGoBack(): () => void {
  const router = useRouter()
  return useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/welcome')
  }, [router])
}
