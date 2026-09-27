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
 * Earnings is filtered here too, against each name's expected print
 * (`screenerEarnings.ts`). It used to be sent to the engine, which accepts
 * `include_earnings_span` and never reads it, so the toggle re-screened and
 * excluded nothing (walk 2026-09-27).
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
import { etDate, etStamp } from '@/lib/freshness'
import { SCREEN_DELTA_BAND } from '@/lib/screenBand'
import type { ScreenerContractRow, ScreenerResponse, ScreenerSymbolGroup } from '@/types/research'
import { spansEarnings, type EarningsReading } from './screenerEarnings'

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

/** The structure's target delta band — lime in the Δ column, and the Δ half
 * of the band the Contracts panel carries into the Chain face. */
const DELTA_BAND = SCREEN_DELTA_BAND

/** The design keeps the four best a name. */
export const TOP_PER_NAME = 4

/** `2026-10-16` or `20261016` → the §14.4 date token `16OCT26`. */
function expiryToken(expiry: string): string {
  const d = expiry.replace(/\D/g, '')
  if (d.length !== 8) return expiry
  return fmtIsoDateToken(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`)
}

/** The §14.4 contract token: `NVDA 16OCT26 150P`, `TSLA 25MAR26 387.5C`. */
export function contractToken(symbol: string, row: Pick<ScreenerContractRow, 'expiration' | 'strike' | 'right'>): string {
  const strike = Number.isInteger(row.strike) ? String(row.strike) : String(Number(row.strike.toFixed(2)))
  return `${symbol} ${expiryToken(row.expiration)} ${strike}${row.right}`
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

/**
 * Whether a row's spread was measured. The chain store keeps no bid/ask — the
 * Options Starter entitlement carries no quotes — and for such a row the engine
 * sends `spread_pct: null` and the session close as `mid` (since trade-api
 * 86ebdf7; before it, `spread_pct: 0`, which is why both sides are checked
 * rather than the null). A spread is read only when both sides are there
 * (§15.8: an entitlement gap is named, not filled).
 */
export function spreadMeasured(row: Pick<ScreenerContractRow, 'bid' | 'ask'>): boolean {
  return row.bid != null && row.ask != null
}

/** Why the Spread cell reads `—`, and why the premium is then the session close. */
export const SPREAD_UNMEASURED =
  'Not measured — the chain store keeps no bid/ask (the Options Starter entitlement carries no quotes), so there is no spread to read or filter on, and the premium is the session close.'

/** What the premium is: the engine's word, else read off the quote as an older engine left it. */
export function premiumBasis(row: Pick<ScreenerContractRow, 'premium_basis' | 'bid' | 'ask'>): 'close' | 'mid' {
  return row.premium_basis ?? (spreadMeasured(row) ? 'mid' : 'close')
}

/** When a row's chain snapshot was observed, in ms; null when the engine sent none. */
export function quoteMs(row: Pick<ScreenerContractRow, 'snapshot_ts'>): number | null {
  if (!row.snapshot_ts) return null
  const ms = Date.parse(row.snapshot_ts)
  return Number.isFinite(ms) ? ms : null
}

/**
 * The quote time the design prints in the Contracts panel head, read over the
 * rows the table shows. The rows of one name do not share a snapshot: on DEV
 * (2026-09-27) AAPL answered 81 contracts from a 15:30 ET snapshot and 104
 * from the 16:00 close, AMD two from the session before, VRSN one from three
 * sessions back. So the head names the newest and counts the rest, and a row
 * from an earlier session is marked — its premium, and the return read from
 * it, belong to that session.
 */
export interface QuoteReading {
  /** `today 16:00 ET`, `Fri 16:00 ET`, `09-25 16:00 ET`; null when no row carries a time. */
  newest: string | null
  newestMs: number | null
  /** Rows quoted before the newest. */
  older: number
  /** Of those, rows from an earlier session (New York date) than the newest. */
  olderSession: number
  /** Every distinct time with its count, for the hover. */
  title: string
}

export function quoteReading(rows: readonly ScreenerContractRow[], nowMs: number): QuoteReading {
  const times = rows.map(quoteMs).filter((ms): ms is number => ms != null)
  if (times.length === 0) {
    return {
      newest: null,
      newestMs: null,
      older: 0,
      olderSession: 0,
      title: rows.length === 0 ? 'No contract is shown.' : 'The engine sent no quote time for these rows.',
    }
  }
  const newestMs = Math.max(...times)
  const newestDay = etDate(newestMs)
  const older = times.filter((ms) => ms < newestMs)
  const olderSession = older.filter((ms) => etDate(ms) < newestDay).length
  const newest = etStamp(newestMs, nowMs)
  const untimed = rows.length - times.length
  const counts = new Map<number, number>()
  for (const ms of older) counts.set(ms, (counts.get(ms) ?? 0) + 1)
  const spread = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([ms, n]) => `${n} at ${etStamp(ms, nowMs)}`)
    .join(', ')
  const lines = [
    older.length === 0
      ? `Every contract shown was quoted ${newest}.`
      : `Newest quote ${newest}; ${older.length} of ${rows.length} contracts carry an earlier one: ${spread}.`,
  ]
  if (olderSession > 0) {
    lines.push(
      `${olderSession} of those ${olderSession === 1 ? 'is' : 'are'} from an earlier session: the chain store has no later snapshot for ${olderSession === 1 ? 'it' : 'them'}, so ${olderSession === 1 ? 'its' : 'their'} premium and Ann. ret are that session’s (amber).`,
    )
  }
  if (untimed > 0) lines.push(`${untimed} carry no quote time.`)
  if (rows.every((r) => premiumBasis(r) === 'close')) {
    lines.push('Every premium is the last trade as of its quote time — the chain store keeps no bid/ask to take a mid from.')
  }
  return { newest, newestMs, older: older.length, olderSession, title: lines.join('\n') }
}

/** Whether a row's premium is from an earlier session than the table's newest quote. */
export function quoteFromEarlierSession(row: ScreenerContractRow, reading: QuoteReading): boolean {
  const ms = quoteMs(row)
  return ms != null && reading.newestMs != null && etDate(ms) < etDate(reading.newestMs)
}

/** The premium cell's hover: what the number is, and when it was quoted. */
export function premiumTitle(row: ScreenerContractRow, reading: QuoteReading, nowMs: number): string {
  const ms = quoteMs(row)
  const when = ms == null ? 'at a time the engine did not send' : etStamp(ms, nowMs)
  const what =
    premiumBasis(row) === 'close'
      ? `Last trade as of ${when} — the chain store keeps no bid/ask to take a mid from.`
      : `Mid of bid and ask, quoted ${when}.`
  if (quoteFromEarlierSession(row, reading)) {
    return `${what} An earlier session than the table’s newest quote (${reading.newest}): the chain store has no later snapshot of this contract, so its premium and Ann. ret are that session’s.`
  }
  if (ms != null && reading.newestMs != null && ms < reading.newestMs) {
    return `${what} Earlier than the table’s newest quote (${reading.newest}).`
  }
  return what
}

export function deltaInBand(delta: number | null): boolean {
  if (delta == null) return false
  const a = Math.abs(delta)
  return a >= DELTA_BAND[0] && a <= DELTA_BAND[1]
}

/**
 * Every filter, each read in the unit its slider speaks. A missing reading
 * fails the filter that needs it — except a spread the store cannot measure
 * (`spreadMeasured`): no row has one, so failing on it would empty every screen
 * over an entitlement, not over the contracts. That filter is skipped and the
 * slider says so.
 */
export function rowPasses(row: ScreenerContractRow, f: LiveFilters): boolean {
  if (row.dte < f.dteMin || row.dte > f.dteMax) return false
  if (row.prob_itm == null || row.prob_itm * 100 > f.maxPitm) return false
  const ret = annReturnPct(row)
  if (ret == null || ret < f.minRet) return false
  if (spreadMeasured(row) && (row.spread_pct == null || row.spread_pct * 100 > f.maxSpread)) return false
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
    ['spread', (r) => !spreadMeasured(r) || (r.spread_pct != null && r.spread_pct * 100 <= f.maxSpread)],
    ['premium', (r) => (premiumOf(r) ?? -1) >= f.minPrem],
  ]
  const failing = checks.filter(([, ok]) => !inWindow.some(ok)).map(([name]) => name)
  if (failing.length > 0) return `no contract meets ${failing.join(' or ')}`
  // Only the filters that cut something: an unmeasured spread cuts nothing,
  // and naming it here read as though it had (walk 2026-09-27).
  const cutting = checks.filter(([, ok]) => !inWindow.every(ok)).map(([name]) => name)
  return `nothing meets ${cutting.join(' / ')} together`
}

/** A Rules structure, as far as matching a rule to a screened structure needs. */
export interface StructureTypeRef {
  strategy_structure_id: number
  structure_type: string | null
}

/**
 * The rules that can fit a row: those whose structure is the one being
 * screened. A covered-call rule on PLTR does not cover a cash-secured put on
 * PLTR, and the Rule column said it did (walk 2026-09-27). `covered_call`
 * matches the book's `covered_call_otm`. `undefined` while either book loads.
 */
export function rulesForStructure<T extends { strategy_structure_id?: number | null }>(
  opportunities: readonly T[] | undefined,
  structures: readonly StructureTypeRef[] | undefined,
  structure: string,
): T[] | undefined {
  if (!opportunities || !structures) return undefined
  const typeOf = new Map(structures.map((s) => [s.strategy_structure_id, s.structure_type]))
  return opportunities.filter((o) => {
    const t = o.strategy_structure_id == null ? undefined : typeOf.get(o.strategy_structure_id)
    return t != null && (t === structure || t.startsWith(`${structure}_`))
  })
}

/** True when some returned contract has a measured spread. */
export function anySpreadMeasured(groups: readonly ScreenerSymbolGroup[]): boolean {
  return groups.some((g) => g.contracts.some(spreadMeasured))
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
  /** The name's IV percentile as the engine scored it; null for a name not screened or an older engine. */
  iv: NameIv | null
  /** The name's next print; undefined while the read is in flight. */
  earnings: EarningsReading | undefined
}

/**
 * The name's IV30 and where it sits in its last 252 sessions, as the engine
 * read it from Research and scored it: 15% of every contract's score, the same
 * for each. Called IV rank, as the design's header and the rest of Research
 * call a one-year IV percentile; it is the share of the year at or below today.
 */
export interface NameIv {
  iv30: number | null
  pct: number | null
  /** `YYYY-MM-DD`. */
  asOf: string | null
  sessions: number | null
  /** The engine's own sentence when it did not use the percentile; '' when it did. */
  note: string
}

const IV_NOTE = 'IV percentile'

/**
 * Null for an engine older than trade-api db8b867, which sends no reading. The
 * engine joins a name's notes with "; " (a spread note can come first).
 */
export function nameIv(g: ScreenerSymbolGroup, warning: string | undefined): NameIv | null {
  if (g.iv_percentile === undefined) return null
  const num = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v : null)
  return {
    iv30: num(g.iv30),
    pct: num(g.iv_percentile),
    asOf: g.iv_percentile_as_of ?? null,
    sessions: num(g.iv_percentile_sessions),
    note: (warning ?? '').split('; ').find((s) => s.startsWith(IV_NOTE)) ?? '',
  }
}

/**
 * The header's IV reading. A percentile the engine did not use says why in a
 * word, with the engine's sentence on hover; only a failed read is a warning —
 * a short history or a stale day is the store's state, not a fault.
 */
export function nameIvLabel(iv: NameIv): { text: string; title: string; warn: boolean } {
  const iv30 = iv.iv30 == null ? '' : ` · IV30 ${(iv.iv30 * 100).toFixed(0)}%`
  if (iv.pct != null) {
    return {
      text: `IV rank ${Math.round(iv.pct)}${iv30}`,
      title:
        `IV rank: IV30 on ${fmtIsoDateToken(iv.asOf)} sits at or above ${iv.pct}% of its last ${iv.sessions ?? '—'} ` +
        'sessions (Research). The engine scores it as 15% of every contract here, the same for each.',
      warn: false,
    }
  }
  const failed = iv.note.startsWith(`${IV_NOTE} read failed`)
  const why = failed
    ? 'read failed'
    : iv.asOf == null
      ? 'no IV30'
      : iv.note.includes('days old')
        ? `as of ${fmtIsoDateToken(iv.asOf)}`
        : iv.sessions != null
          ? `${iv.sessions} sessions`
          : 'withheld'
  // The engine's sentences carry no full stop.
  const said = iv.note ? `${iv.note.replace(/\.$/, '')}.` : 'The engine sent no IV percentile for this name.'
  return {
    text: `IV rank — (${why})${iv30}`,
    title: `${said} Every contract scores it neutral (0.5).`,
    warn: failed,
  }
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
  /** The engine's per-name notes; a screened name's IV note rides on its row. */
  warnings: Readonly<Record<string, string>> = {},
  /**
   * Each name's next print, and whether a contract that spans it may pass
   * (the rail's Earnings toggle; excluded is the rule default).
   */
  earningsFilter: { earnings: Readonly<Record<string, EarningsReading>>; include: boolean } = {
    earnings: {},
    include: true,
  },
): ScreenGroup[] {
  const out: ScreenGroup[] = []
  for (const g of groups) {
    const inWindow = g.contracts.filter((r) => r.dte >= f.dteMin && r.dte <= f.dteMax).length
    const reading = earningsFilter.earnings[g.symbol]
    const clearOfEarnings = (r: ScreenerContractRow) => earningsFilter.include || !spansEarnings(r.dte, reading)
    const passingElse = g.contracts.filter((r) => rowPasses(r, f))
    const rows = passingElse
      .filter(clearOfEarnings)
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
      // Every other filter passed something, and the print took all of it: the
      // prototype's own sentence.
      warn:
        rows.length > 0
          ? ''
          : passingElse.length > 0
            ? 'earnings inside the DTE window — excluded'
            : bindingFilter(g.contracts, f),
      iv: nameIv(g, warnings[g.symbol]),
      earnings: reading,
    })
  }
  if (view === 'grouped') {
    const seen = new Set(out.map((g) => g.symbol))
    for (const [symbol, reason] of Object.entries(failed)) {
      if (seen.has(symbol)) continue
      out.push({
        symbol,
        spot: null,
        avgIv: null,
        inWindow: 0,
        rows: [],
        warn: `no chain — ${reason}`,
        iv: null,
        earnings: earningsFilter.earnings[symbol],
      })
      seen.add(symbol)
    }
    for (const symbol of pending) {
      if (seen.has(symbol)) continue
      out.push({
        symbol,
        spot: null,
        avgIv: null,
        inWindow: 0,
        rows: [],
        warn: 'screening…',
        iv: null,
        earnings: earningsFilter.earnings[symbol],
      })
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
  // Only a name the engine could not screen has a reason for Screenable; a
  // screened name's warning is a note about it (spread, IV percentile), and
  // counted here it read as why other names returned no chain.
  const failedWarnings: Record<string, string> = {}
  for (const s of data?.symbols_failed ?? []) {
    const w = data?.warnings?.[s]
    if (w) failedWarnings[s] = w
  }
  const warning = leadWarning(failedWarnings)

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
