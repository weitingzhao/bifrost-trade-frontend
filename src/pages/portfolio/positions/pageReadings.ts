/**
 * Small readings the Positions page derives for its slot and its head — pure,
 * so the page keeps to wiring. Lifted out of `PositionsPage.tsx` unchanged.
 */
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import type { Execution, OpenOptionPosition } from '@/types/positions'
import type { AccountFilter } from '@/utils/positionsGrouping'

/** The contract face's underlying: the dated close, then the live last, then the mid. */
export function faceUnderlyingHint(
  pos: OpenOptionPosition | null,
  benchBySymbol: Readonly<Record<string, DailyBenchmark>>,
  quotesBySymbol: Readonly<Record<string, QuoteItem>>,
): number | null {
  if (!pos) return null
  const sym = (pos.symbol ?? '').trim().toUpperCase()
  const bench = benchBySymbol[sym]
  if (bench?.close != null && Number.isFinite(bench.close)) return bench.close
  const q = quotesBySymbol[sym]
  if (q?.last != null && Number.isFinite(q.last)) return q.last
  if (q?.mid != null && Number.isFinite(q.mid)) return q.mid
  return null
}

/** The ledger face's subject: `exec #N · SYM · strategy #M`. */
export function fillSubject(exec: Execution | null): string | null {
  if (!exec) return null
  return [
    exec.account_executions_id != null ? `exec #${exec.account_executions_id}` : 'fill',
    exec.symbol,
    exec.trade_id != null ? `strategy #${exec.trade_id}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** What the Copilot button carries, named on hover (§16): view · rows · accounts · symbol · expiry. */
export function snapshotCarries(o: {
  view: 'strategy' | 'contract' | 'expiries'
  rows: number
  accounts: AccountFilter
  symbol: string
  expiry: string
}): string {
  const accountsWord =
    o.accounts.host && o.accounts.secondary
      ? 'both accounts'
      : o.accounts.host
        ? 'host'
        : o.accounts.secondary
          ? 'secondary'
          : 'no account'
  return [
    { strategy: 'strategies', contract: 'contracts', expiries: 'expiries' }[o.view],
    `${o.rows} rows`,
    accountsWord,
    o.symbol || null,
    o.expiry || null,
  ]
    .filter(Boolean)
    .join(' · ')
}
