/**
 * The book as a calendar.
 *
 * Every other view here is organised by strategy, which is how positions were
 * opened but not how they come due. A premium seller's week is scheduled by
 * expiry — rolls, assignment, pin risk all land on those dates — and nothing on
 * this page aggregated on that axis, so "what is coming at me and when" had to
 * be reassembled by hand from the expanded rows of a dozen instances.
 *
 * Same source as the instance table above: these are its option legs, regrouped.
 * Nothing here is fetched, and nothing here is a second opinion on the P&L.
 */
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  GroupHeaderRow,
  denseTableNumCell,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtExpiry, quoteFeedAgeSec } from '@/utils/positions'
import {
  EXPIRY_BUCKET_LABEL,
  cushionBand,
  expiryBucket,
  type ExpiryBucket,
  type ExpiryLadderRow,
} from '@/utils/positionsOptionRisk'
import type { QuoteItem } from '@/types/market'
import { instancePanel } from './instancePanelClasses'

const TIGHTEST_TOOLTIP =
  'Smallest short-leg cushion expiring on this date — the closest any short strike on this week is to being breached. Not P&L: option P&L on this page is derived from matched executions, and re-deriving it on a different axis would put two different numbers for one thing on the same screen.'

const LADDER_TOOLTIP =
  'Option legs from the instance table above, regrouped by expiry date. Follows the same filters. ITM counts short legs whose strike the underlying has already passed — the ones that can be assigned.'

const COL_SPAN_FULL = 8

/** Past this, the quote path itself is suspect — the page polls every 8 seconds. */
const STALE_FEED_SEC = 60

const BUCKET_ORDER: ExpiryBucket[] = ['expired', 'this_week', 'next_week', 'this_month', 'later']

export function ExpiryLadderSection({
  rows,
  quotesBySymbol,
  cushionTightPct,
  open,
  onToggle,
}: {
  /** Built once in usePositionsAlarm — the strip and this table read one derivation. */
  rows: ExpiryLadderRow[]
  quotesBySymbol: Record<string, QuoteItem>
  /** The trader's cushion warning line — see useCushionThreshold. */
  cushionTightPct: number
  /** Controlled by the page so an alarm chip can open it. */
  open: boolean
  onToggle: () => void
}) {
  const feedAgeSec = quoteFeedAgeSec(Object.values(quotesBySymbol))


  const totals = useMemo(() => {
    let shortContracts = 0
    let itm = 0
    // Unpriced shorts were being dropped from the rolled-up count. A book whose
    // every short leg lacks a quote then summarised as "0 ITM short" — the exact
    // shape of a clean bill of health issued over no data.
    let unpriced = 0
    for (const r of rows) {
      shortContracts += r.shortContracts
      itm += r.itmShortCount
      unpriced += r.unpricedShortCount
    }
    const next = rows.find((r) => r.dte != null && r.dte >= 0)
    return { shortContracts, itm, unpriced, next }
  }, [rows])

  if (rows.length === 0) return null

  // With nothing priced, ITM and Tightest are a column of dashes each. The
  // unpriced count already sits in the header; the columns step out.
  const showPriced = rows.some((r) => r.tightestCushionPct != null || r.itmShortCount > 0)

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>
          <span className="inline-flex items-center gap-1.5">
            Expiry ladder
            <InfoTooltip text={LADDER_TOOLTIP} />
          </span>
        </CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="text-xs text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'expiry' : 'expiries'} ·{' '}
            {totals.shortContracts} short
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
              className={cn(
                'text-dense-caption',
                feedAgeSec > STALE_FEED_SEC ? 'text-warning' : 'text-muted-foreground',
              )}
              title={
                'Age of the quote feed — the gateway cache write, not the price itself. ' +
                'A small number means the quote path is alive; it is not a claim that any ' +
                'price is current.'
              }
            >
              quotes {feedAgeSec}s
            </span>
          ) : null}
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {open ? (
        <CollapsibleGroupBody>
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
                    <DenseTableHead title="Short legs already past their strike — assignable.">
                      ITM
                    </DenseTableHead>
                  ) : null}
                  <DenseTableHead>Symbols</DenseTableHead>
                  <DenseTableHead align="right" title="Strategy instances with legs on this date.">
                    Inst
                  </DenseTableHead>
                  {showPriced ? (
                    <DenseTableHead align="right" title={TIGHTEST_TOOLTIP}>
                      Tightest
                    </DenseTableHead>
                  ) : null}
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>{renderBuckets(rows, cushionTightPct, showPriced)}</DenseTableBody>
            </DenseDataTable>
          </div>
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}

function renderBuckets(rows: ExpiryLadderRow[], tightPct: number, showPriced: boolean) {
  const colSpan = showPriced ? COL_SPAN_FULL : COL_SPAN_FULL - 2
  const byBucket = new Map<ExpiryBucket, ExpiryLadderRow[]>()
  for (const r of rows) {
    const b = expiryBucket(r.dte)
    const list = byBucket.get(b)
    if (list) list.push(r)
    else byBucket.set(b, [r])
  }

  const out = []
  for (const bucket of BUCKET_ORDER) {
    const bucketRows = byBucket.get(bucket)
    if (!bucketRows || bucketRows.length === 0) continue
    const shorts = bucketRows.reduce((n, r) => n + r.shortContracts, 0)
    out.push(
      <GroupHeaderRow
        key={`bucket-${bucket}`}
        colSpan={colSpan}
        label={
          <span className={cn(bucket === 'expired' && 'text-loss')}>
            {EXPIRY_BUCKET_LABEL[bucket]}
            <span className="ml-2 font-normal text-muted-foreground">
              {bucketRows.length} {bucketRows.length === 1 ? 'date' : 'dates'} · {shorts} short
            </span>
          </span>
        }
      />,
    )
    for (const r of bucketRows)
      out.push(<LadderRow key={r.expiry} row={r} tightPct={tightPct} showPriced={showPriced} />)
  }
  return out
}

function LadderRow({
  row,
  tightPct,
  showPriced,
}: {
  row: ExpiryLadderRow
  tightPct: number
  showPriced: boolean
}) {
  const urgent = row.dte != null && row.dte >= 0 && row.dte <= 7
  const past = row.dte != null && row.dte < 0

  return (
    <DenseTableRow className="[&_td]:whitespace-nowrap [&_td]:text-dense-body">
      <DenseTableCell className="font-mono text-xs">{fmtExpiry(row.expiry)}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <span
          className={cn(
            'font-mono text-xs tabular-nums',
            past ? 'text-loss' : urgent ? 'text-warning' : undefined,
          )}
        >
          {row.dte == null ? '—' : past ? `${-row.dte}d ago` : `${row.dte}d`}
        </span>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
        {row.shortContracts || '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
        {row.longContracts || '—'}
      </DenseTableCell>
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
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
        {row.instanceCount}
      </DenseTableCell>
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
