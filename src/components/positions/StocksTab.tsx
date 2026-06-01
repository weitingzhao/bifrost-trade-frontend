import { useMemo } from 'react'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
import {
  computeOpenStockPositionMetrics,
  groupStockPositionsByAccount,
} from '@/utils/openStockPositions'
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
  PnlCell,
  SymbolLinkButton,
} from '@/components/data-display'
import { denseTable } from '@/components/data-display'

interface Props {
  positions: LivePositionRow[]
  title?: string
  emptyHint?: string
  filterSymbol?: string
  rowKeyPrefix?: string
  onInspect?: (symbol: string, accountId: string, pos: LivePositionRow) => void
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
    <DenseTableRow>
      <DenseTableCell>{accId}</DenseTableCell>
      <DenseTableCell>
        {onInspect ? (
          <SymbolLinkButton
            label={position.symbol ?? '—'}
            onClick={() => onInspect(sym, accId, position)}
            ariaLabel={`Open details for ${position.symbol ?? 'symbol'}`}
            variant="stock"
          />
        ) : (
          <strong>{position.symbol ?? '—'}</strong>
        )}
      </DenseTableCell>
      <DenseTableCell>{m.sideLabel}</DenseTableCell>
      <DenseTableCell>{Number.isFinite(m.qty) ? m.qty : '—'}</DenseTableCell>
      <DenseTableCell>{fmtUsd(position.avgCost)}</DenseTableCell>
      <DenseTableCell>{fmtUsd(m.lastPrice)}</DenseTableCell>
      <DenseTableCell>{fmtUsd(m.marketValue)}</DenseTableCell>
      <DenseTableCell className="text-right">
        <PnlCell
          dollar={m.dailyPnl}
          pct={m.dailyPct}
          formatDollar={fmtUsd}
          formatPct={fmtSignedPct}
        />
      </DenseTableCell>
      <DenseTableCell className="text-right">
        <PnlCell
          dollar={m.sincePnl}
          pct={m.sincePct}
          formatDollar={fmtUsd}
          formatPct={fmtSignedPct}
        />
      </DenseTableCell>
    </DenseTableRow>
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
      <div className="min-w-0">
        <h5 className={denseTable.sectionTitle}>{title}</h5>
        <p className={denseTable.emptyHint}>{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <h5 className={denseTable.sectionTitle}>{title}</h5>
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
            <DenseTableHead align="right">Daily $ / %</DenseTableHead>
            <DenseTableHead align="right">Since $ / %</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {accountGroups.flatMap(({ accountId, rows }) => {
            const groupKey = `${rowKeyPrefix}-acc-${accountId}`
            return [
              <GroupHeaderRow key={groupKey} colSpan={9} label={<strong>{accountId}</strong>} />,
              ...rows.map((position) => {
                const contractKey = position.contract_key ?? `${position.symbol ?? ''}|STK|||`
                const rowKey = `${rowKeyPrefix}-open-stk-${accountId}-${position.symbol ?? ''}-${contractKey}`
                return <StockRow key={rowKey} position={position} onInspect={onInspect} />
              }),
            ]
          })}
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
