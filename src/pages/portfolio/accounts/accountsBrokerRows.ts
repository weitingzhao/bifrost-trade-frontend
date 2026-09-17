/**
 * What the broker says, in one table instead of a tab per account.
 *
 * Tabs made the second account a place you had to go; the row per account plus
 * an `All accounts` total makes both readable at once, and selecting a row is
 * what scopes the Holdings band below. The six fields the per-account summary
 * card used to carry are columns here — same fields, one place.
 *
 * Cushion and maintenance are the broker's own numbers and are never recomputed
 * on this page. A dormant account is grey where it has no reading, which is not
 * the same as a zero and not the same as broken.
 */
import { summaryNum } from '@/utils/marginPressure'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { ExecutionFreshnessItem } from '@/types/trading'
import { accountRoles, daysFor } from './accountsFreshnessRows'

/** Owner's ruling: the third account is funded but standing idle, and will not be started. */
export const DORMANT_ROLE_NOTE = 'funded, not in use'

/** Below this the broker's own day-trade counter is worth showing (ruling F7). */
export const DAY_TRADES_WARN_AT = 2

export interface BrokerAccountRow {
  accountId: string
  role: string
  /** Present only on the dormant account. */
  roleNote?: string
  dormant: boolean
  netLiq: number | null
  shareOfTotal: number | null
  cash: number | null
  buyingPower: number | null
  maintenance: number | null
  excessLiquidity: number | null
  cushion: number | null
  positions: number
  /** Days since the newest record, or null when this account has no row for that source. */
  flexRecDays: number | null
  twsRecDays: number | null
  /** Only set when the broker says the account is near its day-trade limit. */
  dayTradesLeft: number | null
}

export interface BrokerTotals {
  netLiq: number
  cash: number
  buyingPower: number
  maintenance: number
  excessLiquidity: number
  positions: number
}

function positionCount(a: IbAccountSnapshot): number {
  return a.positions?.length ?? 0
}

export function buildBrokerRows(
  accounts: readonly IbAccountSnapshot[],
  freshness: readonly ExecutionFreshnessItem[],
): { rows: BrokerAccountRow[]; totals: BrokerTotals } {
  const ids = accounts.map((a) => a.account_id ?? '')
  const roles = accountRoles(ids)
  const totalNetLiq = accounts.reduce((t, a) => t + (summaryNum(a.summary, 'NetLiquidation') ?? 0), 0)

  const rows = accounts.map((a) => {
    const accountId = a.account_id ?? '—'
    const s = a.summary
    const netLiq = summaryNum(s, 'NetLiquidation')
    const positions = positionCount(a)
    // Dormant is a standing state, not a failed fetch: no holdings and no
    // balance, while the broker still reports a full field set for it.
    const dormant = positions === 0 && (netLiq ?? 0) === 0
    const dayTradesLeft = summaryNum(s, 'DayTradesRemaining')
    return {
      accountId,
      role: dormant ? 'dormant' : (roles[accountId] ?? ''),
      roleNote: dormant ? DORMANT_ROLE_NOTE : undefined,
      dormant,
      netLiq,
      shareOfTotal: netLiq != null && totalNetLiq > 0 ? (netLiq / totalNetLiq) * 100 : null,
      cash: summaryNum(s, 'TotalCashValue'),
      buyingPower: summaryNum(s, 'BuyingPower'),
      maintenance: summaryNum(s, 'MaintMarginReq'),
      excessLiquidity: summaryNum(s, 'ExcessLiquidity'),
      cushion: summaryNum(s, 'Cushion'),
      positions,
      flexRecDays: daysFor(freshness, accountId, 'flex_trades'),
      twsRecDays: daysFor(freshness, accountId, 'tws_client'),
      dayTradesLeft:
        dayTradesLeft != null && dayTradesLeft <= DAY_TRADES_WARN_AT ? dayTradesLeft : null,
    }
  })

  const totals = rows.reduce<BrokerTotals>(
    (t, r) => ({
      netLiq: t.netLiq + (r.netLiq ?? 0),
      cash: t.cash + (r.cash ?? 0),
      buyingPower: t.buyingPower + (r.buyingPower ?? 0),
      maintenance: t.maintenance + (r.maintenance ?? 0),
      excessLiquidity: t.excessLiquidity + (r.excessLiquidity ?? 0),
      positions: t.positions + r.positions,
    }),
    { netLiq: 0, cash: 0, buyingPower: 0, maintenance: 0, excessLiquidity: 0, positions: 0 },
  )

  return { rows, totals }
}

export function unrealizedPnlTotal(accounts: readonly IbAccountSnapshot[]): number {
  let total = 0
  for (const a of accounts) {
    for (const p of a.positions ?? []) total += Number(p.unrealized_pnl) || 0
  }
  return total
}
