/**
 * The Symbol list's arrangement, as data — design `_Part SymbolDock.dc.html`
 * (Rev .56–.58), transcribed from its script rather than its picture.
 *
 * Six lists share one row grammar: ticker · last · change · a third column
 * whose meaning changes per list and says so in its head (Score, IV rk, Unrl,
 * State, When, At). Tags pick *which* lists show; the sort line picks *how*:
 *
 * 1. **By list** — each list whole, in tag order, a name repeated wherever it
 *    appears, every group with its own third column.
 * 2–6. **Merged** — one row per name. The third column becomes `In`: the
 *    initials of the lists holding it (`W P`), since one cell cannot average
 *    an IV rank and a P&L.
 * 7. **By expiry** — contracts only, grouped by expiry, nearest first.
 *
 * The walk order (j / k, the `3 of 18` foot) is the display order with each
 * name once, at its first appearance — so what you step through is what you
 * are looking at.
 */
import type { ListKey } from './dockState'
import { LIST_ORDER } from './dockState'

/** What colours a third-column cell. */
export type ThirdTone = 'plain' | 'mute' | 'unrl' | 'waiting'

export interface DockContractIn {
  /** Unique within its list — the account and the contract. */
  id: string
  /** `YYYYMMDD`, for grouping and the by-expiry order. */
  expiry: string
  label: string
  mark: number | null
  /** Premium change against the prior close, in percent. */
  chgPct: number | null
  third: string
  thirdTone?: ThirdTone
  /** Part of a multi-leg structure (opens Payoff rather than Strikes). */
  multi?: boolean
  /** The strike and side, so the Symbol panel can land on the row lit. */
  strike?: number
  right?: 'C' | 'P'
}

export interface DockRowIn {
  symbol: string
  third: string
  thirdTone?: ThirdTone
  /** Why the third cell reads as it does, when it is not self-evident. */
  thirdTitle?: string
  /** A short flag before the note — the design's `E 5d`. */
  mark?: string
  note?: string
  held?: boolean
  contracts?: DockContractIn[]
}

export interface DockListIn {
  key: ListKey
  title: string
  /** The tag's word. */
  tag: string
  sub: string
  head: string
  rows: DockRowIn[]
  /**
   * Why the list is empty, in the reader's words — null when it has rows or is
   * still loading. An empty list keeps its tag and its group and says why.
   */
  empty: string | null
  loading: boolean
}

export interface DockContract extends DockContractIn {
  /** `17OCT`. */
  exp: string
  /** Merged modes: which lists hold it, and its own value moves to the title. */
  inTitle?: string
}

export interface DockRow {
  /** Unique within the dock: group and symbol. */
  key: string
  sym: string
  third: string
  thirdTone: ThirdTone
  thirdTitle?: string
  mark: string
  note: string
  held: boolean
  /** Title of the row: the lists it is in, and the note. */
  tip: string
  contracts: DockContract[]
  /** The key its contract fold is remembered under. */
  optKey: string
  /** Contracts show without asking — Portfolio's, and every by-expiry row. */
  optDefaultOpen: boolean
}

export interface DockGroup {
  key: string
  title: string
  sub: string
  head: string
  rows: DockRow[]
  empty: string | null
  loading: boolean
}

export interface SortMode {
  name: string
  short: string
  order: string
  /**
   * Market Live's family accents, as its own classes (`MarketStreamsTable`'s
   * SORT_ACCENT) — never the direction green / red (§14.7).
   */
  accent: string
}

