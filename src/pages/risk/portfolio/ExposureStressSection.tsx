/**
 * Exposure › Stress (design Rev .107: the Stress page merged in, full width).
 *
 * The matrix is the model service's spot axis at today's vol; the vol rows are
 * drawn and marked, because the service reports `iv_stress_available: false`.
 * The worst column is selected by default, a click on a flat cell selects
 * another, and Who pays follows it — each row with its cost across all seven
 * columns (the convexity: a short put bends down on a drop and caps on a
 * rally, shares are a straight line), and a click opens the name beside.
 *
 * Named scenarios are always four chips with their own state. A chip is
 * readable only when the service returned its (spot, iv) cell — never
 * interpolated — so today all four read n/c. Backing after shock is Backing &
 * Model's to compute and reads "not computed" until it does.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { howFrom, useSymbolGo } from '@/layout/symbolGo'
import type { UnderlyingEntry, StressScenario } from '@/types/modelAnalysis'
import {
  NAMED_SCENARIOS,
  STRESS_UNRECORDED,
  STRESS_VOL_ROWS,
  acrossShocks,
  stressColumns,
  unstressedNames,
  whoPays,
  worstColumn,
} from './stressModel'

const TRACK = 'bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]'

function shockPct(shock: number): string {
  return `${shock > 0 ? '+' : shock < 0 ? '−' : ''}${Math.abs(Math.round(shock * 100))}%`
}

/** One name's cost at each column: zero line centred, one scale for the whole table. */
function AcrossShocks({ bars, max, selected, shocks, symbol }: {
  bars: readonly number[]
  max: number
  selected: number
  shocks: readonly number[]
  symbol: string
}) {
  const title = `${symbol} across shocks · ${shocks.map((s, i) => `${shockPct(s)} ${fmtSignedUsd0(bars[i] ?? 0)}`).join(' · ')}`
  return (
    <span className="inline-flex h-6 items-center gap-0.5" title={title} role="img" aria-label={title}>
      {shocks.map((s, i) => {
        const v = bars[i] ?? 0
        const h = v === 0 ? 0 : Math.max(1, Math.round((Math.abs(v) / max) * 11))
        const on = i === selected
        return (
          <span
            key={s}
            className={cn('relative inline-block h-6 w-1.5 rounded-[1px]', on && 'bg-[color-mix(in_srgb,var(--sk-accent)_18%,transparent)]')}
          >
            <span className="absolute inset-x-0 top-3 h-px bg-[color-mix(in_srgb,var(--sk-ink)_14%,transparent)]" />
            <span
              className={cn(
                'absolute inset-x-0 rounded-[1px]',
                v < 0 ? (on ? 'bg-loss' : 'bg-loss/55') : on ? 'bg-profit' : 'bg-profit/55',
              )}
              style={{ top: v > 0 ? 12 - h : 12, height: h }}
            />
          </span>
        )
      })}
    </span>
  )
}

