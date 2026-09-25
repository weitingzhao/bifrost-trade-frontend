import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { updateExecution } from '@/api/trading'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  ExpandToggleCell,
  NestedDenseTable,
  DenseLinkButton,
  DenseTag,
  denseTable,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import {
  fmtUsd,
  fmtDate,
  fmtDaysAgo,
  daysUntilExpiry,
  unrealizedPnlColorClass,
} from '@/utils/positions'
import {
  computeOptionLiveAvgPerShareFromExecutions,
  computeOptionMtmPnlUsd,
  resolveOptAvgCostPerShareForMtm,
} from '@/utils/optionLiveBasis'
import { contractButtonLabel, optionLastStrikePctClassFromQty } from '@/utils/openOptionsTab'
import {
  findMatchingFinalForTws,
  findMatchingTwsForFinal,
  shouldShowOptionExecSync,
} from '@/utils/execAttributionSync'
import { OpenOptionExecDetailRow, OpenOptionExecDetailTable } from './OpenOptionExecCompactLine'

/** Must equal the header count — an execution detail row that spans one column
 *  short pulls the table's last column out from under its own header. */
const OPTION_COL_SPAN = 17
import type { OpenOptionPosition, Execution, InstanceAllGroup } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { DetailViewMode } from './LinesToolbar'
import { scopedExecListsForPosition } from '@/utils/instanceSheetExec'
import { instancePanel } from './instancePanelClasses'
import { positionsUi } from './positionsUi'
import { localDayStamp } from '@/utils/positions'
import { LEG_GREEKS_TITLE, OptionLegGreeksCell } from './OptionLegGreeksCell'
import { buildOptionTicker, positionGreek } from '@/utils/optionTicker'
import { fmtIsoDateToken } from '@/lib/format'
import { extractUnderlyingRootSymbol } from './linkExecutionModalHelpers'
import type { PositionGreeks } from '@/hooks/useOptionGreeks'
import type { VendorGreeksRow } from '@/api/marketData/optionGreeks'

