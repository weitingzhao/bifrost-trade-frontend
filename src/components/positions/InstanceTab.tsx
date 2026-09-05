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
  DenseLinkButton,
  DenseOptionCategoryLabel,
  DenseTag,
  denseTable,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import { RiskProfileDetail } from './RiskProfileDetail'
import type { DetailViewMode } from './LinesToolbar'
import { fmtUsd, fmtDate, fmtDaysAgo } from '@/utils/positions'
import { InstanceOptionSubTable } from './InstanceOptionSubTable'
import { InstanceCoverageSubTable } from './InstanceCoverageSubTable'
import type {
  InstanceAllGroup,
  Execution,
  LivePositionRow,
  PositionInstanceAttribution,
  StrategyOpportunity,
  OpenOptionPosition,
} from '@/types/positions'
import type { StrategyStructure } from '@/types/strategy'
import type { IbAccountSnapshot } from '@/types/monitor'
import { useInstanceTabRiskProfiles } from '@/hooks/useInstanceTabRiskProfiles'
import type { QuoteItem, DailyBenchmark } from '@/types/market'
import { buildLiveOptExecutionMap } from '@/utils/positionsExecutions'
import { formatRiskDisplayLabels } from '@/utils/riskProfile'
import {
  formatInstanceOptExecQtyCell,
  instanceDefaultAccountForStockInspect,
  instanceGroupKey,
} from '@/utils/instanceSheetExec'
import { extractUnderlyingRootSymbol } from '@/components/positions/linkExecutionModalHelpers'
import { instancePanel } from './instancePanelClasses'
import {
  AT_EXPIRY_TITLE,
  CUSHION_TITLE,
  DTE_TITLE,
  InstanceCushionCell,
  InstanceDteCell,
  InstancePayoffCell,
} from './InstanceRiskCells'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { compareInstanceRisk, summarizeCushion, summarizeExpiry } from '@/utils/positionsOptionRisk'
import type { PositionGreeks } from '@/hooks/useOptionGreeks'

const EXEC_QTY_TITLE =
  'Per option: execution quantities (comma-separated). Uses Final book only when at least one matching Final exists; otherwise TWS. Multiple option lines separated by |.'

