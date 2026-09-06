/**
 * The first thing on the page: the option book measured against its base.
 *
 * Four gauges, graded 0–3, one line each. They replace the alarm strip and
 * Composition as the opening screen: the strip stated the same facts as chips
 * with no scale, and the donuts answered how capital is allocated, which is a
 * description rather than a state. A seller opening this page wants to know how
 * tight, how backed, how exposed, how much room — and in that order.
 *
 * Below the gauges, demand against supply. The numbers are the same ones the
 * gauges grade; showing both sides is what makes the grade auditable.
 *
 * Everything here is derived once in usePositionsAlarm. Nothing is recomputed,
 * so the gauge cannot disagree with the tables it summarises.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTagButton } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import type { BookVsBase, GaugeLevel } from '@/utils/bookVsBase'
import type { AlarmCheck, AlarmTarget } from '@/hooks/usePositionsAlarm'
import type { ObligationsSort } from '@/utils/obligationsRoom'
import { fmtSpotDate, type SpotMix } from '@/utils/spotPrice'
import { cushionBand } from '@/utils/positionsOptionRisk'

const LEVEL_TONE: Record<GaugeLevel, string> = {
  0: 'bg-profit',
  1: 'bg-profit',
  2: 'bg-warning',
  3: 'bg-loss',
}

function Gauge({
  label,
  level,
  tone,
  children,
  title,
  onOpen,
}: {
  label: string
  level: GaugeLevel | null
  /** Override the level colour — potential is an opportunity, not a warning. */
  tone?: string
  children: React.ReactNode
  title: string
  /** The section holding this gauge's detail; the label is the way in. */
  onOpen: () => void
}) {
  const fill = tone ?? (level == null ? 'bg-muted-foreground/40' : LEVEL_TONE[level])
  const lit = level == null ? 0 : level + 1
  return (
    <div
      className="grid grid-cols-[5.25rem_4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5"
      title={`${title}\nClick the label to open the detail.`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="text-left text-dense-body font-medium text-foreground hover:text-link hover:underline"
      >
        {label}
      </button>
      <span className="flex gap-0.5" aria-label={level == null ? 'not graded' : `level ${level} of 3`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'block h-2 w-3.5 rounded-sm border border-border/60',
              i < lit ? fill : 'bg-secondary',
            )}
          />
        ))}
      </span>
      <span className="min-w-0 text-dense-body leading-snug text-muted-foreground">{children}</span>
    </div>
  )
}

function Num({ children, tone, title }: { children: React.ReactNode; tone?: string; title?: string }) {
  return (
    <span className={cn('font-mono tabular-nums text-foreground', tone)} title={title}>
      {children}
    </span>
  )
}

