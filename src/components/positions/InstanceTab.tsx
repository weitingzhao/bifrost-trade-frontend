import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { fmtUsd, fmtDate, fmtDaysAgo, pnlColorClass } from '@/utils/positions'
import { InstanceOptionSubTable } from './InstanceOptionSubTable'
import { InstanceCoverageSubTable } from './InstanceCoverageSubTable'
import type { InstanceAllGroup, Execution, LivePositionRow, StrategyOpportunity } from '@/types/positions'
import type { QuoteItem, DailyBenchmark } from '@/types/market'

interface Props {
  groups: InstanceAllGroup[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  liveStocks: LivePositionRow[]
  executionsFinal: Execution[]
  executionsTws: Execution[]
  opportunities: StrategyOpportunity[]
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution) => void
  onDeleteExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
  onOpenStrategy?: (instanceId: number) => void
  onOpenStock?: (symbol: string, accountId: string) => void
  onOpenOption?: (contractKey: string) => void
}

function coverageBadge(coverage: InstanceAllGroup['stock_coverage'], liveStocks: LivePositionRow[]) {
  if (coverage.length === 0) return <span className="text-muted-foreground text-xs">—</span>
  let allCovered = true
  let anyNaked = false
  for (const sc of coverage) {
    const held = liveStocks
      .filter((s) => (s.symbol ?? '').toUpperCase() === sc.symbol.toUpperCase() && s.account_id === sc.account_id)
      .reduce((sum, s) => sum + Math.abs(s.position ?? 0), 0)
    if (held >= sc.required_shares) continue
    allCovered = false
    if (held === 0) anyNaked = true
  }
  if (allCovered) return <Badge variant="default" className="text-[10px]">Covered</Badge>
  if (anyNaked) return <Badge variant="destructive" className="text-[10px]">Naked</Badge>
  return <Badge variant="secondary" className="text-[10px] border-yellow-500 text-yellow-600">Partial</Badge>
}

function execQtySummary(options: InstanceAllGroup['options'], execsFinal: Execution[]): string {
  const parts: string[] = []
  for (const opt of options) {
    const matched = execsFinal.filter(
      (e) => e.contract_key === opt.contract_key && e.account_id === opt.account_id && e.sec_type?.toUpperCase() === 'OPT'
    )
    if (matched.length === 0) { parts.push('—'); continue }
    const qtys = matched.map((e) => String(e.qty))
    parts.push(qtys.join(','))
  }
  return parts.join(' | ') || '—'
}

