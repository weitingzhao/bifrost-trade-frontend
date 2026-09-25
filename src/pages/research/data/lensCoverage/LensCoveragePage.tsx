/**
 * Lens Coverage — walked against `Research Lens Coverage.dc.html`
 * (Rev 2026-09-19.2) on 2026-09-22.
 *
 * The Dossier answers "which faces does this symbol have"; this asks it of
 * every symbol at once, which is the number that says whether widening the
 * option universe is reaching the analysis or only the collector.
 * Observe-only (D10).
 *
 * ## The design's one change, and it pays immediately
 *
 * Its footer names what was wrong here: *"The old page showed one bar per
 * lens across the whole universe; this splits it by tier because the Book
 * being 100% and Extended being 40% are different problems."* This side was
 * the old page.
 *
 * The split costs nothing — `/research/screen/coverage` already takes a
 * `tiers` filter, so a column is the same call with one tier in it. Measured
 * on DEV 2026-09-22 (resident 22 · core 577 · edge 48) it earns itself on the
 * first row it draws: **IV Rank reads 99% of core and 71% of edge**, and one
 * number over the whole universe says 97%.
 *
 * ## The zero that looked like a disaster
 *
 * `every_face` is 0 in every tier. The cause is a single lens —
 * `order_sentiment` returns 0 of 647 while the other nine screenable lenses
 * run 88–100% — so no symbol can read all ten. The page names it under the
 * strip now; printing the zero alone sent the reader hunting a systemic
 * failure that is not there.
 *
 * ## Owed, and why
 *
 * - **Δ 7d** — nothing stores yesterday's coverage, so there is no previous
 *   reading to difference against. Named in the matrix footer rather than
 *   drawn as a column of thirteen dashes.
 * - **The click-a-cell Missing aside** — the response carries counts, not
 *   names, so the panel would have nothing to put in it. It keeps its place
 *   and says so.
 */
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { fetchLensCoverage } from '@/api/research/lensCoverage'
import { CoverageMatrix } from './CoverageMatrix'
import {
  coverageMatrix,
  coverageStrip,
  everyFaceBlocker,
  reachBars,
  tierColumns,
  unscreenableRows,
  type ByTier,
} from './coverageModel'
import { ANALYZE_HUB } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'

const LAMP_TEXT: Record<string, string> = {
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-danger',
  gray: 'text-muted-foreground',
}

