import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import type { IbAccountSnapshot } from '@/types/monitor'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import { optContractKey } from '@/utils/contractKey'

interface Props {
  accounts: IbAccountSnapshot[]
  className?: string
}

function computeOverviewTotals(accounts: IbAccountSnapshot[]) {
  const optKeys = new Set<string>()
  let stockLines = 0
  // Only lines that carry a figure are summed; none at all is no reading, not $0 (TD-260).
  let unrealizedPnl: number | null = null
  let unpriced = 0

  for (const account of accounts) {
    for (const position of account.positions ?? []) {
      const qty = Number(position.position)
      if (!Number.isFinite(qty) || qty === 0) continue
      if ((position.secType ?? '').toUpperCase() === 'OPT') {
        const expiry = position.lastTradeDateOrContractMonth ?? position.expiry ?? ''
        const strike = Number(position.strike) || 0
        const right = (position.right ?? '').toUpperCase().slice(0, 1)
        optKeys.add(
          position.contract_key ?? optContractKey(position.symbol ?? '', expiry, strike, right),
        )
      } else {
        stockLines += 1
      }
      const u = position.unrealized_pnl == null ? NaN : Number(position.unrealized_pnl)
      if (Number.isFinite(u)) unrealizedPnl = (unrealizedPnl ?? 0) + u
      else unpriced += 1
    }
  }

  return { optionContracts: optKeys.size, stockLines, unrealizedPnl, unpriced }
}

export function OverviewCompact({ accounts, className }: Props) {
  const totals = computeOverviewTotals(accounts)

  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      <span>
        <span className="font-medium text-foreground/70">Accounts</span>{' '}
        {accounts.length}
      </span>
      <span className="mx-2 opacity-40">·</span>
      <span>
        <span className="font-medium text-foreground/70">Options</span>{' '}
        {totals.optionContracts}
      </span>
      <span className="mx-2 opacity-40">·</span>
      <span>
        <span className="font-medium text-foreground/70">Stock lines</span>{' '}
        {totals.stockLines}
      </span>
      <span className="mx-2 opacity-40">·</span>
      <span>
        <span className="font-medium text-foreground/70">Unrealized PnL</span>{' '}
        {totals.unrealizedPnl == null ? (
          <span className="font-mono">—</span>
        ) : (
          <span className={cn('font-mono', unrealizedPnlColorClass(totals.unrealizedPnl))}>
            {fmtUsd(totals.unrealizedPnl)}
            {totals.unpriced > 0 ? '+?' : ''}
          </span>
        )}
      </span>
    </p>
  )
}
