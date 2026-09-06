import { useState } from 'react'
/**
 * How far each account is from liquidation.
 *
 * Sits under the cockpit. The cockpit's Pressure gauge is a two-account total,
 * and margin does not net across IB accounts — the broker closes positions in
 * whichever account runs out of excess liquidity, not in the portfolio. So a
 * comfortable blended gauge can hide one account at the edge. One bullet bar
 * per account, on the same 0–100% scale and the same band ticks as the gauge,
 * puts the two side by side where the gauge could only show their sum.
 *
 * Rows come from marginAccountRows; this file only draws them.
 */
import { cn } from '@/lib/utils'
import type { MarginRollup } from '@/utils/marginPressure'
import {
  PRESSURE_TICKS,
  marginAccountRows,
  type MarginAccountRow,
  type MarginAccountTone,
} from '@/utils/marginByAccount'

import { DerivationBlock } from './DerivationBlock'
import { holdingsOf, marginDerivation } from '@/utils/marginDerivation'
import type { LivePositionRow } from '@/types/positions'
import type { SpotResolver } from '@/utils/spotPrice'

const TONE_FILL: Record<MarginAccountTone, string> = {
  profit: 'bg-profit',
  warning: 'bg-warning',
  loss: 'bg-loss',
}

function PressureBar({
  label,
  pressure,
  tone,
}: {
  label: string
  pressure: number
  tone: MarginAccountTone
}) {
  const pct = Math.round(Math.min(1, Math.max(0, pressure)) * 100)
  return (
    <span
      role="meter"
      aria-label={`${label} margin pressure`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="relative block h-2 w-full overflow-hidden rounded-sm border border-border/60 bg-secondary"
    >
      {/* Width is data, not styling — the only inline style on the page. */}
      <span
        data-testid="pressure-fill"
        className={cn('absolute inset-y-0 left-0', TONE_FILL[tone])}
        style={{ width: `${pct}%` }}
      />
      {PRESSURE_TICKS.map((t) => (
        <span
          key={t}
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-foreground/40"
          style={{ left: `${t * 100}%` }}
        />
      ))}
    </span>
  )
}

function AccountRow({ row, open, onToggle }: { row: MarginAccountRow; open: boolean; onToggle: () => void }) {
  const known = row.pressure != null && row.tone != null && row.pctText != null
  return (
    <div
      className={cn(
        'grid grid-cols-[6.25rem_minmax(6rem,11rem)_minmax(0,1fr)] items-center gap-x-3',
        !row.inScope && 'opacity-50'
      )}
      title={row.inScope ? row.rawTitle : `not in scope\n${row.rawTitle}`}
      data-account={row.accountId}
      data-in-scope={row.inScope ? 'true' : 'false'}
    >
      {/* The label and its `?` open how the row was computed, field by field. */}
      <span className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={onToggle}
          className="truncate text-left text-dense-body font-medium text-foreground hover:text-link hover:underline"
        >
          {row.label}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={open}
          aria-label={`How ${row.label} margin is computed`}
          title="Which broker fields these are, and how they check out"
          className={cn(
            'ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border/60 font-mono text-dense-caption leading-none',
            open ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          ?
        </button>
      </span>
      {row.pressure != null && row.tone != null ? (
        <PressureBar label={row.label} pressure={row.pressure} tone={row.tone} />
      ) : (
        <span />
      )}
      <span className="min-w-0 truncate font-mono text-dense-body tabular-nums">
        {known ? (
          <>
            <span className="text-foreground">{row.pctText}</span>
            <span className="text-muted-foreground"> · {row.detailText}</span>
          </>
        ) : (
          <span className="text-warning">n/a — broker reported no cushion</span>
        )}
      </span>
    </div>
  )
}

export function MarginByAccountStrip({
  margin,
  hostId,
  secondaryId,
  accountFilter,
  positions,
  resolveSpot,
}: {
  margin: MarginRollup
  hostId: string
  secondaryId: string
  accountFilter: { host: boolean; secondary: boolean }
  /** Every account's rows, repriced; the derivation values the open account's holdings from them. */
  positions?: readonly LivePositionRow[]
  resolveSpot?: SpotResolver | null
}) {
  const rows = marginAccountRows(margin, hostId, secondaryId, accountFilter)
  const [openId, setOpenId] = useState<string | null>(null)
  const openRow = rows.find((r) => r.accountId === openId) ?? null
  const holdings = openRow && positions ? holdingsOf(positions, openRow.accountId, resolveSpot) : undefined
  return (
    <section
      id="positions-margin"
      aria-label="Margin by account"
      className="rounded-md border border-border bg-secondary/40 px-3 py-1.5"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && openId) setOpenId(null)
      }}
    >
      <span className="mb-1 block text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
        Margin by account
      </span>
      {rows.length === 0 ? (
        <p className="text-dense-body text-warning">n/a — no funded account reported margin</p>
      ) : (
        <div className="flex flex-col gap-y-0.5">
          {rows.map((r) => (
            <AccountRow
              key={r.accountId}
              row={r}
              open={openId === r.accountId}
              onToggle={() => setOpenId((cur) => (cur === r.accountId ? null : r.accountId))}
            />
          ))}
        </div>
      )}
      <p className="text-dense-caption text-muted-foreground">cockpit pressure: accounts in scope · ? walks the broker fields behind a row</p>
      {openRow ? (
        <DerivationBlock
          derivation={marginDerivation(openRow.facts, openRow.label, holdings)}
          onClose={() => setOpenId(null)}
          className="mb-1"
        />
      ) : null}
    </section>
  )
}
