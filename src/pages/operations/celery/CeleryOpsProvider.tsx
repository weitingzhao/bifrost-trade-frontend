import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useCeleryOpsAuth } from '@/hooks/useCeleryOpsAuth'
import { CeleryOpsContext, type CeleryFlash, type CeleryOpsContextValue } from './celeryOpsStore'

export function CeleryOpsProvider({ children }: { children: ReactNode }) {
  const auth = useCeleryOpsAuth()
  const [flash, setFlash] = useState<CeleryFlash>(null)

  const showFlash = useCallback((text: string, isErr = false) => {
    setFlash({ text, isErr })
    window.setTimeout(() => setFlash(null), 5000)
  }, [])

  const value = useMemo<CeleryOpsContextValue>(
    () => ({
      token: auth.token,
      caps: auth.caps,
      canOperate: auth.canOperate,
      canAdmin: auth.canAdmin,
      setToken: auth.setToken,
      refreshAuth: auth.refreshAuth,
      flash,
      setFlash,
      showFlash,
    }),
    [auth, flash, showFlash],
  )

  return <CeleryOpsContext.Provider value={value}>{children}</CeleryOpsContext.Provider>
}
