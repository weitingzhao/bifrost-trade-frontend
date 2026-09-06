/**
 * How much of the account the broker is already holding against the book.
 *
 * The question "how much room is left to sell" was going to be answered with a
 * home-made collateral table — cash at 100%, fixed-income ETFs at some haircut,
 * margin at some multiple. That number would have been ours, and it would have
 * disagreed with the only number that can actually force a position closed.
 *
 * IB already publishes its margin engine's own view in the account summary, so
 * this reads it rather than re-deriving it:
 *
 *   MaintMarginReq   what the broker holds against the book right now
 *   NetLiquidation   what the account is worth if liquidated now
 *   ExcessLiquidity  the broker's own headroom figure; below 0 it liquidates
 *   Cushion          the broker's own ExcessLiquidity / NetLiquidation
 *
 * Read verbatim, not reconstructed. Measured against DEV on 2026-09-05, the
 * obvious identities do not quite hold: ExcessLiquidity is EquityWithLoanValue −
 * MaintMarginReq exactly on one account and off by $326 on the other, and it is
 * never NetLiquidation − MaintMarginReq (which was out by $37,936). Deriving
 * these would produce a headroom number that quietly disagrees with the one the
 * broker acts on — so pressure here is 1 − Cushion, taken from the field itself.
 *
 * That requirement already contains every haircut, because applying haircuts is
 * what a margin requirement *is*: Reg T's 20%/10% short-option formula, the
 * strike notional behind a cash-secured put, nothing extra on a covered call,
 * and under portfolio margin the worst of a ±15% stress grid. None of it is
 * worth reimplementing beside a broker that computes it continuously and is the
 * party who enforces it.
 */
import type { IbAccountSnapshot } from '@/types/monitor'

export interface MarginFacts {
  accountId: string
  netLiquidation: number | null
  maintMarginReq: number | null
  excessLiquidity: number | null
  equityWithLoanValue: number | null
  /** The broker's ExcessLiquidity / NetLiquidation, read from its own field. */
  cushion: number | null
  buyingPower: number | null
  grossPositionValue: number | null
  /** The broker's own margin and cash figures the explanation quotes; null when not reported. */
  initMarginReq: number | null
  availableFunds: number | null
  totalCashValue: number | null
  /**
   * 1 − cushion. Reaching 1 means excess liquidity is gone, which is the point
   * the broker starts closing positions. This is the pressure ratio.
   */
  pressure: number | null
  /**
   * MaintMarginReq / NetLiquidation. A related but distinct fraction — it is NOT
   * the complement of cushion (0.332 vs 0.273 on the live host account), so it
   * is kept under its own name rather than passed off as the same thing.
   */
  maintToNlv: number | null
}

/** Bands for margin pressure. */
export type MarginBand = 'idle' | 'normal' | 'heavy' | 'critical'

/**
 * Pressure of 1 is the broker's own trigger — excess liquidity gone. The bands
 * below it are spacing rather than doctrine, which is why they are exported for
 * the caller to override instead of buried in the function.
 */
export const MARGIN_HEAVY = 0.5
export const MARGIN_CRITICAL = 0.75

export function marginBand(
  pressure: number,
  heavy: number = MARGIN_HEAVY,
  critical: number = MARGIN_CRITICAL,
): MarginBand {
  if (pressure >= critical) return 'critical'
  if (pressure >= heavy) return 'heavy'
  if (pressure <= 0) return 'idle'
  return 'normal'
}

/** IB reports summary values as strings, sometimes comma-grouped. */
export function summaryNum(
  summary: Record<string, string> | undefined,
  key: string,
): number | null {
  const v = summary?.[key]
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, '').replace(/\s/g, ''))
  return Number.isFinite(n) ? n : null
}

export function readMarginFacts(acc: IbAccountSnapshot | undefined): MarginFacts {
  const s = acc?.summary
  const nlv = summaryNum(s, 'NetLiquidation')
  const maint = summaryNum(s, 'MaintMarginReq')
  const excess = summaryNum(s, 'ExcessLiquidity')
  // Prefer the broker's own Cushion. The fallback exists for a payload that
  // omits it, and is the same ratio — not a different definition.
  const cushion =
    summaryNum(s, 'Cushion') ?? (nlv != null && nlv > 0 && excess != null ? excess / nlv : null)
  return {
    accountId: (acc?.account_id ?? '').trim(),
    netLiquidation: nlv,
    maintMarginReq: maint,
    excessLiquidity: excess,
    equityWithLoanValue: summaryNum(s, 'EquityWithLoanValue'),
    cushion,
    buyingPower: summaryNum(s, 'BuyingPower'),
    grossPositionValue: summaryNum(s, 'GrossPositionValue'),
    initMarginReq: summaryNum(s, 'InitMarginReq'),
    availableFunds: summaryNum(s, 'AvailableFunds'),
    totalCashValue: summaryNum(s, 'TotalCashValue'),
    pressure: cushion == null ? null : 1 - cushion,
    maintToNlv: nlv != null && nlv > 0 && maint != null ? maint / nlv : null,
  }
}

export interface MarginRollup {
  accounts: MarginFacts[]
  netLiquidation: number
  maintMarginReq: number
  excessLiquidity: number
  /** Portfolio-level pressure, from summed excess liquidity over summed net liq. */
  pressure: number | null
  /** The single most-loaded account — a portfolio ratio can hide one stretched account. */
  tightest: MarginFacts | null
}

/**
 * Summed across accounts, and separately the worst single account.
 *
 * Margin does not net across IB accounts: a liquidation is triggered per
 * account, so a comfortable blended ratio over two accounts says nothing about
 * whether one of them is about to be closed out.
 */
export function rollupMargin(accounts: readonly IbAccountSnapshot[]): MarginRollup {
  const facts = accounts
    .map(readMarginFacts)
    // Accounts with no net liquidation are not funded — including them would
    // dilute the ratio with an account that cannot be liquidated.
    .filter((f) => f.netLiquidation != null && f.netLiquidation > 0)

  let nlv = 0
  let maint = 0
  let excess = 0
  let tightest: MarginFacts | null = null
  for (const f of facts) {
    nlv += f.netLiquidation ?? 0
    maint += f.maintMarginReq ?? 0
    excess += f.excessLiquidity ?? 0
    if (f.pressure == null) continue
    if (tightest?.pressure == null || f.pressure > tightest.pressure) tightest = f
  }

  return {
    accounts: facts,
    netLiquidation: nlv,
    maintMarginReq: maint,
    excessLiquidity: excess,
    // Summed excess over summed net liq, matching how Cushion is defined per
    // account — not an average of the per-account ratios, which would weight a
    // small account the same as a large one.
    pressure: nlv > 0 ? 1 - excess / nlv : null,
    tightest,
  }
}
