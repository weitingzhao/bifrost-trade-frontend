/**
 * The Option screen's reading, computed in the browser (design Rev 2026-09-20.10,
 * `Research Contract Screener.dc.html`).
 *
 * ## Live, over one fetch
 *
 * The design's filter panel says **"live — no Run button"**: results re-run as
 * a slider moves. The engine cannot be asked that often — `POST
 * /research/screener` costs 15–30 s a name on DEV — and it does not need to
 * be. The server is asked once per name, structure and earnings choice, at
 * the widest window any slider can reach (`FETCH_WINDOW`), and the six sliders
 * filter what came back here, where a drag costs nothing. A slider never
 * refetches; changing what is being screened does.
 *
 * Earnings is the one filter that stays on the server: the response carries no
 * earnings date per name, so the browser cannot tell which contracts span one.
 * Toggling it refetches.
 *
 * ## The formula is the design's
 *
 * `Ann. ret = premium ÷ cash secured × 365 ÷ DTE`, with the mid as the premium
 * and strike × 100 as the cash a put secures. The engine ranks by its own
 * score; the design ranks by this return and keeps the top four a name, and
 * so does this page. The engine's score and rating are not columns here — the
 * design draws neither — but they stay on each row's hover and in the export.
 */
import { fmtIsoDateToken } from '@/lib/format'
import type { ScreenerContractRow, ScreenerResponse, ScreenerSymbolGroup } from '@/types/research'

/** The design's six sliders, in its units: days, percent, dollars. */
export interface LiveFilters {
  dteMin: number
  dteMax: number
  /** Max probability ITM, percent. */
  maxPitm: number
  /** Min annualised return, percent. */
  minRet: number
  /** Max bid/ask spread as a share of the mid, percent. */
  maxSpread: number
  /** Min premium per share, dollars. */
  minPrem: number
}

/** The prototype's own defaults, restored by Reset. */
export const DEFAULT_LIVE_FILTERS: LiveFilters = {
  dteMin: 14,
  dteMax: 45,
  maxPitm: 30,
  minRet: 12,
  maxSpread: 6,
  minPrem: 1,
}

export interface FilterSpec {
  key: keyof LiveFilters
  label: string
  min: number
  max: number
  step: number
  format: (v: number) => string
}

/** Ranges, steps and read-outs are the prototype's. */
export const FILTER_SPECS: readonly FilterSpec[] = [
  { key: 'dteMin', label: 'DTE min', min: 7, max: 60, step: 1, format: (v) => `${v}d` },
  { key: 'dteMax', label: 'DTE max', min: 14, max: 120, step: 1, format: (v) => `${v}d` },
  { key: 'maxPitm', label: 'Max P(ITM)', min: 5, max: 50, step: 1, format: (v) => `${v}%` },
  { key: 'minRet', label: 'Min ann. return', min: 0, max: 60, step: 1, format: (v) => `${v}%` },
  { key: 'maxSpread', label: 'Max spread', min: 1, max: 15, step: 0.5, format: (v) => `${v}%` },
  { key: 'minPrem', label: 'Min premium', min: 0, max: 5, step: 0.25, format: (v) => `$${v.toFixed(2)}` },
]

/**
 * What the server is asked for: the widest window any slider can reach, and no
 * return, spread or premium floor — those are applied here.
 */
export const FETCH_WINDOW = { dte_min: 7, dte_max: 120, max_prob_itm: 1 } as const

/** The structure's target delta band — lime in the Δ column. */
const DELTA_BAND: readonly [number, number] = [0.15, 0.35]

/** The design keeps the four best a name. */
export const TOP_PER_NAME = 4

