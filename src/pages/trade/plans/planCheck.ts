/**
 * The sheet's right-hand check (Trade Plans rev .94 sheet): does this one plan
 * fit the account it is written against, recomputed as the form is typed.
 *
 * Same derivation as Room to add on Backing & Model, run on one plan instead
 * of the whole book: IB's Reg T requirement for a short put
 * (`regTShortPutMargin`), pressure as 1 − cushion moved by that margin out of
 * excess liquidity, and headroom as (ceiling − pressure) × net liq capped by
 * available funds. The ceiling is the trader's own risk level
 * (`usePressureCeiling`), not the prototype's fixed 70%.
 *
 * Two shapes are checked: a single short put and a single short call against
 * shares. Anything else (spreads, stock legs, several legs) says the check
 * does not model it rather than running a naked-put formula on a spread.
 */
import type { MarginFacts } from '@/utils/marginPressure'
import { regTShortPutMargin } from '@/utils/roomToAdd'
import { fmtUsdRound as usdOf } from '@/lib/format'
import { fmtPct0 } from '@/utils/positions'
import { describeSpot, type Spot } from '@/utils/spotPrice'

export type CheckLamp = 'unknown' | 'ok' | 'degraded' | 'fail'
export type CheckTone = 'ink' | 'profit' | 'loss' | 'warn'

export interface CheckRow {
  k: string
  v: string
  tone?: CheckTone
  /** Where the figure came from, when it is not obvious. */
  note?: string
}

export interface PlanCheck {
  lamp: CheckLamp
  verdict: string
  rows: CheckRow[]
  /** Pressure before and after, 0–1; null when the account is not read. */
  bar: { now: number | null; after: number | null; ceiling: number; tone: CheckTone }
  note: string
}

export interface PlanCheckLeg {
  side: 'sell' | 'buy' | ''
  secType: 'OPT' | 'STK'
  right: '' | 'C' | 'P'
  strike: number | null
  ratio: number
}

export interface PlanCheckInput {
  symbol: string
  legs: readonly PlanCheckLeg[]
  qty: number
  /** Per share, as typed. */
  limit: number | null
  priceEffect: 'credit' | 'debit'
  accountLabel: string
  account: MarginFacts | null
  /** Shares of `symbol` held in the account; null while positions are unread. */
  sharesHeld: number | null
  spot: Spot | null
  /** 0–1. */
  ceiling: number
  /** Cash other intended plans in this account already reserve. */
  intendedCash: number
}

/** Within this many points of the ceiling the check still passes, in amber. */
export const NEAR_CEILING = 0.06


function pressureTone(p: number, ceiling: number): CheckTone {
  if (p >= ceiling) return 'loss'
  if (p >= ceiling - NEAR_CEILING) return 'warn'
  return 'ink'
}

function creditRow(input: PlanCheckInput): CheckRow {
  const { limit, qty, priceEffect } = input
  if (limit == null) return { k: 'Est. credit at limit', v: '—', note: 'no limit price yet' }
  const amount = limit * 100 * qty * (priceEffect === 'debit' ? -1 : 1)
  return {
    k: `Est. ${priceEffect} at limit ${limit.toFixed(2)}`,
    v: `${amount < 0 ? '-' : '+'}${usdOf(Math.abs(amount))}`,
    tone: amount < 0 ? 'loss' : 'profit',
  }
}

function pressureAfter(account: MarginFacts, added: number): number | null {
  const { excessLiquidity, netLiquidation } = account
  if (excessLiquidity == null || netLiquidation == null || netLiquidation <= 0) return null
  return Math.min(1, Math.max(0, 1 - (excessLiquidity - added) / netLiquidation))
}

/** (ceiling − pressure) × net liq, capped by available funds — Room to add's headroom. */
function headroom(account: MarginFacts, ceiling: number): number | null {
  if (account.pressure == null || account.netLiquidation == null) return null
  const raw = Math.max(0, (ceiling - account.pressure) * account.netLiquidation)
  return account.availableFunds != null ? Math.min(raw, Math.max(0, account.availableFunds)) : raw
}

