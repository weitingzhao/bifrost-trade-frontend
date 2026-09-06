/**
 * The book as a calendar — the grid's third view.
 *
 * The other two views are organised by strategy and by contract, which is how
 * positions were opened but not how they come due. A premium seller's week is
 * scheduled by expiry — rolls, assignment, pin risk all land on those dates.
 * Same legs as the other views, regrouped by date; nothing fetched, nothing a
 * second opinion on P&L. The week/month bands the old ladder drew are gone:
 * the short-leg risk map beside the cockpit is the time axis now, and here a
 * flat list sorted by days to expiry reads faster than five group headers.
 */
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtExpiry, quoteFeedAgeSec } from '@/utils/positions'
import { cushionBand, type ExpiryLadderRow } from '@/utils/positionsOptionRisk'
import type { QuoteItem } from '@/types/market'
import { instancePanel } from './instancePanelClasses'

const TIGHTEST_TITLE =
  'Smallest short-leg cushion expiring on this date — the closest any short strike on this date is to being breached.'

/** Past this, the quote path itself is suspect — the page polls every 8 seconds. */
const STALE_FEED_SEC = 60

export function ExpiriesView({
  rows,
  quotesBySymbol,
  cushionTightPct,
  activeExpiry,
  onExpiryClick,
}: {
  /** Built once in usePositionsAlarm — the cockpit and this view read one derivation. */
  rows: ExpiryLadderRow[]
  quotesBySymbol: Record<string, QuoteItem>
  cushionTightPct: number
  /** The expiry in the page scope, if any; clicking a row toggles it. */
  activeExpiry: string | null
  onExpiryClick: (expiry: string) => void
}) {
  const feedAgeSec = quoteFeedAgeSec(Object.values(quotesBySymbol))

  const totals = useMemo(() => {
    let shortContracts = 0
    let itm = 0
    // Unpriced shorts are counted, never dropped: a book whose every short leg
    // lacks a quote must not summarise as "0 ITM".
    let unpriced = 0
    for (const r of rows) {
      shortContracts += r.shortContracts
      itm += r.itmShortCount
      unpriced += r.unpricedShortCount
    }
    const next = rows.find((r) => r.dte != null && r.dte >= 0)
    return { shortContracts, itm, unpriced, next }
  }, [rows])

  if (rows.length === 0) {
    return <p className="p-2 text-dense-body text-muted-foreground">No option legs in scope.</p>
  }

  // With nothing priced, ITM and Tightest would be a column of dashes each.
  const showPriced = rows.some((r) => r.tightestCushionPct != null || r.itmShortCount > 0)
  const sorted = [...rows].sort((a, b) => (a.dte ?? Number.MAX_SAFE_INTEGER) - (b.dte ?? Number.MAX_SAFE_INTEGER))

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
        <span>
          {rows.length} {rows.length === 1 ? 'expiry' : 'expiries'} · {totals.shortContracts} short
          {totals.next ? (
            <>
              {' · next '}
              <span className="font-mono">{fmtExpiry(totals.next.expiry)}</span>
              {totals.next.dte != null ? ` (${totals.next.dte}d)` : null}
            </>
          ) : null}
        </span>
        {totals.itm > 0 ? (
          <DenseTag variant="danger" size="cell">
            {totals.itm} ITM short
          </DenseTag>
        ) : null}
        {totals.unpriced > 0 ? (
          <DenseTag variant="warning" size="cell">
            {totals.unpriced} unpriced
          </DenseTag>
        ) : null}
        {feedAgeSec != null ? (
          <span
            className={cn('text-dense-caption', feedAgeSec > STALE_FEED_SEC ? 'text-warning' : undefined)}
            title="Age of the quote feed — the gateway cache write, not the price itself."
          >
            quotes {feedAgeSec}s
          </span>
        ) : null}
        <span className="ml-auto text-dense-caption">click a date to scope the page to it</span>
      </div>
      <div className={instancePanel.tableWrap}>
        <DenseDataTable tableClassName="min-w-[46rem]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Expiry</DenseTableHead>
              <DenseTableHead align="right">DTE</DenseTableHead>
              <DenseTableHead align="right" title="Short contracts expiring on this date.">
                Short
              </DenseTableHead>
              <DenseTableHead align="right" title="Long contracts expiring on this date.">
                Long
              </DenseTableHead>
              {showPriced ? (
                <DenseTableHead title="Short legs already past their strike — assignable.">ITM</DenseTableHead>
              ) : null}
              <DenseTableHead>Symbols</DenseTableHead>
              <DenseTableHead align="right" title="Strategy instances with legs on this date.">
                Inst
              </DenseTableHead>
              {showPriced ? (
                <DenseTableHead align="right" title={TIGHTEST_TITLE}>
                  Tightest
                </DenseTableHead>
              ) : null}
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {sorted.map((r) => (
              <ExpiryRow
                key={r.expiry}
                row={r}
                tightPct={cushionTightPct}
                showPriced={showPriced}
                active={activeExpiry === r.expiry}
                onClick={() => onExpiryClick(r.expiry)}
              />
            ))}
          </DenseTableBody>
        </DenseDataTable>
      </div>
    </div>
  )
}

