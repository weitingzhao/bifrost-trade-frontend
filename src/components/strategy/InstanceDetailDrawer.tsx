import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

// ── PnL computation from executions ──────────────────────────────────────────

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
        symbol,
        strike,
        expiry,
        right,
        buyQty: 0, buyAvg: 0, buyTotal: 0, buyComm: 0,
        sellQty: 0, sellAvg: 0, sellTotal: 0, sellComm: 0,
        netQty: 0, groupPnl: 0,
        fills: [],
      })
    }

    const g = map.get(key)!
    g.fills.push(e)
    const qty = Math.abs(e.quantity)
    const premium = e.price * qty * 100
    const comm = Math.abs(e.commission ?? 0)

    if (isBuySide(e.side)) {
      g.buyQty += qty
      g.buyTotal += premium
      g.buyComm += comm
    } else {
      g.sellQty += qty
      g.sellTotal += premium
      g.sellComm += comm
    }
  }

  for (const g of map.values()) {
    g.buyAvg = g.buyQty > 0 ? g.buyTotal / (g.buyQty * 100) : 0
    g.sellAvg = g.sellQty > 0 ? g.sellTotal / (g.sellQty * 100) : 0
    g.netQty = g.buyQty - g.sellQty
    g.groupPnl = g.sellTotal - g.buyTotal - g.buyComm - g.sellComm
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol)
    if (a.expiry !== b.expiry) return a.expiry.localeCompare(b.expiry)
    return a.strike - b.strike
  })
}

interface RiskProfileData {
  riskType: 'defined' | 'undefined'
  maxGain: number | null
  maxLoss: number | null
  netPremium: number
  breakeven: number | null
  maxGainSpot: number | null
  maxLossSpot: number | null
}

function computeSimpleRiskProfile(groups: ContractGroup[]): RiskProfileData | null {
  if (groups.length === 0) return null

  let netPremium = 0
  const positions: { strike: number; right: string; qty: number }[] = []

  for (const g of groups) {
    netPremium += g.sellTotal - g.buyTotal - g.sellComm - g.buyComm
    const netQty = g.sellQty - g.buyQty
    if (Math.abs(netQty) > 0) {
      positions.push({ strike: g.strike, right: g.right, qty: netQty })
    }
  }

  if (positions.length === 0) return null

  const allPuts = positions.every(p => p.right === 'P')
  const allCalls = positions.every(p => p.right === 'C')
  const allShort = positions.every(p => p.qty > 0)

  const maxGain: number | null = netPremium > 0 ? netPremium : null
  let maxLoss: number | null = null
  let breakeven: number | null = null
  let riskType: 'defined' | 'undefined' = 'undefined'
  let maxGainSpot: number | null = null
  let maxLossSpot: number | null = null

  if (allPuts && allShort && positions.length === 1) {
    const p = positions[0]
    maxLoss = -(p.strike * Math.abs(p.qty) * 100 - Math.abs(netPremium))
    breakeven = p.strike - Math.abs(netPremium) / (Math.abs(p.qty) * 100)
    riskType = 'defined'
    maxGainSpot = p.strike + 10
    maxLossSpot = 0
  } else if (allCalls && allShort && positions.length === 1) {
    riskType = 'undefined'
    maxLossSpot = null
    maxGainSpot = positions[0].strike
  } else {
    const strikes = positions.map(p => p.strike)
    const minStrike = Math.min(...strikes)
    const maxStrike = Math.max(...strikes)
    if (positions.length >= 2) {
      const width = maxStrike - minStrike
      maxLoss = -(width * 100 * Math.abs(positions[0].qty) - Math.abs(netPremium))
      riskType = 'defined'
      maxGainSpot = maxStrike + 10
      maxLossSpot = minStrike > 0 ? 0 : maxStrike + width
    }
  }

  if (breakeven != null && breakeven < 0) breakeven = null

  return { riskType, maxGain, maxLoss, netPremium, breakeven, maxGainSpot, maxLossSpot }
}

// ── Capital at Risk ──────────────────────────────────────────────────────────

interface CapitalMetrics {
  risk: number
  riskLabel: string
  maxLoss: number | null
  notional: number
  costPerDay: number | null
  netPnlPerDay: number | null
  holdDays: number
  returnPct: number | null
  annualPct: number | null
}

