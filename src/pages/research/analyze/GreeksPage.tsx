/**
 * Contract Greeks — walked against `Research Contract Greeks.dc.html`
 * (Rev 2026-09-19.2) on 2026-09-22. Observe-only (D10).
 *
 * ## The route changed subject, and the old one kept its place
 *
 * The design calls this page *"every option leg in the book, greek by greek —
 * the per-leg detail behind Risk › Exposure's aggregates"*. This side held
 * something else: a chain calculator — pick a symbol and a past trade date,
 * fetch the chain, read greeks per contract with the Black-Scholes derivation
 * behind each row. Both are real, and they answer different questions, so the
 * design's page leads and the calculator is the second face rather than a
 * deletion (Owner ruling 2026-09-18: absence from the design is not deletion).
 *
 * ## The strip is not computed here, and that is the design's own rule
 *
 * Its footer: *β-weighted aggregation across the whole book — including stock
 * — is Risk › Exposure's job; this page never re-aggregates differently.* So
 * the strip prints `useOptionGreeks`'s rollup — the same object Risk ›
 * Exposure prints — with Risk's own captions (`Γ · per point`, `Vega · per
 * vol pt`, `Θ · per day`). The design's `Γ$ / 1%` is a rescaling this side
 * does not make; two pages showing one book's gamma at two scales is exactly
 * what that sentence forbids.
 *
 * ## What the book holds
 *
 * Measured on DEV 2026-09-22: 11 short option legs over three expiries, nine
 * underlyings, nine calls and two puts. **9 of the 11 price.** The two that do
 * not are both AMD, and `/market/options/snapshots` answers `count: 0` for AMD
 * at every expiry tried while the other eight underlyings answer with today's
 * capture — AMD is absent from the snapshot store, not behind in it. Those two
 * rows are drawn, marked UNPRICED, and counted out of the totals.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import { pnlColorClass } from '@/utils/dailyChange'
import { ChainCalculatorFace } from './greeks/ChainCalculatorFace'
import { BookLegsPanel } from './greeks/BookLegsPanel'
import { useBookGreeks } from './greeks/useBookGreeks'

type Face = 'book' | 'chain'

const FACES = [
  { value: 'book', label: 'Book legs' },
  { value: 'chain', label: 'Chain calculator' },
]

function Stat({
  cap,
  value,
  ink,
  sub,
}: {
  cap: string
  value: string
  ink?: string
  sub?: string
}) {
  return (
    <div className="flex min-w-[96px] flex-col gap-0.5">
      <span className="text-dense-micro font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {cap}
      </span>
      <span className={cn('font-mono text-base font-bold tabular-nums', ink)}>{value}</span>
      {sub ? <span className="text-dense-caption text-muted-foreground">{sub}</span> : null}
    </div>
  )
}

function BookFace() {
  // Read once: DTE must not change under the reader between renders.
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10))
  const b = useBookGreeks(todayIso)
  // Contracts for the table and the marks line, holdings for the totals: the
  // rollup sums the book's per-instance legs, and one contract can be three.
  const contracts = b.rows.length
  const priced = contracts - b.marks.unpriced
  const holdings = b.totals.matched + b.totals.unmatched

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-x-7 gap-y-3 rounded-md border border-border px-3.5 py-2.5">
        <Stat
          cap="Contracts"
          value={String(contracts)}
          sub={`${priced} priced · ${holdings} holdings`}
        />
        <Stat
          cap="Δ · options only"
          value={priced > 0 ? fmtUsd(b.totals.delta, true) : '—'}
          ink={pnlColorClass(b.totals.delta)}
          sub="shares-equivalent, not β-weighted"
        />
        <Stat
          cap="Γ · per point"
          value={priced > 0 ? fmtUsd(b.totals.gamma, true) : '—'}
          ink={b.totals.gamma < 0 ? 'text-warning' : undefined}
          sub={b.totals.gamma < 0 ? 'short gamma' : 'long gamma'}
        />
        <Stat cap="Vega · per vol pt" value={priced > 0 ? fmtUsd(b.totals.vega, true) : '—'} />
        <Stat
          cap="Θ · per day"
          value={priced > 0 ? fmtUsd(b.totals.theta, true) : '—'}
          ink={pnlColorClass(b.totals.theta)}
        />
        <div className="ml-auto flex min-w-[180px] flex-col gap-0.5">
          <span className="text-dense-micro font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Marks
          </span>
          <span
            className={cn(
              'text-dense-caption leading-relaxed',
              b.marks.tone === 'warn' ? 'text-warning' : 'text-muted-foreground',
            )}
          >
            {b.isLoading ? 'reading the chains…' : b.marks.text}
          </span>
          <span className="text-dense-caption text-muted-foreground">
            spot {b.spotMix.live} live · {b.spotMix.close} close · {b.spotMix.mark} broker mark
            {b.spotMix.none > 0 ? ` · ${b.spotMix.none} unpriced` : ''}
          </span>
        </div>
      </div>

      {b.isError ? (
        <p role="status" className="text-dense-meta text-danger">
          The chain snapshots did not answer — no leg on this page can be called priced.
        </p>
      ) : null}

      <BookLegsPanel
        groups={b.groups}
        tightPct={b.tightPct}
        loading={b.isLoading}
        footer={
          <>
            Greeks are per leg from the vendor&rsquo;s dated chain snapshot — the same capture{' '}
            <Link to="/portfolio/positions" className="text-foreground hover:underline">
              Positions
            </Link>{' '}
            prices from — scaled to the position (per share × contracts × 100) and signed by it. A
            leg the vendor cannot price keeps its row and is counted out of the totals, never summed
            as zero. β-weighted aggregation across the whole book, including stock, is{' '}
            <Link to="/risk/portfolio" className="text-foreground hover:underline">
              Risk › Portfolio Exposure
            </Link>
            &rsquo;s job; the strip above is that page&rsquo;s own rollup, not a second one.
          </>
        }
      />
    </div>
  )
}

export default function GreeksPage() {
  const [face, setFace] = useState<Face>('book')
  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Contract Greeks"
        description="Every option leg in the book, greek by greek — the per-leg detail behind Risk › Exposure's aggregates."
        actions={
          <Link
            to="/risk/portfolio"
            className="text-dense-meta text-muted-foreground hover:text-foreground"
          >
            Aggregates in Risk →
          </Link>
        }
      />
      <SegmentControl value={face} onChange={(v) => setFace(v as Face)} options={FACES} />
      {face === 'book' ? <BookFace /> : <ChainCalculatorFace />}
    </PageShell>
  )
}
