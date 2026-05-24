import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { fmtUsd, fmtExpiry, rightLabel, fmtDate, fmtDaysAgo, daysUntilExpiry, pnlColorClass } from '@/utils/positions'
import { ExecutionRow } from './ExecutionRow'
import type { OpenOptionPosition, Execution } from '@/types/positions'
import type { QuoteItem } from '@/types/market'

interface Props {
  options: OpenOptionPosition[]
  quotesBySymbol: Record<string, QuoteItem>
  executionsFinal: Execution[]
  executionsTws: Execution[]
  onOpenOption?: (contractKey: string) => void
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution) => void
  onDeleteExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
}

function lastStrikePctClass(right: string, qty: number, pct: number): string {
  if (pct === 0 || (right !== 'C' && right !== 'P')) return ''
  const isSell = qty < 0
  const positive = pct > 0
  if (right === 'C') {
    return isSell ? (positive ? 'text-red-600' : 'text-green-600') : (positive ? 'text-green-600' : 'text-red-600')
  }
  return isSell ? (positive ? 'text-green-600' : 'text-red-600') : (positive ? 'text-red-600' : 'text-green-600')
}

function matchExecs(contractKey: string, accountId: string, execs: Execution[]): Execution[] {
  return execs.filter((e) =>
    e.contract_key === contractKey && e.account_id === accountId && e.sec_type?.toUpperCase() === 'OPT'
  )
}

export function InstanceOptionSubTable({
  options,
  quotesBySymbol,
  executionsFinal,
  executionsTws,
  onOpenOption,
  onEditExec,
  onLinkExec,
  onDeleteExec,
  onRefreshExecs,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  if (options.length === 0) return null

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Options ({options.length})
      </p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead>Contract</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Strike</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead className="text-right">@</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Opt Quote</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">UN PNL</TableHead>
              <TableHead>Pool</TableHead>
              <TableHead>Attr</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Opp</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.map((pos) => {
              const key = pos.contract_key || `${pos.symbol}-${pos.expiry}-${pos.strike}-${pos.right}`
              const isExpanded = expandedKeys.has(key)
              const absQty = Math.abs(pos.qty)
              const sideLabel = pos.qty > 0 ? 'Long' : pos.qty < 0 ? 'Short' : '—'
              const value = (pos.avg_cost ?? 0) * absQty * 100

              const underlying = pos.symbol
              const quote = quotesBySymbol[underlying]
              const spot = quote?.last ?? null
              const strikeNum = pos.strike
              const lastStrikePct = spot != null && strikeNum != null && spot !== 0
                ? ((spot - strikeNum) / spot) * 100
                : null
              const pctClass = lastStrikePct != null ? lastStrikePctClass(pos.right, pos.qty, lastStrikePct) : ''

              const dte = daysUntilExpiry(pos.expiry)
              const dteLabel = dte != null ? (dte >= 0 ? (dte === 0 ? 'today' : `${dte}d`) : `${-dte}d ago`) : null

              const finalExecs = matchExecs(pos.contract_key, pos.account_id, executionsFinal)
              const twsExecs = matchExecs(pos.contract_key, pos.account_id, executionsTws)
              const execCount = finalExecs.length + twsExecs.length
              const hasExecs = execCount > 0

              const latestExecTime = [...finalExecs, ...twsExecs]
                .reduce<number | null>((best, e) => {
                  if (e.time == null) return best
                  return best == null || e.time > best ? e.time : best
                }, null)

              return [
                <TableRow
                  key={key}
                  className={cn(hasExecs && 'cursor-pointer hover:bg-muted/50')}
                  onClick={hasExecs ? () => toggleExpand(key) : undefined}
                >
                  <TableCell className="px-1">
                    {hasExecs && (
                      <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                    )}
                  </TableCell>
                  <TableCell>
                    {onOpenOption ? (
                      <button
                        type="button"
                        className="font-mono text-xs font-medium text-primary hover:underline"
                        onClick={(e) => { e.stopPropagation(); onOpenOption(pos.contract_key) }}
                      >
                        <strong>{pos.symbol}</strong> {rightLabel(pos.right)}
                      </button>
                    ) : (
                      <span className="font-mono text-xs font-medium">
                        <strong>{pos.symbol}</strong> {rightLabel(pos.right)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-mono">{fmtExpiry(pos.expiry)}</div>
                    {dteLabel && <div className="text-[10px] text-muted-foreground">{dteLabel}</div>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{fmtUsd(pos.strike)}</TableCell>
                  <TableCell className="text-right text-xs">
                    <div className="font-mono">{spot != null ? fmtUsd(spot) : '—'}</div>
                    {lastStrikePct != null && (
                      <div className={cn('text-[10px] font-mono font-semibold', pctClass)}>
                        {lastStrikePct >= 0 ? '+' : ''}{lastStrikePct.toFixed(2)}%
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{sideLabel} {absQty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(pos.avg_cost)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(value)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {quote ? (
                      <div className="leading-tight">
                        <span>{quote.bid != null ? quote.bid.toFixed(2) : '—'}</span>
                        {' / '}
                        <strong>{quote.bid != null && quote.ask != null ? ((quote.bid + quote.ask) / 2).toFixed(2) : '—'}</strong>
                        {' / '}
                        <span>{quote.ask != null ? quote.ask.toFixed(2) : '—'}</span>
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {latestExecTime != null ? (
                      <>
                        <div className="font-mono">{fmtDate(latestExecTime)}</div>
                        {fmtDaysAgo(latestExecTime) && (
                          <div className="text-[10px] text-muted-foreground">{fmtDaysAgo(latestExecTime)}</div>
                        )}
                      </>
                    ) : '—'}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', pnlColorClass(pos.unrealized_pnl))}>
                    {fmtUsd(pos.unrealized_pnl)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={pos.pool_label === 'Off' ? 'secondary' : 'default'} className="text-[10px]">
                      {pos.pool_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {pos.attribution_type === 'single' ? (
                      <Badge variant="default" className="text-[10px]">Single</Badge>
                    ) : pos.attribution_type === 'mixed' ? (
                      <Badge variant="secondary" className="text-[10px] border-yellow-500 text-yellow-600">Mixed</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{pos.account_id || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {hasExecs ? <span>{execCount} exec{execCount > 1 ? 's' : ''}</span> : '—'}
                  </TableCell>
                  <TableCell />
                </TableRow>,

                ...(isExpanded && hasExecs ? [
                  <TableRow key={`${key}-execs`} className="bg-muted/10 hover:bg-muted/10">
                    <TableCell colSpan={16} className="p-2">
                      <ExecutionRow
                        finalExecs={finalExecs}
                        twsExecs={twsExecs}
                        onEdit={onEditExec ?? (() => {})}
                        onLink={onLinkExec ?? (() => {})}
                        onDelete={onDeleteExec ?? (() => {})}
                        onRefresh={onRefreshExecs ?? (() => {})}
                        showPoolOff={pos.pool_label === 'Off'}
                      />
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
