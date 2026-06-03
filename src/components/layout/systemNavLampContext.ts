import { createContext } from 'react'
import type { SystemNavLampState } from '@/hooks/useSystemNavLamps'

export type SystemNavLampContextValue = {
  getLamp: (path: string) => SystemNavLampState | undefined
}

export const SystemNavLampContext = createContext<SystemNavLampContextValue | null>(null)
