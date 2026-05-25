import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  fetchTickerOverview,
  fetchSymbolFundamentalConditions,
  fetchSymbolTechnicalConditions,
} from '@/api/research'
import { fmtUsd, pnlColorClass } from '@/utils/positions'
import type { LivePositionRow } from '@/types/positions'

const SEPA_FUND_LABELS: Record<string, string> = {
  eps_q2q_ge_25pct: 'EPS QoQ ≥ 25%',
  rev_q2q_ge_25pct: 'Revenue QoQ ≥ 25%',
  eps_acc_2q: 'EPS Accelerating (2Q)',
  rev_acc_2q: 'Revenue Accelerating (2Q)',
  eps_3y_ge_15pct: 'EPS 3Y CAGR ≥ 15%',
  rev_3y_ge_15pct: 'Revenue 3Y CAGR ≥ 15%',
  eps_acc_fy: 'EPS Accelerating (FY)',
  rev_acc_fy: 'Revenue Accelerating (FY)',
}

const SEPA_FUND_ORDER = [
  'eps_q2q_ge_25pct', 'rev_q2q_ge_25pct',
  'eps_acc_2q', 'rev_acc_2q',
  'eps_3y_ge_15pct', 'rev_3y_ge_15pct',
  'eps_acc_fy', 'rev_acc_fy',
]

const SEPA_TECH_LABELS: Record<string, string> = {
  avg_volume_50_gt_threshold: 'Avg Vol 50D > 100K',
  crs_ge_70: 'CRS ≥ 70',
  close_ge_low52_x_1_3: 'Close ≥ Low52W × 1.3',
  close_ge_high52_x_0_75: 'Close ≥ High52W × 0.75',
  sma50_gt_sma150: 'SMA50 > SMA150',
  sma50_gt_sma200: 'SMA50 > SMA200',
  sma150_gt_sma200: 'SMA150 > SMA200',
  sma200_rising_1m: 'SMA200 Rising (1M)',
  price_gt_sma50: 'Price > SMA50',
  price_gt_sma150: 'Price > SMA150',
  price_gt_sma200: 'Price > SMA200',
}

const SEPA_TECH_ORDER = [
  'avg_volume_50_gt_threshold', 'crs_ge_70',
  'close_ge_low52_x_1_3', 'close_ge_high52_x_0_75',
  'sma50_gt_sma150', 'sma50_gt_sma200', 'sma150_gt_sma200',
  'sma200_rising_1m', 'price_gt_sma50', 'price_gt_sma150', 'price_gt_sma200',
]

