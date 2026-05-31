import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useLogPanel } from '@/hooks/useLogPanel'

/** Route alias: opens the footer LogPanel and redirects to Live. */
export default function LogsPage() {
  const { open, toggle } = useLogPanel()

  useEffect(() => {
    if (!open) toggle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- open panel once on mount

  return <Navigate to="/market/live" replace />
}
