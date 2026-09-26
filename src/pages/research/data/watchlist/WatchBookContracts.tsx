/**
 * The Watchlist's Contracts table — *"tracked from Option Discovery — quotes
 * stream on Live"*.
 *
 * **Measured on DEV 2026-09-22: the watchlist holds 22 rows and every one of
 * them is a stock.** So this section renders empty, and empty is a reading:
 * the app can hold contracts here (the `+` on a stock row adds one) and none
 * has been put here. That is different from a section that cannot be drawn,
 * and the empty state says which.
 *
 * Two of the design's seven columns are named rather than drawn, because the
 * store cannot answer them:
 *
 * - **vs added** — nothing records the mid a contract was tracked at. The same
 *   absence as the stock table's *Since added*, and the same one field would
 *   answer both.
 * - **IV · Δ** — `QuoteItem` carries `last`, `bid`, `ask` and `mid` and no
 *   greeks at all; the chain has them per contract, which is a join this page
 *   does not make. Drawing the columns and filling them with dashes would
 *   read as "this contract has no IV", which is a different claim.
 */
import { Link } from 'react-router-dom'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  IconActionButton,
  denseTableNumCell,
} from '@/components/data-display'
import { Trash2 } from 'lucide-react'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import { SYMBOL_PATH, TAB_PARAM } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { watchlistItemLabel } from '@/utils/watchlistHelpers'
import { cn } from '@/lib/utils'

/** Calendar days to expiry, or null when the row does not carry one. */
export function daysToExpiry(expiry: string | null | undefined, now: number): number | null {
  if (!expiry) return null
  const iso = expiry.length === 8 ? `${expiry.slice(0, 4)}-${expiry.slice(4, 6)}-${expiry.slice(6, 8)}` : expiry
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(t)) return null
  return Math.round((t - now) / 86_400_000)
}

/** The design's amber: under three weeks a contract is running out of time. */
const DTE_TIGHT = 21

export function WatchBookContracts({
  items,
  quoteByContractKey,
  symbolFromItem,
  onRemove,
  now,
}: {
  items: readonly WatchlistItem[]
  quoteByContractKey: Readonly<Record<string, QuoteItem>>
  symbolFromItem: (item: WatchlistItem) => string
  onRemove: (item: WatchlistItem) => void
  now: number
}) {
  if (items.length === 0) {
    return (
      <p className="px-3 py-5 text-center text-dense-meta leading-relaxed text-muted-foreground">
        No contracts tracked. The <span className="font-mono">+</span> on a stock row puts one here,
        and Option Discovery promotes one from the chain — the list simply has none today.
      </p>
    )
  }

  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Contract</DenseTableHead>
          <DenseTableHead align="right">Mid</DenseTableHead>
          <DenseTableHead align="right">vs added</DenseTableHead>
          <DenseTableHead align="right">IV</DenseTableHead>
          <DenseTableHead align="right">Δ</DenseTableHead>
          <DenseTableHead align="right">DTE</DenseTableHead>
          <DenseTableHead>Why tracked</DenseTableHead>
          <DenseTableHead />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {items.map((item) => {
          const und = symbolFromItem(item).toUpperCase()
          const q = quoteByContractKey[item.contract_key]
          const mid = q?.mid ?? q?.last ?? null
          const dte = daysToExpiry(item.expiry, now)
          return (
            <DenseTableRow key={item.contract_key}>
              <DenseTableCell>
                <span className="font-mono font-bold text-entity-option">
                  {item.display_label || watchlistItemLabel(item)}
                </span>
              </DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
                {mid == null ? '—' : mid.toFixed(2)}
              </DenseTableCell>
              <DenseTableCell
                className={cn(denseTableNumCell, 'text-muted-foreground/60')}
                title="Nothing records the mid a contract was tracked at, so there is no baseline to measure from."
              >
                owed
              </DenseTableCell>
              <DenseTableCell
                className={cn(denseTableNumCell, 'text-muted-foreground/60')}
                title="The quote stream carries no greeks; the chain has them per contract, and this page does not join it yet."
              >
                owed
              </DenseTableCell>
              <DenseTableCell
                className={cn(denseTableNumCell, 'text-muted-foreground/60')}
                title="The quote stream carries no greeks; the chain has them per contract, and this page does not join it yet."
              >
                owed
              </DenseTableCell>
              <DenseTableCell
                className={cn(
                  denseTableNumCell,
                  dte != null && dte < DTE_TIGHT ? 'text-warning' : 'text-muted-foreground',
                )}
              >
                {dte == null ? '—' : dte}
              </DenseTableCell>
              <DenseTableCell className="text-dense-meta text-foreground/80">
                {/* The design writes a sentence here. The store keeps the lane
                    it was filed under and who filed it, which is what this
                    side actually knows about why a contract is on the list. */}
                {[item.category, item.source].filter(Boolean).join(' · ') || '—'}
              </DenseTableCell>
              <DenseTableCell>
                <span className="flex items-center gap-2.5">
                  {/* Compare is the design's first link and has no page on this
                      side, so the second — the chain this contract came from —
                      leads instead, and the name opens its own dossier. */}
                  <Link
                    to={withSymbolParam(`${SYMBOL_PATH}?${TAB_PARAM}=chain`, und)}
                    className="text-dense-caption text-primary hover:underline"
                  >
                    Chain →
                  </Link>
                  <Link
                    to={withSymbolParam(SYMBOL_PATH, und)}
                    className="text-dense-caption text-primary hover:underline"
                  >
                    Dossier →
                  </Link>
                  <IconActionButton
                    title="Stop tracking this contract"
                    ariaLabel="Stop tracking this contract"
                    onClick={() => onRemove(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconActionButton>
                </span>
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
