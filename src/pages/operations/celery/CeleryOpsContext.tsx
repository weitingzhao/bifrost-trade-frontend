import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { OpsCapabilities } from '@/api/ops'
import { useCeleryOpsAuth } from '@/hooks/useCeleryOpsAuth'

export type CeleryFlash = { text: string; isErr: boolean } | null

export interface CeleryOpsContextValue {
  token: string
  caps: OpsCapabilities | undefined
  canOperate: boolean
  canAdmin: boolean
  setToken: (token: string) => void
  refreshAuth: () => void
  flash: CeleryFlash
  setFlash: (flash: CeleryFlash) => void
  showFlash: (text: string, isErr?: boolean) => void
}

const CeleryOpsContext = createContext<CeleryOpsContextValue | null>(null)

export function CeleryOpsProvider({ children }: { children: ReactNode }) {
  const auth = useCeleryOpsAuth()
  const [flash, setFlash] = useState<CeleryFlash>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFlash = useCallback((text: string, isErr = false) => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
    setFlash({ text, isErr })
    if (!isErr) {
      flashTimerRef.current = setTimeout(() => {
        setFlash(null)
        flashTimerRef.current = null
      }, 8_000)
    }
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

export function useCeleryOps(): CeleryOpsContextValue {
  const ctx = useContext(CeleryOpsContext)
  if (!ctx) throw new Error('useCeleryOps must be used within CeleryOpsProvider')
  return ctx
}
