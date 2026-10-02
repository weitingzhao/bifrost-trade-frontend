import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { requestJson, type RequestJsonOptions } from '@/lib/http'
import { withValidation } from '@/lib/apiValidation'
import {
  PlaybookCaseListSchema,
  PlaybookNoteListSchema,
  PlaybookRuleListSchema,
} from '@/lib/schemas/researchData'

const validateRules = withValidation<PlaybookRule[]>(PlaybookRuleListSchema, 'research/playbook/rules')
const validateNotes = withValidation<PlaybookNote[]>(PlaybookNoteListSchema, 'research/playbook/notes')
const validateCases = withValidation<PlaybookCase[]>(PlaybookCaseListSchema, 'research/playbook/cases')

export type PlaybookRule = {
  id: string
  title: string
  category: string
  body_md: string
  tags?: string[]
  active?: boolean
  created_at?: string
  updated_at?: string
  retired_at?: string | null
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

/** Playbook routes answer the `{ ok, data }` envelope with the research bearer. */
function playbookFetch<T>(path: string, init: RequestJsonOptions<T> = {}): Promise<T> {
  return requestJson<T>(researchEngineUrl(path), {
    ...init,
    headers: getResearchAuthHeaders(),
    envelope: 'research',
    label: 'Playbook',
  })
}

export async function fetchPlaybookRules(category?: string): Promise<PlaybookRule[]> {
  const q = category ? `?category=${encodeURIComponent(category)}` : ''
  const data = await playbookFetch<{ rows: PlaybookRule[] }>(`/research/playbook/rules${q}`)
  return validateRules(data.rows ?? [])
}

export async function createPlaybookRule(input: {
  title: string
  category: string
  body_md: string
  tags?: string[]
}): Promise<PlaybookRule> {
  return playbookFetch<PlaybookRule>('/research/playbook/rules', { method: 'POST', body: input })
}

export async function retirePlaybookRule(id: string): Promise<void> {
  await playbookFetch<Record<string, unknown>>(
    `/research/playbook/rules/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function fetchPlaybookNotes(): Promise<PlaybookNote[]> {
  const data = await playbookFetch<{ rows: PlaybookNote[] }>('/research/playbook/notes')
  return validateNotes(data.rows ?? [])
}

export async function createPlaybookNote(input: {
  note_md: string
  tags?: string[]
  symbols?: string[]
}): Promise<PlaybookNote> {
  return playbookFetch<PlaybookNote>('/research/playbook/notes', { method: 'POST', body: input })
}

export async function fetchPlaybookCases(): Promise<PlaybookCase[]> {
  const data = await playbookFetch<{ rows: PlaybookCase[] }>('/research/playbook/cases')
  return validateCases(data.rows ?? [])
}

export async function createPlaybookCaseFromBridge(input: {
  bridge_event_id: string
  external_reply_md: string
  outcome?: string
  tags?: string[]
}): Promise<PlaybookCase> {
  return playbookFetch<PlaybookCase>('/research/playbook/cases/from_bridge', { method: 'POST', body: input })
}

export async function searchPlaybook(q: string): Promise<{
  rules: PlaybookRule[]
  notes: PlaybookNote[]
}> {
  return playbookFetch(`/research/playbook/search?q=${encodeURIComponent(q)}`)
}
