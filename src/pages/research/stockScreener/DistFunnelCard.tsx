import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { FundPassCountBucket, TechPassCountBucket } from '@/types/stockScreener'
import { fundBarColorClass, techBarColorClass } from '@/utils/stockScreener'
import styles from './stock-screener.module.css'

interface Props {
  title?: string
  variant: 'tech' | 'fund'
  buckets: FundPassCountBucket[] | TechPassCountBucket[] | null
  base: number
  maxCount: number
  suffix: string
  activeBucket: number | null
  loading?: boolean
  criteriaLoading?: boolean
  criteriaError?: string | null
  asOf?: string | null
  onRefresh?: () => void
  onBucketClick: (n: number, count: number) => void
  activeHint?: React.ReactNode
}

function FunnelRow({
  conditionsPassed,
  symbolCount,
  maxCount,
  base,
  suffix,
  colorClass,
  isActive,
  onClick,
}: {
  conditionsPassed: number
  symbolCount: number
  maxCount: number
  base: number
  suffix: string
  colorClass: string
  isActive: boolean
  onClick: () => void
}) {
  const widthPct = Math.round((symbolCount / maxCount) * 100)
  const sharePct = Math.round((symbolCount / base) * 100)
  const isClickable = symbolCount > 0
  const isFull = conditionsPassed === parseInt(suffix, 10)

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      title={isClickable ? `Load ${symbolCount} symbols → Results` : undefined}
      className={cn(
        'grid grid-cols-[52px_1fr_auto] items-center gap-2 py-0.5 text-[11px]',
        isClickable && 'cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1',
        isActive && 'bg-accent/40 rounded px-1 -mx-1',
      )}
    >
      <span className={cn(
        'font-mono font-medium tabular-nums',
        isFull && (suffix === '11' ? 'text-violet-400' : 'text-emerald-400'),
      )}>
        {isFull ? `${suffix}/${suffix} ★` : `${conditionsPassed}/${suffix}`}
      </span>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', colorClass)} style={{ width: `${widthPct}%` }} />
      </div>
      <span className="font-mono tabular-nums text-muted-foreground whitespace-nowrap">
        {symbolCount.toLocaleString()}
        <span className="text-[10px] opacity-70">({sharePct}%)</span>
      </span>
    </div>
  )
}

export function DistFunnelCard({
  title = 'SEPA Dist.',
  variant,
  buckets,
  base,
  maxCount,
  suffix,
  activeBucket,
  loading,
  criteriaLoading,
  criteriaError,
  asOf,
  onRefresh,
  onBucketClick,
  activeHint,
}: Props) {
  const colorFn = variant === 'tech' ? techBarColorClass : fundBarColorClass

  return (
    <div className={cn(
      styles.ssCard,
      variant === 'tech' ? styles.ssCardDistTech : styles.ssCardDistFund,
    )}>
      <div className="flex flex-row items-center justify-between gap-2 mb-2">
        <h3 className={styles.ssCardTitle}>{title}</h3>
        <div className="flex items-center gap-1">
          {asOf && (
            <span className="font-mono text-[10px] text-muted-foreground">As of {asOf}</span>
          )}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefresh}
              disabled={criteriaLoading}
              title="Refresh"
            >
              <RefreshCw className={cn('h-3 w-3', criteriaLoading && 'animate-spin')} />
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {activeHint}
        {criteriaLoading && !buckets ? (
          <Skeleton className="h-24 w-full" />
        ) : criteriaError ? (
          <p className="text-xs text-destructive">{criteriaError}</p>
        ) : buckets && buckets.length > 0 ? (
          buckets.map(({ conditions_passed, symbol_count }) => (
            <FunnelRow
              key={conditions_passed}
              conditionsPassed={conditions_passed}
              symbolCount={symbol_count}
              maxCount={maxCount}
              base={base}
              suffix={suffix}
              colorClass={colorFn(conditions_passed)}
              isActive={activeBucket === conditions_passed}
              onClick={() => onBucketClick(conditions_passed, symbol_count)}
            />
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            {variant === 'tech' ? 'No data — run technical backfill first.' : 'No distribution data.'}
          </p>
        )}
        {loading && <p className="text-[10px] text-muted-foreground">Loading symbols…</p>}
      </div>
    </div>
  )
}