export const SORTS: readonly SortMode[] = [
  { name: 'By list', short: 'List', order: '· tag order · repeats shown per list', accent: 'text-foreground' },
  { name: 'A → Z', short: 'A→Z', order: '· merged · one row per name', accent: 'text-blue-700 dark:text-blue-300' },
  { name: 'Z → A', short: 'Z→A', order: '· merged · one row per name', accent: 'text-blue-700 dark:text-blue-300' },
  { name: 'Movers ↓', short: 'Up', order: '· merged · biggest gain first', accent: 'text-fuchsia-700 dark:text-fuchsia-300' },
  { name: 'Movers ↑', short: 'Down', order: '· merged · biggest loss first', accent: 'text-fuchsia-700 dark:text-fuchsia-300' },
  { name: 'Held first', short: 'Held', order: '· merged · held · not held', accent: 'text-violet-700 dark:text-violet-300' },
  { name: 'By expiry', short: 'Exp', order: '· contracts only · nearest first', accent: 'text-fuchsia-700 dark:text-fuchsia-300' },
]

export const LIST_INITIAL: Record<ListKey, string> = {
  source: 'S',
  watch: 'W',
  port: 'P',
  obj: 'O',
  recent: 'R',
  alerts: 'A',
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** `20261017` → `17OCT`. */
export function expLabel(expiry: string): string {
  const d = expiry.replace(/\D/g, '')
  if (d.length < 8) return expiry
  const m = Number(d.slice(4, 6))
  return `${d.slice(6, 8)}${MONTHS[m - 1] ?? '?'}`
}

/** Calendar days from an ET `YYYY-MM-DD` to a `YYYYMMDD` expiry. */
export function daysTo(todayEt: string, expiry: string): number | null {
  const d = expiry.replace(/\D/g, '')
  if (d.length < 8 || !/^\d{4}-\d{2}-\d{2}$/.test(todayEt)) return null
  const a = Date.UTC(Number(todayEt.slice(0, 4)), Number(todayEt.slice(5, 7)) - 1, Number(todayEt.slice(8, 10)))
  const b = Date.UTC(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)))
  return Math.round((b - a) / 86_400_000)
}

/** The sel a reader starts with: Source first where a page handed one over. */
export function defaultSel(hasSource: boolean): ListKey[] {
  return hasSource ? ['source', 'watch', 'port'] : ['watch', 'port']
}

/** One tag click: toggle, or ⌥ = only this list. Never leaves nothing shown. */
export function toggleSel(shown: readonly ListKey[], key: ListKey, only: boolean): ListKey[] | null {
  if (only) return [key]
  const on = shown.includes(key)
  const next = on ? shown.filter((k) => k !== key) : LIST_ORDER.filter((k) => k === key || shown.includes(k))
  return next.length > 0 ? next : null
}

export interface BuildInput {
  lists: Record<ListKey, DockListIn>
  shown: readonly ListKey[]
  sort: number
  /** Day change per symbol, for the two Movers orders; null sorts last. */
  chgOf: (sym: string) => number | null
  todayEt: string
}

function contractsOf(row: DockRowIn): DockContract[] {
  return (row.contracts ?? []).map((c) => ({ ...c, exp: expLabel(c.expiry) }))
}

function rowOf(list: DockListIn, row: DockRowIn, groupKey: string): DockRow {
  return {
    key: `${groupKey}:${row.symbol}`,
    sym: row.symbol,
    third: row.third,
    thirdTone: row.thirdTone ?? 'plain',
    thirdTitle: row.thirdTitle,
    mark: row.mark ?? '',
    note: row.note ?? '',
    held: Boolean(row.held),
    tip: `Load ${row.symbol} · ${list.title}${row.note ? ` · ${row.note}` : ''}`,
    contracts: contractsOf(row),
    optKey: `${list.key}:${row.symbol}`,
    optDefaultOpen: list.key === 'port',
  }
}

interface Merged {
  first: { list: DockListIn; row: DockRowIn }
  inn: ListKey[]
  held: boolean
  contracts: DockContract[]
}

