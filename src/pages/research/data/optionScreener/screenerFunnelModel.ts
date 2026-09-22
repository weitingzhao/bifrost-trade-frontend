/**
 * The screener's funnel — four numbers that say *where* a run emptied.
 *
 * `Research Contract Screener.dc.html` puts this strip above everything and
 * gives it one job in its own words: **"the funnel strip says which stage
 * empties."** On a page whose whole output is a filtered list, a blank table
 * is the least informative thing the app can show, and this is the design's
 * answer to that.
 *
 * It is the reading this page most needs on DEV today. Measured 2026-09-22:
 * `POST /research/screener` answers `ok: true` with `total_contracts: 0` for
 * every symbol tried — including ANET, which the market-data plugin's own
 * coverage reports as 2,150 contracts across 21 expiries — at every `source`
 * value and with the filters opened to their widest (DTE 7–120, P(ITM) ≤ 90%,
 * return ≥ 0, spread ≤ 50%, premium ≥ 0, earnings allowed). The engine says
 * why, identically each time: *No snapshot data — run Market Data Plugin sync
 * first.* So the emptiness is neither the filters nor the symbols, and the
 * funnel is what carries that sentence to the reader instead of a blank list.
 */
import type { ScreenerResponse } from '@/types/research'

export interface FunnelCell {
  label: string
  value: string
  note: string
  /** `ok` counts, `warn` is a narrowing, `dead` is a stage that emptied. */
  tone: 'ok' | 'warn' | 'dead'
}

/** The commonest warning, which on a whole-store failure is the only one. */
function leadWarning(warnings: Record<string, string> | undefined): string | null {
  const values = Object.values(warnings ?? {})
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const [text, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return n === values.length ? text : `${text} · and ${values.length - n} other reason(s)`
}

export function screenerFunnel(
  picked: readonly string[],
  structureLabel: string,
  data: ScreenerResponse | null,
): FunnelCell[] {
  const scanned = data?.symbols_scanned?.length ?? 0
  const failed = data?.symbols_failed?.length ?? 0
  const screened = Math.max(0, scanned - failed)
  const contracts = data?.total_contracts ?? 0
  const pass = (data?.groups ?? []).reduce((n, g) => n + g.contracts.length, 0)
  const warning = leadWarning(data?.warnings)

  return [
    {
      label: 'Underlyings',
      value: String(picked.length),
      note: picked.length === 0 ? 'pick a source, or type a symbol' : structureLabel,
      tone: picked.length ? 'ok' : 'warn',
    },
    {
      label: 'Screened',
      value: data ? `${screened}` : '—',
      note: !data
        ? 'not run yet'
        : failed === 0
          ? 'every name answered'
          : (warning ?? `${failed} returned nothing`),
      tone: !data ? 'warn' : screened === 0 ? 'dead' : failed > 0 ? 'warn' : 'ok',
    },
    {
      label: 'Contracts in window',
      value: data ? String(contracts) : '—',
      note: data ? 'inside the DTE window, before the filters' : 'not run yet',
      tone: !data ? 'warn' : contracts === 0 ? 'dead' : 'ok',
    },
    {
      label: 'Pass',
      value: data ? String(pass) : '—',
      note: !data
        ? 'not run yet'
        : pass > 0
          ? 'ranked by score within each name'
          : contracts > 0
            ? 'every contract in the window fails a filter — loosen one'
            : 'nothing reached the filters',
      tone: !data ? 'warn' : pass > 0 ? 'ok' : 'dead',
    },
  ]
}
