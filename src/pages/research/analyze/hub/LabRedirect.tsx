import { Navigate, useLocation } from 'react-router-dom'
import { analyzeRedirect } from '@/lib/symbolTabs'

/** A retired lab or hub URL lands on its Symbol tab, query and section intact. */
export function LabRedirect({ from }: { from: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={analyzeRedirect(from, search, hash) ?? '/research'} replace />
}
