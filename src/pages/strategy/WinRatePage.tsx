import { useMemo, useState } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWinRate } from '@/hooks/useStrategies'
import { fmtUsd, fmtPct, pnlColorClass } from '@/utils/positions'
import { cn } from '@/lib/utils'
import type { WinRateStructureRow } from '@/types/strategy'

// ── Time filter ───────────────────────────────────────────────────────────────

type SinceFilter = '' | '1m' | 'q' | 'half' | '1y' | 'ytd'

const SINCE_OPTIONS: { key: SinceFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: '1m', label: '1 month' },
  { key: 'q', label: 'Quarter' },
  { key: 'half', label: 'Half year' },
  { key: '1y', label: '1 year' },
  { key: 'ytd', label: 'YTD' },
]

function sinceEpoch(filter: SinceFilter): number | undefined {
  if (!filter) return undefined
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (filter === '1m') d.setUTCMonth(d.getUTCMonth() - 1)
  else if (filter === 'q') d.setUTCMonth(d.getUTCMonth() - 3)
  else if (filter === 'half') d.setUTCMonth(d.getUTCMonth() - 6)
  else if (filter === '1y') d.setUTCFullYear(d.getUTCFullYear() - 1)
  else if (filter === 'ytd') { d.setUTCMonth(0); d.setUTCDate(1) }
  return Math.floor(d.getTime() / 1000)
}

// ── Derived calculations ──────────────────────────────────────────────────────

function winPct(row: WinRateStructureRow): number | null {
  if (row.total_instances <= 0) return null
  return (row.profit_trades / row.total_instances) * 100
}

function winPctColorClass(row: WinRateStructureRow): string {
  const pct = winPct(row)
  if (pct == null) return 'text-muted-foreground'
  if (pct > 50) return 'text-green-600 dark:text-green-400'
  if (pct < 50) return 'text-red-600 dark:text-red-400'
  return 'text-muted-foreground'
}

// P&L reconciliation: use avg × count when it diverges from raw sum by > $0.05
function getDisplayProfit(row: WinRateStructureRow): number | null {
  if (row.profit_trades === 0) return null
  if (row.profit_avg_usd != null && row.total_profit != null) {
    const implied = row.profit_avg_usd * row.profit_trades
    if (Math.abs(implied - row.total_profit) > 0.05) return implied
  }
  return row.total_profit
}

function getDisplayLoss(row: WinRateStructureRow): number | null {
  if (row.loss_trades === 0) return null
  if (row.loss_avg_usd != null && row.total_loss != null) {
    const implied = row.loss_avg_usd * row.loss_trades
    if (Math.abs(implied - row.total_loss) > 0.05) return implied
  }
  return row.total_loss
}

function computeTotalsAll(rows: WinRateStructureRow[]): WinRateStructureRow {
  const totalInstances = rows.reduce((s, r) => s + r.total_instances, 0)
  const profitTrades   = rows.reduce((s, r) => s + r.profit_trades, 0)
  const lossTrades     = rows.reduce((s, r) => s + r.loss_trades, 0)
  const totalProfit    = rows.reduce((s, r) => s + (r.total_profit ?? 0), 0)
  const totalLoss      = rows.reduce((s, r) => s + (r.total_loss ?? 0), 0)
  const profitInv      = rows.reduce((s, r) => s + (r.profit_investment ?? 0), 0)
  const lossInv        = rows.reduce((s, r) => s + (r.loss_investment ?? 0), 0)
  const totalInv       = rows.reduce((s, r) => s + (r.total_investment ?? 0), 0)
  const totalMaxRisk   = rows.reduce((s, r) => s + (r.total_max_risk ?? 0), 0)

  const wAvg = (
    getter: (r: WinRateStructureRow) => number | null,
    weight: (r: WinRateStructureRow) => number,
  ) => {
    const total = rows.reduce((s, r) => s + weight(r), 0)
    if (total === 0) return null
    return rows.reduce((s, r) => {
      const v = getter(r)
      return v != null ? s + v * weight(r) : s
    }, 0) / total
  }

  const profitAvgPct = wAvg(r => r.profit_avg_pct, r => r.profit_trades)
  const lossAvgPct   = wAvg(r => r.loss_avg_pct,   r => r.loss_trades)
  const profitAvgUsd = wAvg(r => r.profit_avg_usd,  r => r.profit_trades)
  const lossAvgUsd   = wAvg(r => r.loss_avg_usd,    r => r.loss_trades)

  const lossVals = rows.map(r => r.single_max_loss_pct).filter((v): v is number => v != null)
  const minLossPct = lossVals.length > 0 ? Math.min(...lossVals) : null

  const totalNet  = totalProfit + (lossTrades > 0 ? totalLoss : 0)
  const returnPct = totalMaxRisk > 0 ? (totalNet / totalMaxRisk) * 100 : null

  return {
    structure_name:       'All structures',
    total_instances:      totalInstances,
    profit_trades:        profitTrades,
    loss_trades:          lossTrades,
    total_profit:         totalProfit,
    total_loss:           totalLoss,
    profit_investment:    profitInv,
    loss_investment:      lossInv,
    total_investment:     totalInv,
    total_max_risk:       totalMaxRisk,
    structure_return_pct: returnPct,
    profit_avg_pct:       profitAvgPct,
    loss_avg_pct:         lossAvgPct,
    single_max_loss_pct:  minLossPct,
    profit_avg_usd:       profitAvgUsd,
    loss_avg_usd:         lossAvgUsd,
  }
}

