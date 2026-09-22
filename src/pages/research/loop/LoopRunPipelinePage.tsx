/**
 * The design's Loop Run address — a surface, not a page.
 *
 * `Research Autopilot Console.dc.html` settles it in its own script
 * (§5a.8, seventeenth round): *"the run pipeline is a SURFACE in the shell's
 * side panel, never this page's own drawer. Only the embedded run face
 * (#/research/loop/runs inside the panel) renders the pipeline."* So this
 * route is the deep-link address of that surface: it lands on the Console,
 * which reads `?run=` and opens `runSurface(id)` in the panel.
 *
 * The comment here used to say the pipeline lives in the Console's right
 * inspector. That inspector was retired when the surface was built — a
 * surface is something you can carry to the panel or a float and keep after
 * leaving the page that opened it; an inspector explains a row of its own
 * page. The address did not move; what it opens did.
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
