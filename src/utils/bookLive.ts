/**
 * Book Live — the held book as the status bar reads it (design `_Shell
 * StatusBar.dc.html`, Shell Spec §12.3.3): one row per holding, a day total
 * and the rows that could not be priced.
 *
 * Every figure comes from a rule another page already owns, read here rather
 * than re-derived (§14.2):
 *
 * - a stock's price is the Positions page's `SpotResolver` — the live last,
 *   else the dated close, else the broker's mark only when it is newer than
 *   the close (on DEV the mark has sat months old while its row kept
 *   updating) — and its day change is Live's `resolveDailyBasePrice` /
 *   `computeDailyChange`;
 * - option mark and open P&L are Live's `computeOptMidAndLivePnl`, over the
 *   ledger basis when the caller has it; with no live mid (the option cache
 *   is empty outside regular hours) the vendor's dated close stands in, and
 *   the cell says which it is;
 * - option Δ and θ are the vendor's per-share rows scaled by the holding, the
 *   Positions page's per-leg source (`positionGreek`);
 * - the short-leg cushion and its warning line are the Positions page's
 *   `shortLegCushion` / `cushionBand`.
 *
 * What is new here is one join: an option's day change is its live mid against
 * the vendor's dated close, and only when that close is from an earlier
 * session than today's in New York. A close stamped today is today's running
 * close, and subtracting it would print a day change of nearly nothing.
 */
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import type { IbAccountSnapshot, IbPositionRow } from '@/types/monitor'
import type { VendorGreeksRow } from '@/api/marketData/optionGreeks'
import type { ShortLeg } from '@/api/shortLegs'
import { computeDailyChange, resolveDailyBasePrice } from '@/utils/dailyChange'
import { formatExpiryIbGroupLabel } from '@/utils/marketStreamsSort'
import { computeOptMidAndLivePnl, type OptionLiveBasis } from '@/utils/optionLiveBasis'
import type { SpotResolver } from '@/utils/spotPrice'
import { buildOptionTicker, positionGreek } from '@/utils/optionTicker'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { cushionBand, shortLegCushion } from '@/utils/positionsOptionRisk'

export interface BookLiveNext {
  text: string
  /** A short leg at or inside the trader's warning line. */
  warn: boolean
  title: string
}

export interface BookLiveRow {
  key: string
  kind: 'stk' | 'opt'
  /** `PLTR` · `NVDA Oct 17'26 CALL 170` — Live's contract token. */
  label: string
  symbol: string
  accountId: string
  qty: number
  mark: number | null
  /** Where the mark came from — `last`, a dated close, the broker's mark. */
  markNote: string | null
  /** Stock rows: % against the prior close. */
  dayPct: number | null
  /** Option rows: premium points against the prior close, per share. */
  dayPts: number | null
  /** Either kind, in dollars for the whole holding. Null when unknown. */
  dayUsd: number | null
  /** Why `dayUsd` is null, for the cell's title. */
  dayWhy: string | null
  pnl: number | null
  /** Shares-equivalent: the stock's own quantity, or vendor Δ × 100 × contracts. */
  deltaEff: number | null
  next: BookLiveNext
}

export interface BookLiveInputs {
  accounts: readonly IbAccountSnapshot[]
  /** The Positions page's price rule, built over the same quotes and bars. */
  spotOf: SpotResolver
  optQuotes: Readonly<Record<string, QuoteItem>>
  benchmarks: Readonly<Record<string, DailyBenchmark>>
  vendorByTicker: ReadonlyMap<string, VendorGreeksRow>
  shortLegs: readonly ShortLeg[]
  tightPct: number
  /** Ledger basis per `account\tcontract_key`; without it the IB average is used. */
  basisByKey?: ReadonlyMap<string, OptionLiveBasis>
  /** Today in New York, `YYYY-MM-DD`. */
  todayEt: string
  /** Account ordering and short names. */
  tagOf: (accountId: string) => string
}

export interface BookLiveTotals {
  dayUsd: number
  /** Rows with no day figure — the total is over the rest. */
  dayUnknown: number
  /** Short legs inside the warning line. */
  warnCount: number
}

const NOT_ON_PLAN = 'Forward earnings dates are not on the data plan — unmeasured, not omitted'

