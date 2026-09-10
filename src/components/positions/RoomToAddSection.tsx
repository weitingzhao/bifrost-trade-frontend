/**
 * Room to add - three steps: what the free base backs on its own, what margin
 * adds up to the ceiling, and where the Pressure gauge lands after each.
 *
 * Always open: it answers a standing question, and a reader who has to expand
 * it first will not ask. Each step is a row of two meters - a premium ladder
 * that accumulates step over step on one scale, so the eye reads how much each
 * step adds to the last, and the pressure after it on the gauge's own 0-100%
 * scale with the band ticks - and each carries a ? that walks that row's
 * numbers back to the contracts, legs and broker fields they came from.
 */
import { useState } from 'react'
import { DerivationBlock } from './DerivationBlock'
import { cn } from '@/lib/utils'
import { pressureLevel, type CoverRow, type GaugeLevel } from '@/utils/bookVsBase'
import { PRESSURE_TICKS, usdAbbrev } from '@/utils/marginByAccount'
import { fmtUsd } from '@/utils/positions'
import { SegmentControl } from '@/components/data-display'
import { roomDerivation, type RoomView } from './roomDerivation'
import type { RoomToAdd } from '@/utils/roomToAdd'
import { riskLevelFor, RISK_LEVELS, type RiskLevelId } from '@/hooks/usePressureCeiling'

interface Props {
  room: RoomToAdd
  coverRows: readonly CoverRow[]
  ceiling: number
  onLevelChange: (id: RiskLevelId) => void
}

type TierId = 'now' | 'backed' | 'margin'

/** The ladder's colours: what is held, what the base would back, what margin would carry. */
const TIER_FILL: Record<TierId, string> = {
  now: 'bg-muted-foreground/50',
  backed: 'bg-profit',
  margin: 'bg-warning',
}
const TIER_TEXT: Record<TierId, string> = {
  now: 'text-foreground',
  backed: 'text-profit',
  margin: 'text-warning',
}
const BAND: Record<GaugeLevel, string> = { 0: 'idle', 1: 'normal', 2: 'heavy', 3: 'critical' }
const BAND_TEXT: Record<GaugeLevel, string> = { 0: 'text-muted-foreground', 1: 'text-foreground', 2: 'text-warning', 3: 'text-loss' }
const BAND_FILL: Record<GaugeLevel, string> = { 0: 'bg-profit', 1: 'bg-profit', 2: 'bg-warning', 3: 'bg-loss' }
/**
 * The step column was a fixed 11rem, which is narrower than three of the five
 * strings it holds: "Borrow against the account up to balanced 50%" wants
 * 290px and got 176. Every row truncated its meaning and its counts, so the
 * column that says *what each step is* was the one paying for the bars.
 *
 * It can now take up to 19rem when the section has the width, and still falls
 * back to 11rem — with the truncation behind it — when it does not. The bars
 * keep a 9rem floor; they are proportional, so they read fine narrower, which
 * the text does not.
 */
const GRID =
  'grid grid-cols-[minmax(11rem,19rem)_minmax(9rem,1fr)_4.75rem_4.25rem] items-center gap-x-2'

