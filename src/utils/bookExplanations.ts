/**
 * How every number on the cockpit and the margin strip was computed, as
 * something the reader can open next to the number.
 *
 * The figures themselves come from bookVsBase, assignmentExposure and
 * marginPressure; nothing here recomputes them. This file only says, in the
 * reader's terms, which broker field or which arithmetic produced each one,
 * and shows the per-account, per-symbol rows the totals were summed from.
 * An explanation that quietly used a different formula from the number it
 * explains would be worse than none, so every line quotes the value it
 * describes from the same objects the cockpit reads.
 */
import type { BookVsBase, CoverRow, GaugeLevel } from './bookVsBase'
import { PRESSURE_BANDS } from './bookVsBase'
import type { ExposureSummary } from './assignmentExposure'
import type { MarginRollup } from './marginPressure'
import { summaryNum } from './marginPressure'
import type { SpotMix } from './spotPrice'
import { fmtSpotDate } from './spotPrice'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'
import { fmtUsd } from './positions'

export type ExplainTopic =
  | 'pressure'
  | 'backing'
  | 'risk'
  | 'potential'
  | 'putCash'
  | 'callShares'
  | 'cashLike'
  | 'shares'

export interface ExplanationRow {
  label: string
  value: string
  /** A warning-toned row: a naked call, an unpriced leg. */
  warn?: boolean
}

export interface Explanation {
  title: string
  /** The formula and the fields, in order; the first line is the headline. */
  lines: string[]
  /** The rows the total was summed from. */
  rows?: ExplanationRow[]
  /** What each of the four segments means. */
  scale?: string[]
}

export interface ExplainInputs {
  book: BookVsBase
  exposure: ExposureSummary
  margin: MarginRollup
  /** Accounts in scope — the cash figure is their TotalCashValue summed. */
  accounts: readonly IbAccountSnapshot[]
  cashLikeRows: readonly LivePositionRow[]
  coverRows: readonly CoverRow[]
  tightPct: number
  spotMix?: SpotMix
}

const pct = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`)
const pct1 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(1)}%`)
const usd = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : fmtUsd(v))
const n = (v: number) => v.toLocaleString()

/** Segments lit for a graded gauge: level 0 lights one, level 3 lights all four. */
export function litSegments(level: GaugeLevel | null): number {
  return level == null ? 0 : level + 1
}

/** Potential is a meter, not a warning: the share of held shares still free, in four steps. */
export function potentialSegments(book: BookVsBase): number {
  const held = book.supply.sharesHeld
  if (held <= 0) return 0
  return Math.max(0, Math.min(4, Math.round((4 * book.supply.sharesFree) / held)))
}

