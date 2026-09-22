/**
 * The digest as the design draws it: a name, one line, and where it came from.
 *
 * `Research Copilot.dc.html` (Rev 2026-09-20.20) does not print the draft's
 * prose in the panel. It prints columns of `SYM · one sentence · cite`, where
 * the cite opens the page whose lens produced that sentence — the reading,
 * not the writing. This module builds those rows from the payload the digest
 * already carries.
 *
 * **One divergence, measured.** The design splits the names into **Book** and
 * **Watchlist**. The payload has no such split: `symbols` is one list with
 * `holdings_status: 'applied'`, meaning holdings were folded into it, and
 * `candidates` is a separate (today empty) list. Guessing which names are held
 * from this side's own book would be a second source answering a question the
 * digest already answered its own way, so the names stay one section and say
 * so. The split returns the day the digest records it.
 */
import { LAB_VIEW_LENS, labHref, type LabViewId } from '@/lib/analyzeHubs'
import { digestExhibits, type DigestReading, type DigestSymbol } from '@/lib/harness/dailyDigest'

export interface DigestLine {
  /** The name, or `—` for a row about the loop rather than a name. */
  sym: string
  text: string
  /** The page that produced the sentence; null when nothing routes to it. */
  cite: { label: string; to: string } | null
  /**
   * What kind of loop row this is — `RUN`, `AWAITING`, `TRUST`.
   *
   * The design's Daily Brief tags each Loop row so the column reads as a
   * category rather than three dashes; the dock's digest panel has no room for
   * a tag column and keeps using `sym`. One list, two readings of its first
   * column.
   */
  tag?: string
}

/** Which lab view owns a lens id, for the cite chip. */
const VIEW_FOR_LENS = new Map<string, LabViewId>(
  Object.entries(LAB_VIEW_LENS).map(([view, lens]) => [lens as string, view as LabViewId]),
)

const VIEW_LABEL: Record<LabViewId, string> = {
  'iv-rank': 'IV rank',
  vrp: 'VRP',
  skew: 'Skew',
  gex: 'GEX',
  opex: 'OpEx',
  model: 'Terrain',
  sessions: 'Sessions',
  playbook: 'Playbook',
}

/**
 * The reading worth printing for a name.
 *
 * A band at an extreme is the one that says something; `neutral` and the
 * `lean_` bands are the lens declining to. When every lens declines, the
 * first is printed anyway, because "nothing stands out" is itself the read
 * and a name that vanishes would be mistaken for one that was not looked at.
 */
export function notableReading(readings: readonly DigestReading[]): DigestReading | null {
  if (readings.length === 0) return null
  const loud = readings.find((r) => r.band === 'hot' || r.band === 'cold')
  return loud ?? readings[0]
}

/** `hot` → `IV rank hot` — the band first, because that is what was read. */
function readingText(r: DigestReading): string {
  const band = (r.band ?? '').replace('_', ' ')
  const view = VIEW_FOR_LENS.get(r.lens)
  const lens = view ? VIEW_LABEL[view] : r.lens
  const means = (r.means ?? '').trim()
  const head = band ? `${lens} ${band}` : lens
  return means ? `${head} — ${means}` : head
}

export function nameLines(payload: Record<string, unknown>): DigestLine[] {
  return digestExhibits(payload)
    .map((row: DigestSymbol) => {
      const r = notableReading(row.readings)
      if (!r) return null
      const view = VIEW_FOR_LENS.get(r.lens) ?? null
      return {
        sym: row.symbol,
        text: readingText(r),
        cite: view ? { label: VIEW_LABEL[view], to: labHref(view, row.symbol) } : null,
      }
    })
    .filter((x): x is DigestLine => x != null)
}

interface LoopBlock {
  pending?: Record<string, number>
  runs?: unknown[]
  objectives?: { id?: string; title?: string }[]
  trust?: { l0?: boolean; reason?: string }
}

/**
 * `29 candidate batches` — the queue, in the words the Inbox uses.
 *
 * Both forms written out: `batch` does not take an `s`, and a queue that
 * reads `29 candidate batchs` says the page is generating English rather
 * than printing it.
 */
const PENDING_LABEL: Record<string, [one: string, many: string]> = {
  candidate_batch: ['candidate batch', 'candidate batches'],
  policy_suggestion: ['policy suggestion', 'policy suggestions'],
  hypothesis_suggestion: ['hypothesis suggestion', 'hypothesis suggestions'],
  eod_verdict: ['EOD verdict', 'EOD verdicts'],
}

/**
 * What the loop did and what it is waiting on.
 *
 * The design's third column. Its rows are about the machine rather than a
 * name, so they carry `—` where a ticker would be, exactly as the prototype
 * does for the settled hit rate.
 */
export function loopLines(payload: Record<string, unknown>): DigestLine[] {
  const loop = (payload.loop ?? {}) as LoopBlock
  const out: DigestLine[] = []

  const runs = Array.isArray(loop.runs) ? loop.runs.length : 0
  const objectives = Array.isArray(loop.objectives) ? loop.objectives : []
  const firstObjective = objectives[0]
  if (objectives.length > 0) {
    out.push({
      sym: '—',
      tag: 'RUN',
      text:
        runs > 0
          ? `${objectives.length} active objective${objectives.length === 1 ? '' : 's'} · ${runs} run${runs === 1 ? '' : 's'} since yesterday`
          : `${objectives.length} active objective${objectives.length === 1 ? '' : 's'} · no run since yesterday`,
      cite: firstObjective?.id
        ? { label: 'Autopilot', to: `/research/loop/objectives/${firstObjective.id}` }
        : { label: 'Autopilot', to: '/research/loop/harness' },
    })
  }

  const pending = loop.pending ?? {}
  const waiting = Object.entries(pending)
    .filter(([, n]) => typeof n === 'number' && n > 0)
    .sort((a, b) => b[1] - a[1])
  if (waiting.length > 0) {
    out.push({
      sym: '—',
      tag: 'AWAITING',
      text: `waiting on you: ${waiting
        .map(([k, n]) => {
          const label = PENDING_LABEL[k]
          if (!label) return `${n} ${k}`
          return `${n} ${n === 1 ? label[0] : label[1]}`
        })
        .join(' · ')}`,
      cite: { label: 'Decision Inbox', to: '/research/loop/decisions' },
    })
  }

  if (loop.trust && loop.trust.l0 !== true) {
    out.push({
      sym: '—',
      tag: 'TRUST',
      text: `not L0${loop.trust.reason ? ` — ${loop.trust.reason}` : ''}`,
      cite: { label: 'Autopilot', to: '/research/loop/harness' },
    })
  }
  return out
}
