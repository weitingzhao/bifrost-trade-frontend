/**
 * Calendar · Hypothesis horizons (future) — the day each candidate-born
 * hypothesis settles by its objective's outcome rule, as Research states it
 * (`settles_on` on the hypothesis read, research 0.168.0, Owner plan #16).
 * The Calendar does not project a horizon itself: the rule is the server's,
 * and a second computation would disagree with it.
 *
 * Read through the Hypothesis Board's own query (same key). Before 0.168.0 no
 * row carries the field and the layer is `unprovided`, saying so; a row with
 * `settles_on: null` carries the reason in `settles_basis` and is tallied in
 * the note. Opens the board on that card (`?h=`).
 */
import { useMemo } from 'react'
import type { Hypothesis, HypothesisSettlesBasis } from '@/api/researchHypothesis'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { layerStateOf, type CalendarItem, type CalendarLayerReading } from './calendarLayers'
import { BOARD_HYPOTHESES } from './decisionsLayer'

const REASON_LABEL: Record<NonNullable<HypothesisSettlesBasis['reason']>, string> = {
  resolved: 'already resolved',
  retired: 'retired',
  no_candidate_lineage: 'no candidate behind it — settles by hand',
  candidate_not_found: 'its candidate is gone',
  candidate_trade_date_missing: 'its candidate has no trade date',
  resolution_disabled: 'its objective’s outcome rule is off',
  horizon_not_settled_by_engine: 'its horizon is not one the outcome engine settles',
  outside_settlement_window: 'outside the engine’s settlement window',
  lookup_failed: 'Research could not look it up',
}

export interface HorizonsReading {
  items: CalendarItem[]
  /** Rows that carry the field at all — zero before research 0.168.0. */
  provided: number
  /** Rows with `settles_on: null`, by why. */
  undated: { reason: string; n: number }[]
}

export function horizonItems(hypotheses: readonly Hypothesis[]): HorizonsReading {
  const items: CalendarItem[] = []
  const undated = new Map<string, number>()
  let provided = 0
  for (const h of hypotheses) {
    if (!('settles_on' in h)) continue
    provided += 1
    const d = (h.settles_on ?? '').slice(0, 10)
    if (!d) {
      const r = h.settles_basis?.reason
      const label = r ? (REASON_LABEL[r] ?? r) : 'no reason given'
      undated.set(label, (undated.get(label) ?? 0) + 1)
      continue
    }
    const b = h.settles_basis ?? {}
    const sym = h.symbols[0]?.toUpperCase() ?? ''
    const how =
      b.from === 'candidate_outcome'
        ? 'settled by the outcome engine'
        : `settles by the outcome rule${b.horizon_sessions ? ` · ${b.horizon_sessions} sessions from ${b.trade_date ?? 'entry'}` : ''}${b.overdue ? ' · overdue — no outcome written yet' : ''}`
    items.push({
      key: `horizons:${h.id}`,
      d,
      layer: 'horizons',
      cell: `${sym || 'hypothesis'} settles`,
      text: `${h.title} · ${how}`,
      syms: h.symbols.map((s) => s.toUpperCase()),
      ink: 'soft',
      to: `/research/loop/hypotheses?h=${encodeURIComponent(h.id)}`,
    })
  }
  return {
    items: items.sort((a, b) => a.d.localeCompare(b.d)),
    provided,
    undated: [...undated].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n),
  }
}

export function useCalendarHorizons(): CalendarLayerReading {
  const q = useHypothesisList(BOARD_HYPOTHESES)
  const reading = useMemo(() => horizonItems(q.data?.rows ?? []), [q.data?.rows])
  const state = layerStateOf([q])
  const rows = q.data?.rows.length ?? 0
  if (state === 'ready' && rows > 0 && reading.provided === 0) {
    return {
      layer: 'horizons',
      items: [],
      state: 'unprovided',
      note: 'Not provided: Research has not shipped settles_on (0.168.0) to this environment — no hypothesis carries a settlement date yet.',
    }
  }
  return {
    layer: 'horizons',
    items: reading.items,
    state,
    floor: rows >= BOARD_HYPOTHESES.limit,
    note:
      state === 'signed-out'
        ? 'The hypotheses are the research user’s — sign in to read them.'
        : reading.undated.length > 0
          ? `No settlement date for ${reading.undated.reduce((n, u) => n + u.n, 0)}: ${reading.undated
              .map((u) => `${u.n} ${u.reason}`)
              .join(' · ')}.`
          : null,
  }
}
