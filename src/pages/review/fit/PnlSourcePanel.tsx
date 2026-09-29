/**
 * Where the P&L came from (design Rev .112, §5.1.3): the Judgment-or-luck
 * reading P&L Explain used to carry, quoted per trade.
 *
 * The attribution — Δ, Γ, vega, θ and what is left unexplained — is computed
 * on P&L Explain from a daily snapshot of positions, marks and Greeks, keyed by
 * trade; Review quotes it and never recomputes it. No such snapshot is stored
 * (measured 2026-09-29: no attribution endpoint on trade-api, Research or the
 * market-data plugin), so every cell reads — and the panel says why, in the
 * design's own not-wired form.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import type { ReviewTrade } from '@/utils/reviewTrades'

const PARTS = ['Δ · direction', 'Γ · convexity', 'Vega · vol marks', 'Θ · carry', 'Unexplained'] as const

/** A severity edge on a card is inline: `mat-card` clears border-colour classes. */
const WARN_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' }

export function PnlSourcePanel({ trade }: { trade: Pick<ReviewTrade, 'shortPremium' | 'exitKind'> }) {
  // A credit trade is a sell-vol play and should earn from carry; a debit one is a drift play.
  const should = trade.shortPremium ? 'should earn from θ + vega' : 'should earn from Δ'
  return (
    <section className={positionsUi.panel} style={WARN_EDGE} aria-label="Where the P&L came from">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Where the P&amp;L came from</span>
        <span className={positionsUi.panelTitle}>{should}</span>
        <DenseTag variant="warning" size="cell" className="ml-auto">
          ⚠ needs the daily snapshot
        </DenseTag>
        <Link to="/portfolio/pnl-explain" className={positionsUi.link}>
          P&amp;L Explain →
        </Link>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2 px-3 py-2.5">
        {PARTS.map((label) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-dense-meta font-semibold text-muted-foreground">{label}</span>
            <span className={cn(positionsUi.mono, 'text-dense-body font-semibold text-muted-foreground')}>—</span>
            <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>no snapshot</span>
          </div>
        ))}
      </div>
      <p className="m-0 border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
        The attribution for this trade is computed on P&amp;L Explain from the daily snapshot, keyed by trade. No snapshot
        is stored yet, so nothing here is a reading{trade.exitKind === 'open' ? ' — and on an open trade it would be provisional' : ''}.
      </p>
    </section>
  )
}
