import { researchEngineUrl } from '@/lib/devApiUrl'

export type CopilotSessionSummary = {
  id: string
  title?: string | null
  model?: string
  updated_at?: string
  message_count?: number
  pinned?: boolean
}

export type CopilotSessionDetail = {
  session: {
    id: string
    title?: string | null
    model?: string
    messages?: Array<{ role: string; content: string }>
    agent_trail?: Array<{ from: string; to: string; at?: string }>
  }
  messages: Array<{ role: string; content: string }>
}

export async function fetchCopilotSessions(limit = 10): Promise<CopilotSessionSummary[]> {
  const res = await fetch(researchEngineUrl(`/research/copilot/sessions?limit=${limit}`))
  if (!res.ok) throw new Error(`sessions HTTP ${res.status}`)
  const body = (await res.json()) as { rows: CopilotSessionSummary[] }
  return body.rows ?? []
}

export async function fetchCopilotSession(id: string): Promise<CopilotSessionDetail> {
  const res = await fetch(researchEngineUrl(`/research/copilot/sessions/${encodeURIComponent(id)}`))
  if (!res.ok) throw new Error(`session HTTP ${res.status}`)
  return (await res.json()) as CopilotSessionDetail
}

export async function archiveCopilotSession(id: string): Promise<void> {
  const res = await fetch(researchEngineUrl(`/research/copilot/sessions/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`archive HTTP ${res.status}`)
}

export async function patchCopilotSession(
  id: string,
  changes: { title?: string; pinned?: boolean },
): Promise<CopilotSessionSummary> {
  const res = await fetch(researchEngineUrl(`/research/copilot/sessions/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  })
  if (!res.ok) throw new Error(`patch HTTP ${res.status}`)
  const body = (await res.json()) as { session: CopilotSessionSummary }
  return body.session
}
