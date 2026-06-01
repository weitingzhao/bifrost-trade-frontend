import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { Link } from 'react-router-dom'
import { Compass, ScanSearch } from 'lucide-react'
import { buildDiscoveryUrl } from '@/utils/optionDiscovery/discoveryNav'
import { getPositionExecLists } from '@/utils/buildInstanceAllGroups'
import { buildLiveOptExecutionMap } from '@/utils/positionsExecutions'
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
  rightLabel,
} from '@/utils/positions'
import type { OpenOptionPosition, Execution } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { DetailViewMode } from './PositionsOpenControls'
import { OpenOptionExecTableRow } from './OpenOptionExecTableRow'
import './optionsTab.module.css'

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
}

function InstanceIcon({ fill }: { fill: 'none' | 'all' | 'mixed' }) {
  const cls =
    fill === 'all'
      ? 'positions-opt-instance-icon--same'
      : fill === 'mixed'
        ? 'positions-opt-instance-icon--mixed'
        : 'positions-opt-instance-icon--none'
  const title =
    fill === 'all'
      ? 'All matched executions have a strategy instance'
      : fill === 'mixed'
        ? 'Mixed strategy instance on matched executions'
        : 'No strategy instance on matched executions'
  return (
    <span className={`positions-opt-instance-icon ${cls}`} title={title} role="img" aria-label={title}>
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
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [openOptSort, setOpenOptSort] = useState<{ column: OpenOptSortCol; dir: 'asc' | 'desc' }>({
    column: 'expiry',
    dir: 'desc',
  })

  const finalMap = useMemo(() => buildLiveOptExecutionMap(executionsFinal), [executionsFinal])
  const twsMap = useMemo(() => buildLiveOptExecutionMap(executionsTws), [executionsTws])

  let filtered = positions
  const symUpper = filterSymbol.trim().toUpperCase()
  if (symUpper) filtered = filtered.filter((p) => (p.symbol ?? '').toUpperCase().includes(symUpper))
  if (filterExpiry) filtered = filtered.filter((p) => optionExpiryMatchesFilter(p.expiry, filterExpiry))

  const sorted = useMemo(
    () => sortOpenOptionPositions(filtered, openOptSort.column, openOptSort.dir, quotesBySymbol),
    [filtered, openOptSort, quotesBySymbol],
  )

  function toggleSort(col: OpenOptSortCol) {
    setOpenOptSort((prev) =>
      prev.column === col ? { column: col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { column: col, dir: 'desc' },
    )
  }

  function toggleExpand(posKey: string) {
    setExpandedKeys((prev) => {
      const isOpen = prev.includes(posKey)
      if (detailViewMode === 'accordion') return isOpen ? [] : [posKey]
      return isOpen ? prev.filter((k) => k !== posKey) : [...prev, posKey]
    })
  }

  const sortTh = (label: ReactNode, col: OpenOptSortCol, title?: string) => {
    const active = openOptSort.column === col
    return (
      <th
        className="replay-th-sortable"
        title={title ?? `Sort by ${label}`}
        role="button"
        tabIndex={0}
        aria-sort={active ? (openOptSort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
        onClick={() => toggleSort(col)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleSort(col)
          }
        }}
      >
        {label}
        {active ? (openOptSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </th>
    )
  }

  const totalUnPnl = sorted.reduce((acc, p) => acc + (p.unrealized_pnl ?? 0), 0)

  if (sorted.length === 0) {
    return (
      <div className="optionsTabRoot positions-options-panel">
        <h4 className="positions-options-heading">Option positions</h4>
        <p className="positions-options-empty">No open option positions under the current filters.</p>
      </div>
    )
  }

  return (
    <div className="optionsTabRoot positions-options-panel">
      <h4 className="positions-options-heading">Option positions</h4>
      <div className="positions-opt-table-wrap">
        <table className="positions-opt-main-table replay-opt-groups">
          <colgroup>
            <col className="pom-col-expand" style={{ width: '2.25rem' }} />
            <col style={{ width: '11.25rem' }} />
            <col style={{ width: '7.75rem' }} />
            <col style={{ width: '5.25rem' }} />
            <col style={{ width: '6.25rem' }} />
            <col style={{ width: '4.75rem' }} />
            <col style={{ width: '5.25rem' }} />
            <col style={{ width: '7rem' }} />
            <col style={{ width: '4.75rem' }} />
            <col style={{ width: '4.5rem' }} />
            <col style={{ width: '8.5rem' }} />
            <col style={{ width: '5.5rem' }} />
            <col style={{ width: '5.5rem' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="replay-opt-expand-col" aria-label="Expand" />
              {sortTh('Contract', 'contract')}
              {sortTh('Expiry', 'expiry')}
              {sortTh('Strike', 'strike')}
              {sortTh('Last', 'last', 'Underlying last; (Last − Strike) / Last %')}
              {sortTh('Qty', 'qty')}
              {sortTh('@', 'avg_cost')}
              {sortTh('Value', 'value')}
              <th title="Option live bid / mid / ask">Opt Quote</th>
              {sortTh('Time', 'time')}
              {sortTh('UN PNL', 'un_pnl')}
              <th title="Executions">Opp</th>
              <th className="replay-opt-actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.flatMap((pos) => {
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
                <tr
                  key={posKey}
                  className="detail-position-row"
                  onClick={
                    hasExecutions
                      ? (e) => {
                          e.stopPropagation()
                          toggleExpand(posKey)
                        }
                      : undefined
                  }
                  role={hasExecutions ? 'button' : undefined}
                  tabIndex={hasExecutions ? 0 : undefined}
                  onKeyDown={
                    hasExecutions
                      ? (e) => {
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
                  <td className="replay-opt-expand-col">
                    {hasExecutions ? (
                      <span className={`replay-opt-expand-icon ${isExpanded ? 'expanded' : ''}`} aria-hidden>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    ) : null}
                  </td>
                  <td className="replay-opt-contract">
                    {iconFill !== 'empty' && <InstanceIcon fill={iconFill} />}
                    {onInspect ? (
                      <button
                        type="button"
                        className="riv-opt-contract-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onInspect(pos)
                        }}
                        aria-label={`Option details for ${contractButtonLabel(pos)}`}
                      >
                        <strong>{pos.symbol}</strong> {rightLabel(pos.right)}
                        {pos.strike != null ? ` ${pos.strike}` : ''}
                      </button>
                    ) : (
                      <strong>{contractButtonLabel(pos)}</strong>
                    )}
                  </td>
                  <td className="positions-opt-expiry-cell">
                    <div className="positions-opt-expiry-line1">{fmtExpiry(pos.expiry)}</div>
                    {(() => {
                      const days = daysUntilExpiry(pos.expiry)
                      if (days == null) return null
                      const label = days >= 0 ? (days === 0 ? 'today' : `${days}d`) : `${-days}d ago`
                      return (
                        <div className="positions-opt-expiry-line2">
                          <span className="expiry-days-remaining text-warning font-semibold">{label}</span>
                        </div>
                      )
                    })()}
                  </td>
                  <td>
                    <strong>{fmtUsd(pos.strike)}</strong>
                  </td>
                  <td className="positions-opt-last-cell">
                    <div className="positions-opt-last-line1">{last != null ? fmtUsd(last) : '—'}</div>
                    {pct != null && (
                      <div className="positions-opt-last-line2">
                        <span className={pctClass} title={`(Last − Strike) / Last = ${pct.toFixed(2)}%`}>
                          {pct >= 0 ? '+' : ''}
                          {pct.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    {sideLabel} {absQty}
                  </td>
                  <td>{fmtUsd(pos.avg_cost)}</td>
                  <td>{fmtUsd(value)}</td>
                  <td className="positions-opt-live-quote">
                    {!liveQ ? (
                      <span className="replay-muted">—</span>
                    ) : (
                      <>
                        <div className="positions-opt-quote-line positions-opt-quote-line--bid">
                          {liveQ.bid != null ? (
                            <span className="positions-opt-quote-bid">{liveQ.bid.toFixed(2)}</span>
                          ) : (
                            <span className="replay-muted">—</span>
                          )}
                        </div>
                        <div className="positions-opt-quote-line positions-opt-quote-line--mid">
                          <strong>{liveMid != null ? liveMid.toFixed(2) : '—'}</strong>
                        </div>
                        <div className="positions-opt-quote-line">
                          {liveQ.ask != null ? (
                            <span className="positions-opt-quote-ask">{liveQ.ask.toFixed(2)}</span>
                          ) : (
                            <span className="replay-muted">—</span>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="positions-opt-time-cell">
                    {ts != null ? (
                      <>
                        <div className="positions-opt-time-line1">{fmtDate(ts)}</div>
                        {fmtDaysAgo(ts) && (
                          <div className="positions-opt-time-line2">
                            <span className="replay-time-ago">{fmtDaysAgo(ts)}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {livePnl != null && (
                      <div>
                        <span className={cn('replay-pnl-unrealized font-semibold', pnlColorClass(livePnl))}>
                          {fmtUsd(livePnl)}
                        </span>
                        <span className="replay-muted" style={{ fontSize: '0.7em' }}>
                          {' '}
                          live
                        </span>
                      </div>
                    )}
                    <div style={livePnl != null ? { fontSize: '0.75em' } : undefined}>
                      <span
                        className={cn('replay-pnl-unrealized font-semibold', pnlColorClass(pos.unrealized_pnl))}
                      >
                        {fmtUsd(pos.unrealized_pnl)}
                      </span>
                      {livePnl != null && (
                        <span className="replay-muted" style={{ fontSize: '0.7em' }}>
                          {' '}
                          snap
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="positions-opt-opp-hint-cell">
                    {execCount === 0 ? (
                      '—'
                    ) : (
                      <span className="replay-muted" title={`${execCount} execution${execCount > 1 ? 's' : ''} — expand row`}>
                        {execCount} exec{execCount > 1 ? 's' : ''} ↓
                      </span>
                    )}
                  </td>
                  <td className="replay-opt-actions-cell">
                    {onInspect && (
                      <span className="pos-opt-action-btns">
                        <Link
                          to={buildDiscoveryUrl(pos.symbol, pos.expiry)}
                          className="pos-opt-action-btn"
                          title="Open in Discovery"
                          aria-label={`Open ${pos.symbol} in Option Discovery`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Compass className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          className="pos-opt-action-btn"
                          title="Inspect contract"
                          aria-label="Inspect contract"
                          onClick={(e) => {
                            e.stopPropagation()
                            onInspect(pos)
                          }}
                        >
                          <ScanSearch className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              )

              const execRows =
                isExpanded && hasExecutions
                  ? [
                      ...execLists.final.map((ex, ei) => (
                        <OpenOptionExecTableRow
                          key={`${posKey}-f-${ex.account_executions_id ?? ei}`}
                          pos={pos}
                          posKey={posKey}
                          exec={ex}
                          execIndex={ei}
                          book="final"
                          onEdit={onEditExec ?? (() => {})}
                          onLink={(ex) => onLinkExec?.(ex, execLists.merged)}
                          onDelete={onDeleteExec ?? (() => {})}
                          onClose={pos.pool_label === 'Off' ? onCloseExec : undefined}
                          onOpenStrategy={onOpenStrategy}
                        />
                      )),
                      ...execLists.tws.map((ex, ei) => (
                        <OpenOptionExecTableRow
                          key={`${posKey}-t-${ex.account_executions_id ?? ei}`}
                          pos={pos}
                          posKey={posKey}
                          exec={ex}
                          execIndex={ei}
                          book="tws"
                          onEdit={onEditExec ?? (() => {})}
                          onLink={(ex) => onLinkExec?.(ex, execLists.merged)}
                          onDelete={onDeleteExec ?? (() => {})}
                          onClose={pos.pool_label === 'Off' ? onCloseExec : undefined}
                          onOpenStrategy={onOpenStrategy}
                        />
                      )),
                    ]
                  : []

              return [posRow, ...execRows]
            })}
          </tbody>
          <tfoot>
            <tr className="positions-opt-tfoot-total">
              <td colSpan={12} className="positions-opt-tfoot-label">
                Total
              </td>
              <td>
                <span className={cn('replay-pnl-unrealized font-semibold', pnlColorClass(totalUnPnl))}>
                  {fmtUsd(totalUnPnl)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
