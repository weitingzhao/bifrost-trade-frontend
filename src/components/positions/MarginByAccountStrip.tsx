import { useState, type ReactNode } from 'react'
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
import { Link } from 'react-router-dom'
import { positionsUi } from './positionsUi'
import { holdingsOf, marginDerivation } from '@/utils/marginDerivation'
import type { LivePositionRow } from '@/types/positions'
import type { SpotResolver } from '@/utils/spotPrice'

/**
 * The prototype's reading: the fill stays green below the 75% critical line and
 * turns amber past it, with the percent. Pressure is risk, not a fault — never red.
 */
const TONE_FILL: Record<MarginAccountTone, string> = {
  profit: 'bg-profit',
  warning: 'bg-profit',
  loss: 'bg-warning',
}
const TONE_INK: Record<MarginAccountTone, string> = {
  profit: 'text-secondary-foreground',
  warning: 'text-secondary-foreground',
  loss: 'text-warning',
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
      className="relative block h-1.75 min-w-22.5 flex-[1_1_130px] rounded-sm bg-[var(--sk-surface)]"
    >
      {/* Width is data, not styling. */}
      <span
        data-testid="pressure-fill"
        className={cn('absolute inset-y-0 left-0 rounded-sm', TONE_FILL[tone])}
        style={{ width: `${pct}%` }}
      />
      {PRESSURE_TICKS.map((t) => (
        <span
          key={t}
          aria-hidden="true"
          className={cn(
            'absolute -top-0.5 h-2.75 w-px',
            t >= PRESSURE_TICKS[PRESSURE_TICKS.length - 1] ? 'bg-warning' : 'bg-[var(--sk-line2)]',
          )}
          style={{ left: `${t * 100}%` }}
        />
      ))}
    </span>
  )
}

/** "cushion 73% · excess $468.9k · BP $1.87M" as three key · value pairs. */
function tailPairs(detail: string): { k: string; v: string }[] {
  return detail.split(' · ').map((part) => {
    const i = part.indexOf(' ')
    return i < 0 ? { k: part, v: '' } : { k: part.slice(0, i), v: part.slice(i + 1) }
  })
}

function AccountRow({
  row,
  open,
  onToggle,
  children,
}: {
  row: MarginAccountRow
  open: boolean
  onToggle: () => void
  children?: ReactNode
}) {
  const known = row.pressure != null && row.tone != null && row.pctText != null
  return (
    <div
      className={cn('border-b border-border/45 last:border-b-0', !row.inScope && 'opacity-50')}
      title={row.inScope ? row.rawTitle : `not in scope\n${row.rawTitle}`}
      data-account={row.accountId}
      data-in-scope={row.inScope ? 'true' : 'false'}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 leading-normal">
        {/* The label and its `?` open how the row was computed, field by field. */}
        <button
          type="button"
          onClick={onToggle}
          className="min-w-17.5 cursor-pointer border-0 bg-transparent p-0 text-left text-xs font-semibold text-foreground hover:underline leading-normal"
        >
          {row.label}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={open}
          aria-label={`How ${row.label} margin is computed`}
          title="Walk the broker fields behind this row"
          className={cn(positionsUi.q, open && 'border-primary text-primary')}
        >
          ?
        </button>
        {known && row.pressure != null && row.tone != null ? (
          <>
            <PressureBar label={row.label} pressure={row.pressure} tone={row.tone} />
            <span className={cn(positionsUi.mono, 'text-dense-body font-bold leading-normal', TONE_INK[row.tone])}>{row.pctText}</span>
            <span className="flex min-w-0 flex-[1_1_210px] flex-wrap gap-x-2.5 gap-y-0.5" data-testid="margin-tail">
              {tailPairs(row.detailText ?? '').map((t) => (
                <span key={t.k} className={cn(positionsUi.mono, 'whitespace-nowrap text-dense-meta text-muted-foreground/80 leading-normal')}>
                  {t.k} <span className="text-muted-foreground">{t.v}</span>
                </span>
              ))}
            </span>
          </>
        ) : (
          <span className="text-dense-meta text-warning leading-normal">n/a — broker reported no cushion</span>
        )}
      </div>
      {children}
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
  return (
    <section
      id="positions-margin"
      aria-label="Margin by account"
      className={positionsUi.panel}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && openId) setOpenId(null)
      }}
    >
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Margin by account</span>
        <span className={positionsUi.panelNote}>cockpit pressure: accounts in scope · ? walks the broker fields behind a row</span>
        <Link to="/risk/margin" className={cn(positionsUi.link, 'ml-auto')}>
          per-position margin · Risk Margin →
        </Link>
      </header>
      {rows.length === 0 ? (
        <p className="m-0 px-3 py-2 text-dense-body text-warning leading-normal">n/a — no funded account reported margin</p>
      ) : (
        <div>
          {rows.map((r) => {
            const open = openId === r.accountId
            return (
              <AccountRow
                key={r.accountId}
                row={r}
                open={open}
                onToggle={() => setOpenId((cur) => (cur === r.accountId ? null : r.accountId))}
              >
                {open ? (
                  <DerivationBlock
                    derivation={marginDerivation(r.facts, r.label, positions ? holdingsOf(positions, r.accountId, resolveSpot) : undefined)}
                    onClose={() => setOpenId(null)}
                    className="mx-2.5 mt-0.5 mb-2.25 rounded-[5px] border-[var(--sk-line2)] bg-[var(--sk-raised2)]"
                  />
                ) : null}
              </AccountRow>
            )
          })}
        </div>
      )}
    </section>
  )
}
