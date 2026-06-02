import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  ExpandToggleCell,
  NestedDenseTable,
  DenseTag,
  DenseTagButton,
  denseTable,
  denseTableNumCell,
} from '@/components/data-display'
import {
  fmtUsd,
  fmtExpiry,
  rightLabel,
  fmtDate,
  fmtDaysAgo,
  daysUntilExpiry,
  unrealizedPnlColorClass,
} from '@/utils/positions'
import { optionLastStrikePctClassFromQty } from '@/utils/openOptionsTab'
import { ExecutionRow } from './ExecutionRow'
import type { OpenOptionPosition, Execution, InstanceAllGroup } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { DetailViewMode } from './PositionsOpenControls'
import { scopedExecListsForPosition } from '@/utils/instanceSheetExec'
import { instancePanel } from './instancePanelClasses'

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
  onOpenOption?: (position: OpenOptionPosition) => void
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution, sameContractTrades?: Execution[]) => void
  onDeleteExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
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
    <section className={instancePanel.subSection}>
      <h4 className={instancePanel.subHeading}>Options ({options.length})</h4>
      <div className={instancePanel.subTableWrap}>
        <NestedDenseTable>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead className="w-6" aria-label="Expand" />
              <DenseTableHead>Contract</DenseTableHead>
              <DenseTableHead>Expiry</DenseTableHead>
              <DenseTableHead align="right">Strike</DenseTableHead>
              <DenseTableHead align="right">Last</DenseTableHead>
              <DenseTableHead>Qty</DenseTableHead>
              <DenseTableHead align="right">@</DenseTableHead>
              <DenseTableHead align="right">Value</DenseTableHead>
              <DenseTableHead title="Option live bid / mid / ask">Opt Quote</DenseTableHead>
              <DenseTableHead>Time</DenseTableHead>
              <DenseTableHead align="right">UN PNL</DenseTableHead>
              <DenseTableHead>Pool</DenseTableHead>
              <DenseTableHead>Attr</DenseTableHead>
              <DenseTableHead>Account</DenseTableHead>
              <DenseTableHead title="Opportunity">Opp</DenseTableHead>
              <DenseTableHead className="w-8" />
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {options.flatMap((pos) => {
              const key =
                pos.contract_key ||
                `${pos.symbol}-${pos.expiry}-${pos.strike}-${pos.right}-${pos.account_id}`
              const isExpanded = expandedKeys.has(key)
              const absQty = Math.abs(pos.qty)
              const sideLabel = pos.qty > 0 ? 'Long' : pos.qty < 0 ? 'Short' : '—'
              const value = (pos.avg_cost ?? 0) * absQty * 100

              const underlying = pos.symbol
              const stkQuote = quotesBySymbol[underlying?.toUpperCase() ?? '']
              const spot = stkQuote?.last ?? null
              const strikeNum = pos.strike
              const lastStrikePct =
                spot != null && strikeNum != null && spot !== 0
                  ? ((spot - strikeNum) / spot) * 100
                  : null
              const pctClass =
                lastStrikePct != null
                  ? optionLastStrikePctClassFromQty(pos.right, pos.qty, lastStrikePct)
                  : ''

              const dte = daysUntilExpiry(pos.expiry)
              const dteLabel =
                dte != null ? (dte >= 0 ? (dte === 0 ? 'today' : `${dte}d`) : `${-dte}d ago`) : null

              const { final: scopedFinalExecs, tws: scopedTwsExecs } = scopedExecListsForPosition(
                pos,
                group,
                finalMap,
                twsMap,
              )
              const execCount = scopedFinalExecs.length + scopedTwsExecs.length
              const hasExecs = execCount > 0

              const latestExecTime = [...scopedFinalExecs, ...scopedTwsExecs].reduce<number | null>(
                (best, e) => {
                  if (e.time == null) return best
                  return best == null || e.time > best ? e.time : best
                },
                null,
              )

              const optQuote = quotesByCk[pos.contract_key]
              const liveMid = optQuoteMid(optQuote)
              const livePnl =
                liveMid != null && pos.avg_cost != null
                  ? (liveMid - pos.avg_cost) * absQty * 100
                  : null

              const posRow = (
                <DenseTableRow
                  key={key}
                  className={cn(hasExecs && 'cursor-pointer')}
                  onClick={hasExecs ? () => toggleExpand(key) : undefined}
                  role={hasExecs ? 'button' : undefined}
                  tabIndex={hasExecs ? 0 : undefined}
                  onKeyDown={
                    hasExecs
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleExpand(key)
                          }
                        }
                      : undefined
                  }
                  aria-expanded={hasExecs ? isExpanded : undefined}
                >
                  <DenseTableCell className="w-6 px-1">
                    {hasExecs ? (
                      <ExpandToggleCell expanded={isExpanded} onToggle={() => toggleExpand(key)} />
                    ) : null}
                  </DenseTableCell>
                  <DenseTableCell>
                    {onOpenOption ? (
                      <DenseTagButton
                        variant="symbol"
                        size="cell"
                        className="font-mono text-left whitespace-normal leading-snug"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenOption(pos)
                        }}
                      >
                        <strong>{pos.symbol}</strong> {rightLabel(pos.right)}
                        {pos.strike != null ? ` ${pos.strike}` : ''}
                      </DenseTagButton>
                    ) : (
                      <DenseTag variant="symbol" size="cell" className="font-mono whitespace-normal">
                        <strong>{pos.symbol}</strong> {rightLabel(pos.right)}
                        {pos.strike != null ? ` ${pos.strike}` : ''}
                      </DenseTag>
                    )}
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="font-mono">{fmtExpiry(pos.expiry)}</div>
                    {dteLabel && (
                      <div className={instancePanel.subExpiryDte}>{dteLabel}</div>
                    )}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
                    {fmtUsd(pos.strike)}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    <div>{spot != null ? fmtUsd(spot) : '—'}</div>
                    {lastStrikePct != null && (
                      <div
                        className={cn(
                          'text-[length:var(--text-dense-meta)] font-semibold',
                          pctClass,
                        )}
                      >
                        {lastStrikePct >= 0 ? '+' : ''}
                        {lastStrikePct.toFixed(2)}%
                      </div>
                    )}
                  </DenseTableCell>
                  <DenseTableCell>
                    {sideLabel} {absQty}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtUsd(pos.avg_cost)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtUsd(value)}</DenseTableCell>
                  <DenseTableCell className={denseTable.mutedMeta}>
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
                  </DenseTableCell>
                  <DenseTableCell>
                    {latestExecTime != null ? (
                      <>
                        <div className="font-mono">{fmtDate(latestExecTime)}</div>
                        {fmtDaysAgo(latestExecTime) && (
                          <div className={instancePanel.subTimeAgo}>{fmtDaysAgo(latestExecTime)}</div>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {livePnl != null && (
                      <div className={cn('font-semibold', unrealizedPnlColorClass(livePnl))}>
                        {fmtUsd(livePnl)}
                        <span className={cn('ml-1 text-[length:var(--text-dense-meta)] font-normal', denseTable.mutedMeta)}>
                          live
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'font-semibold',
                        unrealizedPnlColorClass(pos.unrealized_pnl),
                        livePnl != null && 'text-[length:var(--text-dense-meta)] font-normal',
                      )}
                    >
                      {fmtUsd(pos.unrealized_pnl)}
                      {livePnl != null && (
                        <span className={cn('ml-1 text-[length:var(--text-dense-meta)]', denseTable.mutedMeta)}>
                          snap
                        </span>
                      )}
                    </div>
                  </DenseTableCell>
                  <DenseTableCell className={instancePanel.subMutedCell}>{pos.pool_label}</DenseTableCell>
                  <DenseTableCell>
                    {pos.filtered_exec_lists ? (
                      <DenseTag
                        variant="neutral"
                        size="cell"
                        title="Fills that do not match the instance row for this contract (Uncategorized)"
                      >
                        Uncategorized
                      </DenseTag>
                    ) : pos.attribution_type === 'mixed' ? (
                      <DenseTag
                        variant="warning"
                        size="cell"
                        title={`Estimated attribution (net): ${((pos.attribution_ratio ?? 0) * 100).toFixed(0)}%`}
                      >
                        Mixed
                      </DenseTag>
                    ) : pos.attribution_type === 'single' ? (
                      <DenseTag variant="success" size="cell" title="Single instance attribution">
                        Single
                      </DenseTag>
                    ) : (
                      <span className={denseTable.mutedMeta}>—</span>
                    )}
                  </DenseTableCell>
                  <DenseTableCell className={cn('font-mono', instancePanel.subMutedCell)}>
                    {pos.account_id || '—'}
                  </DenseTableCell>
                  <DenseTableCell className={instancePanel.subMutedCell}>
                    {execCount === 0 ? (
                      '—'
                    ) : (
                      <span
                        title={`${execCount} execution${execCount > 1 ? 's' : ''} — expand row`}
                        className="inline-flex items-center gap-0.5"
                      >
                        {pos.filtered_exec_lists ? (
                          <abbr title="Uncategorized fills" className="no-underline">
                            Unct.
                          </abbr>
                        ) : null}
                        {pos.filtered_exec_lists ? ' · ' : null}
                        {execCount} exec{execCount > 1 ? 's' : ''} ↓
                      </span>
                    )}
                  </DenseTableCell>
                  <DenseTableCell />
                </DenseTableRow>
              )

              const execRow =
                isExpanded && hasExecs ? (
                  <DenseTableRow key={`${key}-execs`} className={instancePanel.subExecRow}>
                    <DenseTableCell colSpan={16} className="p-2">
                      <ExecutionRow
                        finalExecs={scopedFinalExecs}
                        twsExecs={scopedTwsExecs}
                        onEdit={onEditExec ?? (() => {})}
                        onLink={onLinkExec ?? (() => {})}
                        onDelete={onDeleteExec ?? (() => {})}
                        onRefresh={onRefreshExecs ?? (() => {})}
                        showPoolOff={pos.pool_label === 'Off'}
                      />
                    </DenseTableCell>
                  </DenseTableRow>
                ) : null

              return execRow ? [posRow, execRow] : [posRow]
            })}
          </DenseTableBody>
        </NestedDenseTable>
      </div>
    </section>
  )
}