const plus = (n: number | null) => (n == null ? '—' : `+${n.toLocaleString()}`)
const pct0 = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`)
/** The band is read off the rounded figure the reader sees: a 49.9% that prints as 50% is heavy. */
const bandOf = (v: number | null): GaugeLevel | null => (v == null ? null : pressureLevel(Math.round(v * 100) / 100))

interface Tier {
  id: TierId
  label: string
  /** What this step means for the account, in the reader's terms. */
  meaning: string
  counts: string
  /** This step's premium per cycle; the Now row is the book's entry premium. */
  premium: number | null
  pressure: number | null
}

/** The premium ladder: every step up to this one, each in its own colour, on one scale. */
function PremiumLadder({ tiers, upTo, max }: { tiers: Tier[]; upTo: number; max: number }) {
  const shown = tiers.slice(0, upTo + 1)
  const cumulative = shown.reduce((n, t) => n + (t.premium ?? 0), 0)
  return (
    <span
      role="meter"
      aria-label={`${tiers[upTo].label}: premium per cycle, cumulative`}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(cumulative)}
      className="flex h-2 w-full overflow-hidden rounded-sm border border-border/60 bg-secondary"
      data-testid={`ladder-${tiers[upTo].id}`}
    >
      {shown.map((t) =>
        t.premium != null && t.premium > 0 && max > 0 ? (
          // Width is data, not styling.
          <span key={t.id} className={cn('block h-full', TIER_FILL[t.id])} style={{ width: `${(100 * t.premium) / max}%` }} />
        ) : null,
      )}
    </span>
  )
}

/** Pressure after the step, on the gauge's scale with its band ticks - the margin strip's bar, thinner. */
function PressureAfter({ label, pressure }: { label: string; pressure: number | null }) {
  const band = bandOf(pressure)
  const pct = pressure == null ? 0 : Math.round(Math.min(1, Math.max(0, pressure)) * 100)
  return (
    <span
      role="meter"
      aria-label={`${label}: pressure after`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="relative block h-1.5 w-full overflow-hidden rounded-sm border border-border/60 bg-secondary"
    >
      {band != null ? <span className={cn('absolute inset-y-0 left-0', BAND_FILL[band])} style={{ width: `${pct}%` }} /> : null}
      {PRESSURE_TICKS.map((t) => (
        <span key={t} aria-hidden="true" className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${t * 100}%` }} />
      ))}
    </span>
  )
}