function fmtMarketCap(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

function ConditionIcon({ pass, noData }: { pass: boolean; noData?: boolean }) {
  if (noData) return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
  if (pass) return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
  return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
}

function PassBadge({ pass, count, total }: { pass: boolean; count: number; total: number }) {
  return (
    <span className={cn(
      'text-[10px] font-mono px-1.5 py-0.5 rounded',
      pass
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    )}>
      {count}/{total}
    </span>
  )
}

interface Props {
  symbol: string
  accountId?: string
  livePosition?: LivePositionRow
}

export function StockInspectorPanel({ symbol, accountId, livePosition }: Props) {
  const sym = symbol.toUpperCase()

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['research', 'ticker-overview', sym],
    queryFn: () => fetchTickerOverview(sym),
    staleTime: 600_000,
    retry: 0,
  })

  const { data: fund, isLoading: fundLoading } = useQuery({
    queryKey: ['research', 'fundamental-conditions', sym],
    queryFn: () => fetchSymbolFundamentalConditions(sym),
    staleTime: 300_000,
    retry: 0,
  })

  const { data: tech, isLoading: techLoading } = useQuery({
    queryKey: ['research', 'technical-conditions', sym],
    queryFn: () => fetchSymbolTechnicalConditions(sym),
    staleTime: 300_000,
    retry: 0,
  })

  // Build condition lookup maps from API response
  const fundMap = new Map(
    (fund?.conditions ?? []).map((c) => [c.id, c]),
  )
  const techMap = new Map(
    (tech?.conditions ?? []).map((c) => [c.id, c]),
  )

  // Position data
  const qty = livePosition ? Number(livePosition.position) : null
  const avgCost = livePosition?.avgCost != null ? Number(livePosition.avgCost) : null
  const lastPrice = livePosition?.price != null ? Number(livePosition.price) : null
  const pnl = livePosition?.unrealized_pnl != null ? Number(livePosition.unrealized_pnl) : null
  const prevClose = livePosition?.daily_prev_close != null ? Number(livePosition.daily_prev_close) : null

  const totalCost = qty != null && avgCost != null ? qty * avgCost : null
  const totalMarket = qty != null && lastPrice != null ? qty * lastPrice : null
  const totalPnlPct = pnl != null && totalCost != null && totalCost !== 0
    ? (pnl / Math.abs(totalCost)) * 100 : null
  const dailyPnl = lastPrice != null && prevClose != null && qty != null
    ? (lastPrice - prevClose) * qty : null
  const dailyPct = lastPrice != null && prevClose != null && prevClose !== 0
    ? ((lastPrice - prevClose) / prevClose) * 100 : null

  const fundCondCount = SEPA_FUND_ORDER.filter((id) => fundMap.get(id)?.pass).length
  const techCondCount = SEPA_TECH_ORDER.filter((id) => techMap.get(id)?.pass).length

  return (
    <div className="divide-y divide-border text-xs">
      {/* Ticker overview */}
      <div className="p-4 space-y-2">
        {ovLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : overview?.found ? (
          <>
            {overview.name && (
              <p className="font-medium text-sm leading-tight">{overview.name}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {overview.exchange && <span>{overview.exchange}</span>}
              {overview.sector && <span>{overview.sector}</span>}
              {overview.industry && <span className="text-xs">{overview.industry}</span>}
            </div>
            <div className="flex gap-4 tabular-nums">
              {overview.market_cap != null && (
                <span>Market Cap: <span className="font-mono text-foreground">{fmtMarketCap(overview.market_cap)}</span></span>
              )}
              {overview.total_employees != null && (
                <span>Employees: <span className="font-mono text-foreground">{overview.total_employees.toLocaleString()}</span></span>
              )}
            </div>
            {overview.address_city && (
              <p className="text-muted-foreground">{overview.address_city}{overview.address_state ? `, ${overview.address_state}` : ''}</p>
            )}
          </>
        ) : !ovLoading && (
          <p className="text-muted-foreground italic">Ticker overview unavailable</p>
        )}
      </div>

      {/* Position summary */}
      {livePosition && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Position{accountId ? ` · ${accountId}` : ''}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono tabular-nums">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Qty</span>
              <span>{qty?.toLocaleString() ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Cost</span>
              <span>{fmtUsd(avgCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last</span>
              <span>{fmtUsd(lastPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cost</span>
              <span>{fmtUsd(totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Mkt</span>
              <span>{fmtUsd(totalMarket)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily P&L</span>
              <span className={cn(pnlColorClass(dailyPnl))}>
                {fmtUsd(dailyPnl)}{dailyPct != null ? ` (${dailyPct.toFixed(2)}%)` : ''}
              </span>
            </div>
            <div className="flex justify-between col-span-2">
              <span className="text-muted-foreground">Unrealized P&L</span>
              <span className={cn(pnlColorClass(pnl))}>
                {fmtUsd(pnl)}{totalPnlPct != null ? ` (${totalPnlPct.toFixed(2)}%)` : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SEPA Fundamental Conditions */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SEPA Fundamentals</p>
          {!fundLoading && fund && (
            <PassBadge
              pass={fund.fundamental_pass ?? false}
              count={fundCondCount}
              total={SEPA_FUND_ORDER.length}
            />
          )}
        </div>
        {fundLoading ? (
          <div className="space-y-1.5">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : fund?.insufficient_data ? (
          <p className="text-muted-foreground italic text-xs">Insufficient data for {sym}</p>
        ) : fund?.conditions && fund.conditions.length > 0 ? (
          <div className="space-y-1">
            {SEPA_FUND_ORDER.map((id) => {
              const cond = fundMap.get(id)
              const label = SEPA_FUND_LABELS[id] ?? id
              if (!cond) return (
                <div key={id} className="flex items-center gap-2 opacity-40">
                  <MinusCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              )
              return (
                <div key={id} className="flex items-center gap-2">
                  <ConditionIcon pass={cond.pass} />
                  <span className={cn(cond.pass ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                  {cond.actual != null && (
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                      {typeof cond.actual === 'number' ? cond.actual.toFixed(1) + '%' : cond.actual}
                    </span>
                  )}
                </div>
              )
            })}
            {fund.as_of_date && (
              <p className="text-[10px] text-muted-foreground/50 pt-1">As of {fund.as_of_date}</p>
            )}
          </div>
        ) : !fundLoading && (
          <p className="text-muted-foreground italic text-xs">No fundamental data</p>
        )}
      </div>

      {/* SEPA Technical Conditions */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SEPA Technical</p>
          {!techLoading && tech && (
            <PassBadge
              pass={tech.technical_pass ?? false}
              count={techCondCount}
              total={SEPA_TECH_ORDER.length}
            />
          )}
        </div>
        {techLoading ? (
          <div className="space-y-1.5">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : tech?.insufficient_data ? (
          <p className="text-muted-foreground italic text-xs">Insufficient data for {sym}</p>
        ) : tech?.conditions && tech.conditions.length > 0 ? (
          <div className="space-y-1">
            {SEPA_TECH_ORDER.map((id) => {
              const cond = techMap.get(id)
              const label = SEPA_TECH_LABELS[id] ?? id
              if (!cond) return (
                <div key={id} className="flex items-center gap-2 opacity-40">
                  <MinusCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              )
              return (
                <div key={id} className="flex items-center gap-2">
                  <ConditionIcon pass={cond.pass} />
                  <span className={cn(cond.pass ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                  {cond.actual != null && (
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                      {typeof cond.actual === 'number' ? cond.actual.toFixed(2) : cond.actual}
                    </span>
                  )}
                </div>
              )
            })}
            {tech.as_of_date && (
              <p className="text-[10px] text-muted-foreground/50 pt-1">As of {tech.as_of_date}</p>
            )}
          </div>
        ) : !techLoading && (
          <p className="text-muted-foreground italic text-xs">No technical data</p>
        )}
      </div>

      {/* Key metrics from technical conditions */}
      {tech?.metrics && Object.keys(tech.metrics).length > 0 && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key Metrics</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono tabular-nums">
            {Object.entries(tech.metrics)
              .filter(([, v]) => v != null)
              .slice(0, 12)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-[10px] truncate">{k.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] shrink-0">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <Separator />
    </div>
  )
}
