import { useContext } from 'react'
import { SystemNavLampContext } from '@/components/layout/systemNavLampContext'
import type { SystemNavLampState } from '@/hooks/useSystemNavLamps'

export function useSystemNavLamp(path: string): SystemNavLampState | undefined {
  return useContext(SystemNavLampContext)?.getLamp(path)
}
