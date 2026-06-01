import { useMemo } from 'react'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
import {
  buildIndependentStockSections,
  computeIndependentHoldingMetrics,
} from '@/utils/independentHoldings'
import type { LivePositionRow } from '@/types/positions'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  GroupHeaderRow,
  InlinePnl,
  SymbolLinkButton,
} from '@/components/data-display'
import { denseTable } from '@/components/data-display'

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
  onInspectStock,
}: {
  position: LivePositionRow
  onInspectStock?: (pos: LivePositionRow) => void
}) {
  const accId = (position.account_id ?? '').trim() || '—'
  const qty = Number(position.position)
  const m = computeIndependentHoldingMetrics(position)

  return (
    <DenseTableRow>
      <DenseTableCell>{accId}</DenseTableCell>
      <DenseTableCell>
        {onInspectStock ? (
          <SymbolLinkButton
            label={position.symbol ?? '—'}
            onClick={() => onInspectStock(position)}
            ariaLabel={`Open details for ${position.symbol ?? 'symbol'}`}
            variant="stock"
          />
        ) : (
          <strong>{position.symbol ?? '—'}</strong>
        )}
      </DenseTableCell>
      <DenseTableCell>{qty > 0 ? 'Long' : qty < 0 ? 'Short' : '—'}</DenseTableCell>
      <DenseTableCell>{Number.isFinite(qty) ? qty : '—'}</DenseTableCell>
      <DenseTableCell>{fmtUsd(position.avgCost)}</DenseTableCell>
      <DenseTableCell>{fmtUsd(m.lastPrice)}</DenseTableCell>
      <DenseTableCell>{fmtUsd(m.marketValue)}</DenseTableCell>
      <DenseTableCell>
        <InlinePnl value={m.dailyPnl}>{fmtUsd(m.dailyPnl)}</InlinePnl>
        {' / '}
        <InlinePnl value={m.dailyPct}>{fmtSignedPct(m.dailyPct)}</InlinePnl>
      </DenseTableCell>
      <DenseTableCell>
        <InlinePnl value={m.totalPnl}>{fmtUsd(m.totalPnl)}</InlinePnl>
        {' / '}
        <InlinePnl value={m.totalPct}>{fmtSignedPct(m.totalPct)}</InlinePnl>
      </DenseTableCell>
    </DenseTableRow>
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
    <div className="min-w-0 space-y-2">
      <h4 className="text-sm font-semibold text-foreground">Independent Holdings</h4>
      <p className={denseTable.emptyHint}>
        Positions without tradeable options (Index, ETF, etc.); not part of any option strategy. Grouped by
        position category (Stocks, Fixed income, Cash-like).
      </p>
      <DenseDataTable>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Account</DenseTableHead>
            <DenseTableHead>Symbol</DenseTableHead>
            <DenseTableHead>Side</DenseTableHead>
            <DenseTableHead>Qty</DenseTableHead>
            <DenseTableHead>Avg Cost</DenseTableHead>
            <DenseTableHead>Last</DenseTableHead>
            <DenseTableHead>Market Value</DenseTableHead>
            <DenseTableHead>Daily ($ / %)</DenseTableHead>
            <DenseTableHead>Total ($ / %)</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {sections.flatMap((section) => [
            <GroupHeaderRow key={`${section.key}-section`} colSpan={9} label={<strong>{section.title}</strong>} />,
            ...section.rows.map((p) => (
              <HoldingRow
                key={`${section.key}-${p.account_id}-${p.symbol}-${p.contract_key ?? 'stk'}`}
                position={p}
                onInspectStock={onInspectStock}
              />
            )),
          ])}
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
