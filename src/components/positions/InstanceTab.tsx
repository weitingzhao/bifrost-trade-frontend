import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  ExpandToggleCell,
  GrandTotalRow,
  InlinePnl,
  DenseTag,
  DenseTagButton,
  denseTableNumCell,
} from '@/components/data-display'
import { RiskProfileDetail } from './RiskProfileDetail'
import type { DetailViewMode } from './PositionsOpenControls'
import { fmtUsd, fmtDate, fmtDaysAgo } from '@/utils/positions'
import { InstanceOptionSubTable } from './InstanceOptionSubTable'
import { InstanceCoverageSubTable } from './InstanceCoverageSubTable'
import type {
  InstanceAllGroup,
  Execution,
  LivePositionRow,
  StrategyOpportunity,
  OpenOptionPosition,
} from '@/types/positions'
import type { QuoteItem, DailyBenchmark } from '@/types/market'
import { buildLiveOptExecutionMap } from '@/utils/positionsExecutions'
import { formatRiskDisplayLabels } from '@/utils/riskProfile'
import {
  formatInstanceOptExecQtyCell,
  instanceDefaultAccountForStockInspect,
  instanceGroupKey,
} from '@/utils/instanceSheetExec'
import { instancePanel } from './instancePanelClasses'

const EXEC_QTY_TITLE =
  'Per option: execution quantities (comma-separated). Uses Final book only when at least one matching Final exists; otherwise TWS. Multiple option lines separated by |.'

const COL_SPAN = 11

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
  onLinkExec?: (exec: Execution, sameContractTrades?: Execution[]) => void
  onDeleteExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
  onOpenStrategy?: (instanceId: number) => void
  onOpenStock?: (symbol: string, accountId: string) => void
  onOpenOption?: (position: OpenOptionPosition) => void
}

