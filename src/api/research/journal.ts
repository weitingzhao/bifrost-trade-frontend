/**
 * Journal notes (K4 — research-api /research/journal/notes, D-Journal-Stores).
 *
 * Notes are keyed by the research user, so every call carries the research
 * bearer; a 401 surfaces as the usual auth gap. The §20.1 lock comes back as
 * 409 with the memory id in the detail — the caller shows it, never retries.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { withValidation } from '@/lib/apiValidation'
import { requestJson, type RequestJsonOptions } from '@/lib/http'
import { ResearchEnvelopeSchema } from '@/lib/schemas/research'

export interface NoteRef {
  /**
   * A trade's ref is `inst` in the store. Design Rev .111 renames it `trade`;
   * Research still accepts only `sym | obj | inst` (journal_notes.REF_TYPES),
   * so the app writes `inst` and reads either until the store's rename lands.
   */
  type: 'sym' | 'obj' | 'inst' | 'trade'
  id: string
}

/** A ref that names a trade, under its stored code (`inst`) or its new one (`trade`). */
export function isTradeRef(r: NoteRef): boolean {
  return r.type === 'inst' || r.type === 'trade'
}

export interface JournalNote {
  id: string
  owner_id: string
  body_md: string
  page_route: string
  page_label: string
  refs: NoteRef[]
  distilled_memory_id: string | null
  created_at: string | null
  updated_at: string | null
}

const validateJournal = withValidation<{ ok: boolean; data: unknown }>(
  ResearchEnvelopeSchema,
  'research/journal/notes',
)

/** The research bearer on every call; the server's `detail` (the §20.1 lock's memory id) is the error. */
async function call<T>(path: string, init: RequestJsonOptions<T> = {}): Promise<T> {
  const body = await requestJson(researchEngineUrl(path), {
    ...init,
    headers: getResearchAuthHeaders(),
    label: 'Journal',
  })
  return (validateJournal(body) as { ok: boolean; data: T }).data
}

export function createNote(input: {
  body_md: string
  page_route?: string
  page_label?: string
  refs?: NoteRef[]
}): Promise<{ note: JournalNote }> {
  return call('/research/journal/notes', { method: 'POST', body: input })
}

export function fetchNotes(params: {
  q?: string
  ref_type?: NoteRef['type']
  ref_id?: string
  limit?: number
} = {}): Promise<{ notes: JournalNote[]; count: number }> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.ref_type && params.ref_id) {
    qs.set('ref_type', params.ref_type)
    qs.set('ref_id', params.ref_id)
  }
  if (params.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs}` : ''
  return call(`/research/journal/notes${suffix}`)
}

export function updateNote(
  id: string,
  patch: { body_md?: string; refs?: NoteRef[] },
): Promise<{ note: JournalNote }> {
  return call(`/research/journal/notes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  })
}

export function deleteNote(id: string): Promise<{ deleted: string }> {
  return call(`/research/journal/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ── K6 — memory, visits, hints, the Day view (Spec §20) ─────────────────────

export interface MemoryEvidence {
  source: string
  date: string
  text: string
  route: string
}

export type MemoryChange = 'new' | 'stronger' | 'fading' | 'steady'

export interface JournalMemory {
  id: string
  topic: string
  kind: 'did' | 'said' | 'tension'
  axis: string | null
  value: string
  sub: string
  text: string
  evidence: MemoryEvidence[]
  strength: number
  change: MemoryChange
  archived: boolean
  first_seen: string | null
  last_seen: string | null
}

export interface MemoryAxis {
  id: string
  label: string
  value: string
  sub: string
  backs: string[]
  warn: boolean
}

export interface MemoryPayload {
  memories: JournalMemory[]
  archived_count: number
  axes: MemoryAxis[]
  sources: { source: string; enabled: boolean }[]
  hints: Record<string, number>
  week: { range: string; moved: number; forgot: number }
}

export function fetchMemory(): Promise<MemoryPayload> {
  return call('/research/journal/memory')
}

export function forgetMemory(id: string): Promise<{ forgotten: string; topic: string }> {
  return call(`/research/journal/memory/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function setMemorySource(
  source: string,
  enabled: boolean,
): Promise<{ sources: { source: string; enabled: boolean }[] }> {
  return call(`/research/journal/memory/sources/${encodeURIComponent(source)}`, {
    method: 'PUT',
    body: { enabled },
  })
}

/** The shell's beacon — fire-and-forget; a failed beacon is nobody's error. */
export function postVisit(route: string, symbol: string): Promise<{ recorded: boolean }> {
  return call('/research/journal/visits', {
    method: 'POST',
    body: { route, symbol },
  })
}

export interface DayTrace {
  at: string
  kind: 'note' | 'visit' | 'fill' | 'decision' | 'thread'
  text: string
  where: string
  to: string
}

export interface DayPayload {
  date: string
  traces: DayTrace[]
  /** [memory id, change, topic] — the day's distill deltas. */
  changes: [string, string, string][]
}

export function fetchJournalDay(date?: string): Promise<DayPayload> {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : ''
  return call(`/research/journal/day${suffix}`)
}

export interface MemoryHint extends JournalMemory {
  dismissals: number
  quiet: boolean
}

export function fetchMemoryHint(symbol: string): Promise<{ hint: MemoryHint | null }> {
  return call(`/research/journal/memory/hint?symbol=${encodeURIComponent(symbol)}`)
}

export function dismissMemoryHint(
  topic: string,
): Promise<{ topic: string; count: number; quiet: boolean }> {
  return call(`/research/journal/memory/hint/${encodeURIComponent(topic)}/dismiss`, {
    method: 'POST',
  })
}
