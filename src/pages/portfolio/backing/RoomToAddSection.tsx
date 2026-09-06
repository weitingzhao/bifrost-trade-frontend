/**
 * Room to add — three steps: what the free base backs on its own, what
 * margin adds up to the ceiling, and where the Pressure gauge lands after
 * each. The header carries the answer, the body is the table, the ceiling
 * setting, and the ? that walks every number back to the fields it came from.
 */
import { useState } from 'react'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { DerivationBlock } from '@/components/positions/DerivationBlock'
import { cn } from '@/lib/utils'
import { pressureLevel, type CoverRow, type GaugeLevel } from '@/utils/bookVsBase'
import { usdAbbrev } from '@/utils/marginByAccount'
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

const BAND: Record<GaugeLevel, string> = { 0: 'idle', 1: 'normal', 2: 'heavy', 3: 'critical' }
const BAND_TONE: Record<GaugeLevel, string> = { 0: 'text-muted-foreground', 1: 'text-foreground', 2: 'text-warning', 3: 'text-loss' }

const plus = (n: number | null) => (n == null ? '—' : `+${n.toLocaleString()}`)
const plusUsd = (v: number | null) => (v == null ? '—' : `+${fmtUsd(v, true)}`)
const pct0 = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`)

/** The band is read off the rounded figure the reader sees: a 49.9% that prints as 50% is heavy, not normal. */
function Pressure({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-muted-foreground">—</span>
  const level = pressureLevel(Math.round(pct * 100) / 100)
  return (
    <span className={BAND_TONE[level]}>
      {pct0(pct)} <span className="text-muted-foreground">· {BAND[level]}</span>
    </span>
  )
}

export function RoomToAddSection({ open, onToggle, room, coverRows, ceiling, onCeilingChange }: Props) {
  const [how, setHow] = useState(false)
  const r = room
  const ceilingPct = Math.round(ceiling * 100)
  const totalIncome = r.backed.income == null && r.margin.income == null ? null : (r.backed.income ?? 0) + (r.margin.income ?? 0)
  const tenor = r.now.tenor ? `${r.now.tenor.min}–${r.now.tenor.max} d` : null

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>Room to add</CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="font-mono text-xs tabular-nums text-muted-foreground" data-testid="room-stats">
            backed {plus(r.backed.calls)} calls · {plus(r.backed.puts)} puts · margin to {ceilingPct}% {plus(r.margin.puts)} puts
            {totalIncome != null ? ` · ≈ ${plusUsd(totalIncome)}/cycle` : ''}
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
            <span>
              at the book’s own yield{r.pool.yieldPerCycle != null ? ` ${(r.pool.yieldPerCycle * 100).toFixed(1)}% per cycle` : ''}
              {tenor ? ` of ${tenor}` : ''} · Reg T margin {r.margin.marginPerPut != null ? usdAbbrev(r.margin.marginPerPut) : '—'} per put
              {r.margin.leverage != null ? ` (${r.margin.leverage.toFixed(1)}× less than cash-secured)` : ''} · estimates, not the broker’s what-if
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
          <DenseDataTable scrollX={false} tableClassName="table-fixed min-w-0">
            <colgroup>
              <col />
              <col style={{ width: '6rem' }} />
              <col style={{ width: '6rem' }} />
              <col style={{ width: '9rem' }} />
              <col style={{ width: '9rem' }} />
            </colgroup>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Step</DenseTableHead>
                <DenseTableHead className="text-right">Calls</DenseTableHead>
                <DenseTableHead className="text-right">Puts</DenseTableHead>
                <DenseTableHead className="text-right">Premium / cycle</DenseTableHead>
                <DenseTableHead className="text-right">Pressure after</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              <DenseTableRow data-testid="room-row-now">
                <DenseTableCell>
                  <span className="text-foreground">Now</span>
                  <span className="text-muted-foreground"> · entry premium of the book in scope</span>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{r.now.calls.toLocaleString()}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{r.now.puts.toLocaleString()}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(r.now.netPremium, true)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  <Pressure pct={r.now.pressure} />
                </DenseTableCell>
              </DenseTableRow>
              <DenseTableRow data-testid="room-row-backed">
                <DenseTableCell>
                  <span className="text-foreground">+ Backed</span>
                  <span className="text-muted-foreground">
                    {' '}· {r.backed.freeShares.toLocaleString()} free sh and {usdAbbrev(r.backed.cashFree)} free cash-like, no new margin
                  </span>
                </DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'text-profit')}>{plus(r.backed.calls)}</DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'text-profit')}>{plus(r.backed.puts)}</DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'text-profit')}>{plusUsd(r.backed.income)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  <Pressure pct={r.backed.pressureAfter} />
                </DenseTableCell>
              </DenseTableRow>
              <DenseTableRow data-testid="room-row-margin">
                <DenseTableCell>
                  <span className="text-foreground">+ Margin to {ceilingPct}%</span>
                  <span className="text-muted-foreground">
                    {' '}· {r.margin.headroomAfterBacked != null ? usdAbbrev(r.margin.headroomAfterBacked) : '—'} headroom left after the backed puts, puts only
                  </span>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  <span className="text-muted-foreground" title="A call needs shares behind it, not margin">—</span>
                </DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'text-profit')}>{plus(r.margin.puts)}</DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'text-profit')}>{plusUsd(r.margin.income)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  <Pressure pct={r.margin.pressureAfter} />
                </DenseTableCell>
              </DenseTableRow>
            </DenseTableBody>
          </DenseDataTable>
          {how ? <DerivationBlock derivation={roomDerivation(r, coverRows)} onClose={() => setHow(false)} className="mb-1" /> : null}
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}
