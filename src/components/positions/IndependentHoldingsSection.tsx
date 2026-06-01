import { useMemo } from 'react'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
import {
  buildIndependentStockSections,
  computeIndependentHoldingMetrics,
} from '@/utils/independentHoldings'
import type { LivePositionRow } from '@/types/positions'
import './independentHoldingsLegacy.css'

interface Props {
  coreStocks: LivePositionRow[]
  fixedIncomeStocks: LivePositionRow[]
  cashLikeStocks: LivePositionRow[]
  filterSymbol?: string
  onInspectStock?: (pos: LivePositionRow) => void
}

function filterBySymbol(rows: LivePositionRow[], filterSymbol: string): LivePositionRow[] {
  const sym = filterSymbol.trim().toUpperCase()
  if (!sym) return rows
  return rows.filter((p) => (p.symbol ?? '').toUpperCase().includes(sym))
}

function HoldingRow({
  position,
  keyPrefix,
  onInspectStock,
}: {
  position: LivePositionRow
  keyPrefix: string
  onInspectStock?: (pos: LivePositionRow) => void
}) {
  const accId = (position.account_id ?? '').trim() || '—'
  const qty = Number(position.position)
  const m = computeIndependentHoldingMetrics(position)
  const ck = (position.contract_key ?? '').trim()

  return (
    <tr key={`${keyPrefix}-${accId}-${position.symbol ?? ''}-${ck || 'stk'}`}>
      <td>{accId}</td>
      <td>
        {onInspectStock ? (
          <button
            type="button"
            className="independent-holdings-symbol-btn"
            onClick={() => onInspectStock(position)}
            aria-label={`Open details for ${position.symbol ?? 'symbol'}`}
          >
            <strong>{position.symbol ?? '—'}</strong>
          </button>
        ) : (
          <strong>{position.symbol ?? '—'}</strong>
        )}
      </td>
      <td>{qty > 0 ? 'Long' : qty < 0 ? 'Short' : '—'}</td>
      <td>{Number.isFinite(qty) ? qty : '—'}</td>
      <td>{fmtUsd(position.avgCost)}</td>
      <td>{fmtUsd(m.lastPrice)}</td>
      <td>{fmtUsd(m.marketValue)}</td>
      <td>
        <span className={(m.dailyPnl ?? 0) >= 0 ? 'independent-holdings-pnl-positive' : 'independent-holdings-pnl-negative'}>
          {fmtUsd(m.dailyPnl)}
        </span>
        {' / '}
        <span className={(m.dailyPct ?? 0) >= 0 ? 'independent-holdings-pnl-positive' : 'independent-holdings-pnl-negative'}>
          {fmtSignedPct(m.dailyPct)}
        </span>
      </td>
      <td>
        <span className={(m.totalPnl ?? 0) >= 0 ? 'independent-holdings-pnl-positive' : 'independent-holdings-pnl-negative'}>
          {fmtUsd(m.totalPnl)}
        </span>
        {' / '}
        <span className={(m.totalPct ?? 0) >= 0 ? 'independent-holdings-pnl-positive' : 'independent-holdings-pnl-negative'}>
          {fmtSignedPct(m.totalPct)}
        </span>
      </td>
    </tr>
  )
}

export function IndependentHoldingsSection({
  coreStocks,
  fixedIncomeStocks,
  cashLikeStocks,
  filterSymbol = '',
  onInspectStock,
}: Props) {
  const sections = useMemo(() => {
    const built = buildIndependentStockSections(coreStocks, fixedIncomeStocks, cashLikeStocks)
    return built
      .map((s) => ({ ...s, rows: filterBySymbol(s.rows, filterSymbol) }))
      .filter((s) => s.rows.length > 0)
  }, [coreStocks, fixedIncomeStocks, cashLikeStocks, filterSymbol])

  if (sections.length === 0) return null

  return (
    <div className="instance-sheet-stock-section">
      <h4 className="instance-sheet-section-heading">Independent Holdings</h4>
      <p className="independent-holdings-hint">
        Positions without tradeable options (Index, ETF, etc.); not part of any option strategy. Grouped by
        position category (Stocks, Fixed income, Cash-like).
      </p>
      <div className="overflow-x-auto">
        <table className="independent-holdings-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Avg Cost</th>
              <th>Last</th>
              <th>Market Value</th>
              <th>Daily ($ / %)</th>
              <th>Total ($ / %)</th>
            </tr>
          </thead>
          <tbody>
            {sections.flatMap((section) => [
              <tr key={`${section.key}-section`} className="independent-holdings-group-row">
                <td colSpan={9}>
                  <strong>{section.title}</strong>
                </td>
              </tr>,
              ...section.rows.map((p) => (
                <HoldingRow
                  key={`${section.key}-${p.account_id}-${p.symbol}-${p.contract_key ?? 'stk'}`}
                  position={p}
                  keyPrefix={section.key}
                  onInspectStock={onInspectStock}
                />
              )),
            ])}
          </tbody>
        </table>
      </div>
    </div>
  )
}
