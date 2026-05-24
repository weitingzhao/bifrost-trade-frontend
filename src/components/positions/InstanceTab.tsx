import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { fmtUsd, fmtExpiry, rightLabel, pnlColorClass } from '@/utils/positions'
import { formatRiskLabel } from '@/utils/riskProfile'
import { ExecutionRow } from './ExecutionRow'
import type { InstanceAllGroup, Execution } from '@/types/positions'
import type { QuoteItem } from '@/types/market'

interface Props {
  groups: InstanceAllGroup[]
  quotesBySymbol: Record<string, QuoteItem>
  filterSymbol?: string
  executionsFinal?: Execution[]
  executionsTws?: Execution[]
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution) => void
  onDeleteExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
}

function colorClass(n: number | null | undefined) {
  return pnlColorClass(n)
}

export function InstanceTab({
  groups,
  quotesBySymbol,
  filterSymbol,
  executionsFinal = [],
  executionsTws = [],
  onEditExec,
  onLinkExec,
  onDeleteExec,
  onRefreshExecs,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number | null>>(new Set())

  const filtered = filterSymbol
    ? groups.filter((g) =>
        g.options.some((o) => o.symbol.includes(filterSymbol.toUpperCase()))
      )
    : groups

  if (filtered.length === 0) {
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

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Strategy Instances</p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Instance</TableHead>
              <TableHead>Opportunity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Options</TableHead>
              <TableHead className="text-right">Unrealized PnL</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((group) => {
              const id = group.strategy_instance_id
              const isExpanded = expandedIds.has(id)
              const riskLabel = group.risk_profile
                ? formatRiskLabel(group.risk_profile)
                : '—'

              return [
                <TableRow
                  key={`inst-${id}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(id)}
                >
                  <TableCell className="px-2">
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">
                    {group.strategy_instance_label ?? 'Unassigned'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {group.strategy_opportunity_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {group.structure_type ? (
                      <Badge variant="secondary" className="text-xs">{group.structure_type}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {group.options.length}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(group.options_unrealized_pnl))}>
                    {fmtUsd(group.options_unrealized_pnl)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {riskLabel}
                  </TableCell>
                </TableRow>,

                ...(isExpanded
                  ? [
                      <TableRow key={`inst-detail-${id}`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={7} className="p-3">
                          <div className="rounded border bg-card p-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                              Option Contracts
                            </p>
                            <div className="space-y-1">
                              {group.options.map((opt, i) => {
                                const spot = quotesBySymbol[opt.symbol]?.last ?? null
                                return (
                                  <div key={opt.contract_key || i} className="flex items-center gap-3 text-xs">
                                    <span className="font-mono font-medium w-12">{opt.symbol}</span>
                                    <span className="w-8">{rightLabel(opt.right)}</span>
                                    <span className="font-mono w-16">{fmtExpiry(opt.expiry)}</span>
                                    <span className="font-mono w-14 text-right">{fmtUsd(opt.strike)}</span>
                                    <span className="font-mono w-8 text-right">{opt.qty}</span>
                                    <span className="font-mono w-16 text-right">{fmtUsd(opt.mark_price)}</span>
                                    <span className={cn('font-mono w-16 text-right font-semibold', colorClass(opt.unrealized_pnl))}>
                                      {fmtUsd(opt.unrealized_pnl)}
                                    </span>
                                    {spot != null && (
                                      <span className="text-muted-foreground">
                                        spot {fmtUsd(spot)}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            {(executionsFinal.length > 0 || executionsTws.length > 0) && group.options.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                  Executions
                                </p>
                                {group.options.map((opt) => {
                                  const finalForOpt = executionsFinal.filter(
                                    (e) => e.contract_key === opt.contract_key && e.account_id === opt.account_id && e.sec_type?.toUpperCase() === 'OPT'
                                  )
                                  const twsForOpt = executionsTws.filter(
                                    (e) => e.contract_key === opt.contract_key && e.account_id === opt.account_id && e.sec_type?.toUpperCase() === 'OPT'
                                  )
                                  if (finalForOpt.length === 0 && twsForOpt.length === 0) return null
                                  return (
                                    <div key={opt.contract_key} className="mb-2">
                                      <p className="text-[10px] text-muted-foreground font-mono mb-1">
                                        {opt.symbol} {rightLabel(opt.right)} {fmtExpiry(opt.expiry)} {fmtUsd(opt.strike)}
                                      </p>
                                      <ExecutionRow
                                        finalExecs={finalForOpt}
                                        twsExecs={twsForOpt}
                                        onEdit={onEditExec ?? (() => {})}
                                        onLink={onLinkExec ?? (() => {})}
                                        onDelete={onDeleteExec ?? (() => {})}
                                        onRefresh={onRefreshExecs ?? (() => {})}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            {group.stock_coverage.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                  Stock Coverage
                                </p>
                                {group.stock_coverage.map((sc, i) => (
                                  <div key={i} className="flex items-center gap-3 text-xs">
                                    <span className="font-mono font-medium">{sc.symbol}</span>
                                    <span className="text-muted-foreground">
                                      {sc.direction} {sc.required_shares} shares
                                    </span>
                                    <span className="text-muted-foreground font-mono">{sc.account_id}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {group.risk_profile && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                  Risk Profile
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Max Gain: </span>
                                    <span className={cn('font-mono font-semibold', colorClass(group.risk_profile.max_gain))}>
                                      {group.risk_profile.max_gain != null ? fmtUsd(group.risk_profile.max_gain) : '∞'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Max Loss: </span>
                                    <span className={cn('font-mono font-semibold', colorClass(group.risk_profile.max_loss))}>
                                      {group.risk_profile.max_loss != null ? fmtUsd(group.risk_profile.max_loss) : '∞'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Breakeven: </span>
                                    <span className="font-mono">
                                      {group.risk_profile.breakeven_points.length > 0
                                        ? group.risk_profile.breakeven_points.map((b) => fmtUsd(b)).join(', ')
                                        : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>,
                    ]
                  : []),
              ]
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