function emptyBar(input: PlanCheckInput): PlanCheck['bar'] {
  const now = input.account?.pressure ?? null
  return { now, after: null, ceiling: input.ceiling, tone: 'ink' }
}

function checkShortPut(input: PlanCheckInput, leg: PlanCheckLeg & { strike: number }): PlanCheck {
  const { account, accountLabel, spot, ceiling, qty, symbol } = input
  const contracts = qty * leg.ratio
  const cash = leg.strike * 100 * contracts
  const premium = input.priceEffect === 'credit' && input.limit != null ? input.limit : 0
  const freeCash =
    account?.totalCashValue != null ? account.totalCashValue - input.intendedCash : null
  const cashPerUnit = leg.strike * 100 * leg.ratio
  const coversByCash = freeCash != null ? Math.max(0, Math.floor(freeCash / cashPerUnit)) : null

  const rows: CheckRow[] = [
    { k: 'Spot', v: spot ? spot.price.toFixed(2) : '—', note: describeSpot(spot) },
    {
      k: 'OTM',
      v: spot ? `${((1 - leg.strike / spot.price) * 100).toFixed(1)}%` : '—',
    },
    { k: 'Cash secured', v: usdOf(cash), note: 'strike × 100 × qty' },
  ]

  if (!spot) {
    rows.push({ k: 'Reg-T margin', v: '—', note: `no quote for ${symbol}` }, creditRow(input))
    return {
      lamp: 'unknown',
      verdict: `No quote for ${symbol} — Reg-T needs a spot`,
      rows,
      bar: emptyBar(input),
      note: 'The margin half waits on a price; the cash half above is exact.',
    }
  }

  const marginPerUnit = regTShortPutMargin(spot.price, leg.strike, premium) * leg.ratio
  const margin = marginPerUnit * qty
  rows.push({ k: 'Reg-T margin', v: usdOf(margin), note: 'added to maintenance' }, creditRow(input))

  if (!account) {
    return {
      lamp: 'unknown',
      verdict: `${accountLabel}'s margin is not read`,
      rows,
      bar: emptyBar(input),
      note: 'Pressure and free cash come from the broker’s account summary, which did not answer.',
    }
  }

  const now = account.pressure
  const after = pressureAfter(account, margin)
  const room = headroom(account, ceiling)
  const maxByMargin = room != null && marginPerUnit > 0 ? Math.floor(room / marginPerUnit) : null
  rows.push(
    {
      k: `Pressure ${accountLabel}`,
      v: now != null && after != null ? `${fmtPct0(now)} → ${fmtPct0(after)}` : '—',
      tone: after != null ? pressureTone(after, ceiling) : 'ink',
    },
    {
      k: 'Max at this strike',
      v: maxByMargin != null ? `${maxByMargin} contracts` : '—',
      tone: maxByMargin != null && qty > maxByMargin ? 'loss' : 'ink',
      note: coversByCash != null ? `cash covers ${coversByCash}` : undefined,
    },
    {
      k: `Free cash ${accountLabel} after intended`,
      v: freeCash != null ? usdOf(freeCash) : '—',
      tone: freeCash != null && freeCash < cash ? 'warn' : 'ink',
    },
  )

  const bar = { now, after, ceiling, tone: after != null ? pressureTone(after, ceiling) : ('ink' as CheckTone) }
  if (after == null) {
    return { lamp: 'unknown', verdict: 'The account’s excess liquidity is not reported', rows, bar, note: 'Nothing to check yet.' }
  }
  if (after >= ceiling) {
    return {
      lamp: 'fail',
      verdict: `Does not fit — ${fmtPct0(after)} ≥ ${fmtPct0(ceiling)}`,
      rows,
      bar,
      note:
        maxByMargin != null && maxByMargin > 0
          ? `Reduce to ${maxByMargin} contracts, pick a lower strike, or wait for an expiry to free margin.`
          : 'No room under the ceiling in this account — wait for an expiry to free margin.',
    }
  }
  const near = after >= ceiling - NEAR_CEILING
  if (coversByCash != null && qty > coversByCash) {
    return {
      lamp: 'degraded',
      verdict: `On margin — ${usdOf(Math.max(0, freeCash ?? 0))} free covers ${coversByCash}`,
      rows,
      bar,
      note: 'Fits under the ceiling, but not cash-secured: the rest borrows against the account.',
    }
  }
  return {
    lamp: near ? 'degraded' : 'ok',
    verdict: near ? 'Fits, within 6pp of the ceiling' : 'Fits under the ceiling',
    rows,
    bar,
    note: 'Every other intended plan is assumed to fill first; this is the marginal check.',
  }
}

