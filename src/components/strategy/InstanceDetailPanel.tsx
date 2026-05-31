/**
 * Inline Instance Detail Panel — embedded in the page layout (no Sheet/Dialog).
 * Reuses the same business logic as InstanceDetailDrawer but renders as a scrollable panel.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { structureChipStyle } from '@/utils/structureColor'
import { fetchInstancePerformance, fetchInstanceExecutions } from '@/api/trading'
import { fetchOpportunityDetail } from '@/api/strategy'
import type { StrategyInstance } from '@/types/positions'
import type { RawExecution, PerformanceSummary } from '@/types/trading'

// ── Format helpers ───────────────────────────────────────────────────────────

function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const formatted = abs >= 100_000
    ? `$${(abs / 1000).toFixed(0)}k`
    : abs >= 1000
      ? `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${abs.toFixed(2)}`
  return n < 0 ? `-${formatted}` : formatted
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function pnlColor(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'text-muted-foreground'
  return n > 0.01 ? 'text-green-500' : n < -0.01 ? 'text-red-500' : 'text-muted-foreground'
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) +
    ', ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

// ── Execution logic ──────────────────────────────────────────────────────────

function isSellSide(side: string): boolean {
  const s = (side ?? '').toUpperCase()
  return s === 'SELL' || s === 'SLD' || s === 'S'
}

function isBuySide(side: string): boolean {
  const s = (side ?? '').toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

interface ContractGroup {
  contractKey: string
  symbol: string
  strike: number
  expiry: string
  right: string
  buyQty: number
  buyAvg: number
  buyTotal: number
  buyComm: number
  sellQty: number
  sellAvg: number
  sellTotal: number
  sellComm: number
  netQty: number
  groupPnl: number
  fills: RawExecution[]
}

function buildContractGroups(executions: RawExecution[]): ContractGroup[] {
  const map = new Map<string, ContractGroup>()
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const strike = e.strike ?? 0
    const right = (e.option_right ?? '').toUpperCase().charAt(0)
    const expiry = (e.expiry ?? '').replace(/\D/g, '').slice(0, 8)
    const symbol = (e.symbol ?? '').toUpperCase().split(/\s/)[0] || '—'
    const key = `${symbol}|${expiry}|${strike}|${right}`
    if (!map.has(key)) {
      map.set(key, {
        contractKey: e.contract_key ?? `${symbol} ${expiry} ${strike} ${right}`,
        symbol, strike, expiry, right,
        buyQty: 0, buyAvg: 0, buyTotal: 0, buyComm: 0,
        sellQty: 0, sellAvg: 0, sellTotal: 0, sellComm: 0,
        netQty: 0, groupPnl: 0, fills: [],
      })
    }
    const g = map.get(key)!
    g.fills.push(e)
    const qty = Math.abs(e.quantity)
    const premium = e.price * qty * 100
    const comm = Math.abs(e.commission ?? 0)
    if (isBuySide(e.side)) { g.buyQty += qty; g.buyTotal += premium; g.buyComm += comm }
    else { g.sellQty += qty; g.sellTotal += premium; g.sellComm += comm }
  }
  for (const g of map.values()) {
    g.buyAvg = g.buyQty > 0 ? g.buyTotal / (g.buyQty * 100) : 0
    g.sellAvg = g.sellQty > 0 ? g.sellTotal / (g.sellQty * 100) : 0
    g.netQty = g.buyQty - g.sellQty
    g.groupPnl = g.sellTotal - g.buyTotal - g.buyComm - g.sellComm
  }
  return Array.from(map.values()).sort((a, b) => a.symbol.localeCompare(b.symbol) || a.strike - b.strike)
}

function computeCapital(executions: RawExecution[], summary: PerformanceSummary, openedAtEpoch: number | null, structureName: string | null) {
  const netPnl = summary.net_pnl
  let notional = 0
  let cashSecured = 0
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT' || !isSellSide(e.side)) continue
    const strike = e.strike ?? 0
    const qty = Math.abs(e.quantity)
    if (strike <= 0 || qty <= 0) continue
    notional += strike * qty * 100
    if ((e.option_right ?? '').toUpperCase().charAt(0) === 'P') cashSecured += strike * qty * 100
  }
  const stLower = (structureName ?? '').toLowerCase()
  const isCashSecured = stLower.includes('cash secured') || stLower.includes('cash_secured')
  const risk = isCashSecured && cashSecured > 0 ? cashSecured : notional
  const riskLabel = isCashSecured && cashSecured > 0 ? 'Cash secured' : 'Underlying notional'
  const holdDays = openedAtEpoch != null ? Math.max(1, Math.floor((Date.now() / 1000 - openedAtEpoch) / 86400)) : 1
  const netPnlPerDay = holdDays > 0 ? netPnl / holdDays : null
  const costPerDay = risk > 0 && holdDays > 0 ? risk / holdDays : null
  const returnPct = risk > 0 ? (netPnl / risk) * 100 : null
  const annualPct = risk > 0 ? (netPnl / risk) * (365.25 / holdDays) * 100 : null
  return { risk, riskLabel, notional, costPerDay, netPnlPerDay, holdDays, returnPct, annualPct }
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  instance: StrategyInstance
  onClose?: () => void
  embedded?: boolean
}

export function InstanceDetailPanel({ instance, onClose, embedded = false }: Props) {
  const instanceId = instance.strategy_instance_id
  const [execTab, setExecTab] = useState<string>('performance_book')

  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['instance-detail-perf', instanceId],
    queryFn: () => fetchInstancePerformance(instanceId),
    enabled: instanceId > 0,
    staleTime: 60_000,
  })
  const { data: execData, isLoading: execLoading } = useQuery({
    queryKey: ['instance-detail-execs', instanceId],
    queryFn: () => fetchInstanceExecutions(instanceId),
    enabled: instanceId > 0,
    staleTime: 60_000,
  })
  useQuery({
    queryKey: ['instance-detail-opp', instance.strategy_opportunity_id],
    queryFn: () => fetchOpportunityDetail(instance.strategy_opportunity_id),
    enabled: instance.strategy_opportunity_id != null,
    staleTime: 120_000,
  })

  const summary = perfData?.summary ?? null
  const executions = useMemo(() => execData?.executions ?? [], [execData])
  const contractGroups = useMemo(() => buildContractGroups(executions), [executions])

  const capitalMetrics = useMemo(() => {
    if (!summary) return null
    return computeCapital(executions, summary, instance.opened_at_epoch, instance.strategy_structure_name)
  }, [executions, summary, instance.opened_at_epoch, instance.strategy_structure_name])

  const positionStatus = useMemo(() => {
    if (contractGroups.length === 0) return 'no_fills'
    return contractGroups.some(g => Math.abs(g.netQty) > 0) ? 'open' : 'closed'
  }, [contractGroups])

  const endDateDisplay = useMemo(() => {
    if (positionStatus !== 'open') return null
    let latest = ''
    for (const g of contractGroups) {
      if (Math.abs(g.netQty) > 0 && g.expiry > latest) latest = g.expiry
    }
    if (latest.length >= 8) return `${latest.slice(0, 4)}-${latest.slice(4, 6)}-${latest.slice(6, 8)}`
    return null
  }, [contractGroups, positionStatus])

  const loading = perfLoading || execLoading

  return (
    <div className={cn('h-full overflow-y-auto', embedded && 'bg-background')}>
      {!embedded && (
        <div className="sticky top-0 bg-background z-10 border-b px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold">Instance #{instanceId}</span>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className={cn('px-4 py-3 space-y-5', embedded && 'pt-3')}>
        {/* ─── Overview + PnL grid ─── */}
        <div className="grid grid-cols-[0.9fr_2.1fr] gap-4">
          {/* Overview */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-semibold">Overview</h3>
              <Badge variant="outline" className={cn('text-[9px] font-semibold px-1.5 py-0',
                positionStatus === 'open' ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-muted text-muted-foreground'
              )}>
                {positionStatus === 'open' ? 'Open' : positionStatus === 'closed' ? 'Closed' : 'No fills'}
              </Badge>
            </div>
            <dl className="text-[11px] space-y-1.5">
              <div><dt className="text-muted-foreground">Structure</dt><dd>{instance.strategy_structure_name ?? '—'}{instance.strategy_structure_id ? ` (${instance.strategy_structure_id})` : ''}</dd></div>
              <div><dt className="text-muted-foreground">Open → End</dt><dd>{fmtDate(instance.opened_at)} → {endDateDisplay ?? '—'}</dd></div>
              <div><dt className="text-muted-foreground">Type</dt><dd>{instance.strategy_structure_name ? <span style={structureChipStyle(instance.strategy_structure_name, false)}>{instance.strategy_structure_name}</span> : '—'}</dd></div>
              <div><dt className="text-muted-foreground">Legs</dt><dd>{contractGroups.length > 0 ? contractGroups.map(g => `${Math.abs(g.netQty || g.sellQty)}× ${g.right === 'P' ? 'put' : 'call'} ${g.sellQty > g.buyQty ? 'short' : 'long'} ${g.right}`).join(', ') : '—'}</dd></div>
              <div><dt className="text-muted-foreground">Constraints</dt><dd className="text-muted-foreground">—</dd></div>
            </dl>
          </section>

          {/* PnL */}
          <section>
            <h3 className="text-xs font-semibold mb-2">PnL</h3>
            {loading ? <Skeleton className="h-24 w-full" /> : summary && capitalMetrics ? (
              <div className="grid grid-cols-3 gap-2">
                {/* PnL & Commission */}
                <div className="rounded border p-2 space-y-1">
                  <h4 className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">PnL & Commission</h4>
                  <div><span className="text-[9px] text-muted-foreground block">Net PnL</span><span className={cn('text-sm font-bold font-mono', pnlColor(summary.net_pnl))}>{fmtUsd(summary.net_pnl)}</span></div>
                  <div><span className="text-[9px] text-muted-foreground block">Commission</span><span className="text-xs font-mono">{fmtUsd(summary.total_commission)}</span></div>
                  <div><span className="text-[9px] text-muted-foreground block">Net PnL / Day</span><span className={cn('text-xs font-bold font-mono', pnlColor(capitalMetrics.netPnlPerDay))}>{fmtUsd(capitalMetrics.netPnlPerDay)}<span className="text-[9px] text-muted-foreground font-normal"> /day</span></span></div>
                </div>
                {/* Risk & Cost */}
                <div className="rounded border p-2 space-y-1">
                  <div className="flex items-center justify-between"><h4 className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Risk & Cost</h4><HelpCircle className="h-2.5 w-2.5 text-muted-foreground" /></div>
                  <div><span className="text-[9px] text-muted-foreground block">Risk</span><span className="text-sm font-bold font-mono">{fmtUsd(capitalMetrics.risk)}</span><span className="text-[9px] text-muted-foreground block">{capitalMetrics.riskLabel}</span></div>
                  <div><span className="text-[9px] text-muted-foreground block">Notional</span><span className="text-xs font-mono">{fmtUsd(capitalMetrics.notional)}</span></div>
                  <div><span className="text-[9px] text-muted-foreground block">Cost / Day</span><span className="text-xs font-mono">{fmtUsd(capitalMetrics.costPerDay)}<span className="text-[9px] text-muted-foreground font-normal"> /day</span></span></div>
                </div>
                {/* Times + Return */}
                <div className="rounded border p-2 space-y-1">
                  <h4 className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Times</h4>
                  <div><span className="text-[9px] text-muted-foreground block">Trades</span><span className="text-sm font-bold font-mono">{summary.trade_count ?? 0}</span></div>
                  <div><span className="text-[9px] text-muted-foreground block">Hold</span><span className="text-xs font-mono">{capitalMetrics.holdDays} d</span></div>
                  <Separator className="my-0.5" />
                  <div><span className="text-[9px] text-muted-foreground block">Return %</span><span className={cn('text-xs font-bold font-mono', pnlColor(capitalMetrics.returnPct))}>{fmtPct(capitalMetrics.returnPct)}</span></div>
                  <div><span className="text-[9px] text-muted-foreground block">Annual</span><span className={cn('text-xs font-bold font-mono', pnlColor(capitalMetrics.annualPct))}>{fmtPct(capitalMetrics.annualPct)}</span></div>
                </div>
              </div>
            ) : <p className="text-[11px] text-muted-foreground italic">No performance data.</p>}
          </section>
        </div>

        <Separator />

        {/* ─── Executions ─── */}
        <section>
          <h3 className="text-xs font-semibold mb-2">Executions</h3>
          <Tabs value={execTab} onValueChange={setExecTab}>
            <TabsList className="h-7"><TabsTrigger value="performance_book" className="text-[11px]">Performance book</TabsTrigger><TabsTrigger value="tws_raw" className="text-[11px]">TWS client</TabsTrigger></TabsList>
            <TabsContent value="performance_book" className="mt-2">
              <p className="text-[10px] text-muted-foreground mb-2">Final book: contract buy/sell match; fill-level rows follow each contract.</p>
              {execLoading ? <Skeleton className="h-20 w-full" /> : contractGroups.length === 0 ? <p className="text-[11px] text-muted-foreground italic">No executions.</p> : (
                <div className="space-y-3">
                  {contractGroups.map((g, gi) => (
                    <div key={gi} className="rounded border overflow-hidden text-[11px]">
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-1 p-2 bg-muted/20">
                        <div className="text-green-500 font-semibold"><div>BUY</div><div className="font-mono font-normal text-foreground mt-0.5">Qty {g.buyQty}<br/>Avg {g.buyAvg.toFixed(2)}<br/>$ {fmtUsd(g.buyTotal)}</div></div>
                        <div className="text-center"><div className="font-medium font-mono underline">{g.symbol} {g.expiry.length >= 8 ? `${g.expiry.slice(0,4)}${g.expiry.slice(4,6)}${g.expiry.slice(6,8)}` : g.expiry} {g.strike} {g.right}</div><div className="mt-0.5 flex items-center justify-center gap-1">Net {g.netQty} <Badge variant="outline" className={cn('text-[8px] px-1', g.netQty === 0 ? '' : 'border-green-500 text-green-500')}>{g.netQty === 0 ? 'Flat' : 'Open'}</Badge></div></div>
                        <div className="text-right text-red-500 font-semibold"><div>SELL</div><div className="font-mono font-normal text-foreground mt-0.5">Qty {g.sellQty}<br/>Avg {g.sellAvg.toFixed(2)}<br/>$ {fmtUsd(g.sellTotal)}<br/><span className="text-muted-foreground">Comm {fmtUsd(-(g.sellComm + g.buyComm))}</span></div></div>
                      </div>
                      {/* Group PnL */}
                      <div className="border-t px-2 py-1 bg-muted/10 flex items-center justify-end gap-3 text-[10px]">
                        <span className="text-muted-foreground">Gross {fmtUsd(g.sellTotal - g.buyTotal)}</span>
                        <span className="text-muted-foreground">Comm {fmtUsd(-(g.sellComm + g.buyComm))}</span>
                        <span className={cn('font-semibold', pnlColor(g.groupPnl))}>Net {fmtUsd(g.groupPnl)}</span>
                      </div>
                      {/* Fill rows */}
                      <div className="grid grid-cols-2 border-t divide-x divide-border text-[10px]">
                        <div>
                          <div className="px-2 py-0.5 bg-green-500/5 text-green-600 dark:text-green-400 font-semibold uppercase">Buy fills ({g.fills.filter(f => isBuySide(f.side)).length})</div>
                          {g.fills.filter(f => isBuySide(f.side)).map((f, fi) => (
                            <div key={fi} className="grid grid-cols-4 px-2 py-0.5 border-t border-border/30 font-mono">
                              <span>{fmtDateShort(f.trade_date)}</span><span className="text-right">{Math.abs(f.quantity)}</span><span className="text-right">{f.price.toFixed(2)}</span><span className="text-right text-muted-foreground">{fmtUsd(-f.commission)}</span>
                            </div>
                          ))}
                          {g.fills.filter(f => isBuySide(f.side)).length === 0 && <div className="px-2 py-0.5 text-muted-foreground italic">—</div>}
                        </div>
                        <div>
                          <div className="px-2 py-0.5 bg-red-500/5 text-red-500 font-semibold uppercase">Sell fills ({g.fills.filter(f => isSellSide(f.side)).length})</div>
                          {g.fills.filter(f => isSellSide(f.side)).map((f, fi) => (
                            <div key={fi} className="grid grid-cols-4 px-2 py-0.5 border-t border-border/30 font-mono">
                              <span>{fmtDateShort(f.trade_date)}</span><span className="text-right">{Math.abs(f.quantity)}</span><span className="text-right">{f.price.toFixed(2)}</span><span className="text-right text-muted-foreground">{fmtUsd(-f.commission)}</span>
                            </div>
                          ))}
                          {g.fills.filter(f => isSellSide(f.side)).length === 0 && <div className="px-2 py-0.5 text-muted-foreground italic">—</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="tws_raw" className="mt-2"><p className="text-[10px] text-muted-foreground">TWS client raw executions.</p></TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  )
}
