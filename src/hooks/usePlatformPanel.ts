import { useContext } from 'react'
import { PlatformPanelContext } from '@/context/PlatformPanelContext'

export function usePlatformPanel() {
  const ctx = useContext(PlatformPanelContext)
  if (!ctx) throw new Error('usePlatformPanel must be inside PlatformPanelProvider')
  return ctx
}
