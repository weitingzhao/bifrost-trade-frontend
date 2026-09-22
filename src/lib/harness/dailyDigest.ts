/**
 * The daily digest draft (research-loop-automation D2) as the Inbox reads it:
 * one post per trading day with the candidate batches folded beneath it.
 */
import type { AiDraft } from '@/api/researchDrafts'
import { readStr as str, readStrings as strings } from '@/lib/readUnknown'
import { rowLamp } from '@/lib/harness/runLamp'
import type { LampTone } from '@/lib/lampTone'

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

/** One lens reading the digest was written from. `band` is null when the lens had nothing to say. */
export interface DigestReading {
  lens: string
  freshness: string
  band: string | null
  means: string | null
  as_of: string | null
}

export interface DigestSymbol {
  symbol: string
  readings: DigestReading[]
}

/**
 * The lens readings behind the digest, one row per name.
 *
 * `payload.exhibits` is keyed by symbol and `payload.symbols` is the list the
 * digest covered. A name on the list with no exhibits keeps its row, empty, so
 * it reads as unread instead of dropping out — a missing row and a quiet name
 * look the same otherwise. Order follows the list, then any exhibit it omits.
 */
export function digestExhibits(payload: Record<string, unknown>): DigestSymbol[] {
  const raw =
    payload.exhibits && typeof payload.exhibits === 'object' && !Array.isArray(payload.exhibits)
      ? (payload.exhibits as Record<string, unknown>)
      : {}
  const order = [...new Set([...strings(payload.symbols), ...Object.keys(raw)])]
  return order.map((symbol) => ({
    symbol,
    readings: records(raw[symbol]).flatMap((r) => {
      const lens = str(r.lens)
      if (!lens) return []
      return [{ lens, freshness: str(r.freshness) ?? '', band: str(r.band), means: str(r.means), as_of: str(r.as_of) }]
    }),
  }))
}

/** Every lens any row carries, in the order first met — the table's columns. */
export function digestLenses(rows: readonly DigestSymbol[]): string[] {
  return [...new Set(rows.flatMap((r) => r.readings.map((x) => x.lens)))]
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

export interface DigestLamp {
  label: string
  lamp: LampTone
  why: string
}

/**
 * The digest's four lamps (Design, Copilot Desk response ④), each read from the
 * digest itself — a past digest shows what was true when it was written, not
 * what is true now.
 *
 * - book: `holdings_status` applied is green; anything else is grey.
 * - lenses: the worst freshness among readings that are present (any stale is
 *   amber). Missing readings are coverage: they are counted in the label, not
 *   coloured. No reading at all is grey.
 * - loop: the runs the digest recorded, lit the way Ran today lights runs. No
 *   run since the previous digest is grey.
 * - events: no source yet, so grey — never green until there is one.
 */
export function digestLamps(payload: Record<string, unknown>): DigestLamp[] {
  const holdings = str(payload.holdings_status)
  const book: DigestLamp =
    holdings === 'applied'
      ? { label: 'book', lamp: 'green', why: 'Holdings were applied to the digest' }
      : {
          label: 'book',
          lamp: 'gray',
          why: holdings ? `Holdings ${holdings} — the names are the Loop's candidates` : 'Holdings status not reported',
        }

  const rows = digestExhibits(payload)
  const total = rows.length * digestLenses(rows).length
  const present = rows.flatMap((r) => r.readings).filter((x) => x.freshness === 'fresh' || x.freshness === 'stale')
  const stale = present.filter((x) => x.freshness === 'stale').length
  const lenses: DigestLamp = {
    label: `lenses ${present.length}/${total}`,
    lamp: present.length === 0 ? 'gray' : stale > 0 ? 'yellow' : 'green',
    why:
      present.length === 0
        ? 'No lens reading behind this digest'
        : `${present.length} of ${total} readings present, ${stale > 0 ? `${stale} stale` : 'all fresh'} — missing ones are coverage, counted rather than coloured`,
  }

  const loopBlock =
    payload.loop && typeof payload.loop === 'object' && !Array.isArray(payload.loop)
      ? (payload.loop as Record<string, unknown>)
      : {}
  const runs = records(loopBlock.runs).flatMap((r) => {
    const id = str(r.id) ?? str(r.run_id)
    return id ? [{ id, status: str(r.status) ?? 'error' }] : []
  })
  const loop: DigestLamp =
    runs.length === 0
      ? { label: 'loop', lamp: 'gray', why: 'No loop run since the previous digest' }
      : (() => {
          const { lamp, why } = rowLamp(
            runs.map((r) => r.id),
            new Map(runs.map((r) => [r.id, r.status])),
          )
          return { label: 'loop', lamp, why: `${why} when the digest was written` }
        })()

  const events: DigestLamp = { label: 'events', lamp: 'gray', why: 'No source for events yet — grey until there is one' }

  return [book, lenses, loop, events]
}

/**
 * The digest's markdown, cut at its own headings.
 *
 * The agent writes one document with `###` sections — *What changed / needs a
 * decision*, *Holdings ∪ candidates*, *Dissents*, *Resolutions* — and the
 * design's Daily Brief page wants the first of them on its own, under **The
 * one thing**. Splitting here rather than in the page keeps the two surfaces
 * that read this document (the page and the dock card) cutting it the same
 * way, and it is a split rather than a rewrite: the text is the agent's.
 *
 * The lead — everything before the first `###` — comes back under the empty
 * key, because it belongs to no section and is the run's own summary line.
 */
export function digestSections(markdown: string): { heading: string; body: string }[] {
  const out: { heading: string; body: string }[] = []
  let heading = ''
  let body: string[] = []
  for (const line of markdown.split('\n')) {
    const m = /^###\s+(.*)$/.exec(line)
    if (m) {
      out.push({ heading, body: body.join('\n').trim() })
      heading = m[1].trim()
      body = []
      continue
    }
    body.push(line)
  }
  out.push({ heading, body: body.join('\n').trim() })
  return out.filter((s) => s.heading !== '' || s.body !== '')
}

/** One section's body, by a case-insensitive prefix of its heading. */
export function digestSection(markdown: string, headingStartsWith: string): string | null {
  const want = headingStartsWith.toLowerCase()
  const hit = digestSections(markdown).find((s) => s.heading.toLowerCase().startsWith(want))
  return hit?.body || null
}

/** The same document with one section taken out — so nothing prints twice. */
export function digestWithout(markdown: string, headingStartsWith: string): string {
  const want = headingStartsWith.toLowerCase()
  return digestSections(markdown)
    .filter((s) => !s.heading.toLowerCase().startsWith(want))
    .map((s) => (s.heading ? `### ${s.heading}\n${s.body}` : s.body))
    .join('\n\n')
    .trim()
}