/** `YYYY-MM-DD` in New York for an ISO timestamp, or null. */
export function etDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function daysBetween(fromIso: string, toYmd: string): number | null {
  const d = toYmd.replace(/\D/g, '')
  if (d.length < 8) return null
  const to = Date.UTC(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)))
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  if (!Number.isFinite(from)) return null
  return Math.round((to - from) / 86_400_000)
}

function contractParts(p: IbPositionRow): { expiry: string; strike: number; right: string } | null {
  const seg = (p.contract_key ?? '').split('|')
  const expiry =
    String(p.expiry ?? p.lastTradeDateOrContractMonth ?? '').replace(/\D/g, '') ||
    (seg.find((s) => /^\d{8}$/.test(s)) ?? '')
  const strike = Number(p.strike ?? seg[3])
  const right = String(p.right ?? seg[4] ?? '').toUpperCase().slice(0, 1)
  if (expiry.length < 8 || !Number.isFinite(strike) || (right !== 'C' && right !== 'P')) return null
  return { expiry, strike, right }
}

function stkRow(p: IbPositionRow, accountId: string, x: BookLiveInputs): BookLiveRow {
  const symbol = (p.symbol ?? '').trim().toUpperCase()
  const qty = Number(p.position ?? 0)
  const spot = x.spotOf(symbol)
  const mark = spot?.price ?? null
  const base = resolveDailyBasePrice(p, x.benchmarks[symbol])
  const { dailyDollar, dailyPct } = computeDailyChange(mark, base, qty)
  const avg = p.avgCost ?? null
  const pnl = mark != null && avg != null && Number.isFinite(avg) ? (mark - avg) * qty : null
  // A close's stamp is its session date at midnight UTC — read it as that date,
  // not converted to New York (which would print the day before). A broker
  // mark's stamp is a real instant.
  const markNote =
    spot == null
      ? null
      : spot.source === 'live'
        ? 'last'
        : spot.asOf == null
          ? spot.source === 'close' ? 'close' : "broker's mark"
          : spot.source === 'close'
            ? `close · ${new Date(spot.asOf * 1000).toISOString().slice(0, 10)}`
            : `broker's mark · ${etDate(new Date(spot.asOf * 1000).toISOString())}`
  return {
    key: `${accountId}|${symbol}`,
    kind: 'stk',
    label: symbol,
    symbol,
    accountId,
    qty,
    mark,
    markNote,
    dayPct: dailyPct,
    dayPts: null,
    dayUsd: dailyDollar,
    dayWhy:
      dailyDollar == null
        ? mark == null
          ? 'No price for this name — no quote and no dated close'
          : 'No prior close for this name'
        : null,
    pnl,
    deltaEff: qty,
    next: { text: '—', warn: false, title: NOT_ON_PLAN },
  }
}