export default function LensCoveragePage() {
  const q = useQuery({
    queryKey: ['research', 'lens-coverage'],
    queryFn: () => fetchLensCoverage(),
    staleTime: 60_000,
  })
  const data = q.data
  // One call per tier, so a column is a real reading of that tier rather than
  // a share of the whole universe wearing a tier's name.
  const tierQs = useQueries({
    queries: (data?.tiers ?? []).map((t) => ({
      queryKey: ['research', 'lens-coverage', t],
      queryFn: () => fetchLensCoverage([t]),
      staleTime: 60_000,
    })),
  })
  const byTier: ByTier = Object.fromEntries(
    (data?.tiers ?? []).map((t, i) => [t, tierQs[i]?.data]),
  )
  const columns = tierColumns(data, byTier)
  const faces = coverageMatrix(data, byTier, columns)
  const strip = coverageStrip(data, byTier, columns)
  const blocker = everyFaceBlocker(data)
  const unscreenable = unscreenableRows(data)
  const reach = reachBars(byTier, columns)
  const reading = q.isFetching || tierQs.some((t) => t.isFetching)

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Lens Coverage"
        description="What the analysis can actually see, lens by lens, tier by tier. The Dossier asks this of one symbol; this asks it of all of them."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/research/lab/calibration"
              className="text-dense-meta text-muted-foreground hover:text-foreground"
            >
              Calibration →
            </Link>
            <button
              type="button"
              onClick={() => {
                void q.refetch()
                tierQs.forEach((t) => void t.refetch())
              }}
              disabled={reading}
              className="rounded-md border border-border px-2 py-1 text-dense-meta hover:bg-secondary disabled:opacity-50"
            >
              {reading ? 'Reading…' : '↻ Re-read universe'}
            </button>
          </div>
        }
      />

      {q.isPending ? (
        <p className="text-dense-meta text-muted-foreground">Reading the universe…</p>
      ) : null}
      {q.isError ? (
        <p role="status" className="text-dense-meta text-danger">
          Coverage unavailable — the screen could not read the lens layer.
        </p>
      ) : null}

      {data ? (
        <>
          <div className="flex flex-wrap overflow-hidden rounded-lg border border-border">
            {strip.map((s) => (
              <div
                key={s.k}
                className="flex min-w-0 flex-[1_1_200px] items-start gap-2.5 border-r border-border/60 px-3 py-2 last:border-r-0"
              >
                <StatusLamp lamp={s.lamp} variant="dot" className="mt-1.5 h-2.5 w-2.5" />
                <div className="min-w-0">
                  <p className="text-dense-micro font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    {s.k}
                  </p>
                  <p
                    className={cn(
                      'whitespace-nowrap font-mono text-lg font-semibold leading-tight tabular-nums',
                      LAMP_TEXT[s.lamp],
                    )}
                  >
                    {s.v}
                  </p>
                  <p className="text-dense-caption text-muted-foreground">{s.note}</p>
                </div>
              </div>
            ))}
          </div>

          {blocker ? (
            <p
              role="status"
              className="rounded-md border border-warning/40 bg-warning-soft/20 px-2.5 py-1.5 text-dense-meta text-warning"
            >
              Nothing reads every face: {blocker}. The other lenses are not the problem.
            </p>
          ) : null}

          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <div className="min-w-0 flex-[999_1_620px]">
              <CoverageMatrix faces={faces} columns={columns} />
            </div>

            <aside className="flex min-w-0 max-w-[420px] flex-[1_1_320px] flex-col gap-3">
              <section className="rounded-lg border border-dashed border-border px-3 py-3">
                <p className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Missing
                </p>
                <p className="mt-1 text-dense-caption leading-relaxed text-muted-foreground">
                  The design lists the symbols a lens cannot read, with the fix beside each one.
                  <span className="text-foreground/80">
                    {' '}
                    This side cannot: the coverage response carries counts, not names
                  </span>
                  , so a cell click would open an empty panel. It needs the endpoint to return the
                  unread symbols per lens.
                </p>
                <p className="mt-2 text-dense-caption text-muted-foreground">
                  One symbol at a time is answerable today —{' '}
                  <Link
                    to={withSymbolParam(ANALYZE_HUB.dossier, 'SPY')}
                    className="text-foreground hover:underline"
                  >
                    the Dossier
                  </Link>{' '}
                  shows which faces a name has.
                </p>
              </section>

              <section className="overflow-hidden rounded-lg border border-border">
                <header className="flex items-baseline gap-2 border-b border-border bg-secondary/40 px-3 py-2">
                  <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Unscreenable
                  </span>
                  <span className="text-dense-body font-semibold">By design, not by failure</span>
                </header>
                {unscreenable.length === 0 ? (
                  <p className="px-3 py-3 text-dense-caption text-muted-foreground">
                    Every lens in the registry can be screened.
                  </p>
                ) : (
                  <ul>
                    {unscreenable.map((u) => (
                      <li
                        key={u.lens}
                        className="flex items-start gap-2.5 border-b border-border/50 px-3 py-2 last:border-b-0"
                      >
                        <StatusLamp lamp="gray" variant="dot" className="mt-1 h-2.5 w-2.5" />
                        <div className="min-w-0">
                          <p className="text-dense-meta">{u.label}</p>
                          <p className="text-dense-caption leading-relaxed text-muted-foreground">
                            {u.why}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="overflow-hidden rounded-lg border border-border">
                <header className="flex items-baseline gap-2 border-b border-border bg-secondary/40 px-3 py-2">
                  <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Reach
                  </span>
                  <span className="text-dense-body font-semibold">
                    Is widening the universe reaching the analysis?
                  </span>
                </header>
                <div className="space-y-2 px-3 py-2.5">
                  {reach.map((r) => {
                    const full = r.universe > 0 ? (r.everyFace / r.universe) * 100 : 0
                    const partial = r.universe > 0 ? (r.partial / r.universe) * 100 : 0
                    return (
                      <div key={r.tier}>
                        <p className="flex items-baseline gap-2 text-dense-caption">
                          <span>{r.tier}</span>
                          <span className="ml-auto font-mono tabular-nums text-muted-foreground">
                            {r.everyFace} / {r.universe} every face
                          </span>
                        </p>
                        <div
                          className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-secondary"
                          title={`${r.tier}: ${r.everyFace} every face · ${r.partial} some · ${r.noOptionFace} stock-side only`}
                        >
                          <span className="bg-success" style={{ width: `${full}%` }} />
                          <span className="bg-muted-foreground/40" style={{ width: `${partial}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  <p className="text-dense-caption leading-relaxed text-muted-foreground">
                    Filled = every face readable; grey = some faces only; the remainder has no
                    option face at all. A tier that grows while its filled bar does not is the
                    collector outrunning the analysis — which is what this page is for.
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </PageShell>
  )
}
