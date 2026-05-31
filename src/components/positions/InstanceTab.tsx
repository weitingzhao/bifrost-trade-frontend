import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RiskProfileSummary } from '@/components/RiskProfileSummary'
import type { DetailViewMode } from './PositionsOpenControls'
import { Badge } from '@/components/ui/badge'
import { fmtUsd, fmtDate, fmtDaysAgo, pnlColorClass } from '@/utils/positions'
import { InstanceOptionSubTable } from './InstanceOptionSubTable'
import { InstanceCoverageSubTable } from './InstanceCoverageSubTable'
import type { InstanceAllGroup, Execution, LivePositionRow, StrategyOpportunity } from '@/types/positions'
import type { QuoteItem, DailyBenchmark } from '@/types/market'
import { buildLiveOptExecutionMap } from '@/utils/positionsExecutions'
import { formatRiskDisplayLabels } from '@/utils/riskProfile'
import {
  formatInstanceOptExecQtyCell,
  instanceDefaultAccountForStockInspect,
  instanceGroupKey,
} from '@/utils/instanceSheetExec'

const EXEC_QTY_TITLE =
  'Per option: execution quantities (comma-separated). Uses Final book only when at least one matching Final exists; otherwise TWS. Multiple option lines separated by |.'

interface Props {
  groups: InstanceAllGroup[]
  totalInstanceCount: number
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  liveStocks: LivePositionRow[]
  executionsFinal: Execution[]
  executionsTws: Execution[]
  opportunities: StrategyOpportunity[]
  detailViewMode?: DetailViewMode
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

export function InstanceTab({
  groups,
  totalInstanceCount,
  quotesBySymbol,
  quotesByCk,
  benchBySymbol,
  liveStocks,
  executionsFinal,
  executionsTws,
  opportunities,
  detailViewMode = 'accordion',
  onEditExec,
  onLinkExec,
  onDeleteExec,
  onRefreshExecs,
  onOpenStrategy,
  onOpenStock,
  onOpenOption,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const finalMap = useMemo(() => buildLiveOptExecutionMap(executionsFinal), [executionsFinal])
  const twsMap = useMemo(() => buildLiveOptExecutionMap(executionsTws), [executionsTws])

  if (groups.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">Strategy Instances</p>
        <p className="text-sm text-muted-foreground">
          {totalInstanceCount > 0
            ? 'No strategies match the current filters.'
            : 'No strategy instance positions found.'}
        </p>
      </div>
    )
  }

  function toggleExpand(instKey: string) {
    setExpandedKeys((prev) => {
      if (detailViewMode === 'accordion') {
        if (prev.has(instKey)) return new Set()
        return new Set([instKey])
      }
      const next = new Set(prev)
      if (next.has(instKey)) next.delete(instKey)
      else next.add(instKey)
      return next
    })
  }

  const totalOptPnl = groups.reduce((s, g) => s + g.options_unrealized_pnl, 0)
  const oppMap = new Map(opportunities.map((o) => [o.strategy_opportunity_id, o]))

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-7" />
              <TableHead title="Opportunity">Opp</TableHead>
              <TableHead>Contract Type</TableHead>
              <TableHead>Symbols</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead title={EXEC_QTY_TITLE}>Exec Qty</TableHead>
              <TableHead>Underlying</TableHead>
              <TableHead className="text-right">Opt PNL</TableHead>
              <TableHead className="text-right">Max Gain</TableHead>
              <TableHead className="text-right">Max Loss</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => {
              const instKey = instanceGroupKey(group)
              const id = group.strategy_instance_id
              const isExpanded = expandedKeys.has(instKey)
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
              const defaultStockAcct = instanceDefaultAccountForStockInspect(group)
              const optExecQty = formatInstanceOptExecQtyCell(group, finalMap, twsMap)
              const optN = group.options.length
              const rp = group.risk_profile
              const rl = rp ? formatRiskDisplayLabels(rp) : null

              return [
                <TableRow
                  key={`inst-${instKey}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(instKey)}
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
                        <span className="font-mono font-medium">{oppName || instLabel}</span>
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
                        {scopeSymbols.map((sym, i) => (
                          <span key={sym}>
                            {i > 0 && <span className="text-muted-foreground">, </span>}
                            {onOpenStock ? (
                              <button
                                type="button"
                                className="font-mono text-primary hover:underline"
                                onClick={(e) => { e.stopPropagation(); onOpenStock(sym, defaultStockAcct) }}
                              >
                                {sym}
                              </button>
                            ) : (
                              <span className="font-mono">{sym}</span>
                            )}
                          </span>
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
                  <TableCell
                    className="font-mono text-xs text-muted-foreground max-w-[120px] truncate"
                    title={EXEC_QTY_TITLE}
                  >
                    {optN > 0 ? optExecQty : '—'}
                  </TableCell>
                  <TableCell>{coverageBadge(group.stock_coverage, liveStocks)}</TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', pnlColorClass(group.options_unrealized_pnl))}>
                    {optN > 0 ? fmtUsd(group.options_unrealized_pnl) : '—'}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', pnlColorClass(rp?.max_gain))}>
                    {rl ? <span>{rl.gainLabel}</span> : '—'}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', pnlColorClass(rp?.max_loss))}>
                    {rl ? (
                      <span className={rl.lossLabel === 'Unlimited' ? 'text-red-600 dark:text-red-400' : undefined}>
                        {rl.lossLabel}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {rl ? (
                      <Badge
                        variant={rp!.risk_type === 'defined' ? 'default' : 'destructive'}
                        className="text-[10px]"
                      >
                        {rl.riskBadge}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                </TableRow>,

                ...(isExpanded ? [
                  <TableRow key={`inst-detail-${instKey}`} className="bg-muted/10 hover:bg-muted/10">
                    <TableCell colSpan={11} className="p-3">
                      <InstanceOptionSubTable
                        group={group}
                        options={group.options}
                        quotesBySymbol={quotesBySymbol}
                        quotesByCk={quotesByCk}
                        executionsFinal={executionsFinal}
                        executionsTws={executionsTws}
                        finalMap={finalMap}
                        twsMap={twsMap}
                        detailViewMode={detailViewMode}
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
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Risk Profile
                          </p>
                          <RiskProfileSummary profile={rp} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>,
                ] : []),
              ]
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/30 font-medium">
              <TableCell colSpan={7} className="text-xs">
                Total ({groups.length} {groups.length === 1 ? 'strategy' : 'strategies'})
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs font-semibold', pnlColorClass(totalOptPnl))}>
                {fmtUsd(totalOptPnl)}
              </TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