function optRow(p: IbPositionRow, accountId: string, x: BookLiveInputs): BookLiveRow | null {
  const parts = contractParts(p)
  const symbol = (p.symbol ?? '').trim().toUpperCase()
  const ck = (p.contract_key ?? '').trim()
  if (!parts || !symbol || !ck) return null
  const qty = Number(p.position ?? 0)
  const basis = x.basisByKey?.get(`${accountId.toLowerCase()}\t${ck}`)
  const { mid, livePnl } = computeOptMidAndLivePnl(
    { qty, avg_cost: p.avgCost ?? null, right: parts.right },
    x.optQuotes[ck],
    basis,
  )
  const ticker = buildOptionTicker({ underlying: symbol, expiry: parts.expiry, strike: parts.strike, right: parts.right })
  const vendor = ticker ? x.vendorByTicker.get(ticker) : undefined

  const closeDay = etDate(vendor?.snapshot_ts)
  const vendorClose = vendor?.day_close ?? null
  const prior = vendorClose != null && closeDay != null && closeDay < x.todayEt ? vendorClose : null
  // No live mid: the dated close stands in for the mark and the P&L, and says so.
  const closePnl =
    mid == null && vendorClose != null
      ? computeOptMidAndLivePnl({ qty, avg_cost: p.avgCost ?? null, right: parts.right }, { mid: vendorClose }, basis)
          .livePnl
      : null
  const dayPts = mid != null && prior != null ? mid - prior : null
  const dayWhy =
    dayPts != null
      ? null
      : mid == null
        ? 'No live mid — the option cache fills during regular hours'
        : 'No prior-session close for this contract'

  const dte = daysBetween(x.todayEt, parts.expiry)
  const dteText = dte == null ? '' : dte <= 0 ? 'today' : `${dte}d`
  let next: BookLiveNext
  if (qty < 0) {
    const leg = x.shortLegs.find(
      (l) => (l.contract_key ?? '') === ck && (!l.account_id || l.account_id.toLowerCase() === accountId.toLowerCase()),
    )
    const cushion = leg?.spot != null ? shortLegCushion(parts.right, parts.strike, leg.spot) : null
    if (cushion == null) {
      next = { text: `unpriced${dteText ? ` · ${dteText}` : ''}`, warn: false, title: 'The underlying carries no quote — unknown, not safe' }
    } else {
      const band = cushionBand(cushion, x.tightPct)
      const pct = `${(cushion * 100).toFixed(1)}%`
      next = {
        text: cushion < 0 ? `ITM ${pct.replace('-', '')}${dteText ? ` · ${dteText}` : ''}` : `${pct} to strike${dteText ? ` · ${dteText}` : ''}`,
        warn: band !== 'comfortable',
        title: `Spot ${leg?.spot} against the ${parts.strike} strike; the warning line is ${(x.tightPct * 100).toFixed(0)}%`,
      }
    }
  } else {
    const theta = positionGreek(vendor?.theta, qty)
    next =
      theta == null
        ? { text: dteText || '—', warn: false, title: 'No vendor θ for this contract' }
        : { text: `θ ${fmtSignedUsd0(theta)}/d${dteText ? ` · ${dteText}` : ''}`, warn: false, title: 'Vendor θ × 100 × contracts, per day' }
  }

  return {
    key: `${accountId}|${ck}`,
    kind: 'opt',
    label: `${symbol} ${formatExpiryIbGroupLabel(parts.expiry)} ${parts.right === 'C' ? 'CALL' : 'PUT'} ${parts.strike}`,
    symbol,
    accountId,
    qty,
    mark: mid ?? vendorClose,
    markNote: mid != null ? 'live mid' : vendorClose != null ? `vendor close${closeDay ? ` · ${closeDay}` : ''}` : null,
    dayPct: null,
    dayPts,
    dayUsd: dayPts == null ? null : dayPts * qty * 100,
    dayWhy,
    pnl: livePnl ?? closePnl,
    deltaEff: positionGreek(vendor?.delta, qty),
    next,
  }
}

const TAG_ORDER = (tag: string) => (tag === 'HOST' ? 0 : tag === 'SEC' ? 1 : 2)

export function buildBookLiveRows(x: BookLiveInputs): BookLiveRow[] {
  const rows: BookLiveRow[] = []
  for (const a of x.accounts) {
    const accountId = (a.account_id ?? '').trim()
    for (const p of a.positions ?? []) {
      if (!p.position) continue
      const sec = (p.secType ?? '').toUpperCase()
      if (sec === 'STK') rows.push(stkRow(p, accountId, x))
      else if (sec === 'OPT') {
        const r = optRow(p, accountId, x)
        if (r) rows.push(r)
      }
    }
  }
  return rows.sort(
    (a, b) =>
      TAG_ORDER(x.tagOf(a.accountId)) - TAG_ORDER(x.tagOf(b.accountId)) ||
      a.accountId.localeCompare(b.accountId) ||
      a.symbol.localeCompare(b.symbol) ||
      (a.kind === b.kind ? a.label.localeCompare(b.label) : a.kind === 'stk' ? -1 : 1),
  )
}

export function bookLiveTotals(rows: readonly BookLiveRow[]): BookLiveTotals {
  let dayUsd = 0
  let dayUnknown = 0
  let warnCount = 0
  for (const r of rows) {
    if (r.dayUsd == null) dayUnknown += 1
    else dayUsd += r.dayUsd
    if (r.next.warn) warnCount += 1
  }
  return { dayUsd, dayUnknown, warnCount }
}
