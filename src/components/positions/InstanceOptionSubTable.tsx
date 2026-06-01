import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { fmtUsd, fmtExpiry, rightLabel, fmtDate, fmtDaysAgo, daysUntilExpiry, pnlColorClass } from '@/utils/positions'
import { ExecutionRow } from './ExecutionRow'
import type { OpenOptionPosition, Execution, InstanceAllGroup } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { DetailViewMode } from './PositionsOpenControls'
import { scopedExecListsForPosition } from '@/utils/instanceSheetExec'
import sheetStyles from './InstanceStrategyPanel.module.css'

interface Props {
  group: Pick<InstanceAllGroup, 'strategy_instance_id' | 'strategy_opportunity_id'>
  options: OpenOptionPosition[]
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  executionsFinal: Execution[]
  executionsTws: Execution[]
  finalMap: Map<string, Execution[]>
  twsMap: Map<string, Execution[]>
  detailViewMode?: DetailViewMode
  onOpenOption?: (contractKey: string) => void
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution, sameContractTrades?: Execution[]) => void
  onDeleteExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
}

function lastStrikePctClass(right: string, qty: number, pct: number): string {
  if (pct === 0 || (right !== 'C' && right !== 'P')) return ''
  const isSell = qty < 0
  const positive = pct > 0
  if (right === 'C') {
    return isSell ? (positive ? 'pnl-negative' : 'pnl-positive') : (positive ? 'pnl-positive' : 'pnl-negative')
  }
  return isSell ? (positive ? 'pnl-positive' : 'pnl-negative') : (positive ? 'pnl-negative' : 'pnl-positive')
}

function optQuoteMid(quote: QuoteItem | undefined): number | null {
  if (!quote) return null
  if (quote.mid != null) return quote.mid
  if (quote.bid != null && quote.ask != null) return (quote.bid + quote.ask) / 2
  return quote.last ?? null
}

