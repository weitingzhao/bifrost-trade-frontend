import { useContext } from 'react'
import { LogPanelContext } from '@/context/LogPanelContext'

export function useLogPanel() {
  const ctx = useContext(LogPanelContext)
  if (!ctx) throw new Error('useLogPanel must be inside LogPanelProvider')
  return ctx
}
