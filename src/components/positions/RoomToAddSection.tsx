/**
 * Room to add — three steps: what the free base backs on its own, what
 * margin adds up to the ceiling, and where the Pressure gauge lands after
 * each. Each step is a row of two meters: the premium per cycle, drawn as
 * a ladder that accumulates step over step so the eye reads how much each
 * adds to the last, and the pressure after it on the gauge's own 0–100%
 * scale with the band ticks. The header carries the answer; the ? walks
 * every number back to the fields it came from.
 */
import { useState } from 'react'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
} from '@/components/data-display'
import { DerivationBlock } from './DerivationBlock'
import { cn } from '@/lib/utils'
import { pressureLevel, type CoverRow, type GaugeLevel } from '@/utils/bookVsBase'
import { PRESSURE_TICKS, usdAbbrev } from '@/utils/marginByAccount'
import { fmtUsd } from '@/utils/positions'
import { roomDerivation } from './roomDerivation'
import type { RoomToAdd } from '@/utils/roomToAdd'
import { PRESSURE_CEILING_MAX, PRESSURE_CEILING_MIN } from '@/hooks/usePressureCeiling'

interface Props {
  open: boolean
  onToggle: () => void
  room: RoomToAdd
  coverRows: readonly CoverRow[]
  ceiling: number
  onCeilingChange: (ceiling: number) => void
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

const plus = (n: number | null) => (n == null ? '—' : `+${n.toLocaleString()}`)
const pct0 = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`)
/** The band is read off the rounded figure the reader sees: a 49.9% that prints as 50% is heavy. */
const bandOf = (v: number | null): GaugeLevel | null => (v == null ? null : pressureLevel(Math.round(v * 100) / 100))

interface Tier {
  id: TierId
  label: string
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

/** Pressure after the step, on the gauge's scale with its band ticks — the margin strip's bar, thinner. */
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

export function RoomToAddSection({ open, onToggle, room, coverRows, ceiling, onCeilingChange }: Props) {
  const [how, setHow] = useState(false)
  const r = room
  const ceilingPct = Math.round(ceiling * 100)
  const tiers: Tier[] = [
    { id: 'now', label: 'Now', counts: `${r.now.calls.toLocaleString()} calls · ${r.now.puts.toLocaleString()} puts`, premium: r.now.netPremium, pressure: r.now.pressure },
    {
      id: 'backed',
      label: '+ Backed',
      counts: `${plus(r.backed.calls)} calls · ${plus(r.backed.puts)} puts · no new margin`,
      premium: r.backed.income,
      pressure: r.backed.pressureAfter,
    },
    {
      id: 'margin',
      label: `+ Margin to ${ceilingPct}%`,
      counts: `${plus(r.margin.puts)} puts on margin`,
      premium: r.margin.income,
      pressure: r.margin.pressureAfter,
    },
  ]
  const max = tiers.reduce((n, t) => n + (t.premium ?? 0), 0)
  const added = r.backed.income == null && r.margin.income == null ? null : (r.backed.income ?? 0) + (r.margin.income ?? 0)
  const tenor = r.now.tenor ? `${r.now.tenor.min}–${r.now.tenor.max} d` : null

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        {/* The title never gives way to the figures: it stays whole, the figures wrap. */}
        <CollapsibleGroupTitle className="shrink-0">Room to add</CollapsibleGroupTitle>
        <CollapsibleGroupStats className="min-w-0 shrink justify-end">
          <span className="font-mono text-xs tabular-nums text-muted-foreground" data-testid="room-stats">
            {plus(r.backed.calls)} calls · {plus(r.backed.puts)} puts · {plus(r.margin.puts)} on margin
            {added != null ? ` · ≈ +${usdAbbrev(added)}/cycle` : ''}
          </span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {open ? (
        <CollapsibleGroupBody>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-dense-caption text-muted-foreground">
            <label
              className="flex h-7 items-center gap-1 rounded-md border border-border bg-card px-1.5"
              title="The pressure the margin step may run up to. 50% is where the gauge turns heavy."
            >
              <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">Ceiling</span>
              <input
                type="number"
                min={PRESSURE_CEILING_MIN * 100}
                max={PRESSURE_CEILING_MAX * 100}
                step={5}
                value={ceilingPct}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) onCeilingChange(n / 100)
                }}
                className="w-10 bg-transparent text-right font-mono text-sm tabular-nums text-foreground outline-none"
                aria-label="Pressure ceiling for the margin step, percent"
              />
              <span className="text-sm">%</span>
            </label>
            <span className="min-w-0">
              yield {r.pool.yieldPerCycle != null ? `${(r.pool.yieldPerCycle * 100).toFixed(1)}%` : '—'}/cycle{tenor ? ` of ${tenor}` : ''} · Reg T{' '}
              {r.margin.marginPerPut != null ? usdAbbrev(r.margin.marginPerPut) : '—'}/put
              {r.margin.leverage != null ? ` (${r.margin.leverage.toFixed(1)}× less than cash-secured)` : ''} · estimates
            </span>
            <button
              type="button"
              onClick={() => setHow((v) => !v)}
              aria-pressed={how}
              aria-label="How Room to add is computed"
              className={cn(
                'ml-auto inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border/60 font-mono leading-none',
                how ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              ?
            </button>
          </div>

          {/* Column heads, then one row a step: label and counts · the two meters · the figures. */}
          <div className="grid grid-cols-[6.75rem_minmax(0,1fr)_4.75rem_3.75rem] items-end gap-x-2 text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Step</span>
            <span>Premium / cycle · pressure after</span>
            <span className="text-right">Premium</span>
            <span className="text-right">Pressure</span>
          </div>
          <div className="mt-1 flex flex-col gap-y-1.5" data-testid="room-tiers">
            {tiers.map((t, i) => {
              const band = bandOf(t.pressure)
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[6.75rem_minmax(0,1fr)_4.75rem_3.75rem] items-center gap-x-2"
                  data-testid={`room-row-${t.id}`}
                >
                  <span className="min-w-0">
                    <span className={cn('block truncate text-dense-body font-medium', TIER_TEXT[t.id])}>{t.label}</span>
                    <span className="block truncate text-dense-caption text-muted-foreground" title={t.counts}>
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
                  <span className={cn('text-right font-mono text-dense-body tabular-nums', band == null ? 'text-muted-foreground' : BAND_TEXT[band])} title={band == null ? undefined : BAND[band]}>
                    {pct0(t.pressure)}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-dense-caption text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className={cn('inline-block h-2 w-3 rounded-sm', TIER_FILL.now)} />held</span>
            <span className="inline-flex items-center gap-1"><span className={cn('inline-block h-2 w-3 rounded-sm', TIER_FILL.backed)} />backed</span>
            <span className="inline-flex items-center gap-1"><span className={cn('inline-block h-2 w-3 rounded-sm', TIER_FILL.margin)} />on margin</span>
            <span>· ladder = premium per cycle, each step on the last · thin bar = pressure after, ticks at 10 · 50 · 75%</span>
          </p>
          {how ? <DerivationBlock derivation={roomDerivation(r, coverRows)} onClose={() => setHow(false)} className="mb-1" /> : null}
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}
