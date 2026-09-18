/**
 * How much of the book is one bet.
 *
 * The matrix is Research's, over the window the header names. Under it the
 * clusters it implies: names that all move together at or above the floor, with
 * how much of the book's β-weighted Δ$ each one carries.
 *
 * Lifted out of the page so neither outgrows the other — the page owns the
 * exposure table and the stress band, this owns the correlation reading.
 */
import { cn } from '@/lib/utils'
import { positionsUi } from '@/components/positions/positionsUi'
import { RISK_CLUSTER_RHO, RISK_UNRECORDED, type RiskCluster } from '@/utils/riskExposure'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'
import type { RiskCorrelationCell } from '@/api/research/riskStats'

/** A correlation cell's ink: amber deepens with ρ, and the diagonal is not a reading. */
function rhoTone(rho: number | null, self: boolean): { text: string; style?: React.CSSProperties } {
  if (self) return { text: 'text-[var(--sk-line2)]' }
  if (rho == null) return { text: 'text-muted-foreground' }
  const a = Math.max(0, rho - 0.2) * 0.42
  return {
    text: rho > 0.7 ? 'text-foreground' : 'text-secondary-foreground',
    style: { background: `color-mix(in oklab, var(--color-warning) ${Math.round(a * 100)}%, transparent)` },
  }
}

export function CorrelationPanel({
  symbols,
  matrix,
  clusters,
  window: corrWindow,
  enp,
  names,
}: {
  symbols: readonly string[]
  matrix: Readonly<Record<string, Record<string, RiskCorrelationCell>>> | null
  clusters: readonly RiskCluster[]
  window: number
  enp: { n: number | null; counted: number; unfilled: number }
  /** Names carrying a β-weighted Δ$ — what the spread is measured over. */
  names: number
}) {
  return (
            <section className={positionsUi.panel} aria-label="One bet or five">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>One bet or many</span>
                <span className={positionsUi.panelTitle}>correlation · {corrWindow}d daily returns</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  effective independent positions{' '}
                  <span
                    className={cn(
                      positionsUi.mono,
                      'font-bold',
                      enp.n != null && enp.n < enp.counted * 0.6 ? 'text-warning' : 'text-foreground',
                    )}
                  >
                    {enp.n == null ? '—' : enp.n.toFixed(1)}
                  </span>{' '}
                  of {enp.counted}
                </span>
              </header>
              {symbols.length > 1 ? (
                <div className="overflow-x-auto px-3 py-2.5">
                  <table className="border-collapse">
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'border-b-0 text-left')} />
                        {symbols.map((s) => (
                          <th key={s} className={cn(positionsUi.th, 'border-b-0 px-1.5 text-center')}>
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {symbols.map((a) => (
                        <tr key={a}>
                          <td className={cn(positionsUi.td, 'border-b-0 pr-2 text-left font-bold text-[var(--color-entity-option)]')}>
                            {a}
                          </td>
                          {symbols.map((b) => {
                            const cell = matrix?.[a]?.[b]
                            const self = a === b
                            const tone = rhoTone(cell?.rho ?? null, self)
                            return (
                              <td
                                key={b}
                                className={cn(positionsUi.td, 'border border-[var(--sk-raised2)] px-1.5 text-center', tone.text)}
                                style={tone.style}
                                title={`${a} / ${b} · ${corrWindow}d${cell?.n ? ` · n ${cell.n}` : ''}`}
                              >
                                {self ? '—' : cell?.rho == null ? '·' : cell.rho.toFixed(2)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                  A matrix needs two names Research can fill; this scope has {symbols.length}.
                </p>
              )}
              {clusters.length > 0 ? (
                <div className="flex flex-col gap-1.5 px-3 pb-2.5">
                  {clusters
                    // A cluster of two names carrying nothing is not a bet worth a row.
                    .filter((c) => c.members.length > 1 && c.share >= 0.01)
                    .map((c) => (
                      <div
                        key={c.members.join('-')}
                        className={cn(
                          'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 rounded-r-sm border-l-2 px-2 py-1.5',
                          'bg-[var(--sk-raised2)]',
                          c.share > 0.5 ? 'border-warning' : 'border-[var(--sk-line2)]',
                        )}
                      >
                        <span className="min-w-0 text-xs leading-normal text-foreground">
                          <span className="font-semibold">
                            {c.members.length} names linked at ρ ≥ {RISK_CLUSTER_RHO.toFixed(2)}
                          </span>{' '}
                          <span className={cn(positionsUi.mono, 'text-dense-meta text-[var(--color-entity-option)]')}>
                            {c.members.join(' · ')}
                          </span>
                          {c.oneWay ? (
                            <span className="text-dense-meta text-muted-foreground"> · all of it one way</span>
                          ) : (
                            <span className="text-dense-meta text-muted-foreground"> · it can offset itself</span>
                          )}
                        </span>
                        <span
                          className={cn(
                            positionsUi.mono,
                            'text-xs font-bold whitespace-nowrap',
                            c.share > 0.5 ? 'text-warning' : 'text-muted-foreground',
                          )}
                        >
                          {Math.round(c.share * 100)}% of β-Δ
                        </span>
                      </div>
                    ))}
                </div>
              ) : null}
              <p className={cn(FOOT, 'm-0')}>
                β-weighting says the book is spread over {names} names;{' '}
                {enp.n == null
                  ? 'correlation has no reading for this scope'
                  : `correlation says it is ${enp.n.toFixed(1)} ${enp.n < 2 ? 'bet' : 'bets'}`}
                . A genuine diversifier is short-beta or long-vol, not another name.{' '}
                {enp.unfilled > 0
                  ? `${enp.unfilled} pairs the matrix could not fill are left out rather than read as uncorrelated.`
                  : ''}{' '}
                {RISK_UNRECORDED.cluster}
              </p>
            </section>
  )
}
