/**
 * The Watchlist's Stocks table, as `Research Watchlist.dc.html` draws it.
 *
 * Seven readings per name, and the last two are the page: **Thesis** is the
 * reason the name is here, and **Age** is how long it has been here without
 * one becoming a trade. The design's header note is the rule they serve — *a
 * watch without a thesis expires in 10 sessions* — and this side prints the
 * count beside it, because a rule with no count is a slogan.
 *
 * `Size →` and `Dossier →` are the design's two promotions. The trailing cell
 * is this side's own: the categories, the option add and the removal are how
 * the list is *kept*, and the design draws no list-keeping because its rows
 * are a fixture. They are not dropped for that (Owner, 2026-09-18: absence
 * from the design is not deletion); they are moved behind the two the design
 * leads with.
 */
import { Plus, ScanSearch, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  DenseTagButton,
  IconActionButton,
  denseTableNumCell,
} from '@/components/data-display'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PositionCategory } from '@/types/portfolio'
import type { WatchlistItem } from '@/types/market'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { pnlColorClass } from '@/utils/dailyChange'
import { cn } from '@/lib/utils'
import type { WatchBookRow } from './watchBookModel'
import { watchlistCategorySelectClass } from './watchlistUi'

/** `+1.2%` · `—` when the day has not moved or cannot be read. */
function dayText(pct: number | null): string {
  if (pct == null) return '—'
  if (pct === 0) return '—'
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`
}

/**
 * The design's amber IV: it marks a name whose vol is expensive *now*, which
 * is the whole reason a vol trader keeps a watchlist. Its own fixture puts the
 * mark on the 64th and 71st and leaves the 22nd and 48th plain, so the line is
 * the top third.
 */
const IV_HIGH = 60

export function WatchBookTable({
  rows,
  categories,
  onCategoryChange,
  onToggleOptionable,
  onInspect,
  onAddOption,
  onRemove,
}: {
  rows: readonly WatchBookRow[]
  categories: PositionCategory[]
  onCategoryChange: (item: WatchlistItem, categoryId: number | null) => void
  onToggleOptionable: (item: WatchlistItem) => void
  /** This app's own reading — fundamentals and technicals beside the row. */
  onInspect: (item: WatchlistItem) => void
  onAddOption: (item: WatchlistItem) => void
  onRemove: (item: WatchlistItem) => void
}) {
  return (
    // Nine columns and a thesis that wraps: below this width they crush into
    // clipped numbers, so a narrow surface scrolls the table in its own frame
    // (the Live table's rule) rather than squeezing it.
    <DenseDataTable tableClassName="min-w-[840px]">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead align="right">Last</DenseTableHead>
          <DenseTableHead align="right">Day</DenseTableHead>
          <DenseTableHead align="right">IV rank</DenseTableHead>
          <DenseTableHead align="right">Since added</DenseTableHead>
          <DenseTableHead>Thesis</DenseTableHead>
          <DenseTableHead>Age</DenseTableHead>
          <DenseTableHead>Keep</DenseTableHead>
          <DenseTableHead />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((r) => (
          <DenseTableRow key={r.item.contract_key}>
            <DenseTableCell>
              {/* An entity is its own destination. */}
              <Link
                to={withSymbolParam(SYMBOL_PATH, r.symbol)}
                className="font-mono font-bold text-primary hover:underline"
              >
                {r.symbol}
              </Link>
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
              {r.last == null ? '—' : r.last.toFixed(2)}
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, pnlColorClass(r.dayPct))}>
              {dayText(r.dayPct)}
            </DenseTableCell>
            <DenseTableCell
              className={cn(
                denseTableNumCell,
                r.ivRank != null && r.ivRank >= IV_HIGH ? 'text-warning' : 'text-muted-foreground',
              )}
              title={r.ivMeasuring ? 'Still reading this name’s IV percentile' : (r.ivAbsence ?? undefined)}
            >
              {r.ivRank != null ? r.ivRank.toFixed(0) : r.ivMeasuring ? '…' : '—'}
            </DenseTableCell>
            {/* Owed, and named rather than left blank — see the section note. */}
            <DenseTableCell
              className={cn(denseTableNumCell, 'text-muted-foreground/60')}
              title="Nothing records the price a watch was opened at, so there is no baseline to measure from."
            >
              owed
            </DenseTableCell>
            {/* The design gives this cell a 220px floor and lets it wrap:
                the claim is the column, so it is the one that keeps its width
                when the table narrows. Two lines, because a belief written by
                the loop carries its run id and a table row is not where that
                is read — the tip and the Board have the whole of it. */}
            <DenseTableCell className="min-w-[220px] max-w-[34ch] whitespace-normal text-dense-meta leading-relaxed">
              {r.thesis ? (
                <Link
                  to="/research/loop/hypotheses"
                  className="line-clamp-2 text-foreground/85 hover:underline"
                  title={r.thesis.thesis ?? r.thesis.title}
                >
                  {r.thesis.title}
                </Link>
              ) : (
                <span className="text-danger">no thesis</span>
              )}
            </DenseTableCell>
            <DenseTableCell className="text-dense-caption">
              <span className={r.ageTone === 'plain' ? 'text-muted-foreground' : 'text-warning'}>
                {r.ageDays == null ? '—' : `${r.ageDays}d`}
                {r.ageTone === 'old' ? ' · aging' : ''}
              </span>
            </DenseTableCell>
            <DenseTableCell>
              <span className="flex items-center gap-1.5">
              {/* Both of these say how the row is *filed*, which is why they
                  sit together and behind the readings. */}
              <DenseTagButton
                variant={r.item.optionable ? 'success' : 'neutral'}
                size="cell"
                onClick={() => onToggleOptionable(r.item)}
                aria-label={r.item.optionable ? 'Stop pulling options for this name' : 'Pull options for this name'}
              >
                {r.item.optionable ? 'OPT' : 'off'}
              </DenseTagButton>
              <Select
                value={r.item.category_id == null ? 'none' : String(r.item.category_id)}
                onValueChange={(v) =>
                  onCategoryChange(r.item, v === 'none' ? null : Number(v))
                }
              >
                <SelectTrigger className={watchlistCategorySelectClass} aria-label="Category">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </span>
            </DenseTableCell>
            <DenseTableCell>
              <span className="flex items-center gap-2.5">
                {/* The design's two promotions, in its order. Sizing takes the
                    name as a candidate; placing stays where it is (D10). */}
                {/* No `?symbol=`: Risk › Sizing does not read one, and a
                    parameter the destination drops is a dead link wearing a
                    live one's clothes. The design's own prototype sends the
                    bare route too. */}
                <Link
                  to="/risk/sizing"
                  className="text-dense-caption text-primary hover:underline"
                  title="Risk › Sizing does not take a name yet — it opens on the book's own caps."
                >
                  Size →
                </Link>
                <Link
                  to={withSymbolParam(SYMBOL_PATH, r.symbol)}
                  className="text-dense-caption text-primary hover:underline"
                >
                  Dossier →
                </Link>
                <IconActionButton
                  title={`Fundamentals and technicals for ${r.symbol}, beside the row`}
                  ariaLabel={`Inspect ${r.symbol}`}
                  onClick={() => onInspect(r.item)}
                >
                  <ScanSearch className="h-3.5 w-3.5" />
                </IconActionButton>
                {r.item.optionable ? (
                  <IconActionButton
                    title={`Track a ${r.symbol} contract`}
                    ariaLabel={`Track a ${r.symbol} contract`}
                    onClick={() => onAddOption(r.item)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </IconActionButton>
                ) : null}
                <IconActionButton
                  title={`Drop ${r.symbol} from the watchlist`}
                  ariaLabel={`Drop ${r.symbol}`}
                  onClick={() => onRemove(r.item)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconActionButton>
              </span>
            </DenseTableCell>
          </DenseTableRow>
        ))}
        {rows.length === 0 ? (
          <DenseTableRow>
            <DenseTableCell colSpan={9} className="py-6 text-center text-muted-foreground">
              Nothing watched. Add a ticker in the header, or pin one from the Screener, from Scan
              or from a Symbol page.
            </DenseTableCell>
          </DenseTableRow>
        ) : null}
      </DenseTableBody>
    </DenseDataTable>
  )
}

/** The count and the rule it serves, in the design's own words. */
export function WatchBookStandingNote({
  names,
  withoutThesis,
  aging,
}: {
  names: number
  withoutThesis: number
  aging: number
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-dense-caption text-muted-foreground">
      <DenseTag variant={withoutThesis > 0 ? 'danger' : 'neutral'} size="cell">
        {withoutThesis} of {names} without a thesis
      </DenseTag>
      <span>
        a watch without a thesis expires in 10 sessions — write one or let it fall off.
        {aging === names && names > 0 ? (
          <span className="ml-1 text-warning">
            Every name here is past that mark: this list has not been weeded, and the rule is not
            enforced on this side.
          </span>
        ) : null}
      </span>
    </span>
  )
}
