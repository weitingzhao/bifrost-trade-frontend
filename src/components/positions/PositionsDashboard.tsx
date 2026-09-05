/**
 * The Owner's dashboard: three rings, beside the cockpit.
 *
 * The three rings are the ones the page had before 872bb58, brought back in the
 * shape the Owner used them — and this time at page level, outside any view, so
 * they cannot vanish behind a tab again. Each is a picture of a fact the page
 * already derives, never a second derivation:
 *
 *   Backing pool        book.base — what the options have taken from each layer
 *   Holdings by symbol  the scoped stock rows — click a slice to scope the page
 *   Asset mix           the scoped accounts — what the capital is made of
 *
 * The Backing pool ring takes the full width because its legend is the layer
 * table; the other two share a row. The short-leg risk map sits with the
 * cockpit instead — it is a picture of the Risk gauge, not of the base.
 *
 * Collapsible and remembered; open by default because the Owner reads it.
 */
import type { IbAccountSnapshot } from '@/types/monitor'
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
import { AssetMixCard } from './charts/AssetMixCard'

export type BackingSegmentTarget = 'calls' | 'puts' | 'free' | 'income'

interface Props {
  open: boolean
  onToggle: () => void
  book: BookVsBase
  /** Every non-option row in scope, all three buckets. */
  stocks: readonly LivePositionRow[]
  coreStocks: readonly LivePositionRow[]
  incomeEtfs: readonly LivePositionRow[]
  cashLike: readonly LivePositionRow[]
  /** Accounts in scope — the HOST / Secondary toggles decide. */
  accounts: readonly IbAccountSnapshot[]
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  activeSymbol: string
  onSymbolClick: (symbol: string) => void
  onBackingSegment: (target: BackingSegmentTarget) => void
}

function Card({
  title,
  showTitle = true,
  children,
}: {
  title: string
  /** The asset-mix card prints its own title beside its %/$ switch. */
  showTitle?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={styles.panel} aria-label={title}>
      {showTitle ? (
        <span className="mb-1 block text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      ) : null}
      {children}
    </section>
  )
}

export function PositionsDashboard({
  open,
  onToggle,
  book,
  stocks,
  coreStocks,
  incomeEtfs,
  cashLike,
  accounts,
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
          <div className="mt-2 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-2">
            <Card title="Holdings by symbol">
              <HoldingsBySymbolCard
                stocks={stocks}
                quotesBySymbol={quotesBySymbol}
                quotesByCk={quotesByCk}
                activeSymbol={activeSymbol}
                onSymbolClick={onSymbolClick}
              />
            </Card>
            <Card title="Asset mix" showTitle={false}>
              <AssetMixCard accounts={accounts} coreStocks={coreStocks} incomeEtfs={incomeEtfs} cashLike={cashLike} />
            </Card>
          </div>
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}
