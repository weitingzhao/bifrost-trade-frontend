import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import type { PerformanceSummary } from '@/types/trading'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtMoney, fmtNum, fmtRawPct, fmtFactor, fmtPct2 } from './performanceFormatters'

function SummaryCard({
  label,
  value,
  colorValue,
}: {
  label: string
  value: string
  colorValue?: number | null
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
        <p
          className={cn(
            'text-lg font-semibold tabular-nums leading-tight truncate',
            colorValue != null ? pnlColorClass(colorValue) : '',
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

type Props = {
  summary: PerformanceSummary | undefined
  isLoading: boolean
}

export function PerformanceSummaryStrip({ summary, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
      <SummaryCard label="Total PnL" value={fmtMoney(summary?.net_pnl)} colorValue={summary?.net_pnl} />
      <SummaryCard label="Realized" value={fmtMoney(summary?.realized)} colorValue={summary?.realized} />
      <SummaryCard
        label="Unrealized"
        value={fmtMoney(summary?.total_unrealized_pnl)}
        colorValue={summary?.total_unrealized_pnl}
      />
      <SummaryCard
        label="Commission"
        value={fmtMoney(summary?.total_commission != null ? -Math.abs(summary.total_commission) : undefined)}
        colorValue={summary?.total_commission != null ? -Math.abs(summary.total_commission) : undefined}
      />
      <SummaryCard label="Trades" value={fmtNum(summary?.trade_count)} />
      <SummaryCard label="Win Rate" value={fmtRawPct(summary?.win_rate)} />
      <SummaryCard label="Profit Factor" value={fmtFactor(summary?.profit_factor)} />
      <SummaryCard
        label="Max Drawdown"
        value={fmtMoney(summary?.max_drawdown)}
        colorValue={summary?.max_drawdown != null ? -Math.abs(summary.max_drawdown) : undefined}
      />
      <SummaryCard label="Return%" value={fmtPct2(summary?.return_pct)} />
      <SummaryCard
        label="Avg W/L"
        value={
          summary?.avg_win != null || summary?.avg_loss != null
            ? `${fmtMoney(summary?.avg_win)} / ${fmtMoney(summary?.avg_loss)}`
            : '—'
        }
      />
    </div>
  )
}
