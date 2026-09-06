/**
 * The Owner's dashboard: the base under the options, as two rings.
 *
 * The rings are the ones the page had before 872bb58, brought back in the
 * shape the Owner used them — at page level, outside any view, so they cannot
 * vanish behind a tab again. Each is a picture of a fact the page already
 * derives, never a second derivation:
 *
 *   Backing pool        book.base — what the options have taken from each layer
 *   Holdings by symbol  the scoped stock rows — click a slice to scope the page
 *
 * The third ring, Asset mix, is the accounts' capital rather than the base,
 * so it sits in the cockpit column beside the margin strip — the two columns
 * read "the accounts" on the left and "the base" on the right.
 *
 * Collapsible and remembered; open by default because the Owner reads it.
 */
import type { LivePositionRow } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { BookVsBase } from '@/utils/bookVsBase'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
} from '@/components/data-display'
import styles from './PositionsChartsSection.module.css'
import { BackingPoolCard } from './charts/BackingPoolCard'
import { HoldingsBySymbolCard } from './charts/HoldingsBySymbolCard'

export type BackingSegmentTarget = 'calls' | 'puts' | 'free' | 'income'

interface Props {
  open: boolean
  onToggle: () => void
  book: BookVsBase
  /** Every non-option row in scope, all three buckets. */
  stocks: readonly LivePositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  activeSymbol: string
  onSymbolClick: (symbol: string) => void
  onBackingSegment: (target: BackingSegmentTarget) => void
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.panel} aria-label={title}>
      <span className="mb-1 block text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      {children}
    </section>
  )
}

export function PositionsDashboard({
  open,
  onToggle,
  book,
  stocks,
  quotesBySymbol,
  quotesByCk,
  activeSymbol,
  onSymbolClick,
  onBackingSegment,
}: Props) {
  const inUse = book.base.reduce((n, l) => n + (l.backingValue ?? 0), 0)
  const total = book.base.reduce((n, l) => n + l.marketValue, 0)

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>Dashboard</CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {total > 0 ? `${Math.round((inUse / total) * 100)}% of base in use` : 'no base holdings'}
          </span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {open ? (
        <CollapsibleGroupBody>
          <Card title="Backing pool">
            <BackingPoolCard book={book} onSegmentClick={onBackingSegment} />
          </Card>
          <div className="mt-2">
            <Card title="Holdings by symbol">
              <HoldingsBySymbolCard
                stocks={stocks}
                quotesBySymbol={quotesBySymbol}
                quotesByCk={quotesByCk}
                activeSymbol={activeSymbol}
                onSymbolClick={onSymbolClick}
              />
            </Card>
          </div>
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}