const COL_SPAN = 10

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
  structures: StrategyStructure[]
  attributions: PositionInstanceAttribution[]
  instanceStructureById: ReadonlyMap<number, number | null | undefined>
  portfolioAccounts: IbAccountSnapshot[] | undefined
  /** Vendor Greeks keyed by warehouse ticker, for the expanded per-leg row. */
  greeksByTicker: ReadonlyMap<string, PositionGreeks>
  detailViewMode?: DetailViewMode
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution, sameContractTrades?: Execution[]) => void
  onDeleteExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
  onOpenStrategy?: (instanceId: number) => void
  onOpenStock?: (symbol: string, accountId: string) => void
  onOpenOption?: (position: OpenOptionPosition) => void
  canonicalOptContractKeys?: Set<string>
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
  structures,
  attributions,
  instanceStructureById,
  portfolioAccounts,
  greeksByTicker,
  detailViewMode = 'accordion',
  onEditExec,
  onLinkExec,
  onDeleteExec,
  onRefreshExecs,
  onOpenStrategy,
  onOpenStock,
  onOpenOption,
  canonicalOptContractKeys,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const { pct: cushionTightPct } = useCushionThreshold()

  const finalMap = useMemo(() => buildLiveOptExecutionMap(executionsFinal), [executionsFinal])
  const twsMap = useMemo(() => buildLiveOptExecutionMap(executionsTws), [executionsTws])
  const riskProfiles = useInstanceTabRiskProfiles(
    groups,
    executionsFinal,
    instanceStructureById,
    attributions,
    opportunities,
    structures,
    portfolioAccounts,
  )

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

  /** Spot for an option leg, via its underlying root — the same source the
   *  expanded sub-table compares strikes against. */
  const spotOfLeg = (leg: OpenOptionPosition): number | null =>
    quotesBySymbol[extractUnderlyingRootSymbol(leg.symbol)]?.last ?? null

  // Most dangerous first. The label order the groups arrive in put the row
  // that could be assigned tonight wherever the alphabet left it.
  const ranked = groups
    .map((group) => ({
      group,
      cushion: summarizeCushion(group.options, spotOfLeg),
      expiry: summarizeExpiry(group.options),
    }))
    .sort(compareInstanceRisk)
    .map((r) => r.group)

  // A column of n/a is not information. When no short leg could be priced the
  // Moneyness column steps out and the unpriced count stays on the cockpit.
  const showMoneyness = ranked.some(
    (g) => summarizeCushion(g.options, spotOfLeg).cushionPct != null,
  )
  const colSpan = showMoneyness ? COL_SPAN : COL_SPAN - 1

  return (
    <div className={instancePanel.tableWrap}>
      <DenseDataTable tableClassName="min-w-[66.5rem] table-fixed">
        <colgroup>
          <col style={{ width: '2rem' }} />
          <col style={{ width: '14rem' }} />
          <col style={{ width: '7.5rem' }} />
          <col style={{ width: '6rem' }} />
          <col style={{ width: '4.75rem' }} />
          {showMoneyness ? <col style={{ width: '5.75rem' }} /> : null}
          <col style={{ width: '5.5rem' }} />
          <col style={{ width: '5rem' }} />
          <col style={{ width: '6.5rem' }} />
          <col style={{ width: '9.5rem' }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="w-7" aria-label="Expand" />
            <DenseTableHead title="Opportunity · strategy instance · when it was opened">
              Opp
            </DenseTableHead>
            <DenseTableHead>Contract Type</DenseTableHead>
            <DenseTableHead>Symbols</DenseTableHead>
            <DenseTableHead title={DTE_TITLE}>DTE</DenseTableHead>
            {showMoneyness ? (
              <DenseTableHead title={CUSHION_TITLE}>Moneyness</DenseTableHead>
            ) : null}
            <DenseTableHead title={EXEC_QTY_TITLE}>Exec Qty</DenseTableHead>
            <DenseTableHead>Underlying</DenseTableHead>
            <DenseTableHead align="right">Opt PNL</DenseTableHead>
            <DenseTableHead align="right" title={AT_EXPIRY_TITLE}>
              Gain / Loss @exp
            </DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {ranked.flatMap((group) => {
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
            // Instance row symbol = underlyings on this instance's options, not the full Opp book list
            const fromOptions = Array.from(
              new Set(
                group.options
                  .map((p) => extractUnderlyingRootSymbol(p.symbol))
                  .filter(Boolean),
              ),
            ).sort()
            const scopeSymbols =
              fromOptions.length > 0
                ? fromOptions
                : opp?.symbols?.length === 1
                  ? opp.symbols
                  : []
            const defaultStockAcct = instanceDefaultAccountForStockInspect(group)
            const optExecQty = formatInstanceOptExecQtyCell(group, finalMap, twsMap)
            const optN = group.options.length
            // Opened is instance metadata, so it rides under the instance label
            // rather than paying for a column of its own.
            const openedMeta =
              group.strategy_instance_opened_at_epoch != null ? (
                <span className="text-dense-caption text-muted-foreground">
                  {fmtDate(group.strategy_instance_opened_at_epoch)}
                  {fmtDaysAgo(group.strategy_instance_opened_at_epoch)
                    ? ` · ${fmtDaysAgo(group.strategy_instance_opened_at_epoch)}`
                    : ''}
                </span>
              ) : null
            const rp = id != null ? (riskProfiles.get(id) ?? null) : null
            const rl = rp ? formatRiskDisplayLabels(rp) : null
            // A breakeven is a price on one underlying. With two underlyings in
            // the instance there is no single spot to measure it against.
            const beSpot =
              fromOptions.length === 1
                ? (quotesBySymbol[fromOptions[0] as string]?.last ?? null)
                : null

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
                <DenseTableCell className={cn('text-xs', instancePanel.oppCell, denseTable.entityCell)}>
                  {id != null ? (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {oppName ? (
                        <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
                          {oppName}
                        </DenseOptionCategoryLabel>
                      ) : null}
                      {onOpenStrategy ? (
                        <span
                          className="inline"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          role="presentation"
                        >
                          <DenseLinkButton
                            variant="instance"
                            label={instLabel}
                            ariaLabel={`View strategy instance: ${instLabel}`}
                            onClick={() => onOpenStrategy(id)}
                            className={denseTableEntityLink}
                          />
                        </span>
                      ) : (
                        <DenseOptionCategoryLabel variant="instance" className="whitespace-normal font-mono">
                          {instLabel}
                        </DenseOptionCategoryLabel>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex flex-wrap gap-1">
                      {oppName ? (
                        <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
                          {oppName}
                        </DenseOptionCategoryLabel>
                      ) : null}
                      {instLabel ? (
                        <DenseOptionCategoryLabel variant="instance" className="whitespace-normal font-mono">
                          {instLabel}
                        </DenseOptionCategoryLabel>
                      ) : null}
                    </span>
                  )}
                </DenseTableCell>
                <DenseTableCell className={cn('text-xs', instancePanel.contractTypeCell)}>
                  {group.structure_type ? (
                    <DenseOptionCategoryLabel
                      variant="structure"
                      className="max-w-full whitespace-normal leading-snug"
                    >
                      {structLabel}
                    </DenseOptionCategoryLabel>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
                <DenseTableCell className={cn('text-xs', denseTable.entityCell)}>
                  {scopeType === 'watchlist_stk' ? (
                    <DenseTag variant="info" size="cell">
                      Watchlist
                    </DenseTag>
                  ) : scopeSymbols.length > 0 ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {scopeSymbols.map(sym =>
                        onOpenStock ? (
                          <span
                            key={sym}
                            className="inline"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            role="presentation"
                          >
                            <DenseLinkButton
                              variant="stock"
                              label={sym}
                              ariaLabel={`Open ${sym}`}
                              onClick={() => onOpenStock(sym, defaultStockAcct)}
                              className={cn(denseTableEntityLink, 'font-mono')}
                            />
                          </span>
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
                  <InstanceDteCell legs={group.options} />
                </DenseTableCell>
                {showMoneyness ? (
                  <DenseTableCell className="text-xs">
                    <InstanceCushionCell
                      legs={group.options}
                      spotOf={spotOfLeg}
                      tightPct={cushionTightPct}
                    />
                  </DenseTableCell>
                ) : null}
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
                  {rp && rl ? (
                    <InstancePayoffCell
                      gainLabel={rl.gainLabel}
                      lossLabel={rl.lossLabel}
                      maxGain={rp.max_gain}
                      maxLoss={rp.max_loss}
                      unlimited={rp.risk_type === 'unlimited'}
                      prices={rp.breakeven_prices}
                      spot={beSpot}
                    />
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
                <DenseTableCell colSpan={colSpan} className={instancePanel.detailCell}>
                  <div className={instancePanel.detailStack}>
                    {openedMeta ? (
                      <div className="px-2 text-dense-caption text-muted-foreground">Opened {openedMeta}</div>
                    ) : null}
                    <InstanceOptionSubTable
                      group={group}
                      options={group.options}
                      quotesBySymbol={quotesBySymbol}
                      quotesByCk={quotesByCk}
                      greeksByTicker={greeksByTicker}
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
                      onOpenStrategy={onOpenStrategy}
                      canonicalOptContractKeys={canonicalOptContractKeys}
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
            labelColSpan={showMoneyness ? 8 : 7}
            label={`Total (${groups.length} ${groups.length === 1 ? 'strategy' : 'strategies'})`}
          >
            <DenseTableCell className={cn(denseTableNumCell, 'text-xs font-semibold')}>
              <InlinePnl value={totalOptPnl}>{fmtUsd(totalOptPnl)}</InlinePnl>
            </DenseTableCell>
            <DenseTableCell colSpan={1} />
          </GrandTotalRow>
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