export function explainBook(topic: ExplainTopic, input: ExplainInputs): Explanation {
  const { book, exposure, margin, tightPct, spotMix } = input
  switch (topic) {
    case 'pressure': {
      const rows: ExplanationRow[] = margin.accounts.map((a) => ({
        label: a.accountId,
        value:
          a.cushion == null
            ? 'no Cushion reported'
            : `Cushion ${pct(a.cushion)} → pressure ${pct(a.pressure)} · excess ${usd(a.excessLiquidity)} / NLV ${usd(a.netLiquidation)}`,
      }))
      return {
        title: 'Pressure',
        lines: [
          `Pressure ${pct(book.pressure.pct)} = 1 − Cushion ${pct(book.pressure.cushion)}.`,
          "Cushion is the broker's own field (ExcessLiquidity / NetLiquidation), read verbatim and never recomputed here; with more than one account in scope it is the scope's ExcessLiquidity over its NetLiquidation.",
          'At 100% excess liquidity is gone and the broker starts closing positions.',
        ],
        rows,
        scale: [
          `1/4 below ${pct(PRESSURE_BANDS.idle)} — idle`,
          `2/4 ${pct(PRESSURE_BANDS.idle)} to ${pct(PRESSURE_BANDS.heavy)} — normal`,
          `3/4 ${pct(PRESSURE_BANDS.heavy)} to ${pct(PRESSURE_BANDS.critical)} — heavy`,
          `4/4 from ${pct(PRESSURE_BANDS.critical)} — critical`,
        ],
      }
    }
    case 'backing': {
      const rows: ExplanationRow[] = exposure.byAccountSymbol
        .filter((r) => r.coveredCallContracts + r.nakedCallContracts > 0)
        .map((r) => ({
          label: `${r.accountId} ${r.underlying}`,
          value: `${r.coveredCallContracts + r.nakedCallContracts} calls · ${n(r.callDeliveryShares)} sh backing → ${r.coveredCallContracts} covered${r.nakedCallContracts > 0 ? ` · ${r.nakedCallContracts} naked` : ''}`,
          warn: r.nakedCallContracts > 0,
        }))
      const b = book.backing
      return {
        title: 'Backing',
        lines: [
          `${b.callsCovered} / ${b.callsTotal} calls covered: a short call counts as covered when whole shares of the same symbol in the same account back it (100 per contract), allocated once per account × symbol; the rest are naked.`,
          `Puts need ${usd(b.putCashNeeded)} (Σ strike × 100 × contracts) against ${usd(b.cashLike)} cash-like (TotalCashValue + SGOV-class holdings)${b.putsCashCovered != null ? ` → ${pct(b.putsCashCovered)} covered in cash, the rest on margin` : ''}.`,
        ],
        rows,
        scale: [
          '1/4 every call backed, puts covered in cash',
          '2/4 puts lean on margin rather than cash',
          '3/4 any naked call',
          '4/4 most calls naked',
        ],
      }
    }
    case 'risk': {
      const c = book.risk.counts
      const priced = spotMix
        ? [
            spotMix.live > 0 ? `${spotMix.live} live` : null,
            spotMix.close > 0 ? `${spotMix.close} at close ${fmtSpotDate(spotMix.oldestCloseAsOf, 'close')}` : null,
            spotMix.mark > 0 ? `${spotMix.mark} at broker mark ${fmtSpotDate(spotMix.oldestMarkAsOf)}` : null,
            spotMix.none > 0 ? `${spotMix.none} unpriced` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : null
      return {
        title: 'Risk',
        lines: [
          `${c.itm} in the money: short legs whose strike the spot has already passed. ${c.near7d} expiring within 7 days${c.zeroDte > 0 ? ` (${c.zeroDte} today)` : ''}${c.past > 0 ? `, ${c.past} still open past expiry` : ''}.`,
          `Cushion = distance from spot to the short strike as a share of the strike; the tightest is ${c.tightest == null ? 'n/a' : pct1(c.tightest)} against your ${pct1(tightPct)} line.`,
          `Spot: live last while the market trades, else the latest daily close (dated), else the broker's mark if newer${priced ? ` — today ${priced}` : ''}. An unpriced leg is left out of every count and is not known to be safe.`,
        ],
        scale: [
          '1/4 nothing near, nothing breached',
          '2/4 a leg within 7 days, or one still open past expiry',
          '3/4 any short leg in the money',
          '4/4 in the money and expiring today',
        ],
      }
    }
    case 'potential': {
      const rows: ExplanationRow[] = input.coverRows.map((r) => ({
        label: `${r.accountId} ${r.symbol}`,
        value: `${n(r.held)} held − ${n(r.backing)} backing = ${n(r.spare)} spare → ${r.moreCalls} more call${r.moreCalls === 1 ? '' : 's'}`,
      }))
      const p = book.potential
      const held = book.supply.sharesHeld
      return {
        title: 'Potential',
        lines: [
          `${p.moreCalls} more calls: per account × symbol, whole shares not already backing a call, ÷ 100, summed — spare RKLB shares cannot back an NVDA call.`,
          `Buying power unused ${usd(p.unusedBuyingPower)} = Σ BuyingPower ${usd(book.supply.buyingPower)} − put cash ${usd(book.demand.putCash)}.`,
          p.thetaPerDay != null ? `θ ${usd(p.thetaPerDay)}/day is the vendor's theta summed over the legs in scope.` : 'θ/day: no vendor Greeks matched the legs in scope.',
        ],
        rows,
        scale: [
          `Segments = share of held shares still free: ${n(book.supply.sharesFree)} / ${n(held)} = ${held > 0 ? pct(book.supply.sharesFree / held) : '—'} → ${potentialSegments(book)}/4`,
        ],
      }
    }
    case 'putCash': {
      const rows: ExplanationRow[] = exposure.byAccountSymbol
        .filter((r) => r.shortPutContracts > 0)
        .map((r) => ({
          label: `${r.accountId} ${r.underlying}`,
          value: `${r.shortPutContracts} put${r.shortPutContracts === 1 ? '' : 's'} → ${usd(r.putAssignmentCash)}`,
        }))
      return {
        title: 'Puts need — cash if every short put is assigned',
        lines: [`Σ strike × 100 × contracts over the short puts in scope = ${usd(book.demand.putCash)}. Strike, not spot: assignment settles at the strike whatever the stock does.`],
        rows,
      }
    }
    case 'callShares': {
      const rows: ExplanationRow[] = exposure.byAccountSymbol
        .filter((r) => r.coveredCallContracts + r.nakedCallContracts > 0)
        .map((r) => {
          const calls = r.coveredCallContracts + r.nakedCallContracts
          return {
            label: `${r.accountId} ${r.underlying}`,
            value: `${calls} × 100 = ${n(calls * 100)} sh · ${n(r.callDeliveryShares)} backed${r.nakedCallContracts > 0 ? ` · ${n(r.nakedCallContracts * 100)} unbacked` : ''}`,
            warn: r.nakedCallContracts > 0,
          }
        })
      return {
        title: 'Calls need — shares delivered if every short call is assigned',
        lines: [`100 shares per short call contract in scope = ${n(book.demand.callShares)} sh; each is backed by that account's own shares of the symbol, or by nothing.`],
        rows,
      }
    }
    case 'cashLike': {
      const rows: ExplanationRow[] = []
      for (const a of input.accounts) {
        const cash = summaryNum(a.summary, 'TotalCashValue')
        rows.push({ label: `${a.account_id ?? '—'} cash`, value: cash == null ? 'no TotalCashValue reported' : usd(cash) })
      }
      for (const r of input.cashLikeRows) {
        const qty = Number(r.position)
        const px = r.price != null ? Number(r.price) : Number.NaN
        rows.push({
          label: `${(r.account_id ?? '').trim() || '—'} ${r.symbol ?? '—'}`,
          value: Number.isFinite(px) ? `${n(qty)} × ${fmtUsd(px)} = ${usd(qty * px)}` : `${n(qty)} sh · unpriced`,
          warn: !Number.isFinite(px),
        })
      }
      return {
        title: 'Cash and SGOV — what can settle a put in cash',
        lines: [
          `TotalCashValue of each account in scope + market value of cash-like holdings (SGOV-class) = ${usd(book.supply.cashLike)}.`,
          `Buying power ${usd(book.supply.buyingPower)} is Σ BuyingPower as the broker reports it; income ETFs count there, not here.`,
        ],
        rows,
      }
    }
    case 'shares': {
      const rows: ExplanationRow[] = input.coverRows.map((r) => ({
        label: `${r.accountId} ${r.symbol}`,
        value: `${n(r.held)} held · ${n(r.backing)} backing · ${n(r.spare)} free${r.price == null ? ' · unpriced' : ''}`,
        warn: r.price == null,
      }))
      return {
        title: 'Held and free — the shares behind the calls',
        lines: [
          `Held ${n(book.supply.sharesHeld)} = whole long shares of the stocks in scope (fractional DRIP shares cannot back a contract). Backing = what the short calls of the same account × symbol take, 100 per contract; free = the rest.`,
        ],
        rows,
      }
    }
  }
}