function pct0(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`
}

function usdK(v: number | null): string {
  if (v == null) return '—'
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return fmtUsd(v)
}

export function BookVsBaseCockpit({
  book,
  checks,
  cushionTightPct,
  onOpenTarget,
  variant = 'full',
  headerLink,
  spotMix,
}: {
  book: BookVsBase
  /** All nine checks; each is a chip with a place to land, quiet ones in grey. */
  checks: AlarmCheck[]
  /** The tightness setting, so the Risk line can say how close the closest leg is to it. */
  cushionTightPct: number
  onOpenTarget: (t: AlarmTarget, sort?: ObligationsSort) => void
  /**
   * 'full' is the Positions opening screen. 'backing' is the same block on the
   * Backing page, holding only the two gauges that page answers — the thin
   * context strip professional tools carry from screen to screen.
   */
  variant?: 'full' | 'backing'
  /** The other page, one click away. */
  headerLink?: { to: string; label: string }
  /** How the Risk line's underlyings were priced; a mark is not live and says so. */
  spotMix?: SpotMix
}) {
  const { pressure, backing, risk, potential, demand, supply } = book
  const full = variant === 'full'
  const tightest = risk.counts.tightest
  const tightestTone =
    tightest == null
      ? 'text-warning'
      : cushionBand(tightest, cushionTightPct) === 'breached'
        ? 'text-loss'
        : cushionBand(tightest, cushionTightPct) === 'tight'
          ? 'text-warning'
          : 'text-profit'

  return (
    <section
      className="rounded-md border border-border bg-secondary/40 px-3 py-2.5"
      aria-label="Option book against the base"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          {full ? 'Option book against the base' : 'Backing — the options against the base'}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-1">
          {headerLink ? (
            <Link to={headerLink.to} className="mr-1 text-dense-caption text-link hover:underline">
              {headerLink.label}
            </Link>
          ) : null}
          {(full ? checks : []).map((c) =>
            c.tone === 'ok' || !c.target ? (
              // Quiet, or nowhere to land (the feed age is a fact, not a section).
              <button
                key={c.id}
                type="button"
                disabled={!c.target}
                title={c.target ? `${c.detail}\nClick to open the detail.` : c.detail}
                onClick={() => c.target && onOpenTarget(c.target)}
                className={cn(
                  'rounded-sm px-1 text-dense-caption text-muted-foreground',
                  c.tone !== 'ok' && 'text-warning',
                  c.target && 'hover:text-foreground hover:underline',
                )}
              >
                {c.label} <span className="font-mono tabular-nums">{c.value}</span>
              </button>
            ) : (
              <DenseTagButton
                key={c.id}
                variant={c.tone === 'danger' ? 'danger' : 'warning'}
                size="cell"
                title={`${c.detail}\nClick to open the section with the detail.`}
                onClick={() => onOpenTarget(c.target as AlarmTarget)}
              >
                {c.label} <span className="font-mono tabular-nums">{c.value}</span>
              </DenseTagButton>
            ),
          )}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {full ? (
        <Gauge
          label="Pressure"
          onOpen={() => onOpenTarget('margin')}
          level={pressure.pct == null ? null : pressure.level}
          title="1 − the broker's own Cushion. At 100% excess liquidity is gone and it starts closing positions; level 3 begins at 75%."
        >
          <Num>{pct0(pressure.pct)}</Num> of margin used · cushion {pct0(pressure.cushion)} · broker
          liquidates at 100%
        </Gauge>
        ) : null}

        <Gauge
          label="Backing"
          onOpen={() => onOpenTarget('coverage', 'cash')}
          level={backing.level}
          title="What the options need against what actually backs them. Any naked call is level 2; puts leaning on margin rather than cash is level 1."
        >
          <Num>
            {backing.callsCovered} / {backing.callsTotal}
          </Num>{' '}
          calls covered
          {backing.nakedCalls > 0 ? (
            <>
              {' · '}
              <Num tone="text-loss">{backing.nakedCalls} naked</Num>
            </>
          ) : null}
          {backing.putCashNeeded > 0 ? (
            <>
              {' · '}puts need <Num>{usdK(backing.putCashNeeded)}</Num>, cash holds{' '}
              <Num>{usdK(backing.cashLike)}</Num>
            </>
          ) : null}
        </Gauge>

        {full ? (
        <Gauge
          label="Risk"
          onOpen={() => onOpenTarget('ladder')}
          level={risk.level}
          title="Short legs already past their strike, or expiring within a week. Unpriced legs are excluded from both counts and are not known to be safe."
        >
          <Num tone={risk.counts.itm > 0 ? 'text-loss' : undefined}>{risk.counts.itm}</Num> in the
          money · <Num tone={risk.counts.near7d > 0 ? 'text-warning' : undefined}>{risk.counts.near7d}</Num>{' '}
          expiring within 7d
          {risk.counts.zeroDte > 0 ? (
            <>
              {' · '}
              <Num tone="text-loss">{risk.counts.zeroDte} today</Num>
            </>
          ) : null}
          {risk.counts.unpriced > 0 ? (
            <>
              {' · '}
              <Num tone="text-warning">{risk.counts.unpriced} unpriced</Num>
            </>
          ) : null}
          {spotMix && spotMix.close > 0 ? (
            <>
              {' · '}
              <Num tone="text-warning" title="Priced at the latest daily close in the warehouse, not a live quote.">
                {spotMix.close} at close {fmtSpotDate(spotMix.oldestCloseAsOf, 'close')}
              </Num>
            </>
          ) : null}
          {spotMix && spotMix.mark > 0 ? (
            <>
              {' · '}
              <Num tone="text-warning" title="Priced at the broker's mark on the position row — its own time stamp is shown.">
                {spotMix.mark} at mark {fmtSpotDate(spotMix.oldestMarkAsOf)}
              </Num>
            </>
          ) : null}
          {' · '}
          {tightest == null ? (
            <Num tone={tightestTone}>tightest n/a</Num>
          ) : (
            <>
              tightest{' '}
              <Num tone={tightestTone}>
                {tightest >= 0 ? '+' : ''}
                {(tightest * 100).toFixed(1)}%
              </Num>{' '}
              vs {Math.round(cushionTightPct * 100)}%
            </>
          )}
        </Gauge>
        ) : null}

        <Gauge
          label="Potential"
          onOpen={() => onOpenTarget('coverage', 'spare')}
          level={3}
          tone="bg-link"
          title="What is still free to sell against, and what the book earns a day. An opportunity, not a warning — so it is not graded."
        >
          <Num>{potential.moreCalls}</Num> more calls on {potential.sharesFree.toLocaleString()} free
          shares
          {potential.unusedBuyingPower != null ? (
            <>
              {' · '}
              <Num>{usdK(potential.unusedBuyingPower)}</Num> buying power unused
            </>
          ) : null}
          {potential.thetaPerDay != null ? (
            <>
              {' · '}
              <Num tone={potential.thetaPerDay >= 0 ? 'text-profit' : 'text-loss'}>
                θ {potential.thetaPerDay >= 0 ? '+' : ''}
                {fmtUsd(potential.thetaPerDay, true)}
              </Num>
              /day
            </>
          ) : null}
        </Gauge>
      </div>

      <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 border-t border-border/60 pt-2 text-dense-body">
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          Demand — what the options need
        </span>
        <span />
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          Supply — what backs them
        </span>

        <span>
          Puts need <Num>{usdK(demand.putCash)}</Num> cash
        </span>
        <span className="text-center text-muted-foreground">→</span>
        <span>
          Cash and SGOV <Num>{usdK(supply.cashLike)}</Num>
          {supply.buyingPower != null ? (
            <>
              {' · '}buying power <Num>{usdK(supply.buyingPower)}</Num>
            </>
          ) : null}
        </span>

        <span>
          Calls need <Num>{demand.callShares.toLocaleString()}</Num> shares
        </span>
        <span className="text-center text-muted-foreground">→</span>
        <span>
          Held <Num>{supply.sharesHeld.toLocaleString()}</Num> · free{' '}
          <Num>{supply.sharesFree.toLocaleString()}</Num>
        </span>
      </div>
    </section>
  )
}
