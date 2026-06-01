import { createContext } from 'react'
import type { OpsCapabilities } from '@/api/ops'

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

export const CeleryOpsContext = createContext<CeleryOpsContextValue | null>(null)
