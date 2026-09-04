/**
 * Deep link `/research/loop/runs/:runId` → Harness Console drawer.
 * Pipeline UI lives in the Console right inspector (keeps flow on one page).
 */
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'

export default function LoopRunPipelinePage() {
  const { runId = '' } = useParams<{ runId: string }>()
  const [searchParams] = useSearchParams()
  const live = searchParams.get('live') !== '0'
  if (!runId) {
    return <Navigate to="/research/loop/harness" replace />
  }
  return <Navigate to={loopPipelinePath(runId, { live })} replace />
}
