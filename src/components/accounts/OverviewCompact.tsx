import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import type { IbAccountSnapshot } from '@/types/monitor'

interface Props {
  accounts: IbAccountSnapshot[]
  className?: string
}

function computeOverviewTotals(accounts: IbAccountSnapshot[]) {
  const optKeys = new Set<string>()
  let stockLines = 0
  let unrealizedPnl = 0

  for (const account of accounts) {
    for (const position of account.positions ?? []) {
      const qty = Number(position.position)
      if (!Number.isFinite(qty) || qty === 0) continue
      if ((position.secType ?? '').toUpperCase() === 'OPT') {
        const expiry = position.lastTradeDateOrContractMonth ?? position.expiry ?? ''
        const strike = Number(position.strike) || 0
        const right = (position.right ?? '').toUpperCase().slice(0, 1)
        optKeys.add(
          position.contract_key ?? `${position.symbol ?? ''}|OPT|${expiry}|${strike}|${right}`,
        )
      } else {
        stockLines += 1
      }
      unrealizedPnl += Number(position.unrealized_pnl) || 0
    }
  }

  return { optionContracts: optKeys.size, stockLines, unrealizedPnl }
}

export function OverviewCompact({ accounts, className }: Props) {
  const totals = computeOverviewTotals(accounts)
  const pnlClass =
    totals.unrealizedPnl > 0
      ? 'text-success'
      : totals.unrealizedPnl < 0
        ? 'text-danger'
        : undefined

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
        <span className={cn('font-mono font-semibold', pnlClass)}>
          {fmtUsd(totals.unrealizedPnl)}
        </span>
      </span>
    </p>
  )
}