function coverageBadge(
  coverage: InstanceAllGroup['stock_coverage'],
  liveStocks: LivePositionRow[],
) {
  if (coverage.length === 0) return <span className="text-muted-foreground text-xs">—</span>
  let allCovered = true
  let anyNaked = false
  for (const sc of coverage) {
    const held = liveStocks
      .filter(
        (s) =>
          (s.symbol ?? '').toUpperCase() === sc.symbol.toUpperCase() &&
          s.account_id === sc.account_id,
      )
      .reduce((sum, s) => sum + Math.abs(s.position ?? 0), 0)
    if (held >= sc.required_shares) continue
    allCovered = false
    if (held === 0) anyNaked = true
  }
  if (allCovered) return <DenseTag variant="success" size="cell">Covered</DenseTag>
  if (anyNaked) return <DenseTag variant="danger" size="cell">Naked</DenseTag>
  return <DenseTag variant="warning" size="cell">Partial</DenseTag>
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
      <div className={instancePanel.tableWrap}>
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
    <div className={instancePanel.tableWrap}>
      <DenseDataTable tableClassName="min-w-[68rem] table-fixed">
        <colgroup>
          <col style={{ width: '2rem' }} />
          <col style={{ width: '17rem' }} />
          <col style={{ width: '9.5rem' }} />
          <col style={{ width: '7.5rem' }} />
          <col style={{ width: '6.75rem' }} />
          <col style={{ width: '8rem' }} />
          <col style={{ width: '6.5rem' }} />
          <col style={{ width: '7.5rem' }} />
          <col style={{ width: '7.5rem' }} />
          <col style={{ width: '8.25rem' }} />
          <col style={{ width: '5.75rem' }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="w-7" aria-label="Expand" />
            <DenseTableHead title="Opportunity">Opp</DenseTableHead>
            <DenseTableHead>Contract Type</DenseTableHead>
            <DenseTableHead>Symbols</DenseTableHead>
            <DenseTableHead>Opened</DenseTableHead>
            <DenseTableHead title={EXEC_QTY_TITLE}>Exec Qty</DenseTableHead>
            <DenseTableHead>Underlying</DenseTableHead>
            <DenseTableHead align="right">Opt PNL</DenseTableHead>
            <DenseTableHead align="right">Max Gain</DenseTableHead>
            <DenseTableHead align="right">Max Loss</DenseTableHead>
            <DenseTableHead>Risk</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {groups.flatMap((group) => {
            const instKey = instanceGroupKey(group)
            const id = group.strategy_instance_id
            const isExpanded = expandedKeys.has(instKey)
            const instLabel =
              group.strategy_instance_label ?? (id != null ? `Strategy #${id}` : 'Uncategorized')
            const oppName = group.strategy_opportunity_name?.trim() || null
            const structLabel = group.structure_type
              ? group.structure_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : '—'

            const opp =
              group.strategy_opportunity_id != null
                ? oppMap.get(group.strategy_opportunity_id)
                : undefined
            const scopeType = group.scope_type
            const scopeSymbols = opp?.symbols?.length ? opp.symbols : []
            const defaultStockAcct = instanceDefaultAccountForStockInspect(group)
            const optExecQty = formatInstanceOptExecQtyCell(group, finalMap, twsMap)
            const optN = group.options.length
            const rp = group.risk_profile
            const rl = rp ? formatRiskDisplayLabels(rp) : null

            const mainRow = (
              <DenseTableRow
                key={`inst-${instKey}`}
                className={cn(
                  instancePanel.sheetRow,
                  isExpanded && instancePanel.sheetRowExpanded,
                )}
                onClick={() => toggleExpand(instKey)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleExpand(instKey)
                  }
                }}
              >
                <DenseTableCell className="px-2">
                  <ExpandToggleCell expanded={isExpanded} onToggle={() => toggleExpand(instKey)} />
                </DenseTableCell>
                <DenseTableCell className={cn('text-xs', instancePanel.oppCell)}>
                  {id != null ? (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {oppName ? (
                        <span className={instancePanel.oppPrimary}>{oppName}</span>
                      ) : null}
                      {onOpenStrategy ? (
                        <button
                          type="button"
                          className={instancePanel.oppSecondary}
                          title={`View strategy instance: ${instLabel}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenStrategy(id)
                          }}
                        >
                          {instLabel}
                        </button>
                      ) : (
                        <span className={instancePanel.oppSecondary}>{instLabel}</span>
                      )}
                    </div>
                  ) : (
                    <span className={instancePanel.oppPrimary}>{oppName || instLabel}</span>
                  )}
                </DenseTableCell>
                <DenseTableCell className={cn('text-xs', instancePanel.contractTypeCell)}>
                  {group.structure_type ? (
                    <DenseTag variant="neutral" size="cell" className="max-w-full whitespace-normal leading-snug">
                      {structLabel}
                    </DenseTag>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
                <DenseTableCell className="text-xs">
                  {scopeType === 'watchlist_stk' ? (
                    <DenseTag variant="info" size="cell">
                      Watchlist
                    </DenseTag>
                  ) : scopeSymbols.length > 0 ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {scopeSymbols.map(sym =>
                        onOpenStock ? (
                          <DenseTagButton
                            key={sym}
                            variant="symbol"
                            size="cell"
                            className="font-mono"
                            title={`Open ${sym}`}
                            onClick={e => {
                              e.stopPropagation()
                              onOpenStock(sym, defaultStockAcct)
                            }}
                          >
                            {sym}
                          </DenseTagButton>
                        ) : (
                          <DenseTag key={sym} variant="symbol" size="cell" className="font-mono">
                            {sym}
                          </DenseTag>
                        ),
                      )}
                    </span>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
                <DenseTableCell className="text-xs">
                  {group.strategy_instance_opened_at_epoch != null ? (
                    <>
                      <div>{fmtDate(group.strategy_instance_opened_at_epoch)}</div>
                      {fmtDaysAgo(group.strategy_instance_opened_at_epoch) && (
                        <div className="text-[10px] text-muted-foreground">
                          {fmtDaysAgo(group.strategy_instance_opened_at_epoch)}
                        </div>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
                <DenseTableCell
                  className={cn(
                    'font-mono text-xs text-muted-foreground',
                    instancePanel.execQtyCell,
                  )}
                  title={EXEC_QTY_TITLE}
                >
                  {optN > 0 ? optExecQty : '—'}
                </DenseTableCell>
                <DenseTableCell>{coverageBadge(group.stock_coverage, liveStocks)}</DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'text-xs font-semibold')}>
                  {optN > 0 ? (
                    <InlinePnl value={group.options_unrealized_pnl}>
                      {fmtUsd(group.options_unrealized_pnl)}
                    </InlinePnl>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
                  {rl ? (
                    <InlinePnl value={rp?.max_gain}>
                      <span>{rl.gainLabel}</span>
                    </InlinePnl>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
                  {rl ? (
                    <span
                      className={
                        rl.lossLabel === 'Unlimited'
                          ? 'text-red-600 dark:text-red-400'
                          : undefined
                      }
                    >
                      <InlinePnl value={rp?.max_loss}>
                        <span>{rl.lossLabel}</span>
                      </InlinePnl>
                    </span>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
                <DenseTableCell className="text-xs">
                  {rl ? (
                    <DenseTag
                      variant={rp!.risk_type === 'defined' ? 'success' : 'danger'}
                      size="cell"
                    >
                      {rl.riskBadge}
                    </DenseTag>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
              </DenseTableRow>
            )

            const detailRow = isExpanded ? (
              <DenseTableRow
                key={`inst-detail-${instKey}`}
                className={instancePanel.detailRow}
              >
                <DenseTableCell colSpan={COL_SPAN} className={instancePanel.detailCell}>
                  <div className={instancePanel.detailStack}>
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
                    {rp && <RiskProfileDetail profile={rp} />}
                  </div>
                </DenseTableCell>
              </DenseTableRow>
            ) : null

            return detailRow ? [mainRow, detailRow] : [mainRow]
          })}
          <GrandTotalRow
            labelColSpan={7}
            label={`Total (${groups.length} ${groups.length === 1 ? 'strategy' : 'strategies'})`}
          >
            <DenseTableCell className={cn(denseTableNumCell, 'text-xs font-semibold')}>
              <InlinePnl value={totalOptPnl}>{fmtUsd(totalOptPnl)}</InlinePnl>
            </DenseTableCell>
            <DenseTableCell colSpan={3} />
          </GrandTotalRow>
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