/** One entry per name across the shown lists, in the order names first appear. */
function mergeShown(lists: Record<ListKey, DockListIn>, shown: readonly ListKey[]): Map<string, Merged> {
  const all = new Map<string, Merged>()
  for (const k of shown) {
    const list = lists[k]
    for (const row of list.rows) {
      let m = all.get(row.symbol)
      if (!m) {
        m = { first: { list, row }, inn: [], held: false, contracts: [] }
        all.set(row.symbol, m)
      }
      if (!m.inn.includes(k)) m.inn.push(k)
      if (row.held) m.held = true
      // A contract two lists hold is one row; its `In` cell names both.
      for (const c of contractsOf(row)) {
        const same = m.contracts.find((x) => x.expiry === c.expiry && x.label === c.label)
        if (same) {
          same.third = `${same.third} ${LIST_INITIAL[k]}`
        } else {
          m.contracts.push({
            ...c,
            third: LIST_INITIAL[k],
            thirdTone: 'mute',
            inTitle: `${list.title} ${c.third}`.trim(),
          })
        }
      }
    }
  }
  return all
}

function mergedRow(lists: Record<ListKey, DockListIn>, sym: string, m: Merged, groupKey: string): DockRow {
  const base = rowOf(m.first.list, m.first.row, groupKey)
  const home = m.inn.includes('port') ? 'port' : m.first.list.key
  return {
    ...base,
    third: m.inn.map((k) => LIST_INITIAL[k]).join(' '),
    thirdTone: 'mute',
    thirdTitle: undefined,
    held: m.held,
    tip: `Load ${sym} · in ${m.inn.map((k) => lists[k].title).join(', ')}`,
    contracts: m.contracts,
    optKey: `${home}:${sym}`,
    optDefaultOpen: home === 'port',
  }
}

function anyLoading(lists: Record<ListKey, DockListIn>, shown: readonly ListKey[]): boolean {
  return shown.some((k) => lists[k].loading)
}

export function buildGroups({ lists, shown, sort, chgOf, todayEt }: BuildInput): DockGroup[] {
  const sm = Math.min(Math.max(1, sort), SORTS.length)
  if (sm === 1) {
    return shown.map((k) => {
      const list = lists[k]
      return {
        key: k,
        title: list.title,
        sub: list.sub,
        head: list.head,
        rows: list.rows.map((r) => rowOf(list, r, k)),
        empty: list.rows.length === 0 ? list.empty : null,
        loading: list.loading && list.rows.length === 0,
      }
    })
  }

  const all = mergeShown(lists, shown)
  const loading = anyLoading(lists, shown)
  const group = (key: string, title: string, rows: DockRow[], empty: string | null): DockGroup => ({
    key,
    title,
    sub: SORTS[sm - 1].name,
    head: 'In',
    rows,
    empty: rows.length === 0 ? empty : null,
    loading: loading && rows.length === 0,
  })

  if (sm === 7) {
    const expiries = new Set<string>()
    for (const m of all.values()) for (const c of m.contracts) expiries.add(c.expiry)
    const out: DockGroup[] = []
    for (const e of [...expiries].sort()) {
      const rows: DockRow[] = []
      for (const [sym, m] of all) {
        const cs = m.contracts.filter((c) => c.expiry === e)
        if (cs.length === 0) continue
        rows.push({ ...mergedRow(lists, sym, m, `~x${e}`), contracts: cs, optDefaultOpen: true })
      }
      const d = daysTo(todayEt, e)
      out.push(group(`~x${e}`, `${expLabel(e)}${d == null ? '' : ` · ${d}d`}`, rows, null))
    }
    return out.length > 0
      ? out
      : [group('~x', 'No contracts', [], 'None of the shown lists holds a contract. By expiry lists contracts only.')]
  }

  const flat = [...all].map(([sym, m]) => ({ row: mergedRow(lists, sym, m, '~all'), chg: chgOf(sym) }))
  const bySym = (a: { row: DockRow }, b: { row: DockRow }) => a.row.sym.localeCompare(b.row.sym)
  // Unknown change sorts last in both directions: a name without a quote is
  // not the day's biggest mover either way.
  const byChg = (dir: 1 | -1) => (a: { chg: number | null }, b: { chg: number | null }) =>
    a.chg == null ? (b.chg == null ? 0 : 1) : b.chg == null ? -1 : dir * (b.chg - a.chg)
  const cmp = { 2: bySym, 3: (a: { row: DockRow }, b: { row: DockRow }) => -bySym(a, b), 4: byChg(1), 5: byChg(-1), 6: bySym }[
    sm as 2 | 3 | 4 | 5 | 6
  ]
  flat.sort(cmp)
  const rows = flat.map((f) => f.row)
  const emptyWhy = 'Nothing on the shown lists yet.'

  if (sm === 6) {
    const held = rows.filter((r) => r.held).map((r) => ({ ...r, key: `~held:${r.sym}` }))
    const free = rows.filter((r) => !r.held).map((r) => ({ ...r, key: `~free:${r.sym}` }))
    const out = [group('~held', 'Held', held, null), group('~free', 'Not held', free, null)].filter((g) => g.rows.length)
    return out.length > 0 ? out : [group('~all', 'Held first', [], emptyWhy)]
  }
  const title = shown.length > 1 ? `${shown.length} lists merged` : lists[shown[0]].title
  return [group('~all', title, rows, emptyWhy)]
}

