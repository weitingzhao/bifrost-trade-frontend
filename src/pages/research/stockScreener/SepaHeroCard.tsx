import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  FundPassCountBucket,
  SepaConditionStat,
  SepaCriteriaStats,
  TechConditionStat,
} from '@/types/stockScreener'
import { fundBarColorClass, techBarColorClass } from '@/utils/stockScreener'

// ── Types ──

interface Props {
  variant: 'tech' | 'fund'
  stats: SepaCriteriaStats | undefined
  buckets: { buckets: FundPassCountBucket[]; base: number; maxCount: number } | null
  activeBucket: number | null
  loading?: boolean
  criteriaLoading?: boolean
  asOf?: string | null
  onRefresh?: () => void
  onBucketClick: (n: number, count: number) => void
  onConditionClick?: (id: string, passCount: number) => void
  activeConditionId?: string | null
  activeHint?: React.ReactNode
  conditionHint?: React.ReactNode
}

// ── Sub-components ──

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0 min-w-0">
      <span className={cn('font-mono text-dense-label font-semibold tabular-nums leading-tight', accent ?? 'text-foreground')}>
        {value}
      </span>
      <span className="text-dense-micro text-muted-foreground uppercase tracking-wider leading-tight">
        {label}
      </span>
    </div>
  )
}

function ConditionBar({
  label,
  passRate,
  passCount,
  accentClass,
  rank,
  isActive,
  onClick,
}: {
  label: string
  passRate: number
  passCount: number
  accentClass: string
  rank: 'weak' | 'mid' | 'strong'
  isActive: boolean
  onClick: () => void
}) {
  const pct = Math.round(passRate * 100)
  const isClickable = passCount > 0
  const dotColor = rank === 'weak'
    ? 'bg-orange-400'
    : rank === 'strong'
      ? 'bg-emerald-400'
      : 'bg-muted-foreground/40'
  const barColor = rank === 'weak'
    ? 'bg-orange-400/60'
    : rank === 'strong'
      ? accentClass
      : 'bg-muted-foreground/30'
  const pctColor = rank === 'weak'
    ? 'text-orange-400'
    : rank === 'strong'
      ? 'text-emerald-400'
      : 'text-muted-foreground/70'
  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? e => { if (e.key === 'Enter' || e.key === ' ') onClick() }
          : undefined
      }
      title={isClickable ? `Load ${passCount.toLocaleString()} symbols that pass → Results` : undefined}
      className={cn(
        'grid grid-cols-[6px_92px_1fr_30px] items-center gap-1.5 rounded px-0.5 -mx-0.5',
        isClickable && 'cursor-pointer hover:bg-muted/25',
        isActive && 'bg-accent/40',
      )}
    >
      <div className={cn('h-1 w-1 rounded-full', dotColor)} />
      <span className="truncate text-dense-caption text-foreground/75 leading-none">
        {label}
      </span>
      <div className="relative h-[4px] rounded-full bg-muted/30 overflow-hidden">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        'text-right font-mono text-dense-caption font-medium tabular-nums leading-none',
        pctColor,
      )}>
        {pct}%
      </span>
    </div>
  )
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
      onKeyDown={
        isClickable
          ? e => { if (e.key === 'Enter' || e.key === ' ') onClick() }
          : undefined
      }
      title={isClickable ? `Load ${symbolCount} symbols → Results` : undefined}
      className={cn(
        'grid grid-cols-[32px_1fr_56px] items-center gap-1.5 py-[1px] text-dense-micro',
        isClickable && '-mx-0.5 cursor-pointer rounded px-0.5 hover:bg-muted/25',
        isActive && '-mx-0.5 rounded bg-accent/40 px-0.5',
      )}
    >
      <span
        className={cn(
          'text-right font-mono font-medium tabular-nums text-foreground/80',
          isFull && (suffix === '11' ? 'text-screener-tech' : 'text-screener-fund'),
        )}
      >
        {isFull ? `${suffix}★` : `${conditionsPassed}/${suffix}`}
      </span>
      <div className="flex h-[5px] w-full items-center">
        <div
          className={cn('h-full min-w-[2px] rounded-sm', colorClass)}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-right font-mono tabular-nums text-foreground/70">
        {symbolCount.toLocaleString()}
        <span className="text-muted-foreground/60"> · {sharePct}%</span>
      </span>
    </div>
  )
}

