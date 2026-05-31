import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import type { IbAccountSnapshot } from '@/types/monitor'

interface Props {
  accounts: IbAccountSnapshot[]
}

function Tile({
  label,
  value,
  valueClass,
  largeValue,
}: {
  label: string
  value: string
  valueClass?: string
  largeValue?: boolean
}) {
  return (
    <Card variant="elevated" size="sm">
      <CardContent className="py-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
        <p
          className={cn(
            'font-semibold font-mono tabular-nums',
            largeValue ? 'text-xl font-bold' : 'text-lg',
            valueClass,
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

export function OverviewDashboard({ accounts }: Props) {
  let totalPnl = 0
  let totalNetLiq = 0
  let totalCash = 0
  let totalBuyingPower = 0

  for (const acc of accounts) {
    for (const pos of acc.positions ?? []) {
      totalPnl += pos.unrealized_pnl ?? 0
    }
    totalNetLiq += parseFloat(acc.summary?.['NetLiquidation'] ?? '0') || 0
    totalCash += parseFloat(acc.summary?.['TotalCashValue'] ?? '0') || 0
    totalBuyingPower += parseFloat(acc.summary?.['BuyingPower'] ?? '0') || 0
  }

  const pnlClass =
    totalPnl > 0
      ? 'text-success'
      : totalPnl < 0
        ? 'text-danger'
        : undefined

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Tile label="Unrealized PnL" value={fmtUsd(totalPnl)} valueClass={pnlClass} largeValue />
      <Tile label="Net Liquidation" value={fmtUsd(totalNetLiq, true)} />
      <Tile label="Cash" value={fmtUsd(totalCash, true)} />
      <Tile label="Buying Power" value={fmtUsd(totalBuyingPower, true)} />
    </div>
  )
}
