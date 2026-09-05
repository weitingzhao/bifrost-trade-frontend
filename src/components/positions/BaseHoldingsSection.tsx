/**
 * Every non-option holding, grouped by the role its layer plays for the option
 * book — the same three layers the Backing pool ring is drawn from.
 *
 * This is one table where there used to be four: the Stocks, Fixed income and
 * Cash-like tabs and the Independent Holdings section all rendered the same
 * nine columns from the same rows. The group headers carry the layer's market
 * value and how much of it the options are using, so the collapsed header can
 * answer the section's question on its own.
 */
import { useMemo } from 'react'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
import { computeIndependentHoldingMetrics } from '@/utils/independentHoldings'
import type { LivePositionRow } from '@/types/positions'
import type { BaseLayer } from '@/utils/bookVsBase'
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
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
} from '@/components/data-display'

interface Props {
  /** Controlled and persisted by the page — see usePositionsSections. */
  open: boolean
  onToggle: () => void
  layers: BaseLayer[]
  coreStocks: LivePositionRow[]
  incomeEtfs: LivePositionRow[]
  cashLike: LivePositionRow[]
  filterSymbol?: string
  onInspectStock?: (pos: LivePositionRow) => void
}

const COLS = 9

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

export function BaseHoldingsSection({
  open,
  onToggle,
  layers,
  coreStocks,
  incomeEtfs,
  cashLike,
  filterSymbol = '',
  onInspectStock,
}: Props) {
  const groups = useMemo(() => {
    const rowsByRole = { stocks: coreStocks, income: incomeEtfs, cash: cashLike } as const
    return layers
      .map((layer) => ({ layer, rows: filterBySymbol(rowsByRole[layer.role], filterSymbol) }))
      .filter((g) => g.rows.length > 0)
  }, [layers, coreStocks, incomeEtfs, cashLike, filterSymbol])

  if (groups.length === 0) return null

  const rowCount = groups.reduce((n, g) => n + g.rows.length, 0)
  const total = layers.reduce((n, l) => n + l.marketValue, 0)

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>Base holdings</CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {rowCount} {rowCount === 1 ? 'position' : 'positions'} · {fmtUsd(total)}
            {layers.map((l) => (
              <span key={l.role}>
                {' · '}
                {l.label} {fmtUsd(l.marketValue)}
                {l.used != null ? ` (${Math.round(l.used * 100)}% in use)` : ''}
              </span>
            ))}
          </span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {!open ? null : (
        <CollapsibleGroupBody>
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
              {groups.flatMap(({ layer, rows }) => [
                <GroupHeaderRow
                  key={`${layer.role}-header`}
                  colSpan={COLS}
                  label={
                    <span className="inline-flex items-baseline gap-2">
                      <strong>{layer.label}</strong>
                      <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
                        {fmtUsd(layer.marketValue)}
                        {layer.used != null ? ` · ${Math.round(layer.used * 100)}% in use` : ''}
                      </span>
                      <span className="text-dense-caption text-muted-foreground">{layer.note}</span>
                    </span>
                  }
                />,
                ...rows.map((p) => (
                  <HoldingRow
                    key={`${layer.role}-${p.account_id}-${p.symbol}-${p.contract_key ?? 'stk'}`}
                    position={p}
                    onInspectStock={onInspectStock}
                  />
                )),
              ])}
            </DenseTableBody>
          </DenseDataTable>
        </CollapsibleGroupBody>
      )}
    </CollapsibleGroup>
  )
}