function checkCoveredCall(input: PlanCheckInput, leg: PlanCheckLeg): PlanCheck {
  const { account, accountLabel, sharesHeld, qty, ceiling } = input
  const need = qty * leg.ratio * 100
  const now = account?.pressure ?? null
  const rows: CheckRow[] = [
    { k: 'Shares held', v: sharesHeld != null ? sharesHeld.toLocaleString('en-US') : '—' },
    {
      k: 'Shares needed',
      v: need.toLocaleString('en-US'),
      tone: sharesHeld != null && sharesHeld < need ? 'loss' : 'ink',
    },
    creditRow(input),
  ]
  const bar = { now, after: now, ceiling, tone: 'ink' as CheckTone }
  if (sharesHeld == null) {
    return { lamp: 'unknown', verdict: `${accountLabel}'s positions are not read`, rows, bar, note: 'Nothing to check yet.' }
  }
  if (sharesHeld < need) {
    return {
      lamp: 'fail',
      verdict: `Not covered — ${(need - sharesHeld).toLocaleString('en-US')} shares short in ${accountLabel}`,
      rows,
      bar: { ...bar, after: null },
      note: `Buy the shares first or size down to ${Math.floor(sharesHeld / (100 * leg.ratio))}. A naked call's margin is not modelled here.`,
    }
  }
  rows.push(
    { k: 'Margin added', v: '$0' },
    { k: `Pressure ${accountLabel}`, v: now != null ? `${fmtPct0(now)} → unchanged` : '—' },
  )
  return {
    lamp: 'ok',
    verdict: `Covered by ${sharesHeld.toLocaleString('en-US')} shares in ${accountLabel}`,
    rows,
    bar,
    note: `Shares already back ${Math.floor(sharesHeld / 100)} contracts; this uses ${qty * leg.ratio}.`,
  }
}

export function planCheck(input: PlanCheckInput): PlanCheck {
  const written = input.legs.filter((l) => l.side !== '' || l.strike != null)
  const leg = written.length === 1 ? written[0] : null
  if (written.length === 0 || input.qty <= 0) {
    return {
      lamp: 'unknown',
      verdict: 'Enter a leg and contracts',
      rows: [creditRow(input)],
      bar: emptyBar(input),
      note: 'Nothing to check yet.',
    }
  }
  if (leg && leg.side === 'sell' && leg.secType === 'OPT' && leg.right === 'P') {
    if (leg.strike == null || leg.strike <= 0) {
      return { lamp: 'unknown', verdict: 'Enter strike and contracts', rows: [creditRow(input)], bar: emptyBar(input), note: 'Nothing to check yet.' }
    }
    return checkShortPut(input, { ...leg, strike: leg.strike })
  }
  if (leg && leg.side === 'sell' && leg.secType === 'OPT' && leg.right === 'C') {
    return checkCoveredCall(input, leg)
  }
  return {
    lamp: 'unknown',
    verdict: leg && leg.side === '' ? 'Choose buy or sell' : 'Not modelled for this structure',
    rows: [creditRow(input)],
    bar: emptyBar(input),
    note: 'The check covers a single short put and a covered call. Save the plan and judge the fit on Backing & Model.',
  }
}

/** Whether the check lets the plan go out as an intent. */
export function checkPasses(check: PlanCheck): boolean {
  return check.lamp === 'ok' || check.lamp === 'degraded'
}
