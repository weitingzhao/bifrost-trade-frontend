/**
 * What each lens has been worth on this name — the Overview rail's third panel.
 *
 * The design (`Research Symbol.dc.html`, Rev 2026-09-18.2) ranks every lens by
 * its 20-day hit rate with a bar each, puts **your own hand verdicts on the
 * same scale at the top**, and closes with one line: *"20d hit-rate, this
 * symbol only. Thin samples (n < 10) are amber regardless of rate."*
 *
 * ## Two of those three sentences survive measurement, and one does not
 *
 * - the **ranking** is real: every lens's exhibit carries
 *   `track_record.by_side[hot|cold].hit_rate_20d` with the sample it rests on.
 * - the **thin-sample rule** is real and it bites: on AMD (2026-09-21) the SEPA
 *   and terrain records rest on nothing evaluated at 20 days, while GEX rests on
 *   469. A panel that printed those side by side without marking the difference
 *   would rank a coin-flip above a measurement.
 * - **"this symbol only" is not true of this data.** Every lens answers
 *   `symbol_scoped: false` — the record is pooled across the universe, which is
 *   a record, just not this name's. The panel says which it is showing rather
 *   than repeating the design's sentence over data that does not support it.
 *
 * The **hand verdicts** row cannot be drawn at all: nothing on this side stores
 * a verdict a person recorded against the outcome that followed it. Four
 * candidate routes answer 404 (`symbol-verdicts`, `verdicts`,
 * `copilot/verdicts`, `judgements`), which is the same absence the Copilot
 * bench names in its four empty columns. The row stays, and reads `not
 * recorded`, because a page that silently drops it teaches the reader that
 * their own record is not part of the scoring.
 */
import type { ExhibitPayload } from '@/api/research/exhibit'
import { record20 } from '@/lib/lensValue'
import { canonicalLens, regimeItems, type RegimeLensItem } from '@/lib/regimeRibbon'

/** Below this the rate is a coin flip with a decimal point on it. */
export const THIN_SAMPLE = 10

export interface RecordRow {
  id: string
  label: string
  /** 20-day hit rate, 0–1. */
  hit: number
  /** How many triggers settled at 20 days. */
  n: number
  /** True when the record is this symbol's own rather than pooled. */
  scoped: boolean
  thin: boolean
}

export interface SymbolRecord {
  rows: RecordRow[]
  /** Lenses with a reading but no settled 20-day record, by label. */
  unsettled: string[]
  /** How many of the ranked rows are this symbol's own record. */
  scopedCount: number
}

type SpecOf = (canonical: string) => { label: string; page_route: string } | undefined

/**
 * The ranked record, best first.
 *
 * Thin samples are not pushed down the list — the design ranks by rate and
 * marks thinness in the colour, which keeps the sort honest: a 100% on n=2 is
 * genuinely at the top of the rate column, and the amber says not to believe
 * it. Sorting it down would hide the sample problem inside the order.
 */
export function symbolRecord(
  exhibits: readonly ExhibitPayload[],
  symbol: string,
  specOf: SpecOf,
): SymbolRecord {
  const items: RegimeLensItem[] = regimeItems([...exhibits], symbol, specOf)
  const rows: RecordRow[] = []
  const unsettled: string[] = []
  items.forEach((it, i) => {
    const ex = exhibits[i]
    const rec = record20(ex?.track_record, it.band)
    if (!rec) {
      // A lens with no reading at all is not "unsettled", it is unread — the
      // faces above already say so, and repeating it here would make the
      // absence look like two problems.
      if (it.band != null) unsettled.push(it.label)
      return
    }
    rows.push({
      id: canonicalLens(ex.lens_id ?? ex.lens),
      label: it.label,
      hit: rec.hit,
      n: rec.n,
      scoped: rec.scoped,
      thin: rec.n < THIN_SAMPLE,
    })
  })
  rows.sort((a, b) => b.hit - a.hit)
  return { rows, unsettled, scopedCount: rows.filter((r) => r.scoped).length }
}
