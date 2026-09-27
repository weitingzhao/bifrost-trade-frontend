/**
 * What the chat asked to change — `GET /research/copilot/writes` (research 0.133.0).
 *
 * One row per write tool the Owner approved or refused on a card in the
 * Copilot panel, newest first, over the last `days` UTC days. Each row keeps
 * the thread it came from. The scheduled agents' drafts are not here; they are
 * the Decision Inbox's.
 */
import { withValidation } from '@/lib/apiValidation'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope } from '@/lib/researchEnvelope'
import { CopilotWritesSchema } from '@/lib/schemas/research'

export interface CopilotWriteRow {
  id: string
  /** The write tool's full name, e.g. `research.loop.propose_candidate`. */
  tool: string
  /** The noun the Kind column shows: hypothesis, candidate, intent, rule … */
  kind: string
  /** One line built server-side from the arguments the tool ran with. */
  change: string
  symbol: string | null
  /** Null when the write was recorded without its thread. */
  session_id: string | null
  thread_title: string | null
  thread_archived: boolean | null
  /** Ledger status: approved (token issued) · executed · rejected · error · proposed · expired. */
  status: string
  ok: boolean | null
  error: string | null
  created_at: string | null
  executed_at: string | null
}

export interface CopilotWrites {
  days: number
  since_day_utc: string
  rows: CopilotWriteRow[]
  /** Counted over the window, not the page size. */
  total: number
  truncated: boolean
  /** The newest chat write at any age — what an empty window can still say. */
  last_write_at: string | null
  db_ok: boolean
}

const validate = withValidation<CopilotWrites>(CopilotWritesSchema, 'research/copilot/writes')

export async function fetchCopilotWrites(days = 7, limit = 50): Promise<CopilotWrites> {
  const qs = new URLSearchParams({ days: String(days), limit: String(limit) })
  const res = await fetch(researchEngineUrl(`/research/copilot/writes?${qs}`), {
    headers: getResearchAuthHeaders(),
  })
  return validate(await unwrapResearchEnvelope(res, { apiLabel: 'Copilot writes' }))
}
