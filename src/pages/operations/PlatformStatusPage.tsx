import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { usePlatformPanel } from '@/hooks/usePlatformPanel'

/** Route alias: opens the docked Platform Plugins panel and redirects to Live. */
export default function PlatformStatusPage() {
  const { open, toggle } = usePlatformPanel()

  useEffect(() => {
    if (!open) toggle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- open panel once on mount

  return <Navigate to="/market/live" replace />
}
