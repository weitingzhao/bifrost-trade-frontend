import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from './positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
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
import type { SpotResolver } from '@/utils/spotPrice'
import type { VendorGreeksRow } from '@/api/marketData/optionGreeks'
import type { RiskProfile } from '@/utils/riskProfile'

const EXEC_QTY_TITLE =
  'Per option: execution quantities (comma-separated). Uses Final book only when at least one matching Final exists; otherwise TWS. Multiple option lines separated by |.'

const COL_SPAN = 9

/** A head cell in the prototype's two lines: the word, and the code the page speaks. */
function ColHead({
  word,
  code,
  align = 'right',
  title,
}: {
  word: string
  code: string
  align?: 'left' | 'right'
  title?: string
}) {
  return (
    <th className={cn(positionsUi.th, align === 'left' && 'text-left')} title={title}>
      <span className={cn('flex flex-col gap-px', align === 'left' ? 'items-start' : 'items-end')}>
        <span>{word}</span>
        {code ? <span className="font-mono text-dense-micro leading-normal font-normal text-muted-foreground">{code}</span> : null}
      </span>
    </th>
  )
}

interface Props {
  groups: InstanceAllGroup[]
  totalInstanceCount: number
  quotesBySymbol: Record<string, QuoteItem>
  /** The page's spot resolver — live, then the dated close, then the mark — so a
   *  leg cannot be unpriced here and priced on the cockpit. */
  resolveSpot: SpotResolver
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
  /**
   * The vendor's per-share row per contract, for the expanded per-leg row.
   *
   * Per share rather than the rollup's position greeks: a contract held in two
   * instances reaches the sub-table twice, and only an unscaled row survives
   * being keyed by contract — see InstanceOptionSubTable.
   */
  perShareByTicker: ReadonlyMap<string, VendorGreeksRow>
  detailViewMode?: DetailViewMode
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution, sameContractTrades?: Execution[]) => void
  onDeleteExec?: (exec: Execution) => void
  onRefreshExecs?: () => void
  /** The strategy's risk at expiry opens in the slot beside the grid; the sheet carries the rest. */
  onOpenStrategy?: (instanceId: number, ctx?: { title: string; profile: RiskProfile | null }) => void
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
  // Naked is jeopardy, not a fault: amber, never red (§14.7).
  if (anyNaked) return <DenseTag variant="warning" size="cell">Naked</DenseTag>
  return <DenseTag variant="warning" size="cell">Partial</DenseTag>
}