function computeCapitalMetrics(
  executions: RawExecution[],
  summary: PerformanceSummary,
  openedAtEpoch: number | null,
  structureName: string | null,
): CapitalMetrics {
  const netPnl = summary.net_pnl

  let notional = 0
  let cashSecured = 0
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    if (!isSellSide(e.side)) continue
    const strike = e.strike ?? 0
    const qty = Math.abs(e.quantity)
    if (strike <= 0 || qty <= 0) continue
    notional += strike * qty * 100
    const right = (e.option_right ?? '').toUpperCase().charAt(0)
    if (right === 'P') cashSecured += strike * qty * 100
  }

  const stLower = (structureName ?? '').toLowerCase()
  let risk: number
  let riskLabel: string

  if (stLower.includes('cash secured') || stLower.includes('cash_secured')) {
    risk = cashSecured > 0 ? cashSecured : notional
    riskLabel = cashSecured > 0 ? 'Cash secured' : 'Underlying notional'
  } else {
    risk = notional
    riskLabel = 'Underlying notional'
  }

  const holdDays = openedAtEpoch != null
    ? Math.max(1, Math.floor((Date.now() / 1000 - openedAtEpoch) / 86400))
    : 1

  const netPnlPerDay = holdDays > 0 ? netPnl / holdDays : null
  const costPerDay = risk > 0 && holdDays > 0 ? risk / holdDays : null
  const returnPct = risk > 0 ? (netPnl / risk) * 100 : null
  const annualPct = risk > 0 ? (netPnl / risk) * (365.25 / holdDays) * 100 : null

  const groups = buildContractGroups(executions)
  const rp = computeSimpleRiskProfile(groups)
  const maxLoss = rp?.maxLoss ?? null

  return { risk, riskLabel, maxLoss, notional, costPerDay, netPnlPerDay, holdDays, returnPct, annualPct }
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  instance: StrategyInstance | null
  open: boolean
  onClose: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function InstanceDetailDrawer({ instance, open, onClose }: Props) {
  const instanceId = instance?.strategy_instance_id ?? 0
  const [execTab, setExecTab] = useState<string>('performance_book')

  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['instance-detail-perf', instanceId],
    queryFn: () => fetchInstancePerformance(instanceId),
    enabled: open && instanceId > 0,
    staleTime: 60_000,
  })

  const { data: execData, isLoading: execLoading } = useQuery({
    queryKey: ['instance-detail-execs', instanceId],
    queryFn: () => fetchInstanceExecutions(instanceId),
    enabled: open && instanceId > 0,
    staleTime: 60_000,
  })

  const { data: oppData } = useQuery({
    queryKey: ['instance-detail-opp', instance?.strategy_opportunity_id],
    queryFn: () => fetchOpportunityDetail(instance!.strategy_opportunity_id),
    enabled: open && instance?.strategy_opportunity_id != null,
    staleTime: 120_000,
  })

  const summary = perfData?.summary ?? null
  const executions = useMemo(() => execData?.executions ?? [], [execData])

  const contractGroups = useMemo(() => buildContractGroups(executions), [executions])
  const riskProfile = useMemo(() => computeSimpleRiskProfile(contractGroups), [contractGroups])

  const capitalMetrics = useMemo(() => {
    if (!summary) return null
    return computeCapitalMetrics(
      executions,
      summary,
      instance?.opened_at_epoch ?? null,
      instance?.strategy_structure_name ?? null,
    )
  }, [executions, summary, instance?.opened_at_epoch, instance?.strategy_structure_name])

  const positionStatus = useMemo(() => {
    if (contractGroups.length === 0) return 'no_fills'
    for (const g of contractGroups) {
      if (Math.abs(g.netQty) > 0) return 'open'
    }
    return 'closed'
  }, [contractGroups])

  const endDateDisplay = useMemo(() => {
    if (positionStatus === 'open') {
      let latestExpiry = ''
      for (const g of contractGroups) {
        if (Math.abs(g.netQty) > 0 && g.expiry > latestExpiry) latestExpiry = g.expiry
      }
      if (latestExpiry.length >= 8) {
        return `${latestExpiry.slice(0, 4)}-${latestExpiry.slice(4, 6)}-${latestExpiry.slice(6, 8)}`
      }
    }
    return null
  }, [contractGroups, positionStatus])

  // Structure info from opportunity
  const structureInfo = useMemo(() => {
    if (!oppData) return null
    return {
      name: instance?.strategy_structure_name ?? oppData.structure_name ?? '—',
      structureId: instance?.strategy_structure_id,
    }
  }, [oppData, instance])

  const loading = perfLoading || execLoading

  if (!instance) return null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-[960px] sm:max-w-[960px] overflow-y-auto p-0" side="right">
        {/* Header */}
        <SheetHeader className="px-5 pt-4 pb-3 sticky top-0 bg-background z-10 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              Instance #{instanceId}
            </SheetTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-6">
          {/* ─── Main Grid: Overview + PnL ─── */}
          <div className="grid grid-cols-[1fr_2fr] gap-5">
            {/* Overview (left) */}
            <section className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold">Overview</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-semibold',
                    positionStatus === 'open' ? 'border-green-500 text-green-500 bg-green-500/10' :
                    positionStatus === 'closed' ? 'border-muted text-muted-foreground' :
                    'border-muted text-muted-foreground',
                  )}
                >
                  {positionStatus === 'open' ? 'Open' : positionStatus === 'closed' ? 'Closed' : 'No fills'}
                </Badge>
              </div>

              <dl className="text-xs space-y-2">
                <div>
                  <dt className="text-muted-foreground font-medium">Structure</dt>
                  <dd className="mt-0.5">
                    {structureInfo?.name ?? instance.strategy_structure_name ?? '—'}
                    {structureInfo?.structureId && (
                      <span className="text-muted-foreground"> ({structureInfo.structureId})</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Open → End</dt>
                  <dd className="mt-0.5">
                    {fmtDate(instance.opened_at)}
                    <span className="text-muted-foreground"> → </span>
                    {endDateDisplay ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Type</dt>
                  <dd className="mt-0.5">
                    {instance.strategy_structure_name && (
                      <span style={structureChipStyle(instance.strategy_structure_name, false)}>
                        {instance.strategy_structure_name}
                      </span>
                    )}
                    {!instance.strategy_structure_name && '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Legs</dt>
                  <dd className="mt-0.5">
                    {contractGroups.length > 0
                      ? contractGroups.map(g => {
                          const dir = g.sellQty > g.buyQty ? 'short' : 'long'
                          return `${Math.abs(g.netQty)}× ${g.right === 'P' ? 'put' : 'call'} ${dir} ${g.right}`
                        }).join(', ')
                      : '—'
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Constraints</dt>
                  <dd className="mt-0.5 text-muted-foreground">—</dd>
                </div>
              </dl>
            </section>

            {/* PnL (right) */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">PnL</h3>

              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : summary && capitalMetrics ? (
                <div className="grid grid-cols-3 gap-3">
                  {/* Band 1: PnL & Commission */}
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">PnL & Commission</h4>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Net PnL</span>
                        <span className={cn('text-lg font-bold font-mono', pnlColor(summary.net_pnl))}>
                          {fmtUsd(summary.net_pnl)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Commission</span>
                        <span className="text-sm font-mono">{fmtUsd(summary.total_commission)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Net PnL / Day</span>
                        <span className={cn('text-sm font-bold font-mono', pnlColor(capitalMetrics.netPnlPerDay))}>
                          {fmtUsd(capitalMetrics.netPnlPerDay)}
                          <span className="text-[10px] text-muted-foreground font-normal"> /day</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Band 2: Risk & Cost */}
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Risk & Cost</h4>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Risk</span>
                        <span className="text-lg font-bold font-mono">{fmtUsd(capitalMetrics.risk)}</span>
                        <span className="text-[10px] text-muted-foreground block">{capitalMetrics.riskLabel}</span>
                      </div>
                      {capitalMetrics.maxLoss != null && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase">Max Loss</span>
                          <span className="text-sm font-mono">{fmtUsd(Math.abs(capitalMetrics.maxLoss))}</span>
                          <span className="text-[10px] text-muted-foreground"> at exp.</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Notional</span>
                        <span className="text-sm font-mono">{fmtUsd(capitalMetrics.notional)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Cost / Day</span>
                        <span className="text-sm font-mono">
                          {fmtUsd(capitalMetrics.costPerDay)}
                          <span className="text-[10px] text-muted-foreground font-normal"> /day</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Band 3: Times + Return */}
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Times</h4>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Trades</span>
                        <span className="text-lg font-bold font-mono">{summary.trade_count ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Hold</span>
                        <span className="text-sm font-mono">{capitalMetrics.holdDays} d</span>
                      </div>
                    </div>
                    <Separator className="my-1" />
                    <h4 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Return</h4>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Return %</span>
                        <span className={cn('text-sm font-bold font-mono', pnlColor(capitalMetrics.returnPct))}>
                          {fmtPct(capitalMetrics.returnPct)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Annual</span>
                        <span className={cn('text-sm font-bold font-mono', pnlColor(capitalMetrics.annualPct))}>
                          {fmtPct(capitalMetrics.annualPct)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No performance data.</p>
              )}
            </section>
          </div>

          <Separator />

          {/* ─── Risk Profile (at expiration) ─── */}
          {riskProfile && (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Risk profile (at expiration)</h3>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="text-muted-foreground">Risk Type</span>
                  <Badge
                    variant={riskProfile.riskType === 'defined' ? 'default' : 'destructive'}
                    className="text-[10px] font-semibold"
                  >
                    {riskProfile.riskType === 'defined' ? 'Defined' : 'Undefined'}
                  </Badge>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">Net Premium</span>
                  <span className="font-mono font-medium">{fmtUsd(riskProfile.netPremium)}</span>
                  {riskProfile.breakeven != null && (
                    <>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground">Breakeven</span>
                      <span className="font-mono font-medium">${riskProfile.breakeven.toFixed(2)}</span>
                    </>
                  )}
                </div>

                {/* Scenario P&L table */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="px-3 py-1.5 bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    Scenario P&L (expiration, sampled)
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-t bg-muted/20">
                        <th className="text-left p-2 font-medium">Scenario</th>
                        <th className="text-right p-2 font-medium">Spot</th>
                        <th className="text-right p-2 font-medium">Option</th>
                        <th className="text-right p-2 font-medium">Stk</th>
                        <th className="text-right p-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2 text-green-500 font-semibold">MAX GAIN</td>
                        <td className="text-right p-2 font-mono">{riskProfile.maxGainSpot?.toFixed(2) ?? '—'}</td>
                        <td className={cn('text-right p-2 font-mono', pnlColor(riskProfile.maxGain))}>
                          {fmtUsd(riskProfile.maxGain)}
                        </td>
                        <td className="text-right p-2 font-mono text-muted-foreground">$0.00</td>
                        <td className={cn('text-right p-2 font-mono font-medium', pnlColor(riskProfile.maxGain))}>
                          {fmtUsd(riskProfile.maxGain)}
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-2 text-red-500 font-semibold">MAX LOSS</td>
                        <td className="text-right p-2 font-mono">{riskProfile.maxLossSpot?.toFixed(2) ?? '—'}</td>
                        <td className={cn('text-right p-2 font-mono', pnlColor(riskProfile.maxLoss))}>
                          {fmtUsd(riskProfile.maxLoss)}
                        </td>
                        <td className="text-right p-2 font-mono text-muted-foreground">$0.00</td>
                        <td className={cn('text-right p-2 font-mono font-medium', pnlColor(riskProfile.maxLoss))}>
                          {fmtUsd(riskProfile.maxLoss)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* ─── Executions ─── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Executions</h3>

            <Tabs value={execTab} onValueChange={setExecTab}>
              <TabsList className="h-8">
                <TabsTrigger value="performance_book" className="text-xs">Performance book</TabsTrigger>
                <TabsTrigger value="tws_raw" className="text-xs">TWS client</TabsTrigger>
              </TabsList>

              <TabsContent value="performance_book" className="mt-3 space-y-0">
                <p className="text-[11px] text-muted-foreground mb-3">
                  Final book: contract buy/sell match; fill-level rows follow each contract.
                </p>

                {execLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : contractGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No executions.</p>
                ) : (
                  <div className="space-y-4">
                    {contractGroups.map((g, gi) => (
                      <div key={gi} className="rounded-lg border overflow-hidden">
                        {/* Contract header */}
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 p-3 bg-muted/20 text-xs">
                          <div className="text-green-500 font-semibold">
                            <div>BUY</div>
                            <div className="mt-1 space-y-0.5 font-mono font-normal text-foreground">
                              <div>Qty {g.buyQty}</div>
                              <div>Avg {g.buyAvg.toFixed(2)}</div>
                              <div>$ {fmtUsd(g.buyTotal)}</div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-foreground">
                              <span className="font-mono underline cursor-pointer">
                                {g.contractKey.length > 30 ? `${g.symbol} ${g.expiry.slice(0,4)}-${g.expiry.slice(4,6)}-${g.expiry.slice(6,8)} ${g.strike} ${g.right}` : g.contractKey}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-center gap-1.5">
                              <span>Net {g.netQty >= 0 ? g.netQty : g.netQty}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[9px]',
                                  g.netQty === 0 ? 'border-muted text-muted-foreground' : 'border-green-500 text-green-500',
                                )}
                              >
                                {g.netQty === 0 ? 'Flat' : 'Open'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right text-red-500 font-semibold">
                            <div>SELL</div>
                            <div className="mt-1 space-y-0.5 font-mono font-normal text-foreground">
                              <div>Qty {g.sellQty}</div>
                              <div>Avg {g.sellAvg.toFixed(2)}</div>
                              <div>$ {fmtUsd(g.sellTotal)}</div>
                              <div className="text-muted-foreground">Comm {fmtUsd(-(g.sellComm + g.buyComm))}</div>
                            </div>
                          </div>
                        </div>

                        {/* Fill-level rows */}
                        {g.fills.length > 0 && (
                          <div className="grid grid-cols-2 text-[11px] border-t">
                            {/* Buy fills */}
                            <div className="border-r">
                              <div className="px-2 py-1 bg-green-500/5 text-green-600 dark:text-green-400 font-semibold uppercase text-[10px]">
                                Buy fills ({g.fills.filter(f => isBuySide(f.side)).length})
                              </div>
                              <table className="w-full">
                                <thead>
                                  <tr className="text-[10px] text-muted-foreground">
                                    <th className="text-left px-2 py-0.5">Date</th>
                                    <th className="text-right px-2 py-0.5">Qty</th>
                                    <th className="text-right px-2 py-0.5">Price</th>
                                    <th className="text-right px-2 py-0.5">Comm</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.fills.filter(f => isBuySide(f.side)).map((f, fi) => (
                                    <tr key={fi} className="border-t border-border/30">
                                      <td className="px-2 py-0.5">{fmtDateShort(f.trade_date)}</td>
                                      <td className="text-right px-2 py-0.5 font-mono">{Math.abs(f.quantity)}</td>
                                      <td className="text-right px-2 py-0.5 font-mono">{f.price.toFixed(2)}</td>
                                      <td className="text-right px-2 py-0.5 font-mono text-muted-foreground">{fmtUsd(-f.commission)}</td>
                                    </tr>
                                  ))}
                                  {g.fills.filter(f => isBuySide(f.side)).length === 0 && (
                                    <tr><td colSpan={4} className="px-2 py-1 text-muted-foreground italic">—</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            {/* Sell fills */}
                            <div>
                              <div className="px-2 py-1 bg-red-500/5 text-red-500 font-semibold uppercase text-[10px]">
                                Sell fills ({g.fills.filter(f => isSellSide(f.side)).length})
                              </div>
                              <table className="w-full">
                                <thead>
                                  <tr className="text-[10px] text-muted-foreground">
                                    <th className="text-left px-2 py-0.5">Date</th>
                                    <th className="text-right px-2 py-0.5">Qty</th>
                                    <th className="text-right px-2 py-0.5">Price</th>
                                    <th className="text-right px-2 py-0.5">Comm</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.fills.filter(f => isSellSide(f.side)).map((f, fi) => (
                                    <tr key={fi} className="border-t border-border/30">
                                      <td className="px-2 py-0.5">{fmtDateShort(f.trade_date)}</td>
                                      <td className="text-right px-2 py-0.5 font-mono">{Math.abs(f.quantity)}</td>
                                      <td className="text-right px-2 py-0.5 font-mono">{f.price.toFixed(2)}</td>
                                      <td className="text-right px-2 py-0.5 font-mono text-muted-foreground">{fmtUsd(-f.commission)}</td>
                                    </tr>
                                  ))}
                                  {g.fills.filter(f => isSellSide(f.side)).length === 0 && (
                                    <tr><td colSpan={4} className="px-2 py-1 text-muted-foreground italic">—</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tws_raw" className="mt-3">
                <p className="text-[11px] text-muted-foreground">
                  TWS client raw executions — same source, unprocessed.
                </p>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
