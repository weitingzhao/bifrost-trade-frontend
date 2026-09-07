/**
 * The daily digest draft (research-loop-automation D2) as the Inbox reads it:
 * one post per trading day with the candidate batches folded beneath it.
 */
import type { AiDraft } from '@/api/researchDrafts'

export const DIGEST_KIND = 'daily_digest'

export interface DigestBatch {
  run_id: string
  run_ids: string[]
  repeats: number
  objective_id: string
  objective_title: string | null
  status: string
  candidates: string[]
  dissent: number
  draft_ids: string[]
}

export interface DigestDissent {
  symbol: string
  run_id: string
  objective_title: string | null
  net_stance: string | null
  blocked_by_validate: boolean
  judges: string[]
  wrong_if: string[]
}

export interface DigestResolution {
  id: string
  title: string
  status: string
  symbols: string[]
  excess: number | null
  by_rule: boolean
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function records(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []
}

export function isDailyDigest(draft: Pick<AiDraft, 'kind'>): boolean {
  return draft.kind === DIGEST_KIND
}

/** The digest first, newest first among digests; everything else keeps its order. */
export function digestFirst<T extends Pick<AiDraft, 'kind' | 'created_at'>>(rows: readonly T[]): T[] {
  const digests = rows.filter(isDailyDigest).sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
  return [...digests, ...rows.filter((r) => !isDailyDigest(r))]
}

export function digestBatches(payload: Record<string, unknown>): DigestBatch[] {
  return records(payload.batches).flatMap((b) => {
    const runId = str(b.run_id)
    if (!runId) return []
    return [
      {
        run_id: runId,
        run_ids: strings(b.run_ids).length ? strings(b.run_ids) : [runId],
        repeats: typeof b.repeats === 'number' && b.repeats > 0 ? b.repeats : 1,
        objective_id: str(b.objective_id) ?? '',
        objective_title: str(b.objective_title),
        status: str(b.status) ?? '—',
        candidates: strings(b.candidates),
        dissent: typeof b.dissent === 'number' ? b.dissent : 0,
        draft_ids: strings(b.draft_ids),
      },
    ]
  })
}

export function digestDissents(payload: Record<string, unknown>): DigestDissent[] {
  return records(payload.dissents).flatMap((d) => {
    const symbol = str(d.symbol)
    if (!symbol) return []
    return [
      {
        symbol,
        run_id: str(d.run_id) ?? '',
        objective_title: str(d.objective_title),
        net_stance: str(d.net_stance),
        blocked_by_validate: d.blocked_by_validate === true,
        judges: strings(d.judges),
        wrong_if: strings(d.wrong_if),
      },
    ]
  })
}

export function digestResolutions(payload: Record<string, unknown>): DigestResolution[] {
  return records(payload.resolutions).flatMap((r) => {
    const id = str(r.id)
    if (!id) return []
    return [
      {
        id,
        title: str(r.title) ?? id,
        status: str(r.status) ?? '—',
        symbols: strings(r.symbols),
        excess: typeof r.excess === 'number' ? r.excess : null,
        by_rule: r.by_rule === true,
      },
    ]
  })
}