export function InstanceTab({
  groups,
  totalInstanceCount,
  quotesBySymbol,
  resolveSpot,
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
  perShareByTicker,
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
      <div className="flex flex-col items-center gap-1.5 px-4 py-6.5 text-center">
        <span className={cn(positionsUi.cap, totalInstanceCount > 0 && 'text-warning')}>
          {totalInstanceCount > 0 ? 'No match' : 'Nothing in the book'}
        </span>
        <span className="text-dense-label font-semibold text-foreground">
          {totalInstanceCount > 0 ? 'Nothing matches these filters' : 'No strategy instance positions found'}
        </span>
        <span className="max-w-115 text-dense-meta text-muted-foreground text-pretty">
          {totalInstanceCount > 0
            ? 'The book has positions, but none pass the current contract type, opportunity, scope or attribution filters.'
            : 'The broker reports no option positions on a strategy for the accounts in scope.'}
        </span>
      </div>
    )
  }

  /** A row opens its legs and, beside the grid, its risk at expiry — one click, both. */
  function openRow(instKey: string, id: number | null, profile: RiskProfile | null, title: string) {
    toggleExpand(instKey)
    if (id != null) onOpenStrategy?.(id, { title, profile })
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

  const spotOfLeg = (leg: OpenOptionPosition): number | null =>
    resolveSpot(extractUnderlyingRootSymbol(leg.symbol))?.price ?? null

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
    <div className="overflow-x-auto">
      {/* §14.6: nine columns, the design's 940 floor. */}
      <table className="w-full min-w-[940px] table-fixed border-collapse">
        {/* Measured at the 940 floor with every row open: the name column takes the slack. */}
        <colgroup>
          <col style={{ width: '21%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '8.5%' }} />
          <col style={{ width: '8%' }} />
          {showMoneyness ? <col style={{ width: '8.5%' }} /> : null}
          <col style={{ width: '6.5%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '11.5%' }} />
          <col style={{ width: '17%' }} />
        </colgroup>
        <thead>
          <tr>
            <ColHead word="Opportunity" code="Opp" align="left" title="Opportunity · strategy instance · when it was opened" />
            <ColHead word="Contract type" code="" align="left" />
            <ColHead word="Symbols" code="" align="left" />
            <ColHead word="Days to expiry" code="DTE" title={DTE_TITLE} />
            {showMoneyness ? <ColHead word="Moneyness" code="" title={CUSHION_TITLE} /> : null}
            <ColHead word="Executed qty" code="Exec Qty" title={EXEC_QTY_TITLE} />
            <ColHead word="Underlying" code="" />
            <ColHead word="Option P&L · open" code="Opt PNL" />
            <ColHead word="Gain / loss at expiry" code="Gain/Loss @exp" title={AT_EXPIRY_TITLE} />
          </tr>
        </thead>
        <tbody>
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
              fromOptions.length === 1 ? (resolveSpot(fromOptions[0] as string)?.price ?? null) : null

            const rowBg = isExpanded ? '[&>td]:bg-[var(--sk-surface)]' : 'hover:[&>td]:bg-[var(--sk-raised2)]'
            const name = oppName ?? instLabel
            const sub = oppName ? instLabel : id == null ? 'not on any strategy' : 'unnamed instance'
            const nameInk = oppName ? 'text-foreground' : id == null ? 'text-warning' : 'text-secondary-foreground'

            const mainRow = (
              <tr
                key={`inst-${instKey}`}
                id={`lines-row-${instKey}`}
                className={cn('cursor-pointer', rowBg)}
                onClick={() => openRow(instKey, id, rp, name)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                title={isExpanded ? 'Collapse' : 'Open the legs behind this strategy'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openRow(instKey, id, rp, name)
                  }
                }}
              >
                <td className={cn(positionsUi.td, 'pl-2 text-left font-sans whitespace-normal')}>
                  <span className="flex items-baseline gap-1.5">
                    <span className="w-2.5 flex-none text-muted-foreground">{isExpanded ? '▾' : '▸'}</span>
                    <span className="flex min-w-0 flex-col gap-px">
                      <span className={cn('text-xs font-semibold leading-normal', nameInk)}>{name}</span>
                      {onOpenStrategy && id != null ? (
                        <span
                          className="inline"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          role="presentation"
                        >
                          <button
                            type="button"
                            className={cn(
                              positionsUi.mono,
                              'cursor-pointer border-0 bg-transparent p-0 text-left text-dense-caption leading-normal text-muted-foreground hover:text-foreground hover:underline',
                            )}
                            aria-label={`View strategy instance: ${instLabel}`}
                            onClick={() => onOpenStrategy(id, { title: name, profile: rp })}
                          >
                            {sub}
                          </button>
                        </span>
                      ) : (
                        <span className={cn(positionsUi.mono, 'text-dense-caption leading-normal text-muted-foreground')}>
                          {sub}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-secondary-foreground')}>
                  {group.structure_type ? structLabel : <span className="text-muted-foreground">—</span>}
                </td>
                <td className={cn(positionsUi.td, 'text-left whitespace-normal')}>
                  {scopeType === 'watchlist_stk' ? (
                    <DenseTag variant="info" size="cell">
                      Watchlist
                    </DenseTag>
                  ) : scopeSymbols.length > 0 ? (
                    <span className="inline-flex flex-wrap gap-x-1.5 gap-y-0.5">
                      {scopeSymbols.map((sym) =>
                        onOpenStock ? (
                          <span
                            key={sym}
                            className="inline"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            role="presentation"
                          >
                            <button
                              type="button"
                              className="cursor-pointer border-0 bg-transparent p-0 font-mono text-xs font-bold text-[var(--color-entity-option)] hover:underline"
                              aria-label={`Open ${sym}`}
                              data-ctx-sym={sym}
                              onClick={() => onOpenStock(sym, defaultStockAcct)}
                            >
                              {sym}
                            </button>
                          </span>
                        ) : (
                          <span key={sym} className="font-mono text-xs font-bold text-[var(--color-entity-option)]">
                            {sym}
                          </span>
                        ),
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className={positionsUi.td}>
                  <InstanceDteCell legs={group.options} />
                </td>
                {showMoneyness ? (
                  <td className={positionsUi.td}>
                    <InstanceCushionCell legs={group.options} spotOf={spotOfLeg} tightPct={cushionTightPct} />
                  </td>
                ) : null}
                <td className={cn(positionsUi.td, 'text-muted-foreground')} title={EXEC_QTY_TITLE}>
                  {optN > 0 ? optExecQty : '—'}
                </td>
                <td className={cn(positionsUi.td, 'text-right')}>{coverageBadge(group.stock_coverage, liveStocks)}</td>
                <td
                  className={cn(
                    positionsUi.td,
                    'font-bold',
                    optN > 0 ? pnlColorClass(group.options_unrealized_pnl) : 'text-muted-foreground',
                  )}
                >
                  {optN > 0 ? fmtUsd(group.options_unrealized_pnl) : '—'}
                </td>
                <td className={positionsUi.td}>
                  {rp && rl ? (
                    <InstancePayoffCell
                      gainLabel={rl.gainLabel}
                      lossLabel={rl.lossLabel}
                      unlimited={rp.risk_type === 'unlimited'}
                      prices={rp.breakeven_prices}
                      spot={beSpot}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            )

            const detailRow = isExpanded ? (
              <tr key={`inst-detail-${instKey}`}>
                <td colSpan={colSpan} className="border-b border-border bg-[var(--sk-raised2)] px-2.5 pt-1 pb-2.5 pl-6.5 align-top">
                  <div className={instancePanel.detailStack}>
                    {openedMeta ? <div className="text-dense-caption text-muted-foreground">Opened {openedMeta}</div> : null}
                    <InstanceOptionSubTable
                      group={group}
                      options={group.options}
                      quotesBySymbol={quotesBySymbol}
                      quotesByCk={quotesByCk}
                      perShareByTicker={perShareByTicker}
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
                  </div>
                </td>
              </tr>
            ) : null

            return detailRow ? [mainRow, detailRow] : [mainRow]
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className={cn(positionsUi.td, 'border-b-0 pl-2 text-left font-sans font-bold text-foreground')} colSpan={colSpan - 2}>
              Total ({groups.length} {groups.length === 1 ? 'strategy' : 'strategies'})
            </td>
            <td className={cn(positionsUi.td, 'border-b-0 font-bold', pnlColorClass(totalOptPnl))}>{fmtUsd(totalOptPnl)}</td>
            <td className={cn(positionsUi.td, 'border-b-0')} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
