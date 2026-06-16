import type { IbAccountSnapshot } from '@/types/monitor'
import type { ExecutionFreshnessItem } from '@/types/trading'
import { fmtExecDaysAgo } from '@/utils/positions'
import { cn } from '@/lib/utils'

function fmtSummaryUsd(raw: string | undefined): string {
  if (!raw) return '—'
  const n = parseFloat(raw)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—'
}

interface FieldProps {
  label: string
  value: string
  className?: string
}

function SummaryField({ label, value, className }: FieldProps) {
  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold font-mono tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  )
}

interface Props {
  account: IbAccountSnapshot
  freshnessItems: ExecutionFreshnessItem[]
}

export function AccountSummaryCard({ account, freshnessItems }: Props) {
  const aid = account.account_id ?? '—'
  const s = account.summary ?? {}

  const forAcc = freshnessItems.filter((r) => r.account_id === aid)
  const flexItem = forAcc.find((r) => r.source === 'flex_trades') ?? null
  const streamItems = forAcc.filter((r) => r.source !== 'flex_trades')
  const streamBest = streamItems.reduce<ExecutionFreshnessItem | null>(
    (best, r) => (best == null || (r.latest_exec_ts ?? 0) > (best.latest_exec_ts ?? 0) ? r : best),
    null,
  )

  return (
    <div
      className="rounded-xl border border-border bg-secondary px-4 py-3"
      aria-label="Account summary"
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <SummaryField label="Account" value={aid} className="min-w-[7rem]" />
        <SummaryField label="Net liquidation" value={fmtSummaryUsd(s.NetLiquidation)} />
        <SummaryField label="Total cash" value={fmtSummaryUsd(s.TotalCashValue)} />
        <SummaryField label="Buying power" value={fmtSummaryUsd(s.BuyingPower)} />
        <SummaryField
          label="IB Flex"
          value={flexItem ? fmtExecDaysAgo(flexItem.days_since_latest) : '—'}
        />
        <SummaryField
          label="IB Stream"
          value={streamBest ? fmtExecDaysAgo(streamBest.days_since_latest) : '—'}
        />
      </div>
    </div>
  )
}