// ── Helpers ──

function techKpis(stats: SepaCriteriaStats) {
  const t = stats.technical
  const evaluated = t.total_in_snapshot || t.tech_cached_count || 0
  const allPass = t.tech_pass_count || 0
  const breadth = t.conditions.find(c => c.id === 'price_gt_sma200')
  const breadthPct = breadth && evaluated > 0
    ? Math.round((breadth.pass / (breadth.pass + breadth.fail)) * 100)
    : null
  const fromDist = t.pass_count_distribution
    ?.filter(b => b.conditions_passed >= 8)
    .reduce((s, b) => s + b.symbol_count, 0)
  const strong =
    typeof t.pass_8_plus === 'number' && t.pass_8_plus > 0
      ? t.pass_8_plus
      : fromDist ?? 0
  return { evaluated, allPass, strong, breadthPct }
}

function fundKpis(stats: SepaCriteriaStats) {
  const f = stats.fundamental
  const withData = f.cached_count || 0
  const noData = f.no_data_count || 0
  const universe = stats.universe_count || withData + noData
  const allPass = f.fund_pass_count || 0
  const rawCoverage = universe > 0 ? (withData / universe) * 100 : 0
  const fromDist = f.pass_count_distribution
    ?.filter(b => b.conditions_passed >= 6)
    .reduce((s, b) => s + b.symbol_count, 0)
  const strong =
    typeof f.pass_6_plus === 'number' && f.pass_6_plus > 0
      ? f.pass_6_plus
      : fromDist ?? 0
  return { universe, withData, allPass, strong, coverage: rawCoverage }
}

function sortedConditions(
  conditions: (SepaConditionStat | TechConditionStat)[],
): { id: string; label: string; passCount: number; passRate: number; rank: 'weak' | 'mid' | 'strong' }[] {
  return conditions
    .map(c => {
      const total = c.pass + c.fail + ('no_data' in c ? (c as SepaConditionStat).no_data : 0)
      const passRate = total > 0 ? c.pass / total : 0
      return {
        id: c.id,
        label: shortLabel(c.label),
        passCount: c.pass,
        passRate,
        rank: (passRate < 0.4 ? 'weak' : passRate >= 0.7 ? 'strong' : 'mid') as 'weak' | 'mid' | 'strong',
      }
    })
    .sort((a, b) => a.passRate - b.passRate)
}

