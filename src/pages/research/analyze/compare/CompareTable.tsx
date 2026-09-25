/**
 * Structures — one row per rule, at the size the rules allow.
 *
 * Owed columns keep their places: a column that disappears reads as a
 * structure with nothing to say about its odds, and one that prints 0 claims
 * the odds are zero. So POP, EV and p10 carry `—` with the reason on their
 * header, and the two fills columns do the same (Rev .24's table).
 */
import type { KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { legLine } from './compareModel'
import type { CompareRow } from './useCompareRows'

const TH = 'px-2 py-1.5 text-right text-dense-micro font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap'
const TD = 'px-2 py-1.5 text-right font-mono text-dense-meta tabular-nums whitespace-nowrap'

export const OWED_DISTRIBUTION = 'Owed — needs the 20-day distribution, which nothing on this side computes.'
export const OWED_QUOTES = 'Owed — needs quotes. Bid/ask is not in the Options Starter snapshot.'

function signedMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtMvAbbrev(Math.abs(n))}`
}

function greek(n: number | null | undefined, dollars: boolean): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const r = Math.round(n)
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${dollars ? '$' : ''}${Math.abs(r).toLocaleString('en-US')}`
}

export function CompareTable({
  rows,
  sizeOf,
  on,
  onToggle,
  onStep,
  planHref,
}: {
  rows: readonly CompareRow[]
  sizeOf: (r: CompareRow) => number | null
  on: ReadonlySet<number>
  onToggle: (id: number) => void
  /** Step the size by `delta` from whatever it is at the moment of the click. */
  onStep: (id: number, delta: number) => void
  planHref: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className={TH} aria-label="Payoff curve" />
            <th className={cn(TH, 'text-left')}>Structure</th>
            <th className={cn(TH, 'text-left')}>Size</th>
            <th className={cn(TH, 'text-left')}>Binding</th>
            <th className={TH} title="Premium in minus premium out, at the session's last trade — not a quote.">Net</th>
            <th className={TH} title="What the size takes from the backing pool: a put's strike, a spread's width, a covered call's shares.">Backing</th>
            <th className={TH} title={OWED_DISTRIBUTION}>POP</th>
            <th className={TH} title={OWED_DISTRIBUTION}>EV 20d</th>
            <th className={TH} title={OWED_QUOTES}>− fills</th>
            <th className={TH} title={OWED_QUOTES}>EV net</th>
            <th className={TH}>Δ</th>
            <th className={TH} title="Dollars per vol point">Vega</th>
            <th className={TH} title="Dollars per day">θ</th>
            <th className={TH} title={OWED_DISTRIBUTION}>p10</th>
            <th className={TH} aria-label="Plan" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = r.placement
            const placed = p?.ok === true
            const n = sizeOf(r)
            const cap = r.caps?.size ?? null
            const over = n != null && cap != null && n > cap
            const toggle = () => placed && onToggle(r.id)
            const onKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggle()
              }
            }
            const scale = (v: number | null | undefined) => (v == null || n == null ? null : v * n)
            return (
              <tr
                key={r.id}
                onClick={toggle}
                onKeyDown={onKey}
                role={placed ? 'button' : undefined}
                tabIndex={placed ? 0 : undefined}
                aria-pressed={placed ? on.has(r.id) : undefined}
                title={placed ? 'Click to show or hide its payoff curve' : undefined}
                className={cn(
                  'border-b border-border/60 last:border-b-0',
                  placed ? 'cursor-pointer hover:bg-secondary/50' : 'opacity-70',
                  placed && !on.has(r.id) && 'opacity-55',
                )}
              >
                <td className={TD}>
                  <span
                    className={cn('inline-block h-2.5 w-2.5 rounded-sm border', placed && on.has(r.id) ? r.series.bg : 'bg-transparent')}
                    style={{ borderColor: 'currentColor' }}
                  />
                </td>
                <td className="min-w-[180px] px-2 py-1.5 text-left">
                  <span className="text-dense-body font-semibold text-foreground">{r.name}</span>
                  {p == null ? (
                    <span className="block text-dense-caption text-muted-foreground">reading the chain…</span>
                  ) : p.ok ? (
                    <span className="block font-mono text-dense-caption text-entity-option">
                      {p.legs.map((l) => legLine(l, p.expiry)).join(' · ')}
                    </span>
                  ) : (
                    <span className="block text-dense-caption text-warning">not placed — {p.reason}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-left">
                  {placed ? (
                    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="h-5 w-5 rounded border border-border text-dense-meta text-muted-foreground hover:bg-secondary"
                        aria-label={`Size ${r.name} down`}
                        disabled={n == null || n <= 0}
                        onClick={() => onStep(r.id, -1)}
                      >
                        −
                      </button>
                      <span className={cn('min-w-[2.5rem] text-center font-mono text-dense-meta font-bold', over ? 'text-danger' : 'text-foreground')}>
                        {n == null ? '—' : `× ${n}`}
                      </span>
                      <button
                        type="button"
                        className="h-5 w-5 rounded border border-border text-dense-meta text-muted-foreground hover:bg-secondary"
                        aria-label={`Size ${r.name} up`}
                        onClick={() => onStep(r.id, 1)}
                      >
                        ＋
                      </button>
                      {r.caps ? (
                        <DenseTag
                          variant={r.caps.computed < 3 ? 'warning' : 'neutral'}
                          size="cell"
                          title="Only the caps that could be computed decide the size. A missing cap can only make the size too large, never too small."
                        >
                          {r.caps.computed} of 3 caps
                        </DenseTag>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-dense-meta text-muted-foreground">—</span>
                  )}
                </td>
                <td className={cn('px-2 py-1.5 text-left text-dense-caption', over ? 'text-warning' : 'text-muted-foreground')}>
                  {!placed
                    ? '—'
                    : over
                      ? `over cap (${cap})`
                      : r.caps?.binding === 'conviction'
                        ? 'conviction'
                        : r.caps?.binding === 'backing'
                          ? 'backing'
                          : 'no cap read'}
                </td>
                <td className={cn(TD, (r.econ?.net ?? 0) >= 0 ? 'text-success' : 'text-danger')}>
                  {placed ? signedMoney(scale(r.econ?.net)) : '—'}
                  {r.econ && r.econ.unpriced > 0 ? (
                    <span className="block text-dense-micro text-warning" title="A leg did not trade in the session, so the structure has no mark.">
                      {r.econ.unpriced} leg{r.econ.unpriced === 1 ? '' : 's'} untraded
                    </span>
                  ) : null}
                </td>
                <td className={cn(TD, 'text-muted-foreground')}>
                  {placed && r.econ?.backing != null && n != null ? fmtMvAbbrev(r.econ.backing * n) : '—'}
                </td>
                <td className={cn(TD, 'text-muted-foreground')} title={OWED_DISTRIBUTION}>—</td>
                <td className={cn(TD, 'text-muted-foreground')} title={OWED_DISTRIBUTION}>—</td>
                <td className={cn(TD, 'text-muted-foreground')} title={OWED_QUOTES}>—</td>
                <td className={cn(TD, 'text-muted-foreground')} title={OWED_QUOTES}>—</td>
                <td className={TD}>{placed ? greek(scale(r.econ?.delta), false) : '—'}</td>
                <td className={TD}>{placed ? greek(scale(r.econ?.vega), true) : '—'}</td>
                <td className={TD}>{placed ? greek(scale(r.econ?.theta), true) : '—'}</td>
                <td className={cn(TD, 'text-muted-foreground')} title={OWED_DISTRIBUTION}>—</td>
                <td className={TD}>
                  {placed && n != null && n > 0 ? (
                    // Everything lands as a Plan (D10). Plans takes no
                    // contract, so the name is carried and the legs are read
                    // off this row — the same door Option screen's ＋ Plan is.
                    <Link
                      to={planHref}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-6 items-center rounded-md border border-border px-2 text-dense-meta text-foreground hover:bg-secondary"
                    >
                      → Plan
                    </Link>
                  ) : (
                    <span
                      className="inline-flex h-6 items-center border px-2 text-dense-meta text-muted-foreground/60 mat-tag"
                      title={placed ? 'Size is zero — nothing to plan.' : 'Not placed — nothing to plan.'}
                      aria-disabled
                    >
                      → Plan
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