export function InstanceOptionSubTable({
  group,
  options,
  quotesBySymbol,
  quotesByCk,
  finalMap,
  twsMap,
  detailViewMode = 'accordion',
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
      if (detailViewMode === 'accordion') {
        if (prev.has(key)) return new Set()
        return new Set([key])
      }
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <section className={sheetStyles.subSection}>
      <h4 className={sheetStyles.subHeading}>Options ({options.length})</h4>
      <div className={sheetStyles.subTableWrap}>
        <Table className={sheetStyles.subTable}>
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
              <TableHead title="Option live bid / mid / ask">Opt Quote</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">UN PNL</TableHead>
              <TableHead>Pool</TableHead>
              <TableHead>Attr</TableHead>
              <TableHead>Account</TableHead>
              <TableHead title="Opportunity">Opp</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.map((pos) => {
              const key = pos.contract_key || `${pos.symbol}-${pos.expiry}-${pos.strike}-${pos.right}-${pos.account_id}`
              const isExpanded = expandedKeys.has(key)
              const absQty = Math.abs(pos.qty)
              const sideLabel = pos.qty > 0 ? 'Long' : pos.qty < 0 ? 'Short' : '—'
              const value = (pos.avg_cost ?? 0) * absQty * 100

              const underlying = pos.symbol
              const stkQuote = quotesBySymbol[underlying?.toUpperCase() ?? '']
              const spot = stkQuote?.last ?? null
              const strikeNum = pos.strike
              const lastStrikePct = spot != null && strikeNum != null && spot !== 0
                ? ((spot - strikeNum) / spot) * 100
                : null
              const pctClass = lastStrikePct != null ? lastStrikePctClass(pos.right, pos.qty, lastStrikePct) : ''

              const dte = daysUntilExpiry(pos.expiry)
              const dteLabel = dte != null ? (dte >= 0 ? (dte === 0 ? 'today' : `${dte}d`) : `${-dte}d ago`) : null

              const { final: scopedFinalExecs, tws: scopedTwsExecs } = scopedExecListsForPosition(
                pos,
                group,
                finalMap,
                twsMap,
              )
              const execCount = scopedFinalExecs.length + scopedTwsExecs.length
              const hasExecs = execCount > 0

              const latestExecTime = [...scopedFinalExecs, ...scopedTwsExecs].reduce<number | null>((best, e) => {
                if (e.time == null) return best
                return best == null || e.time > best ? e.time : best
              }, null)

              const optQuote = quotesByCk[pos.contract_key]
              const liveMid = optQuoteMid(optQuote)
              const livePnl =
                liveMid != null && pos.avg_cost != null
                  ? (liveMid - pos.avg_cost) * absQty * 100
                  : null

              return [
                <TableRow
                  key={key}
                  className={cn(sheetStyles.subDataRow, hasExecs && 'cursor-pointer')}
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
                        className={sheetStyles.subContractBtn}
                        onClick={(e) => { e.stopPropagation(); onOpenOption(pos.contract_key) }}
                      >
                        <strong>{pos.symbol}</strong> {rightLabel(pos.right)}
                        {pos.strike != null ? ` ${pos.strike}` : ''}
                      </button>
                    ) : (
                      <span className="font-mono text-xs font-medium">
                        <strong>{pos.symbol}</strong> {rightLabel(pos.right)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-mono">{fmtExpiry(pos.expiry)}</div>
                    {dteLabel && <div className={sheetStyles.subExpiryDte}>{dteLabel}</div>}
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
                    {optQuote ? (
                      <div className="leading-tight font-mono">
                        <div>{optQuote.bid != null ? optQuote.bid.toFixed(2) : '—'}</div>
                        <div className="font-semibold text-foreground">
                          {liveMid != null ? liveMid.toFixed(2) : '—'}
                        </div>
                        <div>{optQuote.ask != null ? optQuote.ask.toFixed(2) : '—'}</div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {latestExecTime != null ? (
                      <>
                        <div className="font-mono">{fmtDate(latestExecTime)}</div>
                        {fmtDaysAgo(latestExecTime) && (
                          <div className={sheetStyles.subTimeAgo}>{fmtDaysAgo(latestExecTime)}</div>
                        )}
                      </>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {livePnl != null && (
                      <div className={cn('font-mono font-semibold', pnlColorClass(livePnl))}>
                        {fmtUsd(livePnl)}
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">live</span>
                      </div>
                    )}
                    <div className={cn('font-mono font-semibold', pnlColorClass(pos.unrealized_pnl), livePnl != null && 'text-[11px] text-muted-foreground font-normal')}>
                      {fmtUsd(pos.unrealized_pnl)}
                      {livePnl != null && <span className="text-[10px] ml-1">snap</span>}
                    </div>
                  </TableCell>
                  <TableCell className={cn('text-xs', sheetStyles.subMutedCell)}>{pos.pool_label}</TableCell>
                  <TableCell className="text-xs">
                    {pos.filtered_exec_lists ? (
                      <Badge variant="secondary" className="text-[10px]" title="Fills that do not match the instance row for this contract (Uncategorized)">
                        Uncategorized
                      </Badge>
                    ) : pos.attribution_type === 'mixed' ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] border-yellow-500 text-yellow-600"
                        title={`Estimated attribution (net): ${((pos.attribution_ratio ?? 0) * 100).toFixed(0)}%`}
                      >
                        Mixed
                      </Badge>
                    ) : pos.attribution_type === 'single' ? (
                      <Badge variant="default" className="text-[10px]" title="Single instance attribution">
                        Single
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={cn('font-mono text-xs', sheetStyles.subMutedCell)}>{pos.account_id || '—'}</TableCell>
                  <TableCell className={cn('text-xs', sheetStyles.subMutedCell)}>
                    {execCount === 0 ? (
                      '—'
                    ) : (
                      <span
                        title={`${execCount} execution${execCount > 1 ? 's' : ''} — expand row`}
                        className="inline-flex items-center gap-0.5"
                      >
                        {pos.filtered_exec_lists ? (
                          <abbr title="Uncategorized fills" className="no-underline">Unct.</abbr>
                        ) : null}
                        {pos.filtered_exec_lists ? ' · ' : null}
                        {execCount} exec{execCount > 1 ? 's' : ''} ↓
                      </span>
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>,

                ...(isExpanded && hasExecs ? [
                  <TableRow key={`${key}-execs`} className={sheetStyles.subExecRow}>
                    <TableCell colSpan={16} className="p-2">
                      <ExecutionRow
                        finalExecs={scopedFinalExecs}
                        twsExecs={scopedTwsExecs}
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
    </section>
  )
}
