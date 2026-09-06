import { Navigate, useLocation } from 'react-router-dom'
import { redirectTarget } from '@/lib/analyzeHubs'

/** A retired lab URL lands on its hub view, query and hash intact. */
export function LabRedirect({ from }: { from: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={redirectTarget(from, search, hash) ?? '/research'} replace />
}