/** Display order, each name once at its first appearance. */
export function walkOrder(groups: readonly DockGroup[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const g of groups)
    for (const r of g.rows)
      if (!seen.has(r.sym)) {
        seen.add(r.sym)
        out.push(r.sym)
      }
  return out
}

/** `3 of 18 · PLTR`, or the count when the current name is not listed. */
export function posLine(walk: readonly string[], current: string): string {
  const i = current ? walk.indexOf(current) : -1
  return i >= 0 ? `${i + 1} of ${walk.length} · ${current}` : `${walk.length} name${walk.length === 1 ? '' : 's'}`
}

const MINUS = '−'

/** Full row: `1,210.40` · `156.90`. */
export function fmtLast(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v >= 1000
    ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toFixed(2)
}

/** Strip row, 56px wide: `1,210` · `156.9` · `41.20`. */
export function fmtLastStrip(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  if (v >= 1000) return Math.round(v).toLocaleString('en-US')
  return v >= 100 ? v.toFixed(1) : v.toFixed(2)
}

/** Signed percent at a fixed precision; a move that rounds to nothing is unsigned. */
function signedPct(p: number | null, digits: number): string {
  if (p == null || !Number.isFinite(p)) return '—'
  const text = Math.abs(p).toFixed(digits)
  if (Number(text) === 0) return `${text}%`
  return `${p > 0 ? '+' : MINUS}${text}%`
}

/** `+3.40%` · `−0.84%` · `0.00%`. */
export function fmtChg(p: number | null): string {
  return signedPct(p, 2)
}

/** Strip: `+3.4%` · `−12%`. */
export function fmtChgStrip(p: number | null): string {
  return signedPct(p, p != null && Math.abs(p) >= 10 ? 0 : 1)
}

/** Premium change: `−6.2%`. */
export function fmtChg1(p: number | null): string {
  return signedPct(p, 1)
}

/** Shares, whole or fractional (reinvested dividends): `480` · `2,103.63`. */
export function fmtShares(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/** Whole dollars, signed: `+3,120` · `−540`. */
export function fmtSignedUsd(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const r = Math.round(v)
  return `${r > 0 ? '+' : r < 0 ? MINUS : ''}${Math.abs(r).toLocaleString('en-US')}`
}

/** `now` · `4m` · `1h` · `y’day` · `3d` — how long ago a name was loaded. */
export function agoLabel(atMs: number, nowMs: number): string {
  const s = Math.max(0, (nowMs - atMs) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86_400) return `${Math.floor(s / 3600)}h`
  const days = Math.floor(s / 86_400)
  return days === 1 ? 'y’day' : `${days}d`
}
