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
import type { CoverRow } from '@/utils/bookVsBase'
import { usdAbbrev } from '@/utils/marginByAccount'
import { fmtUsd } from '@/utils/positions'
import { SegmentControl } from '@/components/data-display'
import { positionsUi } from './positionsUi'
import { roomDerivation, type RoomView } from './roomDerivation'
import { roomIncome, type RoomToAdd } from '@/utils/roomToAdd'
import { riskLevelFor, RISK_LEVELS, type RiskLevelId } from '@/hooks/usePressureCeiling'

interface Props {
  room: RoomToAdd
  coverRows: readonly CoverRow[]
  ceiling: number
  onLevelChange: (id: RiskLevelId) => void
  /** §16 (Positions): the caveat shrinks to a label, its sentence in the title. Backing prints it whole. */
  quiet?: boolean
}

type TierId = 'now' | 'backed' | 'margin'

/** The ladder's colours: what is held, what the base would back, what margin would carry. */
const TIER_FILL: Record<TierId, string> = {
  now: 'bg-[var(--sk-line2)]',
  backed: 'bg-profit',
  margin: 'bg-warning',
}
const TIER_NAME: Record<TierId, string> = {
  now: 'text-foreground',
  backed: 'text-profit',
  margin: 'text-warning',
}
const TIER_PREMIUM: Record<TierId, string> = {
  now: 'text-secondary-foreground',
  backed: 'text-profit',
  margin: 'text-warning',
}

/** Pressure after a step reads amber from 50%, the heavy line; it is risk, never a fault, so never red. */
const HEAVY = 0.5

const plus = (n: number | null) => (n == null ? '—' : `+${n.toLocaleString()}`)
const pct0 = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`)
/** Read off the rounded figure the reader sees: a 49.9% that prints as 50% is heavy. */
const heavy = (v: number | null) => v != null && Math.round(v * 100) / 100 >= HEAVY

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
      className="flex h-2 w-full overflow-hidden rounded-sm bg-[var(--sk-surface)]"
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

/** Pressure after the step, on the gauge's 0–100% scale. */
function PressureAfter({ label, pressure }: { label: string; pressure: number | null }) {
  const pct = pressure == null ? 0 : Math.round(Math.min(1, Math.max(0, pressure)) * 100)
  return (
    <span
      role="meter"
      aria-label={`${label}: pressure after`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="relative block h-1 w-full rounded-sm bg-[var(--sk-surface)]"
    >
      {pressure != null ? (
        <span
          className={cn('absolute inset-y-0 left-0 rounded-sm', heavy(pressure) ? 'bg-warning' : 'bg-profit')}
          style={{ width: `${pct}%` }}
        />
      ) : null}
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
      title={`How ${label} is built`}
      className={cn(positionsUi.q, open && 'border-primary text-primary')}
    >
      ?
    </button>
  )
}

export function RoomToAddSection({ room, coverRows, ceiling, onLevelChange, quiet = false }: Props) {
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
  const added = roomIncome(r)

  return (
    <section
      id="positions-room"
      aria-label="Room to add"
      className={positionsUi.panel}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && openView) setOpenView(null)
      }}
    >
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Room to add</span>
        <span className={cn(positionsUi.mono, 'text-xs leading-normal text-secondary-foreground')} data-testid="room-stats">
          {plus(r.backed.calls)} calls · {plus(r.backed.puts)} puts · {plus(r.margin.puts)} on margin
          {added != null ? ` · ≈ +${usdAbbrev(added)}/cycle` : ''}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className={positionsUi.cap}>Risk</span>
          <SegmentControl
            size="xs"
            ariaLabel="How much of the cushion the margin step may spend"
            value={level.id}
            onChange={(v) => onLevelChange(v as RiskLevelId)}
            options={RISK_LEVELS.map((l) => ({
              value: l.id,
              label: (
                <span title={l.meaning}>
                  {l.label} <span className="font-mono tabular-nums">{Math.round(l.pct * 100)}%</span>
                </span>
              ),
            }))}
          />
          <How view="all" label="Room to add" open={openView === 'all'} onToggle={toggle} />
        </span>
      </header>

      <div className="flex flex-col gap-2 px-3 pt-2 pb-3 leading-normal">
        {/* The caveat stays: a panel about money says what kind of number it is without being asked.
            Quiet, it is a label — still visible, because it is honesty, not explanation. */}
        {quiet ? (
          <span
            className="inline-flex h-4.5 items-center self-start rounded-full border border-border px-1.75 text-dense-caption leading-none text-[var(--sk-mute2)]"
            title="Page estimates from the book’s own numbers, not the broker what-if. Each ? opens how the figure is built."
          >
            page estimate · not broker what-if
          </span>
        ) : (
          <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">
            Page estimates from the book&rsquo;s own numbers, not the broker what-if. Each{' '}
            <span className="font-mono">?</span> opens how the figure is built.
          </span>
        )}

        <div className="flex flex-col" data-testid="room-tiers">
          {tiers.map((t, i) => (
            <div key={t.id} className="border-t border-border/50 py-1.75" data-testid={`room-row-${t.id}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(5.625rem,8.75rem)_4.75rem_4rem] items-center gap-2">
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="flex items-center gap-1.5">
                    <span className={cn('text-xs font-semibold leading-normal', TIER_NAME[t.id])}>{t.label}</span>
                    <How view={t.id} label={t.label} open={openView === t.id} onToggle={toggle} />
                  </span>
                  <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">{t.meaning}</span>
                  <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground')}>{t.counts}</span>
                </span>
                <span className="flex flex-col gap-0.75">
                  <PremiumLadder tiers={tiers} upTo={i} max={max} />
                  <PressureAfter label={t.label} pressure={t.pressure} />
                </span>
                <span className={cn(positionsUi.mono, 'text-right text-dense-body font-bold leading-normal', TIER_PREMIUM[t.id])}>
                  {t.premium == null ? '—' : `${i > 0 ? '+' : ''}${fmtUsd(t.premium, true)}`}
                </span>
                <span
                  className={cn(
                    positionsUi.mono,
                    'text-right text-xs leading-normal',
                    t.pressure == null ? 'text-muted-foreground' : heavy(t.pressure) ? 'text-warning' : 'text-secondary-foreground',
                  )}
                >
                  {pct0(t.pressure)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-3.5 gap-y-1 border-t border-border/50 pt-1.75 text-dense-caption leading-normal text-muted-foreground">
          {(['now', 'backed', 'margin'] as const).map((id) => (
            <span key={id} className="inline-flex items-center gap-1.25">
              <span className={cn('h-2 w-2 rounded-[2px]', TIER_FILL[id])} />
              {id === 'now' ? 'held' : id === 'backed' ? 'backed' : 'on margin'}
            </span>
          ))}
          <span>wide bar = premium, each step on the last · thin bar = pressure after, amber from 50%</span>
        </div>

        {openView ? (
          <DerivationBlock
            derivation={roomDerivation(r, coverRows, openView)}
            onClose={() => setOpenView(null)}
            className="mt-0 rounded-[5px] border-[var(--sk-line2)] bg-[var(--sk-raised2)]"
          />
        ) : null}
      </div>
    </section>
  )
}