function How({ view, label, open, onToggle }: { view: RoomView; label: string; open: boolean; onToggle: (v: RoomView) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(view)}
      aria-pressed={open}
      aria-label={`How ${label} is computed`}
      className={cn(
        'ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border/60 font-mono text-dense-caption leading-none',
        open ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      ?
    </button>
  )
}

export function RoomToAddSection({ room, coverRows, ceiling, onLevelChange }: Props) {
  const [openView, setOpenView] = useState<RoomView | null>(null)
  const r = room
  const ceilingPct = Math.round(ceiling * 100)
  const toggle = (v: RoomView) => setOpenView((cur) => (cur === v ? null : v))
  const level = riskLevelFor(ceiling)
  const tiers: Tier[] = [
    {
      id: 'now',
      label: 'Open now',
      meaning: 'What is already sold',
      counts: `${r.now.calls.toLocaleString()} calls · ${r.now.puts.toLocaleString()} puts`,
      premium: r.now.netPremium,
      pressure: r.now.pressure,
    },
    {
      id: 'backed',
      label: '+ Sell against what you own',
      meaning: 'Shares and cash already there, nothing borrowed',
      counts: `${plus(r.backed.calls)} calls · ${plus(r.backed.puts)} puts`,
      premium: r.backed.income,
      pressure: r.backed.pressureAfter,
    },
    {
      id: 'margin',
      label: '+ Sell on margin',
      meaning: `Borrow against the account up to ${level.label.toLowerCase()} risk, ${ceilingPct}% pressure`,
      counts: `${plus(r.margin.puts)} puts · calls need shares, not margin`,
      premium: r.margin.income,
      pressure: r.margin.pressureAfter,
    },
  ]
  const max = tiers.reduce((n, t) => n + (t.premium ?? 0), 0)
  const added = r.backed.income == null && r.margin.income == null ? null : (r.backed.income ?? 0) + (r.margin.income ?? 0)

  return (
    <section
      id="positions-room"
      aria-label="Room to add"
      className="rounded-md border border-border bg-secondary/40 px-3 py-1.5"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && openView) setOpenView(null)
      }}
    >
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">Room to add</span>
        <span className="font-mono text-dense-caption tabular-nums text-muted-foreground" data-testid="room-stats">
          {plus(r.backed.calls)} calls · {plus(r.backed.puts)} puts · {plus(r.margin.puts)} on margin
          {added != null ? ` · ≈ +${usdAbbrev(added)}/cycle` : ''}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">Risk</span>
          <SegmentControl
            size="sm"
            ariaLabel="How much of the cushion the margin step may spend"
            value={level.id}
            onChange={(v) => onLevelChange(v as RiskLevelId)}
            options={RISK_LEVELS.map((l) => ({
              value: l.id,
              label: (
                <span title={l.meaning}>
                  {l.label} <span className="font-mono tabular-nums opacity-70">{Math.round(l.pct * 100)}%</span>
                </span>
              ),
            }))}
          />
          <How view="all" label="Room to add" open={openView === 'all'} onToggle={toggle} />
        </span>
      </div>

      {/* Three lines of prose sat here explaining premium, pressure, what
          margin costs, and that these are estimates. Every one of those is
          already a variable in the derivation the `?` opens — NetPremium's
          tenor note, PressureNow's "at 100% pressure the broker starts closing
          positions", MarginPuts, and the intro's "Not the broker's what-if."
          It was a second copy of the same explanation, in the smallest type,
          permanently occupying the top of a dense panel.

          The caveat stays: a panel about money should say what kind of number
          it is without being asked. */}
      <p className="mb-1.5 text-dense-caption text-muted-foreground">
        Page estimates from the book&rsquo;s own numbers, not the broker&rsquo;s what-if —{' '}
        <span className="text-foreground">?</span> for how each figure is built.
      </p>

      <div className={cn(GRID, 'text-dense-label font-semibold uppercase tracking-wide text-muted-foreground')}>
        <span>Step</span>
        <span>Premium / cycle · pressure after</span>
        <span className="text-right">Premium</span>
        <span className="text-right">Pressure</span>
      </div>
      <div className="mt-1 flex flex-col gap-y-1.5" data-testid="room-tiers">
        {tiers.map((t, i) => {
          const band = bandOf(t.pressure)
          return (
            <div key={t.id} className={GRID} data-testid={`room-row-${t.id}`}>
              <span className="min-w-0">
                <span className="flex items-center">
                  <span className={cn('truncate text-dense-body font-medium', TIER_TEXT[t.id])} title={t.label}>
                    {t.label}
                  </span>
                  <How view={t.id} label={t.label} open={openView === t.id} onToggle={toggle} />
                </span>
                <span className="block truncate text-dense-caption text-muted-foreground" title={`${t.meaning}. ${t.counts}`}>
                  {t.meaning}
                </span>
                <span className="block truncate font-mono text-dense-caption tabular-nums text-muted-foreground" title={t.counts}>
                  {t.counts}
                </span>
              </span>
              <span className="flex flex-col gap-y-1">
                <PremiumLadder tiers={tiers} upTo={i} max={max} />
                <PressureAfter label={t.label} pressure={t.pressure} />
              </span>
              <span className={cn('text-right font-mono text-dense-body tabular-nums', TIER_TEXT[t.id])}>
                {t.premium == null ? '—' : `${i > 0 ? '+' : ''}${fmtUsd(t.premium, true)}`}
              </span>
              <span
                className={cn('text-right font-mono text-dense-body tabular-nums', band == null ? 'text-muted-foreground' : BAND_TEXT[band])}
                title={band == null ? undefined : BAND[band]}
              >
                {pct0(t.pressure)}
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-dense-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className={cn('inline-block h-2 w-3 rounded-sm', TIER_FILL.now)} />held
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={cn('inline-block h-2 w-3 rounded-sm', TIER_FILL.backed)} />backed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={cn('inline-block h-2 w-3 rounded-sm', TIER_FILL.margin)} />on margin
        </span>
        <span>· wide bar = premium, each step on the last · thin bar = pressure after, ticks at 10 · 50 · 75%</span>
      </p>

      {openView ? (
        <DerivationBlock derivation={roomDerivation(r, coverRows, openView)} onClose={() => setOpenView(null)} className="mb-1" />
      ) : null}
    </section>
  )
}
