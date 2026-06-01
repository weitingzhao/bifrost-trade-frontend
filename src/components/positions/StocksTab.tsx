import { useMemo } from 'react'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
import {
  computeOpenStockPositionMetrics,
  groupStockPositionsByAccount,
} from '@/utils/openStockPositions'
import type { LivePositionRow } from '@/types/positions'
import './stocksTabLegacy.css'
import './coverageSummaryLegacy.css'

interface Props {
  positions: LivePositionRow[]
  title?: string
  emptyHint?: string
  filterSymbol?: string
  rowKeyPrefix?: string
  onInspect?: (symbol: string, accountId: string, pos: LivePositionRow) => void
}

function pnlClass(n: number | null | undefined): string {
  return (n ?? 0) >= 0 ? 'pnl-positive' : 'pnl-negative'
}

function StockRow({
  position,
  onInspect,
}: {
  position: LivePositionRow
  onInspect?: (symbol: string, accountId: string, pos: LivePositionRow) => void
}) {
  const accId = (position.account_id ?? '').trim() || '—'
  const sym = (position.symbol ?? '').toUpperCase()
  const m = computeOpenStockPositionMetrics(position)

  return (
    <tr>
      <td>{accId}</td>
      <td>
        {onInspect ? (
          <button
            type="button"
            className="riv-stock-symbol-btn"
            onClick={() => onInspect(sym, accId, position)}
            aria-label={`Open details for ${position.symbol ?? 'symbol'}`}
          >
            <strong>{position.symbol ?? '—'}</strong>
          </button>
        ) : (
          <strong>{position.symbol ?? '—'}</strong>
        )}
      </td>
      <td>{m.sideLabel}</td>
      <td>{Number.isFinite(m.qty) ? m.qty : '—'}</td>
      <td>{fmtUsd(position.avgCost)}</td>
      <td>{fmtUsd(m.lastPrice)}</td>
      <td>{fmtUsd(m.marketValue)}</td>
      <td className="coverage-pnl-stacked-cell">
        <div className={pnlClass(m.dailyPnl)}>{m.dailyPnl != null ? fmtUsd(m.dailyPnl) : '—'}</div>
        <div className={`coverage-pnl-stacked-pct ${pnlClass(m.dailyPct)}`}>
          {m.dailyPct != null ? fmtSignedPct(m.dailyPct) : '—'}
        </div>
      </td>
      <td className="coverage-pnl-stacked-cell">
        <div className={pnlClass(m.sincePnl)}>{m.sincePnl != null ? fmtUsd(m.sincePnl) : '—'}</div>
        <div className={`coverage-pnl-stacked-pct ${pnlClass(m.sincePct)}`}>
          {m.sincePct != null ? fmtSignedPct(m.sincePct) : '—'}
        </div>
      </td>
    </tr>
  )
}

export function StocksTab({
  positions,
  title = 'Stock positions',
  emptyHint = 'No open stock positions under the current filters.',
  filterSymbol = '',
  rowKeyPrefix = 'stk',
  onInspect,
}: Props) {
  const filtered = useMemo(() => {
    const sym = filterSymbol.trim().toUpperCase()
    if (!sym) return positions
    return positions.filter((p) => (p.symbol ?? '').toUpperCase().includes(sym))
  }, [positions, filterSymbol])

  const accountGroups = useMemo(() => groupStockPositionsByAccount(filtered), [filtered])

  if (filtered.length === 0) {
    return (
      <div className="positions-stocks-panel system-tab-panel">
        <h5 className="replay-sub positions-stocks-heading">{title}</h5>
        <p className="section-hint positions-stocks-empty">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="positions-stocks-panel system-tab-panel">
      <h5 className="replay-sub positions-stocks-heading">{title}</h5>
      <div className="replay-portfolio-table-wrap positions-stocks-table-wrap">
        <table className="table-operations positions-stocks-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Avg Cost</th>
              <th>Last</th>
              <th>Market Value</th>
              <th className="coverage-pnl-stacked-th">Daily $ / %</th>
              <th className="coverage-pnl-stacked-th">Since $ / %</th>
            </tr>
          </thead>
          <tbody>
            {accountGroups.flatMap(({ accountId, rows }) => {
              const groupKey = `${rowKeyPrefix}-acc-${accountId}`
              return [
                <tr key={groupKey} className="replay-portfolio-group-header positions-stocks-group-row">
                  <td colSpan={9}>
                    <strong>{accountId}</strong>
                  </td>
                </tr>,
                ...rows.map((position) => {
                  const contractKey = position.contract_key ?? `${position.symbol ?? ''}|STK|||`
                  const rowKey = `${rowKeyPrefix}-open-stk-${accountId}-${position.symbol ?? ''}-${contractKey}`
                  return <StockRow key={rowKey} position={position} onInspect={onInspect} />
                }),
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