// ── Metric atom ───────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  colorClass,
  tooltip,
}: {
  label: string
  value: string
  colorClass?: string
  tooltip?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
          <span className={cn('text-xs font-mono font-medium tabular-nums', colorClass ?? '')}>{value}</span>
        </div>
      </TooltipTrigger>
      {tooltip && <TooltipContent side="top" className="text-xs max-w-52">{tooltip}</TooltipContent>}
    </Tooltip>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 leading-none">
      {children}
    </p>
  )
}

// ── Win Rate Card ─────────────────────────────────────────────────────────────

function WinRateCard({
  row,
  isTotal,
  onClick,
}: {
  row: WinRateStructureRow
  isTotal?: boolean
  onClick?: () => void
}) {
  const pct           = winPct(row)
  const displayProfit = getDisplayProfit(row)
  const displayLoss   = getDisplayLoss(row)
  const totalNet      = (row.total_profit ?? 0) + (row.loss_trades > 0 ? (row.total_loss ?? 0) : 0)

  const cardInner = (
    <div className={cn(
      'rounded-lg border border-border bg-secondary p-4 space-y-4 text-sm h-full',
      isTotal && 'bg-muted/30',
      onClick && 'hover:border-foreground/30 hover:bg-accent/20 transition-colors',
    )}>
      {/* Title */}
      <div className="flex items-center justify-between gap-2">
        <h3 className={cn(
          'font-semibold truncate',
          isTotal ? 'text-xs text-muted-foreground uppercase tracking-wide' : 'text-sm',
        )}>
          {row.structure_name || '—'}
        </h3>
        {onClick && (
          <span className="text-[10px] text-muted-foreground/60 shrink-0">↗ Instances</span>
        )}
      </div>

      {/* Trades */}
      <div className="space-y-1.5">
        <SectionLabel>Trades</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          <Metric
            label="Profit"
            value={String(row.profit_trades)}
            colorClass="text-green-600 dark:text-green-400"
            tooltip="Instances with net PnL > 0"
          />
          <Metric
            label="Loss"
            value={String(row.loss_trades)}
            colorClass={row.loss_trades > 0 ? 'text-red-600 dark:text-red-400' : undefined}
            tooltip="Instances with net PnL ≤ 0"
          />
          <Metric
            label="Total"
            value={String(row.total_instances)}
            tooltip="Total closed instances"
          />
          <Metric
            label="Win %"
            value={pct != null ? `${pct.toFixed(1)}%` : '—'}
            colorClass={winPctColorClass(row)}
            tooltip="profit ÷ total × 100  |  green > 50%,  red < 50%"
          />
        </div>
      </div>

      {/* P&L */}
      <div className="space-y-1.5">
        <SectionLabel>P&L</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <Metric
            label="Total profit"
            value={fmtUsd(displayProfit)}
            colorClass={displayProfit != null && displayProfit > 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-muted-foreground'}
            tooltip="Sum of net PnL on winning instances"
          />
          <Metric
            label="Total loss"
            value={fmtUsd(displayLoss)}
            colorClass={displayLoss != null && displayLoss < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground'}
            tooltip="Sum of net PnL on losing instances (hidden when 0 losses)"
          />
          <Metric
            label="Return"
            value={fmtPct(row.structure_return_pct)}
            colorClass={pnlColorClass(row.structure_return_pct)}
            tooltip={`Net (${fmtUsd(totalNet)}) ÷ total max risk × 100`}
          />
        </div>
      </div>

      {/* Underlying cost */}
      <div className="space-y-1.5">
        <SectionLabel>Underlying cost</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <Metric
            label="On wins"
            value={fmtUsd(row.profit_investment, true)}
            tooltip="Strike × qty × 100 on profitable instances"
          />
          <Metric
            label="On losses"
            value={fmtUsd(row.loss_investment, true)}
            tooltip="Strike × qty × 100 on losing instances"
          />
          <Metric
            label="Total"
            value={fmtUsd(row.total_investment, true)}
            tooltip="Combined underlying cost"
          />
        </div>
      </div>

      {/* Averages */}
      <div className="space-y-1.5">
        <SectionLabel>Averages per trade</SectionLabel>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Metric
            label="Profit avg %"
            value={row.profit_avg_pct != null ? fmtPct(row.profit_avg_pct) : '—'}
            colorClass={row.profit_avg_pct != null ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
            tooltip="Average return % on winning instances"
          />
          <Metric
            label="Loss avg %"
            value={row.loss_avg_pct != null ? fmtPct(row.loss_avg_pct) : '—'}
            colorClass={row.loss_avg_pct != null ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}
            tooltip="Average return % on losing instances"
          />
          <Metric
            label="Worst loss %"
            value={row.single_max_loss_pct != null ? fmtPct(row.single_max_loss_pct) : '—'}
            colorClass="text-red-600 dark:text-red-400"
            tooltip="Minimum (worst) single loss % across all instances"
          />
          <Metric
            label="Profit avg $"
            value={fmtUsd(row.profit_avg_usd)}
            colorClass={row.profit_avg_usd != null ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
            tooltip="Average net PnL $ on winning instances"
          />
          <Metric
            label="Loss avg $"
            value={fmtUsd(row.loss_avg_usd)}
            colorClass={row.loss_avg_usd != null && row.loss_avg_usd < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground'}
            tooltip="Average net PnL $ on losing instances"
          />
        </div>
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className="text-left w-full"
        onClick={onClick}
        title={`Open Instances filtered by structure: ${row.structure_name}`}
        disabled={!row.structure_name.trim()}
      >
        {cardInner}
      </button>
    )
  }

  return cardInner
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WinRatePage() {
  const navigate = useNavigate()
  const [sinceFilter, setSinceFilter] = useState<SinceFilter>('q')

  const params = useMemo(() => ({ sinceTs: sinceEpoch(sinceFilter) }), [sinceFilter])

  const { data, isLoading, isError, error, refetch, isFetching } = useWinRate(params)

  const { structures, totalsAll } = useMemo(() => {
    const s = data?.structures ?? []
    const t = s.length <= 1 ? null : (data?.totals_all ?? computeTotalsAll(s))
    return { structures: s, totalsAll: t }
  }, [data])

  const handleCardClick = (structureName: string) => {
    navigate('/strategy/instances', { state: { structureFilter: structureName } })
  }

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="Win Rate"
        titleSize="large"
        description="Aggregated results per strategy structure — closed instances only. Click a card to drill into its instances."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {/* Time filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Since:</span>
        {SINCE_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSinceFilter(key)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
              sinceFilter === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 w-full rounded-lg" />)}
        </div>
      )}

      {/* Error */}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load win-rate data'}
          </AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {!isLoading && !isError && structures.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
          <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-medium">No closed strategy instances found</p>
          <p className="text-xs text-muted-foreground">
            Win rate data appears once strategy instances have been closed with executions.
          </p>
        </div>
      )}

      {/* All structures summary — only when more than one structure */}
      {!isLoading && !isError && totalsAll && (
        <WinRateCard row={totalsAll} isTotal />
      )}

      {/* Per-structure cards grid */}
      {!isLoading && !isError && structures.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {structures.map(row => (
            <WinRateCard
              key={row.structure_name}
              row={row}
              onClick={row.structure_name.trim() ? () => handleCardClick(row.structure_name) : undefined}
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}