export function ExposureStressSection({
  accountScenarios,
  entries,
  ivAvailable,
  netLong,
}: {
  /** `account_stress.scenarios` per account in scope. */
  accountScenarios: readonly (readonly StressScenario[] | undefined)[]
  /** `per_underlying` across the accounts in scope. */
  entries: readonly UnderlyingEntry[]
  ivAvailable: boolean
  /** The book's β-weighted Δ$ sign, for the worst column's sentence. */
  netLong: boolean | null
}) {
  const symbolGo = useSymbolGo()
  const [picked, setPicked] = useState<number | null>(null)

  const columns = useMemo(() => stressColumns(accountScenarios), [accountScenarios])
  const worst = worstColumn(columns)
  const selectedShock = picked != null && columns.some((c) => c.shock === picked) ? picked : (worst?.shock ?? null)
  const selected = columns.find((c) => c.shock === selectedShock) ?? null
  const payers = selectedShock == null ? [] : whoPays(entries, selectedShock)
  const shocks = columns.map((c) => c.shock)
  const across = acrossShocks(entries, shocks)
  const acrossMax = Math.max(1, ...[...across.values()].flat().map(Math.abs))
  const absent = useMemo(() => unstressedNames(entries), [entries])
  const total = new Set(entries.map((u) => (u.symbol ?? '').trim().toUpperCase()).filter(Boolean)).size
  const maxAbs = Math.max(1, ...columns.map((c) => Math.abs(c.pnlChange)))
  const selectedIndex = selectedShock == null ? -1 : shocks.indexOf(selectedShock)

  return (
    <section id="stress" className={cn(positionsUi.panel, 'scroll-mt-3 border-warning/40')} aria-label="Stress">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Stress</span>
        <span className={positionsUi.panelTitle}>P&amp;L · SPY move × vol shock</span>
        {!ivAvailable ? (
          <DenseTag variant="warning" size="cell" title={STRESS_UNRECORDED.volAxis}>
            ⚠ no vol axis
          </DenseTag>
        ) : null}
        {selected ? (
          <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
            SPY {shockPct(selected.shock)} · vol flat selected
          </span>
        ) : null}
        <span className="ml-auto text-dense-meta text-muted-foreground">
          {total - absent.length} of {total} names can be stressed
        </span>
      </header>

      {columns.length === 0 ? (
        <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
          The model service reports no account stress for this scope.
        </p>
      ) : (
        <div className="overflow-x-auto px-3 py-2.5">
          <table data-sr-table="" className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th data-sr-col="entity" className="border-b-0">
                  vol \ SPY
                </th>
                {columns.map((c) => (
                  <th key={c.shock} data-sr-col="num" className="border-b-0">
                    {shockPct(c.shock)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STRESS_VOL_ROWS.map((row) => (
                <tr key={row.label}>
                  <td data-sr-col="entity" className="border-b-0 text-dense-meta text-muted-foreground">
                    {row.label}
                  </td>
                  {columns.map((c) => {
                    if (row.ivShock == null) {
                      return (
                        <td
                          key={c.shock}
                          data-sr-col="num"
                          className="border border-[var(--sk-raised2)] text-muted-foreground"
                          title={STRESS_UNRECORDED.volAxis}
                        >
                          —
                        </td>
                      )
                    }
                    const on = c.shock === selectedShock
                    const a = Math.min(0.32, (Math.abs(c.pnlChange) / maxAbs) * 0.32)
                    return (
                      <td
                        key={c.shock}
                        data-sr-col="num"
                        className={cn(
                          'cursor-pointer border',
                          on ? 'border-primary' : 'border-[var(--sk-raised2)]',
                          pnlColorClass(c.pnlChange),
                        )}
                        style={{
                          background: `color-mix(in oklab, ${c.pnlChange < 0 ? 'var(--color-loss)' : 'var(--color-profit)'} ${Math.round(a * 100)}%, transparent)`,
                        }}
                        onClick={() => setPicked(c.shock)}
                        title={`SPY ${shockPct(c.shock)} · vol flat · ${c.contributors} contributors${c.partial ? ' · partial' : ''}`}
                      >
                        {fmtSignedUsd0(c.pnlChange)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 mt-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
            {worst ? (
              <>
                Worst column{' '}
                <span className={cn(positionsUi.mono, 'text-loss')}>{fmtSignedUsd0(worst.pnlChange)}</span> at SPY{' '}
                {shockPct(worst.shock)} · vol flat
                {netLong == null ? '. ' : netLong ? ' — the book is net long β-Δ. ' : ' — the book is net short β-Δ. '}
              </>
            ) : null}
            {ivAvailable ? 'Spot × vol, repriced by the model service.' : STRESS_UNRECORDED.volAxis}
          </p>
        </div>
      )}

      <div className="border-t border-border">
        <div className="flex flex-wrap items-center gap-2.5 px-3 py-2">
          <span className={positionsUi.cap}>Who pays</span>
          <span className={positionsUi.panelTitle}>
            {selectedShock == null ? 'pick a column' : `SPY ${shockPct(selectedShock)} · vol flat`}
          </span>
          {selected ? (
            <span className={cn(positionsUi.mono, 'text-dense-body font-bold', pnlColorClass(selected.pnlChange))}>
              {fmtSignedUsd0(selected.pnlChange)}
            </span>
          ) : null}
          <span className="ml-auto text-dense-meta text-muted-foreground">{payers.length} priced at this column</span>
        </div>
        {payers.length === 0 ? (
          <p className="m-0 px-3 pb-3 text-dense-meta text-muted-foreground">No underlying could be stressed at this column.</p>
        ) : (
          <div className="overflow-x-auto">
            <table data-sr-table="" className="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th data-sr-col="entity">Symbol</th>
                  <th data-sr-col="num">At</th>
                  <th data-sr-col="num">Shares</th>
                  <th data-sr-col="num">Options</th>
                  <th data-sr-col="tag">Cost of the shock</th>
                  <th data-sr-col="tag" title="This name’s P&L at each spot column; the selected column is lit">
                    Across shocks
                  </th>
                </tr>
              </thead>
              <tbody>
                {payers.map((p) => (
                  <tr
                    key={p.symbol}
                    className="cursor-pointer"
                    title={`Open ${p.symbol} beside`}
                    tabIndex={0}
                    onClick={(e) => symbolGo.go(p.symbol, howFrom(e))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') symbolGo.go(p.symbol, howFrom(e))
                    }}
                  >
                    <td data-sr-col="entity" className="font-mono font-bold text-entity-symbol">
                      {p.symbol}
                    </td>
                    <td data-sr-col="num" className="text-muted-foreground">
                      {p.newSpot == null ? '—' : fmtUsd(p.newSpot)}
                    </td>
                    <td data-sr-col="num" className={p.stockPnl == null ? 'text-muted-foreground' : pnlColorClass(p.stockPnl)}>
                      {p.stockPnl == null ? '—' : fmtSignedUsd0(p.stockPnl)}
                    </td>
                    <td data-sr-col="num" className={p.optionsPnl == null ? 'text-muted-foreground' : pnlColorClass(p.optionsPnl)}>
                      {p.optionsPnl == null ? '—' : fmtSignedUsd0(p.optionsPnl)}
                    </td>
                    <td data-sr-col="tag">
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('inline-block h-1.25 w-16 overflow-hidden rounded-sm', TRACK)}>
                          <span
                            className={cn('block h-full', p.pnlChange < 0 ? 'bg-loss/60' : 'bg-profit/60')}
                            style={{ width: `${Math.round((p.share ?? 0) * 100)}%` }}
                          />
                        </span>
                        <span className={cn(positionsUi.mono, 'text-xs font-semibold', pnlColorClass(p.pnlChange))}>
                          {fmtSignedUsd0(p.pnlChange)}
                        </span>
                        {p.share != null ? (
                          <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                            {Math.round(p.share * 100)}%
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td data-sr-col="tag">
                      <AcrossShocks
                        bars={across.get(p.symbol) ?? []}
                        max={acrossMax}
                        selected={selectedIndex}
                        shocks={shocks}
                        symbol={p.symbol}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">Backing after shock</span>
        <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground" title={STRESS_UNRECORDED.backing}>
          <StatusLamp lamp="gray" variant="dot" title="Not computed here" />
          not computed
        </span>
        <Link to="/portfolio/backing" className={positionsUi.link}>
          Backing →
        </Link>
        <span className="h-3 w-px bg-border" aria-hidden />
        <span className="text-xs text-muted-foreground">Named scenarios</span>
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
          0 of {NAMED_SCENARIOS.length} readable
        </span>
        <span className="flex flex-wrap gap-1.5">
          {NAMED_SCENARIOS.map((n) => (
            <span
              key={n.id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--sk-ink)_3%,transparent)] px-2 py-0.5 text-dense-meta text-muted-foreground"
              title={`${n.shock}\nNo reading — needs ${n.blocked}.\n${STRESS_UNRECORDED.named}`}
            >
              <span className="size-1.5 rounded-full bg-[var(--sk-line2)]" aria-hidden />
              {n.name}
              <span className={cn(positionsUi.mono, 'font-semibold')}>n/c</span>
            </span>
          ))}
        </span>
      </div>
      <p className="m-0 px-3 pb-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
        Share is of what the column costs, so only the names that lose carry one.
        {absent.length > 0
          ? ` A name the service could not stress is absent rather than a zero (${absent.join(' · ')}).`
          : ''}
        {selected?.partial ? ' This shock is partial: the service priced only part of the book here.' : ''}
      </p>
    </section>
  )
}
