import { createContext, useContext, type ReactNode } from 'react'
import {
  useSystemNavLamps,
  type SystemNavLampState,
} from '@/hooks/useSystemNavLamps'

type SystemNavLampContextValue = {
  getLamp: (path: string) => SystemNavLampState | undefined
}

const SystemNavLampContext = createContext<SystemNavLampContextValue | null>(null)

function useSystemNavLampContext(): SystemNavLampContextValue | null {
  return useContext(SystemNavLampContext)
}

export function SystemNavLampProvider({ children }: { children: ReactNode }) {
  const { getLamp } = useSystemNavLamps(true)
  return (
    <SystemNavLampContext.Provider value={{ getLamp }}>
      {children}
    </SystemNavLampContext.Provider>
  )
}

export function useSystemNavLamp(path: string): SystemNavLampState | undefined {
  return useSystemNavLampContext()?.getLamp(path)
}