const SHORT_LABELS: Record<string, string> = {
  'Avg Vol 50D > 100K': 'Avg Vol 50D',
  'Avg Volume 50D > 100K': 'Avg Vol 50D',
  avg_volume_50_gt_threshold: 'Avg Vol 50D',
  'Close ≥ Low52W × 1.3': 'Off 52W Low',
  close_ge_low52_x_1_3: 'Off 52W Low',
  'Close ≥ High52W × 0.75': 'Near 52W Hi',
  close_ge_high52_x_0_75: 'Near 52W Hi',
  'SMA50 > SMA150': 'SMA 50>150',
  sma50_gt_sma150: 'SMA 50>150',
  'SMA50 > SMA200': 'SMA 50>200',
  sma50_gt_sma200: 'SMA 50>200',
  'SMA150 > SMA200': 'SMA 150>200',
  sma150_gt_sma200: 'SMA 150>200',
  'SMA200 Rising (1M)': 'SMA200 Rising',
  sma200_rising_1m: 'SMA200 Rising',
  'Price > SMA50': 'Price>SMA50',
  price_gt_sma50: 'Price>SMA50',
  'Price > SMA150': 'Price>SMA150',
  price_gt_sma150: 'Price>SMA150',
  'Price > SMA200': 'Price>SMA200',
  price_gt_sma200: 'Price>SMA200',
  'CRS ≥ 70': 'CRS ≥ 70',
  crs_ge_70: 'CRS ≥ 70',
  'EPS QoQ ≥ 25%': 'EPS QoQ',
  eps_q2q_ge_25pct: 'EPS QoQ',
  'Revenue QoQ ≥ 25%': 'Rev QoQ',
  rev_q2q_ge_25pct: 'Rev QoQ',
  'EPS Accelerating (2Q)': 'EPS Accel 2Q',
  eps_acc_2q: 'EPS Accel 2Q',
  'Revenue Accel (2Q)': 'Rev Accel 2Q',
  rev_acc_2q: 'Rev Accel 2Q',
  'EPS 3Y CAGR ≥ 15%': 'EPS 3Y CAGR',
  eps_3y_ge_15pct: 'EPS 3Y CAGR',
  'Revenue 3Y CAGR ≥ 15%': 'Rev 3Y CAGR',
  rev_3y_ge_15pct: 'Rev 3Y CAGR',
  'EPS Accelerating (FY)': 'EPS Accel FY',
  eps_acc_fy: 'EPS Accel FY',
  'Revenue Accel (FY)': 'Rev Accel FY',
  rev_acc_fy: 'Rev Accel FY',
}

function shortLabel(label: string): string {
  return SHORT_LABELS[label] ?? label
}

// ── Main component ──

