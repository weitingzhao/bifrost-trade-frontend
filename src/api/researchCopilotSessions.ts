import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { researchThrowHttp } from '@/lib/auth/researchHttpError'
import { withValidation } from '@/lib/apiValidation'
import {
  CopilotSessionDetailSchema,
  CopilotSessionListSchema,
} from '@/lib/schemas/research'
export type CopilotSessionSummary = {
  id: string
  title?: string | null
  model?: string
  updated_at?: string
  message_count?: number
  /** User questions only (D5). Prefer over counting frames client-side. */
  turns?: number
  pinned?: boolean
  group_name?: string | null
  origin_page?: string | null
  origin_label?: string | null
  origin_symbol?: string | null
  writes?: Record<string, number>
  /** Sum of chat_turn cost_usd for this session (D3). Missing / null → show —. */
  cost_usd?: number | null
}

export type CopilotSessionDetail = {
  session: {
    id: string
    title?: string | null
    model?: string
    messages?: PersistedCopilotFrame[]
    agent_trail?: Array<{ from: string; to: string; at?: string }>
  }
  messages: PersistedCopilotFrame[]
}

export type PersistedCopilotFrame = {
  kind?: string
  role?: string
  content?: string
  agent_from?: string
  agent_to?: string
  tool_call_id?: string
  tool_name?: string
  args?: Record<string, unknown>
  ok?: boolean
  data?: unknown
  error?: string
  agent?: string
  ts?: string
}

/**
 * Recent sessions. `q` full-text filters title + message content server-side
 * (program research-copilot-reach P2) — content matters because the words a
 * user remembers usually live in the conversation, not the generated title.
 */
const validateSessionList = withValidation<{ rows: CopilotSessionSummary[] }>(
  CopilotSessionListSchema,
  'research/copilot/sessions',
)
const validateSessionDetail = withValidation<CopilotSessionDetail>(
  CopilotSessionDetailSchema,
  'research/copilot/sessions/{id}',
)

export async function fetchCopilotSessions(
  limit = 10,
  q?: string,
): Promise<CopilotSessionSummary[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  const term = (q ?? '').trim()
  if (term) params.set('q', term)
  const res = await fetch(researchEngineUrl(`/research/copilot/sessions?${params}`), {
    headers: getResearchAuthHeaders(),
  })
  if (!res.ok) researchThrowHttp(res, 'sessions')
  const body = validateSessionList(await res.json())
  return body.rows ?? []
}

export async function fetchCopilotSession(id: string): Promise<CopilotSessionDetail> {
  const res = await fetch(researchEngineUrl(`/research/copilot/sessions/${encodeURIComponent(id)}`), {
    headers: getResearchAuthHeaders(),
  })
  if (!res.ok) researchThrowHttp(res, 'session')
  return validateSessionDetail(await res.json())
}

export async function archiveCopilotSession(id: string): Promise<void> {
  const res = await fetch(researchEngineUrl(`/research/copilot/sessions/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: getResearchAuthHeaders(),
  })
  if (!res.ok) researchThrowHttp(res, 'archive')
}

export async function patchCopilotSession(
  id: string,
  changes: {
    title?: string
    pinned?: boolean
    group_name?: string | null
    clear_group?: boolean
  },
): Promise<CopilotSessionSummary> {
  const res = await fetch(researchEngineUrl(`/research/copilot/sessions/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getResearchAuthHeaders() },
    body: JSON.stringify(changes),
  })
  if (!res.ok) researchThrowHttp(res, 'patch')
  const body = (await res.json()) as { session: CopilotSessionSummary }
  return body.session
}