export function InstanceTab({
  groups,
  quotesBySymbol,
  benchBySymbol,
  liveStocks,
  executionsFinal,
  executionsTws,
  opportunities,
  onEditExec,
  onLinkExec,
  onDeleteExec,
  onRefreshExecs,
  onOpenStrategy,
  onOpenStock,
  onOpenOption,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number | null>>(new Set())

  if (groups.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">Strategy Instances</p>
        <p className="text-sm text-muted-foreground">No strategy instance positions found.</p>
      </div>
    )
  }

  function toggleExpand(id: number | null) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const oppMap = new Map(opportunities.map((o) => [o.strategy_opportunity_id, o]))

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-7" />
              <TableHead>Opp / Instance</TableHead>
              <TableHead>Contract Type</TableHead>
              <TableHead>Symbols</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Exec Qty</TableHead>
              <TableHead>Underlying</TableHead>
              <TableHead className="text-right">Opt PNL</TableHead>
              <TableHead className="text-right">Max Gain</TableHead>
              <TableHead className="text-right">Max Loss</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => {
              const id = group.strategy_instance_id
              const isExpanded = expandedIds.has(id)
              const firstOpt = group.options[0]
              const unlinkedLabel = firstOpt
                ? `${firstOpt.symbol ?? '?'} ${firstOpt.right === 'C' ? 'Call' : firstOpt.right === 'P' ? 'Put' : ''} ${firstOpt.strike ?? ''} (unlinked)`.trim()
                : 'Unlinked'
              const instLabel = group.strategy_instance_label ?? (id != null ? `Strategy #${id}` : unlinkedLabel)
              const oppName = group.strategy_opportunity_name ?? null
              const structLabel = group.structure_type
                ? group.structure_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                : '—'

              const opp = group.strategy_opportunity_id != null ? oppMap.get(group.strategy_opportunity_id) : undefined
              const scopeType = group.scope_type
              const scopeSymbols = opp?.symbols?.length ? opp.symbols : []

              const rp = group.risk_profile

              return [
                <TableRow
                  key={`inst-${id}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(id)}
                >
                  <TableCell className="px-2">
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="space-y-0.5">
                      {oppName && <div className="text-muted-foreground">{oppName}</div>}
                      {id != null && onOpenStrategy ? (
                        <button
                          type="button"
                          className="font-mono font-medium text-primary hover:underline"
                          onClick={(e) => { e.stopPropagation(); onOpenStrategy(id) }}
                        >
                          {instLabel}
                        </button>
                      ) : (
                        <span className="font-mono font-medium">{instLabel}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {group.structure_type ? (
                      <Badge variant="secondary" className="text-[10px]">{structLabel}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {scopeType === 'watchlist_stk' ? (
                      <Badge variant="secondary" className="text-[10px]">Watchlist</Badge>
                    ) : scopeSymbols.length > 0 ? (
                      <span className="space-x-1">
                        {scopeSymbols.map((sym) => (
                          onOpenStock ? (
                            <button
                              key={sym}
                              type="button"
                              className="font-mono text-primary hover:underline"
                              onClick={(e) => { e.stopPropagation(); onOpenStock(sym, group.options[0]?.account_id ?? '') }}
                            >
                              {sym}
                            </button>
                          ) : (
                            <span key={sym} className="font-mono">{sym}</span>
                          )
                        ))}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {group.strategy_instance_opened_at_epoch != null ? (
                      <>
                        <div>{fmtDate(group.strategy_instance_opened_at_epoch)}</div>
                        {fmtDaysAgo(group.strategy_instance_opened_at_epoch) && (
                          <div className="text-[10px] text-muted-foreground">{fmtDaysAgo(group.strategy_instance_opened_at_epoch)}</div>
                        )}
                      </>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[100px] truncate">
                    {execQtySummary(group.options, executionsFinal)}
                  </TableCell>
                  <TableCell>{coverageBadge(group.stock_coverage, liveStocks)}</TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', pnlColorClass(group.options_unrealized_pnl))}>
                    {fmtUsd(group.options_unrealized_pnl)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', pnlColorClass(rp?.max_gain))}>
                    {rp?.max_gain != null ? fmtUsd(rp.max_gain) : '—'}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', pnlColorClass(rp?.max_loss))}>
                    {rp?.max_loss != null ? fmtUsd(rp.max_loss) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {rp ? (
                      <Badge
                        variant={rp.risk_type === 'defined' ? 'default' : 'destructive'}
                        className="text-[10px]"
                      >
                        {rp.risk_type === 'defined' ? 'Defined' : 'Unlimited'}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                </TableRow>,

                ...(isExpanded ? [
                  <TableRow key={`inst-detail-${id}`} className="bg-muted/10 hover:bg-muted/10">
                    <TableCell colSpan={11} className="p-3">
                      <InstanceOptionSubTable
                        options={group.options}
                        quotesBySymbol={quotesBySymbol}
                        executionsFinal={executionsFinal}
                        executionsTws={executionsTws}
                        onOpenOption={onOpenOption}
                        onEditExec={onEditExec}
                        onLinkExec={onLinkExec}
                        onDeleteExec={onDeleteExec}
                        onRefreshExecs={onRefreshExecs}
                      />
                      <InstanceCoverageSubTable
                        coverage={group.stock_coverage}
                        liveStocks={liveStocks}
                        quotesBySymbol={quotesBySymbol}
                        benchBySymbol={benchBySymbol}
                        onOpenStock={onOpenStock}
                      />
                      {rp && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Risk Profile</p>
                          <div className="grid grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Max Gain: </span>
                              <span className={cn('font-mono font-semibold', pnlColorClass(rp.max_gain))}>
                                {rp.max_gain != null ? fmtUsd(rp.max_gain) : '∞'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Loss: </span>
                              <span className={cn('font-mono font-semibold', pnlColorClass(rp.max_loss))}>
                                {rp.max_loss != null ? fmtUsd(rp.max_loss) : '∞'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Risk: </span>
                              <Badge variant={rp.risk_type === 'defined' ? 'default' : 'destructive'} className="text-[10px]">
                                {rp.risk_type === 'defined' ? 'Defined' : rp.risk_type === 'unlimited' ? 'Unlimited' : 'Unknown'}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Breakeven: </span>
                              <span className="font-mono">
                                {rp.breakeven_points.length > 0 ? rp.breakeven_points.map((b) => fmtUsd(b)).join(', ') : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>,
                ] : []),
              ]
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