function ExpiryRow({
  row,
  tightPct,
  showPriced,
  active,
  onClick,
}: {
  row: ExpiryLadderRow
  tightPct: number
  showPriced: boolean
  active: boolean
  onClick: () => void
}) {
  const urgent = row.dte != null && row.dte >= 0 && row.dte <= 7
  const past = row.dte != null && row.dte < 0

  return (
    <DenseTableRow className={cn('[&_td]:whitespace-nowrap [&_td]:text-dense-body', active && 'bg-secondary/60')}>
      <DenseTableCell>
        <button
          type="button"
          onClick={onClick}
          className="font-mono text-xs text-foreground hover:text-link hover:underline"
          aria-pressed={active}
          title={active ? 'Clear the expiry scope' : 'Scope the page to this expiry'}
        >
          {fmtExpiry(row.expiry)}
        </button>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <span className={cn('font-mono text-xs tabular-nums', past ? 'text-loss' : urgent ? 'text-warning' : undefined)}>
          {row.dte == null ? '—' : past ? `${-row.dte}d ago` : `${row.dte}d`}
        </span>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>{row.shortContracts || '—'}</DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>{row.longContracts || '—'}</DenseTableCell>
      {showPriced ? (
        <DenseTableCell className="text-xs">
          {row.itmShortCount > 0 ? (
            <DenseTag variant="danger" size="cell">
              {row.itmShortCount}
            </DenseTag>
          ) : row.unpricedShortCount > 0 ? (
            <span
              className="text-muted-foreground"
              title={`No underlying quote for ${row.unpricedShortCount} short leg(s) — not known to be safe.`}
            >
              n/a
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </DenseTableCell>
      ) : null}
      <DenseTableCell className="text-xs">
        <span className="inline-flex flex-wrap gap-1">
          {row.symbols.map((sym) => (
            <DenseTag key={sym} variant="symbol" size="cell" className="font-mono">
              {sym}
            </DenseTag>
          ))}
        </span>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>{row.instanceCount}</DenseTableCell>
      {showPriced ? (
        <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
          {row.tightestCushionPct == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span
              className={cn(
                'font-mono font-semibold tabular-nums',
                cushionBand(row.tightestCushionPct, tightPct) === 'breached'
                  ? 'text-loss'
                  : cushionBand(row.tightestCushionPct, tightPct) === 'tight'
                    ? 'text-warning'
                    : undefined,
              )}
            >
              {`${row.tightestCushionPct > 0 ? '+' : ''}${(row.tightestCushionPct * 100).toFixed(1)}%`}
            </span>
          )}
        </DenseTableCell>
      ) : null}
    </DenseTableRow>
  )
}