/** `2026-10-16` or `20261016` → the §14.4 date token `16OCT26`. */
function expiryToken(expiry: string): string {
  const d = expiry.replace(/\D/g, '')
  if (d.length !== 8) return expiry
  return fmtIsoDateToken(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`)
}

/** The §14.4 contract token: `NVDA 16OCT26 150P`, `TSLA 25MAR26 387.5C`. */
export function contractToken(symbol: string, row: Pick<ScreenerContractRow, 'expiry' | 'strike' | 'right'>): string {
  const strike = Number.isInteger(row.strike) ? String(row.strike) : String(Number(row.strike.toFixed(2)))
  return `${symbol} ${expiryToken(row.expiry)} ${strike}${row.right}`
}

/** Premium per share: the mid, else the engine's own premium. */
export function premiumOf(row: ScreenerContractRow): number | null {
  const v = row.mid ?? row.premium
  return v != null && Number.isFinite(v) ? v : null
}

/** Cash a contract secures: strike × 100 (a put is secured at its strike). */
export function cashPerContract(row: ScreenerContractRow): number {
  return row.strike * 100
}

/** `premium ÷ cash secured × 365 ÷ DTE`, in percent; null when it cannot be read. */
export function annReturnPct(row: ScreenerContractRow): number | null {
  const prem = premiumOf(row)
  if (prem == null || row.strike <= 0 || row.dte <= 0) return null
  return (prem / row.strike) * (365 / row.dte) * 100
}

export function deltaInBand(delta: number | null): boolean {
  if (delta == null) return false
  const a = Math.abs(delta)
  return a >= DELTA_BAND[0] && a <= DELTA_BAND[1]
}

/** Every filter, each read in the unit its slider speaks. A missing reading fails the filter that needs it. */
export function rowPasses(row: ScreenerContractRow, f: LiveFilters): boolean {
  if (row.dte < f.dteMin || row.dte > f.dteMax) return false
  if (row.prob_itm == null || row.prob_itm * 100 > f.maxPitm) return false
  const ret = annReturnPct(row)
  if (ret == null || ret < f.minRet) return false
  if (row.spread_pct == null || row.spread_pct * 100 > f.maxSpread) return false
  const prem = premiumOf(row)
  if (prem == null || prem < f.minPrem) return false
  return true
}

/** Which filter empties a name, for the warning on its group row. */
function bindingFilter(rows: readonly ScreenerContractRow[], f: LiveFilters): string {
  const inWindow = rows.filter((r) => r.dte >= f.dteMin && r.dte <= f.dteMax)
  if (inWindow.length === 0) return `nothing inside ${f.dteMin}–${f.dteMax} DTE`
  const checks: [string, (r: ScreenerContractRow) => boolean][] = [
    ['P(ITM)', (r) => r.prob_itm != null && r.prob_itm * 100 <= f.maxPitm],
    ['return', (r) => (annReturnPct(r) ?? -1) >= f.minRet],
    ['spread', (r) => r.spread_pct != null && r.spread_pct * 100 <= f.maxSpread],
    ['premium', (r) => (premiumOf(r) ?? -1) >= f.minPrem],
  ]
  const failing = checks.filter(([, ok]) => !inWindow.some(ok)).map(([name]) => name)
  return failing.length > 0
    ? `no contract meets ${failing.join(' or ')}`
    : `nothing meets ${checks.map(([n]) => n).join(', ')} together`
}

export interface ScreenGroup {
  symbol: string
  spot: number | null
  avgIv: number | null
  /** Contracts the engine returned inside the current DTE window. */
  inWindow: number
  /** Passing rows, best annualised return first, at most `TOP_PER_NAME`. */
  rows: ScreenerContractRow[]
  /** Why a name passes nothing; empty when it passes something. */
  warn: string
}

export type ScreenView = 'grouped' | 'flat'

export function buildScreenGroups(
  groups: readonly ScreenerSymbolGroup[],
  f: LiveFilters,
  view: ScreenView,
  /**
   * Names the engine could not screen, with its own reason. The response
   * leaves them out of `groups`, so a list of three that returns one group
   * would read as three screened and two passing nothing. Grouped view draws
   * each as a row carrying the engine's sentence.
   */
  failed: Readonly<Record<string, string>> = {},
  /** Names still being screened; Grouped view holds their place. */
  pending: readonly string[] = [],
): ScreenGroup[] {
  const out: ScreenGroup[] = []
  for (const g of groups) {
    const inWindow = g.contracts.filter((r) => r.dte >= f.dteMin && r.dte <= f.dteMax).length
    const rows = g.contracts
      .filter((r) => rowPasses(r, f))
      .sort((a, b) => (annReturnPct(b) ?? 0) - (annReturnPct(a) ?? 0))
      .slice(0, TOP_PER_NAME)
    // `Passing only` drops the names that pass nothing; `Grouped` keeps them
    // with the reason, which is the design's point about a screen that
    // returns less than you expected.
    if (rows.length === 0 && view === 'flat') continue
    out.push({
      symbol: g.symbol,
      spot: Number.isFinite(g.spot) && g.spot > 0 ? g.spot : null,
      avgIv: Number.isFinite(g.avg_iv) ? g.avg_iv : null,
      inWindow,
      rows,
      warn: rows.length === 0 ? bindingFilter(g.contracts, f) : '',
    })
  }
  if (view === 'grouped') {
    const seen = new Set(out.map((g) => g.symbol))
    for (const [symbol, reason] of Object.entries(failed)) {
      if (seen.has(symbol)) continue
      out.push({ symbol, spot: null, avgIv: null, inWindow: 0, rows: [], warn: `no chain — ${reason}` })
      seen.add(symbol)
    }
    for (const symbol of pending) {
      if (seen.has(symbol)) continue
      out.push({ symbol, spot: null, avgIv: null, inWindow: 0, rows: [], warn: 'screening…' })
    }
  }
  return out
}

export interface FunnelCell {
  label: string
  value: string
  note: string
  /** `ok` counts, `warn` is a narrowing, `dead` is a stage that emptied. */
  tone: 'ok' | 'warn' | 'dead'
}

/** The commonest engine warning, which on a whole-store failure is the only one. */
function leadWarning(warnings: Record<string, string> | undefined): string | null {
  const values = Object.values(warnings ?? {})
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const [text, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return n === values.length ? text : `${text} · and ${values.length - n} other reason(s)`
}

/**
 * The four cells, in the design's words: how many names, how many the engine
 * could screen, how many contracts sit in the window, how many pass.
 *
 * "the funnel strip says which stage empties" — the design's own sentence
 * for the thing this page does most, so every empty stage names why.
 */
export function screenerFunnel(args: {
  picked: readonly string[]
  sourceLabel: string | null
  data: ScreenerResponse | null
  loading: boolean
  f: LiveFilters
  groups: readonly ScreenGroup[]
  /** Names not answered yet — a cell counted before they are in says so. */
  pending?: readonly string[]
}): FunnelCell[] {
  const { picked, sourceLabel, data, loading, f, groups } = args
  const pending = args.pending ?? []
  // With names picked and nothing back, the stage is waiting on the engine —
  // never "pick underlyings", which read as though the list had been lost.
  const waiting = picked.length === 0 ? 'pick underlyings' : loading ? 'screening…' : 'not screened'
  const partial = pending.length > 0 ? ` · ${pending.length} still screening` : ''
  const scanned = data?.symbols_scanned?.length ?? 0
  const failed = data?.symbols_failed?.length ?? 0
  const screenable = Math.max(0, scanned - failed)
  const inWindow = groups.reduce((n, g) => n + g.inWindow, 0)
  const pass = groups.reduce((n, g) => n + g.rows.length, 0)
  const warning = leadWarning(data?.warnings)

  return [
    {
      label: 'Underlyings',
      value: String(picked.length),
      note: picked.length === 0 ? 'pick a source, or add a symbol' : (sourceLabel ?? 'added by hand'),
      tone: picked.length ? 'ok' : 'warn',
    },
    {
      label: 'Screenable',
      value: data ? String(screenable) : '—',
      note: !data
        ? waiting
        : (failed === 0 ? 'every name has a chain' : (warning ?? `${failed} returned no chain`)) + partial,
      tone: !data ? 'warn' : screenable === 0 ? 'dead' : failed > 0 ? 'warn' : 'ok',
    },
    {
      label: 'Contracts in window',
      value: data ? String(inWindow) : '—',
      note: data ? `${f.dteMin}–${f.dteMax} DTE, before the other filters${partial}` : waiting,
      tone: !data ? 'warn' : inWindow === 0 ? 'dead' : 'ok',
    },
    {
      label: 'Pass',
      value: data ? String(pass) : '—',
      note: !data
        ? waiting
        : pass > 0
          ? `top ${TOP_PER_NAME} per name by annualised return`
          : inWindow > 0
            ? 'loosen a filter'
            : 'nothing reached the filters',
      tone: !data ? 'warn' : pass > 0 ? 'ok' : 'dead',
    },
  ]
}
