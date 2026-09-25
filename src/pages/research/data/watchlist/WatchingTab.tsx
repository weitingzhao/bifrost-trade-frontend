/**
 * The Watchlist as The Book reads it — walked against
 * `Research Watchlist.dc.html` on 2026-09-22.
 *
 * ## The page was a list; the design makes it a ledger
 *
 * This tab used to be list management: a "Step 1" instruction, a category
 * picker, an add box, a remove button. The design's page is about something
 * else entirely — *"names with a thesis attached"* — and it carries a rule
 * that turns the list into a ledger: **a watch without a thesis expires in 10
 * sessions**. Its two sections are two objects, stocks and contracts, and
 * every column answers one of two questions: is this name still moving, and
 * is there still a reason it is here.
 *
 * Nothing was removed to make room. The list-keeping the design does not draw
 * — categories, the option add, the removal — moved into a trailing cell
 * behind the two promotions the design leads with, because absence from the
 * design is not deletion (Owner, 2026-09-18). The Sizing and Positions tabs
 * are untouched: the design's own footer says the production page's inline
 * sizing and order workflow stays where it is under D10, and that this page
 * watches and promotes rather than places.
 *
 * ## What the app can answer, measured before it was built
 *
 * | the design's column | source | DEV 2026-09-22 |
 * |---|---|---|
 * | Symbol · Age | `/market/watchlist` | 22 names, every one a stock |
 * | Last | the quote stream | real |
 * | Day | `/market/bars/benchmark`, one call | real |
 * | IV rank | `/market/analytics/iv-percentile` per name | 18 of 22 |
 * | Thesis | the hypothesis that names it | 5 of 22 |
 * | Since added · vs added | nowhere | **owed** |
 * | Contracts | the watchlist holds none | real zero |
 *
 * The four names with no IV rank are the four in `Fix Income`: a bond ETF has
 * no chain to rank, so the cell carries that sentence rather than a bare dash.
 * And the ages run 27 to 200 days, so every row is past the design's aging
 * mark — which the header says once instead of the rows saying it 22 times.
 */
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { SectionPanel } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import type { PositionCategory } from '@/types/portfolio'
import type { IbPositionRow } from '@/types/monitor'
import type { WatchlistWorkflow } from '@/hooks/useWatchlistWorkflow'
import { positionToContractKey } from '@/utils/watchlistHelpers'
import { WatchBookTable, WatchBookStandingNote } from './WatchBookTable'
import { WatchBookContracts } from './WatchBookContracts'
import { useWatchBook } from './useWatchBook'
import { watchBookRows, watchBookStanding } from './watchBookModel'

interface Props {
  workflow: WatchlistWorkflow
  categories: PositionCategory[]
  quoteBySymbol: Record<string, QuoteItem>
  quoteByContractKey: Record<string, QuoteItem>
  showPositionPicker: boolean
  positionsNotInWatchlist: IbPositionRow[]
  addPending: boolean
  onCategoryChange: (item: WatchlistItem, categoryId: number | null) => void
  onToggleOptionable: (item: WatchlistItem) => void
  onSymbolClick: (item: WatchlistItem) => void
  onRemove: (item: WatchlistItem) => void
  onAddOption: (item: WatchlistItem) => void
  onAddFromPosition: (p: IbPositionRow) => void
}

export function WatchingTab({
  workflow,
  categories,
  quoteBySymbol,
  quoteByContractKey,
  showPositionPicker,
  positionsNotInWatchlist,
  addPending,
  onCategoryChange,
  onToggleOptionable,
  onSymbolClick,
  onRemove,
  onAddOption,
  onAddFromPosition,
}: Props) {
  const { allStocks, watchlistOptions, symbolFromItem } = workflow

  /**
   * Every watched name — including the ones filed under `Sizing`.
   *
   * The tabs split the list by lane, and this face is the book's widest end:
   * a name being sized is still a name being watched, and the lane it is in
   * is a column here, not a filter. It also has to be every name for a
   * harder reason — the Book's census counts all 22 stock rows and prints
   * "with thesis / without" off them, so a Watchlist that showed 18 would
   * give the reader two different answers to one question, one click apart.
   */
  const stockItems = allStocks
  const symbols = useMemo(
    () =>
      [...new Set(stockItems.map((i) => (i.symbol ?? '').trim().toUpperCase()).filter(Boolean))],
    [stockItems],
  )
  const { benchmarks, hypotheses, ivBySymbol, isJoining, ivLoading, thesisUnavailable } =
    useWatchBook(symbols)

  // One clock for the whole face, read once, so the render stays pure and the
  // ages and the DTEs cannot disagree about "now" — the same pattern the Book
  // page uses for the same reason.
  const [now] = useState(() => Date.now())
  const rows = useMemo(
    () => watchBookRows(stockItems, quoteBySymbol, benchmarks, ivBySymbol, hypotheses, now, ivLoading),
    [stockItems, quoteBySymbol, benchmarks, ivBySymbol, hypotheses, now, ivLoading],
  )
  const standing = useMemo(() => watchBookStanding(rows), [rows])

  return (
    <div className="space-y-3">
      {showPositionPicker && positionsNotInWatchlist.length > 0 && (
        <div className="flex flex-wrap gap-2 border p-3 mat-card">
          {positionsNotInWatchlist.map((p, idx) => {
            const ck = positionToContractKey(p)
            return (
              <Button
                key={ck + String(idx)}
                type="button"
                variant="outline"
                size="sm"
                className="font-mono text-xs"
                disabled={addPending}
                onClick={() => onAddFromPosition(p)}
                title={ck}
              >
                {p.symbol || ck.split('|')[0]}
              </Button>
            )
          })}
        </div>
      )}

      <SectionPanel
        cap="Stocks"
        title={`${standing.names} name${standing.names === 1 ? '' : 's'}`}
        note={
          thesisUnavailable
            ? 'the hypothesis board did not answer — the thesis column reads empty for that reason, not because the names have none'
            : undefined
        }
      >
        <div className="px-3 py-2">
          <WatchBookStandingNote
            names={standing.names}
            withoutThesis={standing.withoutThesis}
            aging={standing.aging}
          />
        </div>
        {isJoining && rows.length === 0 ? (
          <Skeleton className="mx-3 mb-3 h-32 rounded-md" />
        ) : (
          <WatchBookTable
            rows={rows}
            categories={categories}
            onCategoryChange={onCategoryChange}
            onToggleOptionable={onToggleOptionable}
            onInspect={onSymbolClick}
            onAddOption={onAddOption}
            onRemove={onRemove}
          />
        )}
      </SectionPanel>

      <SectionPanel
        cap="Contracts"
        title={`${watchlistOptions.length} tracked`}
        note="tracked from the chain — quotes stream on Live"
      >
        <WatchBookContracts
          items={watchlistOptions}
          quoteByContractKey={quoteByContractKey}
          symbolFromItem={symbolFromItem}
          onRemove={onRemove}
          now={now}
        />
      </SectionPanel>

      {/* The design's own footer, and the line that keeps this page inside
          D10: it hands a name on, it does not place anything. */}
      <p className="max-w-[92ch] text-dense-caption leading-relaxed text-muted-foreground">
        <span className="font-mono">Size →</span> hands the name to{' '}
        <span className="text-foreground/80">Risk › Sizing</span> as a candidate. The inline sizing
        and order workflow stays on the <span className="text-foreground/80">Sizing</span> tab per
        D10 — this face watches and promotes, it does not place.
      </p>
    </div>
  )
}
