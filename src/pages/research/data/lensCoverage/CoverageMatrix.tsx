/**
 * The design's matrix: lenses down, tiers across.
 *
 * Its own footer is the argument — *"The old page showed one bar per lens
 * across the whole universe; this splits it by tier because the Book being
 * 100% and Extended being 40% are different problems."* Measured on DEV
 * 2026-09-22 the same split lands on IV Rank: 99% of core, 71% of the edge.
 */
import { Fragment } from 'react'
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'
import type { MatrixFace, TierColumn } from './coverageModel'

const LAMP_TEXT: Record<string, string> = {
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-danger',
  gray: 'text-muted-foreground/60',
}

export function CoverageMatrix({
  faces,
  columns,
}: {
  faces: readonly MatrixFace[]
  columns: readonly TierColumn[]
}) {
  return (
    <section className="overflow-hidden border mat-card">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Matrix
        </span>
        <span className="text-dense-body font-semibold">Lenses × tiers</span>
        <span className="text-dense-caption text-muted-foreground">
          cell = share of the tier the lens can read
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2.5 py-1.5 text-left text-dense-micro font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Lens
              </th>
              {columns.map((c) => (
                <th
                  key={c.tier}
                  className="whitespace-nowrap px-2.5 py-1.5 text-right text-dense-micro font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                >
                  {c.label}{' '}
                  <span className="font-mono font-medium tabular-nums opacity-70">
                    {c.universe}
                  </span>
                </th>
              ))}
              <th className="px-2.5 py-1.5 text-left text-dense-micro font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Blocked by
              </th>
            </tr>
          </thead>
          <tbody>
            {faces.map((f) => (
              <Fragment key={f.face}>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <td
                    colSpan={columns.length + 2}
                    className="px-2.5 py-1 text-dense-caption font-semibold uppercase tracking-[0.08em]"
                  >
                    {f.label}{' '}
                    <span className="font-mono font-normal normal-case tracking-normal text-muted-foreground">
                      · {f.summary}
                    </span>
                  </td>
                </tr>
                {f.rows.map((r) => (
                  <tr key={r.lens} className="border-b border-border/40">
                    <td
                      className="max-w-[24ch] truncate px-2.5 py-1.5 text-dense-meta"
                      title={`${r.label} · ${r.lens}`}
                    >
                      {r.label}{' '}
                      <span className="font-mono text-dense-caption text-muted-foreground">
                        {r.lens}
                      </span>
                    </td>
                    {r.cells.map((c) => (
                      <td key={c.tier} className="px-2.5 py-1.5" title={c.title}>
                        <span className="flex items-center justify-end gap-1.5">
                          <StatusLamp lamp={c.lamp} variant="dot" className="h-2 w-2 shrink-0" />
                          <span
                            className={cn(
                              'font-mono text-dense-meta tabular-nums',
                              LAMP_TEXT[c.lamp],
                            )}
                          >
                            {c.text}
                          </span>
                        </span>
                      </td>
                    ))}
                    <td
                      className="max-w-[34ch] truncate px-2.5 py-1.5 text-dense-caption text-muted-foreground"
                      title={r.blocked ?? undefined}
                    >
                      {r.blocked ?? ''}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        Green ≥ 90% · amber ≥ 25% · red below ·{' '}
        <span className="text-foreground/80">
          grey = unscreenable for this tier — the reason is in Blocked by, not a failure
        </span>
        . Split by tier: IV Rank at 99% of core and 71% of the edge are different problems.{' '}
        <span className="font-mono">Δ 7d</span> is owed — nothing stores yesterday&rsquo;s coverage.
      </p>
    </section>
  )
}