interface Props {
  group: Pick<InstanceAllGroup, 'strategy_instance_id' | 'strategy_opportunity_id'>
  options: OpenOptionPosition[]
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  /**
   * The vendor's per-share row per contract — see useOptionGreeks.
   *
   * Per share, not per position: this table draws a row per *holding*, and the
   * rollup's `byTicker` carries one holding's scaled numbers per contract.
   */
  perShareByTicker: ReadonlyMap<string, VendorGreeksRow>
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
  onOpenStrategy?: (instanceId: number) => void
  canonicalOptContractKeys?: Set<string>
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
  perShareByTicker,
  finalMap,
  twsMap,
  detailViewMode = 'accordion',
  onOpenOption,
  onEditExec,
  onLinkExec,
  onDeleteExec,
  onRefreshExecs,
  onOpenStrategy,
  canonicalOptContractKeys = new Set(),
}: Props) {
  const todayStamp = localDayStamp()
  /**
   * Positions carry the parts; the warehouse keys rows by one ticker string.
   *
   * Scaled here from the vendor's per-share row by *this* row's own signed
   * quantity, rather than read from the rollup's `byTicker`. The book flattens
   * a leg per account × strategy instance, so one contract reaches this table
   * more than once — on DEV 2026-09-22, RKLB 18DEC26 90C three times (-10 /
   * -6 / -10) and HIMS 18DEC26 40C twice (-9 / +5) — while `byTicker` holds
   * *position* greeks keyed by contract, so the last leg written wins. Every
   * row of that contract then printed one holding's numbers: the -6 RKLB row
   * showed the -10 row's θ+61, and the short HIMS row showed the long one's
   * θ-13 Δ162 — decay inverted, which is the wrong sign for the seller who has
   * to decide the leg. The per-share row is a property of the contract and
   * cannot be overwritten wrongly, so scaling from it makes a row's θ follow
   * its own Qty (`bookGreeksModel.ts` nets the same way for the same reason).
   */
  const legGreeks = (pos: OpenOptionPosition): PositionGreeks | undefined => {
    const ticker = buildOptionTicker({
      underlying: extractUnderlyingRootSymbol(pos.symbol),
      expiry: pos.expiry,
      strike: pos.strike,
      right: pos.right,
    })
    const row = ticker ? perShareByTicker.get(ticker) : undefined
    if (!row) return undefined
    return {
      delta: positionGreek(row.delta, pos.qty),
      gamma: positionGreek(row.gamma, pos.qty),
      theta: positionGreek(row.theta, pos.qty),
      vega: positionGreek(row.vega, pos.qty),
      iv: row.iv,
      asOf: row.snapshot_ts,
    }
  }

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [syncingExecId, setSyncingExecId] = useState<number | null>(null)

  const handleSyncAttribution = useCallback(
    async (target: Execution, source: Execution) => {
      const id = target.account_executions_id
      if (id == null) return
      setSyncingExecId(id)
      try {
        const res = await updateExecution(id, {
          strategy_opportunity_id: source.strategy_opportunity_id ?? null,
          strategy_instance_id: source.strategy_instance_id ?? null,
        })
        if (!res.ok) throw new Error(res.error || 'Sync failed')
        onRefreshExecs?.()
      } finally {
        setSyncingExecId(null)
      }
    },
    [onRefreshExecs],
  )

  function renderExecLine(
    pos: OpenOptionPosition,
    posKey: string,
    ex: Execution,
    ei: number,
    book: 'final' | 'tws',
    scopedFinal: Execution[],
    scopedTws: Execution[],
  ) {
    const crossBookMatch =
      book === 'final'
        ? findMatchingTwsForFinal(ex, scopedTws)
        : findMatchingFinalForTws(ex, scopedFinal)
    const showSync = shouldShowOptionExecSync({
      book,
      exec: ex,
      crossBookMatch,
      canonicalOptContractKeys,
    })
    const execId = ex.account_executions_id

    return (
      <OpenOptionExecDetailRow
        key={`${posKey}-${book === 'final' ? 'f' : 't'}-${execId ?? ei}`}
        pos={pos}
        exec={ex}
        book={book}
        onEdit={onEditExec ?? (() => {})}
        onLink={ex => onLinkExec?.(ex, [...scopedFinal, ...scopedTws])}
        onDelete={onDeleteExec ?? (() => {})}
        onOpenStrategy={onOpenStrategy}
        showSync={showSync}
        syncBusy={execId != null && syncingExecId === execId}
        onSync={
          showSync && crossBookMatch
            ? () => void handleSyncAttribution(ex, crossBookMatch)
            : undefined
        }
      />
    )
  }

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
    <section className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={positionsUi.cap}>Options ({options.length})</span>
        <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">
          Pool = which backing pool the leg draws on · Attr = attribution result
        </span>
      </div>
      <div className="overflow-x-auto border mat-card">
        {/* §14.6: fourteen columns plus expand and actions — above the design's 1160 floor. */}
        <NestedDenseTable tableClassName="min-w-[1240px] table-fixed">
          <colgroup>
            <col style={{ width: '2rem' }} />
            <col style={{ width: '9rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '5rem' }} />
            <col style={{ width: '5.5rem' }} />
            <col style={{ width: '4.5rem' }} />
            <col style={{ width: '4.5rem' }} />
            <col style={{ width: '5.5rem' }} />
            <col style={{ width: '5rem' }} />
            <col style={{ width: '6.5rem' }} />
            <col style={{ width: '7rem' }} />
            <col style={{ width: '3.5rem' }} />
            <col style={{ width: '5rem' }} />
            <col style={{ width: '7rem' }} />
            <col style={{ width: '5.5rem' }} />
            <col style={{ width: '4rem' }} />
            <col style={{ width: '3.5rem' }} />
          </colgroup>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead className={denseTable.expandCol} aria-label="Expand" />
              <DenseTableHead>Contract</DenseTableHead>
              <DenseTableHead>Expiry</DenseTableHead>
              <DenseTableHead align="right">Strike</DenseTableHead>
              <DenseTableHead align="right">Last</DenseTableHead>
              <DenseTableHead>Qty</DenseTableHead>
              <DenseTableHead align="right">@</DenseTableHead>
              <DenseTableHead align="right">Value</DenseTableHead>
              <DenseTableHead title="Option live bid / mid / ask">Opt Quote</DenseTableHead>
              <DenseTableHead align="right" title={LEG_GREEKS_TITLE}>
                IV · θ/day
              </DenseTableHead>
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
              const basis = computeOptionLiveAvgPerShareFromExecutions(
                [...scopedFinalExecs, ...scopedTwsExecs],
                pos.account_id,
                pos.contract_key,
                pos.qty,
              )
              const avgPerShare = resolveOptAvgCostPerShareForMtm(pos, basis)
              const value = avgPerShare != null ? avgPerShare * absQty * 100 : 0

              const optQuote = quotesByCk[pos.contract_key]
              const liveMid = optQuoteMid(optQuote)
              const livePnl =
                liveMid != null && avgPerShare != null
                  ? computeOptionMtmPnlUsd(liveMid, avgPerShare, pos.qty)
                  : null
              const execCount = scopedFinalExecs.length + scopedTwsExecs.length
              const hasExecs = execCount > 0

              const latestExecTime = [...scopedFinalExecs, ...scopedTwsExecs].reduce<number | null>(
                (best, e) => {
                  if (e.time == null) return best
                  return best == null || e.time > best ? e.time : best
                },
                null,
              )

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
                  <DenseTableCell className={denseTable.expandColCell}>
                    {hasExecs ? (
                      <ExpandToggleCell expanded={isExpanded} onToggle={() => toggleExpand(key)} />
                    ) : null}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableEntityCell}>
                    {onOpenOption ? (
                      <span onClick={(e) => e.stopPropagation()}>
                        <DenseLinkButton
                          variant="option"
                          label={contractButtonLabel(pos)}
                          ariaLabel={`Option details for ${contractButtonLabel(pos)}`}
                          onClick={() => onOpenOption(pos)}
                          className={denseTableEntityLink}
                        />
                      </span>
                    ) : (
                      <strong className={cn(denseTableEntityLink, 'font-mono')}>
                        {contractButtonLabel(pos)}
                      </strong>
                    )}
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="font-mono">{fmtIsoDateToken(pos.expiry)}</div>
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
                          'text-dense-meta font-semibold',
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
                  <DenseTableCell className={denseTableNumCell}>{fmtUsd(avgPerShare)}</DenseTableCell>
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
                  <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
                    <OptionLegGreeksCell
                      greeks={legGreeks(pos)}
                      today={todayStamp}
                    />
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
                        <span className={cn('ml-1 text-dense-meta font-normal', denseTable.mutedMeta)}>
                          live
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'font-semibold',
                        unrealizedPnlColorClass(pos.unrealized_pnl),
                        livePnl != null && 'text-dense-meta font-normal',
                      )}
                    >
                      {fmtUsd(pos.unrealized_pnl)}
                      {livePnl != null && (
                        <span className={cn('ml-1 text-dense-meta', denseTable.mutedMeta)}>
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

              const execDetailRow =
                isExpanded && hasExecs ? (
                  <DenseTableRow key={`${key}-execs`} className={instancePanel.subExecRow}>
                    <DenseTableCell
                      colSpan={OPTION_COL_SPAN}
                      className="max-w-none overflow-visible p-0 align-top"
                    >
                      <div className="border-t border-border/50 bg-muted/15 px-1 py-0.5">
                        <OpenOptionExecDetailTable>
                          {scopedFinalExecs.map((ex, ei) =>
                            renderExecLine(pos, key, ex, ei, 'final', scopedFinalExecs, scopedTwsExecs),
                          )}
                          {scopedTwsExecs.map((ex, ei) =>
                            renderExecLine(pos, key, ex, ei, 'tws', scopedFinalExecs, scopedTwsExecs),
                          )}
                        </OpenOptionExecDetailTable>
                      </div>
                    </DenseTableCell>
                  </DenseTableRow>
                ) : null

              return execDetailRow ? [posRow, execDetailRow] : [posRow]
            })}
          </DenseTableBody>
        </NestedDenseTable>
      </div>
    </section>
  )
}