export function SepaHeroCard({
  variant,
  stats,
  buckets,
  activeBucket,
  loading,
  criteriaLoading,
  asOf,
  onRefresh,
  onBucketClick,
  onConditionClick,
  activeConditionId,
  activeHint,
  conditionHint,
}: Props) {
  const isTech = variant === 'tech'
  const suffix = isTech ? '11' : '8'
  const colorFn = isTech ? techBarColorClass : fundBarColorClass
  const barAccent = isTech ? 'bg-violet-400/70' : 'bg-emerald-400/70'

  const conditions = isTech ? stats?.technical.conditions : stats?.fundamental.conditions
  const conditionBars = conditions ? sortedConditions(conditions) : []

  const kpis = stats && isTech ? techKpis(stats) : null
  const fkpis = stats && !isTech ? fundKpis(stats) : null

  return (
    <div className={cn(
      'flex flex-col rounded-md border border-border bg-secondary overflow-hidden',
    )}>
      {/* Header — colored top edge + title */}
      <div className={cn(
        'flex items-center justify-between px-3 py-1',
        isTech ? 'bg-violet-500/8' : 'bg-emerald-500/8',
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-1.5 w-1.5 rounded-full',
            isTech ? 'bg-violet-400' : 'bg-emerald-400',
          )} />
          <span className={cn(
            'text-dense-caption font-medium uppercase tracking-wider',
            isTech ? 'text-screener-tech' : 'text-screener-fund',
          )}>
            {isTech ? 'Technical' : 'Fundamental'}
          </span>
          {asOf && (
            <span className="font-mono text-dense-micro text-muted-foreground/50">{asOf}</span>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onRefresh}
            disabled={criteriaLoading}
            title="Refresh"
          >
            <RefreshCw className={cn('h-2.5 w-2.5', criteriaLoading && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* KPI strip */}
      {stats && (
        <div className="flex items-center justify-around gap-1 px-3 py-1.5 border-b border-border/30 bg-background/20">
          {isTech && kpis && (
            <>
              <Kpi label="Evaluated" value={kpis.evaluated.toLocaleString()} />
              <div className="h-5 w-px bg-border/30" />
              <Kpi label={`All ${suffix}`} value={kpis.allPass.toLocaleString()} accent="text-screener-tech" />
              <div className="h-5 w-px bg-border/30" />
              <Kpi label="≥ 8" value={kpis.strong.toLocaleString()} accent="text-violet-300" />
              <div className="h-5 w-px bg-border/30" />
              <Kpi
                label="Breadth"
                value={kpis.breadthPct != null ? `${kpis.breadthPct}%` : '—'}
                accent={
                  kpis.breadthPct != null
                    ? kpis.breadthPct >= 60 ? 'text-emerald-400'
                      : kpis.breadthPct >= 40 ? 'text-amber-400' : 'text-red-400'
                    : undefined
                }
              />
            </>
          )}
          {!isTech && fkpis && (
            <>
              <Kpi label="Universe" value={fkpis.universe.toLocaleString()} />
              <div className="h-5 w-px bg-border/30" />
              <Kpi
                label="With data"
                value={fkpis.withData.toLocaleString()}
                accent={fkpis.coverage >= 50 ? 'text-emerald-400' : 'text-amber-400'}
              />
              <div className="h-5 w-px bg-border/30" />
              <Kpi label={`All ${suffix}`} value={fkpis.allPass.toLocaleString()} accent="text-screener-fund" />
              <div className="h-5 w-px bg-border/30" />
              <Kpi label="≥ 6" value={fkpis.strong.toLocaleString()} accent="text-emerald-300" />
            </>
          )}
        </div>
      )}

      {/* Body: funnel left + conditions right — stretches to fill */}
      <div className="flex-1 grid grid-cols-[minmax(0,180px)_1fr] divide-x divide-border/20 min-h-0">
        {/* Left: Funnel */}
        <div className="px-2.5 py-2 flex flex-col min-h-0">
          <span className="text-dense-micro font-semibold uppercase tracking-wider text-muted-foreground mb-1 shrink-0">
            Distribution
          </span>
          {!isTech && fkpis && fkpis.withData > 0 && fkpis.withData < fkpis.universe && (
            <p className="text-dense-micro text-amber-400/90 leading-snug mb-1 shrink-0">
              {fkpis.withData.toLocaleString()} names with income statements
              (watchlist ingest) — not the {fkpis.universe.toLocaleString()} universe.
            </p>
          )}
          <div className="flex-1 overflow-y-auto pr-0.5 space-y-[1px]">
            {activeHint}
            {criteriaLoading && !buckets ? (
              <Skeleton className="h-14 w-full" />
            ) : buckets && buckets.buckets.length > 0 ? (
              buckets.buckets.map(({ conditions_passed, symbol_count }) => (
                <FunnelRow
                  key={conditions_passed}
                  conditionsPassed={conditions_passed}
                  symbolCount={symbol_count}
                  maxCount={buckets.maxCount}
                  base={buckets.base}
                  suffix={suffix}
                  colorClass={colorFn(conditions_passed)}
                  isActive={activeBucket === conditions_passed}
                  onClick={() => onBucketClick(conditions_passed, symbol_count)}
                />
              ))
            ) : (
              <p className="text-dense-micro text-muted-foreground py-2">
                {isTech ? 'No data — run technical backfill.' : 'No distribution data.'}
              </p>
            )}
            {loading && <p className="text-dense-micro text-muted-foreground">Loading…</p>}
          </div>
        </div>

        {/* Right: Condition pass rates */}
        <div className="px-2.5 py-2 flex flex-col min-h-0">
          <div className="flex items-baseline justify-between mb-1 shrink-0">
            <span className="text-dense-micro font-semibold uppercase tracking-wider text-muted-foreground">
              Pass Rate
            </span>
            <span className="text-dense-micro text-muted-foreground/50">
              weakest → strongest
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-between gap-[2px] min-h-0">
            {conditionHint}
            {conditionBars.length > 0 ? (
              conditionBars.map(({ id, label, passRate, passCount, rank }) => (
                <ConditionBar
                  key={id}
                  label={label}
                  passRate={passRate}
                  passCount={passCount}
                  accentClass={barAccent}
                  rank={rank}
                  isActive={activeConditionId === id}
                  onClick={() => onConditionClick?.(id, passCount)}
                />
              ))
            ) : criteriaLoading ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <p className="text-dense-micro text-muted-foreground py-2">No condition data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
