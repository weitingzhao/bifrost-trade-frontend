import { useMemo, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { updateExecution } from '@/api/trading'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import { Link } from 'react-router-dom'
import { Compass, ScanSearch } from 'lucide-react'
import { buildDiscoveryUrl } from '@/utils/optionDiscovery/discoveryNav'
import { getPositionExecLists } from '@/utils/buildInstanceAllGroups'
import { buildLiveOptExecutionMap } from '@/utils/positionsExecutions'
import {
  findMatchingFinalForTws,
  findMatchingTwsForFinal,
  shouldShowOptionExecSync,
} from '@/utils/execAttributionSync'
import {
  type OpenOptSortCol,
  contractButtonLabel,
  getOptionsTabPositionKey,
  getPositionTime,
  getPositionUnderlyingLast,
  instanceIconFillFromMergedExecutions,
  optionExpiryMatchesFilter,
  optionLastStrikePctClass,
  optQuoteMid,
  sortOpenOptionPositions,
} from '@/utils/openOptionsTab'
import {
  fmtUsd,
  fmtExpiry,
  fmtDate,
  fmtDaysAgo,
  daysUntilExpiry,
} from '@/utils/positions'
import type { OpenOptionPosition, Execution } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { DetailViewMode } from './PositionsOpenControls'
import { OpenOptionExecTableRow } from './OpenOptionExecTableRow'
import {
  DenseDataTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableHeadRow,
  DenseTableHead,
  DenseTableRow,
  DenseTableCell,
  DenseLinkButton,
  ExpandToggleCell,
  denseTable,
  denseTableEntityCell,
  denseTableEntityLink,
} from '@/components/data-display'

interface Props {
  positions: OpenOptionPosition[]
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  filterSymbol?: string
  filterExpiry?: string
  detailViewMode?: DetailViewMode
  executionsFinal?: Execution[]
  executionsTws?: Execution[]
  onEditExec?: (exec: Execution) => void
  onLinkExec?: (exec: Execution, sameContractTrades?: Execution[]) => void
  onDeleteExec?: (exec: Execution) => void
  onCloseExec?: (exec: Execution) => void
  onInspect?: (pos: OpenOptionPosition) => void
  onOpenStrategy?: (instanceId: number) => void
  onRefreshExecs?: () => void
  canonicalOptContractKeys?: Set<string>
}

function InstanceIcon({ fill }: { fill: 'none' | 'all' | 'mixed' }) {
  const colorClass =
    fill === 'all'
      ? 'text-success'
      : fill === 'mixed'
        ? 'text-warning'
        : 'text-muted-foreground/70'
  const title =
    fill === 'all'
      ? 'All matched executions have a strategy instance'
      : fill === 'mixed'
        ? 'Mixed strategy instance on matched executions'
        : 'No strategy instance on matched executions'
  return (
    <span className={cn('inline-flex mr-1 align-middle', colorClass)} title={title} role="img" aria-label={title}>
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="5" width="14" height="14" rx="1" />
      </svg>
    </span>
  )
}

export function OptionsTab({
  positions,
  quotesBySymbol,
  quotesByCk,
  filterSymbol = '',
  filterExpiry = '',
  detailViewMode = 'accordion',
  executionsFinal = [],
  executionsTws = [],
  onEditExec,
  onLinkExec,
  onDeleteExec,
  onCloseExec,
  onInspect,
  onOpenStrategy,
  onRefreshExecs,
  canonicalOptContractKeys = new Set(),
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [syncingExecId, setSyncingExecId] = useState<number | null>(null)
  const [openOptSort, setOpenOptSort] = useState<{ column: OpenOptSortCol; dir: 'asc' | 'desc' }>({
    column: 'expiry',
    dir: 'desc',
  })

  const finalMap = useMemo(() => buildLiveOptExecutionMap(executionsFinal), [executionsFinal])
  const twsMap = useMemo(() => buildLiveOptExecutionMap(executionsTws), [executionsTws])

  let filtered = positions
  const symUpper = filterSymbol.trim().toUpperCase()
  if (symUpper) filtered = filtered.filter(p => (p.symbol ?? '').toUpperCase().includes(symUpper))
  if (filterExpiry) filtered = filtered.filter(p => optionExpiryMatchesFilter(p.expiry, filterExpiry))

  const sorted = useMemo(
    () => sortOpenOptionPositions(filtered, openOptSort.column, openOptSort.dir, quotesBySymbol),
    [filtered, openOptSort, quotesBySymbol],
  )

  function toggleSort(col: OpenOptSortCol) {
    setOpenOptSort(prev =>
      prev.column === col ? { column: col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { column: col, dir: 'desc' },
    )
  }

  function toggleExpand(posKey: string) {
    setExpandedKeys(prev => {
      const isOpen = prev.includes(posKey)
      if (detailViewMode === 'accordion') return isOpen ? [] : [posKey]
      return isOpen ? prev.filter(k => k !== posKey) : [...prev, posKey]
    })
  }

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

  function renderExecRow(
    pos: OpenOptionPosition,
    posKey: string,
    ex: Execution,
    ei: number,
    book: 'final' | 'tws',
    execLists: ReturnType<typeof getPositionExecLists>,
  ) {
    const crossBookMatch =
      book === 'final'
        ? findMatchingTwsForFinal(ex, execLists.tws)
        : findMatchingFinalForTws(ex, execLists.final)
    const showSync = shouldShowOptionExecSync({
      book,
      exec: ex,
      crossBookMatch,
      canonicalOptContractKeys,
    })
    const execId = ex.account_executions_id

    return (
      <OpenOptionExecTableRow
        key={`${posKey}-${book === 'final' ? 'f' : 't'}-${execId ?? ei}`}
        pos={pos}
        posKey={posKey}
        exec={ex}
        execIndex={ei}
        book={book}
        onEdit={onEditExec ?? (() => {})}
        onLink={ex => onLinkExec?.(ex, execLists.merged)}
        onDelete={onDeleteExec ?? (() => {})}
        onClose={pos.pool_label === 'Off' ? onCloseExec : undefined}
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

  const sortTh = (label: ReactNode, col: OpenOptSortCol, title?: string) => {
    const active = openOptSort.column === col
    return (
      <DenseTableHead
        className={denseTable.sortableHead}
        title={title ?? `Sort by ${label}`}
        role="button"
        tabIndex={0}
        aria-sort={active ? (openOptSort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
        onClick={() => toggleSort(col)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleSort(col)
          }
        }}
      >
        {label}
        {active ? (openOptSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </DenseTableHead>
    )
  }

  const totalUnPnl = sorted.reduce((acc, p) => acc + (p.unrealized_pnl ?? 0), 0)

  if (sorted.length === 0) {
    return (
      <div className={denseTable.sectionBlock}>
        <h4 className={denseTable.sectionTitle}>Option positions</h4>
        <p className={denseTable.emptyHint}>No open option positions under the current filters.</p>
      </div>
    )
  }

  return (
    <div className={denseTable.sectionBlock}>
      <h4 className={denseTable.sectionTitle}>Option positions</h4>
      <DenseDataTable>
        <colgroup>
          <col style={{ width: '2.25rem' }} />
          <col style={{ width: '11.25rem' }} />
          <col style={{ width: '7.75rem' }} />
          <col style={{ width: '5.25rem' }} />
          <col style={{ width: '6.25rem' }} />
          <col style={{ width: '4.75rem' }} />
          <col style={{ width: '5.25rem' }} />
          <col style={{ width: '7rem' }} />
          <col style={{ width: '4.75rem' }} />
          <col style={{ width: '6.75rem' }} />
          <col style={{ width: '8.5rem' }} />
          <col style={{ width: '5.5rem' }} />
          <col style={{ width: '5.5rem' }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="w-9" aria-label="Expand" />
            {sortTh('Contract', 'contract')}
            {sortTh('Expiry', 'expiry')}
            {sortTh('Strike', 'strike')}
            {sortTh('Last', 'last', 'Underlying last; (Last − Strike) / Last %')}
            {sortTh('Qty', 'qty')}
            {sortTh('@', 'avg_cost')}
            {sortTh('Value', 'value')}
            <DenseTableHead title="Option live bid / mid / ask">Opt Quote</DenseTableHead>
            {sortTh('Time', 'time')}
            {sortTh('UN PNL', 'un_pnl')}
            <DenseTableHead title="Executions">Opp</DenseTableHead>
            <DenseTableHead>Actions</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {sorted.flatMap(pos => {
            const posKey = getOptionsTabPositionKey(pos)
            const absQty = Math.abs(pos.qty)
            const sideLabel = pos.qty > 0 ? 'Long' : pos.qty < 0 ? 'Short' : '—'
            const value = (pos.avg_cost ?? 0) * absQty * 100
            const ts = getPositionTime(pos)
            const execLists = getPositionExecLists(pos, finalMap, twsMap)
            const execCount = execLists.final.length + execLists.tws.length
            const hasExecutions = execCount > 0
            const isExpanded = expandedKeys.includes(posKey)

            const last = getPositionUnderlyingLast(pos, quotesBySymbol)
            const strikeNum = pos.strike
            const pct =
              last != null && strikeNum != null && last !== 0 ? ((last - strikeNum) / last) * 100 : null
            const side: 'Buy' | 'Sell' = pos.qty > 0 ? 'Buy' : 'Sell'
            const pctClass = pct != null ? optionLastStrikePctClass(pos.right, side, pct) : ''

            const liveQ = quotesByCk[pos.contract_key]
            const liveMid = optQuoteMid(liveQ)
            const livePnl =
              liveMid != null && pos.avg_cost != null ? (liveMid - pos.avg_cost) * absQty * 100 : null

            const iconFill = instanceIconFillFromMergedExecutions(execLists.merged)

            const posRow = (
              <DenseTableRow
                key={posKey}
                className={cn(hasExecutions && 'cursor-pointer')}
                onClick={
                  hasExecutions
                    ? e => {
                        e.stopPropagation()
                        toggleExpand(posKey)
                      }
                    : undefined
                }
                role={hasExecutions ? 'button' : undefined}
                tabIndex={hasExecutions ? 0 : undefined}
                onKeyDown={
                  hasExecutions
                    ? e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleExpand(posKey)
                        }
                      }
                    : undefined
                }
                aria-expanded={hasExecutions ? isExpanded : undefined}
              >
                <DenseTableCell className="w-9">
                  {hasExecutions ? (
                    <ExpandToggleCell expanded={isExpanded} onToggle={() => toggleExpand(posKey)} />
                  ) : null}
                </DenseTableCell>
                <DenseTableCell className={denseTableEntityCell}>
                  {iconFill !== 'empty' && <InstanceIcon fill={iconFill} />}
                  {onInspect ? (
                    <span onClick={e => e.stopPropagation()}>
                      <DenseLinkButton
                        variant="option"
                        label={contractButtonLabel(pos)}
                        ariaLabel={`Option details for ${contractButtonLabel(pos)}`}
                        onClick={() => onInspect(pos)}
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
                  <div>{fmtExpiry(pos.expiry)}</div>
                  {(() => {
                    const days = daysUntilExpiry(pos.expiry)
                    if (days == null) return null
                    const label = days >= 0 ? (days === 0 ? 'today' : `${days}d`) : `${-days}d ago`
                    return (
                      <div className={cn('text-dense-meta font-semibold text-warning')}>
                        {label}
                      </div>
                    )
                  })()}
                </DenseTableCell>
                <DenseTableCell className="font-mono tabular-nums">
                  <strong>{fmtUsd(pos.strike)}</strong>
                </DenseTableCell>
                <DenseTableCell>
                  <div className="font-mono tabular-nums">{last != null ? fmtUsd(last) : '—'}</div>
                  {pct != null && (
                    <div className={cn('text-dense-meta font-mono tabular-nums', pctClass)} title={`(Last − Strike) / Last = ${pct.toFixed(2)}%`}>
                      {pct >= 0 ? '+' : ''}
                      {pct.toFixed(2)}%
                    </div>
                  )}
                </DenseTableCell>
                <DenseTableCell>
                  {sideLabel} {absQty}
                </DenseTableCell>
                <DenseTableCell className="font-mono tabular-nums">{fmtUsd(pos.avg_cost)}</DenseTableCell>
                <DenseTableCell className="font-mono tabular-nums">{fmtUsd(value)}</DenseTableCell>
                <DenseTableCell>
                  {!liveQ ? (
                    <span className={denseTable.mutedMeta}>—</span>
                  ) : (
                    <>
                      <div className="text-dense-meta font-mono tabular-nums text-quote-bid">
                        {liveQ.bid != null ? liveQ.bid.toFixed(2) : '—'}
                      </div>
                      <div className="font-mono tabular-nums font-semibold">
                        {liveMid != null ? liveMid.toFixed(2) : '—'}
                      </div>
                      <div className="text-dense-meta font-mono tabular-nums text-quote-ask">
                        {liveQ.ask != null ? liveQ.ask.toFixed(2) : '—'}
                      </div>
                    </>
                  )}
                </DenseTableCell>
                <DenseTableCell>
                  {ts != null ? (
                    <>
                      <div className="whitespace-nowrap">{fmtDate(ts)}</div>
                      {fmtDaysAgo(ts) && (
                        <div className={cn('text-dense-meta font-semibold text-warning whitespace-nowrap')}>
                          {fmtDaysAgo(ts)}
                        </div>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </DenseTableCell>
                <DenseTableCell className="font-mono tabular-nums">
                  {livePnl != null && (
                    <div>
                      <span className={unrealizedPnlColorClass(livePnl)}>{fmtUsd(livePnl)}</span>
                      <span className={cn('ml-1', denseTable.mutedMeta)}>live</span>
                    </div>
                  )}
                  <div className={livePnl != null ? 'text-dense-meta' : undefined}>
                    <span className={unrealizedPnlColorClass(pos.unrealized_pnl)}>
                      {fmtUsd(pos.unrealized_pnl)}
                    </span>
                    {livePnl != null && (
                      <span className={cn('ml-1', denseTable.mutedMeta)}>snap</span>
                    )}
                  </div>
                </DenseTableCell>
                <DenseTableCell className={denseTable.mutedMeta}>
                  {execCount === 0 ? (
                    '—'
                  ) : (
                    <span title={`${execCount} execution${execCount > 1 ? 's' : ''} — expand row`}>
                      {execCount} exec{execCount > 1 ? 's' : ''} ↓
                    </span>
                  )}
                </DenseTableCell>
                <DenseTableCell>
                  {onInspect && (
                    <span className="inline-flex items-center gap-0.5">
                      <Link
                        to={buildDiscoveryUrl(pos.symbol, pos.expiry)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Open in Discovery"
                        aria-label={`Open ${pos.symbol} in Option Discovery`}
                        onClick={e => e.stopPropagation()}
                      >
                        <Compass className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Inspect contract"
                        aria-label="Inspect contract"
                        onClick={e => {
                          e.stopPropagation()
                          onInspect(pos)
                        }}
                      >
                        <ScanSearch className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </DenseTableCell>
              </DenseTableRow>
            )

            const execRows =
              isExpanded && hasExecutions
                ? [
                    ...execLists.final.map((ex, ei) =>
                      renderExecRow(pos, posKey, ex, ei, 'final', execLists),
                    ),
                    ...execLists.tws.map((ex, ei) =>
                      renderExecRow(pos, posKey, ex, ei, 'tws', execLists),
                    ),
                  ]
                : []

            return [posRow, ...execRows]
          })}
        </DenseTableBody>
        <tfoot>
          <tr className="border-t border-border bg-secondary/30 font-semibold">
            <td colSpan={12} className="px-[var(--table-cell-px)] py-[var(--table-cell-py)] text-xs">
              Total
            </td>
            <td className="px-[var(--table-cell-px)] py-[var(--table-cell-py)] text-xs font-mono tabular-nums">
              <span className={unrealizedPnlColorClass(totalUnPnl)}>{fmtUsd(totalUnPnl)}</span>
            </td>
          </tr>
        </tfoot>
      </DenseDataTable>
    </div>
  )
}
