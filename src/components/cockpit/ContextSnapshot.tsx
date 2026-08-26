import { StatusLamp } from '@/components/StatusLamp'
import type { LampColor } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'

export interface ContextSnapshotProps {
  symbol: string
  dateInput: string
  regimeTag: string | null
  ivRank: number | null
  freshnessLamp: LampColor
  vrpTradeDate: string | null
  focusedHypothesisTitle: string | null
  className?: string
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-baseline gap-2 py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-dense-caption font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-dense-body text-foreground">{children}</dd>
    </div>
  )
}

export function ContextSnapshot({
  symbol,
  dateInput,
  regimeTag,
  ivRank,
  freshnessLamp,
  vrpTradeDate,
  focusedHypothesisTitle,
  className,
}: ContextSnapshotProps) {
  const ivLabel =
    ivRank != null && Number.isFinite(ivRank) ? `${ivRank.toFixed(1)}%ile` : '—'

  return (
    <dl className={cn('rounded-md border border-border/60 bg-background/50 px-3 py-1', className)}>
      <Row label="Symbol">
        <span className="font-mono font-semibold text-entity-symbol">{symbol}</span>
      </Row>
      <Row label="Trade date">
        <span className="font-mono tabular-nums">{dateInput || 'latest'}</span>
      </Row>
      <Row label="Regime">
        <span className="text-dense-label">{regimeTag ?? '—'}</span>
      </Row>
      <Row label="IV / VRP">
        <span className="inline-flex items-center gap-2">
          <StatusLamp lamp={freshnessLamp} className="h-2 w-2" />
          <span className="font-mono tabular-nums">{ivLabel}</span>
          {vrpTradeDate ? (
            <span className="text-dense-micro text-muted-foreground">as of {vrpTradeDate}</span>
          ) : null}
        </span>
      </Row>
      <Row label="Hypothesis">
        <span className="truncate text-dense-label">
          {focusedHypothesisTitle ?? 'None focused'}
        </span>
      </Row>
    </dl>
  )
}
