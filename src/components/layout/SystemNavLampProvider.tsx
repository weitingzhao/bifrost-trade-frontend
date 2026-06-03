import { useSystemNavLamps } from '@/hooks/useSystemNavLamps'
import { SystemNavLampContext } from '@/components/layout/systemNavLampContext'
import type { ReactNode } from 'react'

export function SystemNavLampProvider({ children }: { children: ReactNode }) {
  const { getLamp } = useSystemNavLamps(true)
  return (
    <SystemNavLampContext.Provider value={{ getLamp }}>
      {children}
    </SystemNavLampContext.Provider>
  )
}
