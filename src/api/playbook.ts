import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'

export type PlaybookRule = {
  id: string
  title: string
  category: string
  body_md: string
  tags?: string[]
  active?: boolean
  updated_at?: string
}

export type PlaybookNote = {
  id: string
  note_md: string
  tags?: string[]
  symbols?: string[]
  created_at?: string
}

export type PlaybookCase = {
  id: string
  lessons_md: string
  outcome?: string | null
  tags?: string[]
  trade_ref?: Record<string, unknown>
  created_at?: string
}

async function playbookFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(researchEngineUrl(path), {
    ...init,
    headers: {
      ...getResearchAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`playbook HTTP ${res.status}`)
  const body = (await res.json()) as { ok?: boolean; data: T }
  return body.data
}

export async function fetchPlaybookRules(category?: string): Promise<PlaybookRule[]> {
  const q = category ? `?category=${encodeURIComponent(category)}` : ''
  const data = await playbookFetch<{ rows: PlaybookRule[] }>(`/research/playbook/rules${q}`)
  return data.rows ?? []
}

export async function createPlaybookRule(input: {
  title: string
  category: string
  body_md: string
  tags?: string[]
}): Promise<PlaybookRule> {
  return playbookFetch<PlaybookRule>('/research/playbook/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function retirePlaybookRule(id: string): Promise<void> {
  await playbookFetch<Record<string, unknown>>(
    `/research/playbook/rules/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function fetchPlaybookNotes(): Promise<PlaybookNote[]> {
  const data = await playbookFetch<{ rows: PlaybookNote[] }>('/research/playbook/notes')
  return data.rows ?? []
}

export async function createPlaybookNote(input: {
  note_md: string
  tags?: string[]
  symbols?: string[]
}): Promise<PlaybookNote> {
  return playbookFetch<PlaybookNote>('/research/playbook/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function fetchPlaybookCases(): Promise<PlaybookCase[]> {
  const data = await playbookFetch<{ rows: PlaybookCase[] }>('/research/playbook/cases')
  return data.rows ?? []
}

export async function createPlaybookCaseFromBridge(input: {
  bridge_event_id: string
  external_reply_md: string
  outcome?: string
  tags?: string[]
}): Promise<PlaybookCase> {
  return playbookFetch<PlaybookCase>('/research/playbook/cases/from_bridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function searchPlaybook(q: string): Promise<{
  rules: PlaybookRule[]
  notes: PlaybookNote[]
}> {
  return playbookFetch(`/research/playbook/search?q=${encodeURIComponent(q)}`)
}
