/**
 * Track record — every judge, scored by the same rule.
 *
 * Design: `Research Copilot.dc.html`, the Personas face. Its argument is the
 * reason the table is worth having at all: *the hand is a judge too*. A judge
 * that is right when you are wrong earns weight; one that only ever agrees
 * with you adds nothing, however good its hit rate looks.
 *
 * What is here and what is not, measured on DEV 2026-09-20 rather than
 * assumed:
 *
 * - The outcome store attributes a settled candidate to its **source** —
 *   `harness`, `copilot`, `scan`, `momentum`, `sepa` — which is where the
 *   nomination came from, not which judge graded it. Nothing anywhere records
 *   a per-judge verdict against the outcome that followed, so the design's
 *   five judge rows (`vol_desk` · `momentum` · `value` · `research`, plus
 *   you) cannot be drawn. These rows are origins, and the header says so
 *   rather than letting them be read as judges.
 * - It settles at **1 and 5 days**. The design scores at 20; that horizon is
 *   not computed, so the column is named and left empty rather than quietly
 *   re-based onto 5d, which would make a judge look decided by a rule nobody
 *   agreed to.
 * - **Agrees with you** needs a hand verdict beside a machine one on the same
 *   name. The hand-verdict store (Vision §4 · §9.3) does not exist yet.
 * - **Best regime** needs a regime label on the settled outcome. There is none.
 * - **Weight** is the persona's own preference, not a scored figure, and it
 *   lives in the editor below — so the row links there instead of restating it.
 *
 * Marked, not dropped: every column the design asks for keeps its place and
 * names the half that is missing. A table quietly shipped with four of eight
 * columns reads as the whole scoreboard.
 */
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { DenseTag } from '@/components/data-display'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  fetchCandidateOutcomeRows,
  fetchCandidateOutcomeSummary,
  type CandidateOutcomeSummary,
} from '@/api/research/candidateOutcome'
import { cn } from '@/lib/utils'
import { fmtPct0, fmtSignedPct } from '@/utils/positions'

/** The window the record is read over. A year of a book this size is ~100 settled rows. */
const DAYS = 365
/** Under this many settled, a hit rate is a coincidence. The design's own line. */
const THIN = 10
/** The horizons the store settles. The design scores at 20; see the file's note. */
const HORIZONS = [1, 5] as const

/** What the design asks for and this side cannot compute, each with the reason. */
const UNSCORED: { column: string; missing: string }[] = [
  {
    column: 'Hit 20d',
    missing: 'the outcome store settles at 1 and 5 days — no 20-day horizon is computed',
  },
  {
    column: 'Agrees with you',
    missing: 'nothing records a hand verdict beside the machine’s on the same name',
  },
  { column: 'Best regime', missing: 'settled outcomes carry no regime label' },
]

/** Where a nomination came from, as the operator who owns it. */
function operatorOf(source: string): { label: string; variant: 'neutral' | 'category' } {
  if (source === 'copilot') return { label: 'copilot', variant: 'category' }
  if (source === 'harness') return { label: 'loop', variant: 'neutral' }
  return { label: 'screen', variant: 'neutral' }
}

function horizonOf(summary: CandidateOutcomeSummary | undefined, days: number) {
  return summary?.horizons?.find((h) => h.horizon_days === days) ?? null
}

export function JudgeTrackRecord() {
  // One read to learn which sources the store actually attributes — the rows
  // endpoint ignores a `source` filter, and the summary needs to be asked for
  // one at a time.
  const rowsQuery = useQuery({
    queryKey: ['research', 'candidate-outcome', 'sources', DAYS],
    queryFn: () => fetchCandidateOutcomeRows({ limit: 500 }),
    staleTime: 10 * 60_000,
  })

  const sources = useMemo(() => {
    const seen = new Map<string, number>()
    for (const r of rowsQuery.data?.rows ?? []) {
      const s = (r.source ?? '').trim()
      if (s) seen.set(s, (seen.get(s) ?? 0) + 1)
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
  }, [rowsQuery.data])

  // The numbers are the server's, per source — not re-derived from the rows
  // above, so this table and Signal Decay cannot disagree about a hit rate.
  const summaries = useQueries({
    queries: sources.map((source) => ({
      queryKey: ['research', 'candidate-outcome', 'summary', source, DAYS],
      queryFn: () => fetchCandidateOutcomeSummary({ source, days: DAYS }),
      staleTime: 10 * 60_000,
    })),
  })

  const rows = sources.map((source, i) => ({ source, summary: summaries[i]?.data }))
  const loading = rowsQuery.isLoading || summaries.some((q) => q.isLoading)

  return (
    <Card variant="elevated" className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Track record
        </span>
        <h2 className="text-dense-body font-semibold">
          every nomination source, scored by the same rule
        </h2>
        <span className="ml-auto text-dense-meta text-muted-foreground">
          settled over {DAYS} days · n &lt; {THIN} amber
        </span>
      </div>

      {/* The design's table is per judge. This is the honest version of it, and
          saying so here is the difference between a partial answer and a wrong
          one. */}
      <p className="text-dense-meta text-muted-foreground">
        These are where a candidate came from, not which judge graded it. Per-judge scoring is
        what the design asks for — a judge that is right when you are wrong earns weight, one that
        only agrees with you adds nothing — and nothing on this side records a judge's verdict
        against the outcome that followed, so no row here can carry a judge's name.
      </p>

      {rowsQuery.isError ? <QueryErrorAlert error={rowsQuery.error} /> : null}

      {loading ? (
        <Skeleton className="h-28 w-full rounded-md" />
      ) : rows.length === 0 ? (
        <p className="text-dense-meta text-muted-foreground">
          Nothing has settled in the last {DAYS} days. An empty record is not a bad one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-dense-label">
            <colgroup>
              <col className="min-w-[8rem]" />
              <col className="min-w-[5rem]" />
              <col className="min-w-[4.5rem]" />
              <col className="min-w-[5rem]" />
              <col className="min-w-[5rem]" />
              <col className="min-w-[6rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-1 text-left text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
                  Source
                </th>
                <th className="px-2 py-1 text-left text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
                  Operator
                </th>
                <th className="px-2 py-1 text-right text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
                  Settled
                </th>
                {HORIZONS.map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1 text-right text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Hit {h}d
                  </th>
                ))}
                <th
                  className="px-2 py-1 text-right text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground"
                  title="Average return above the benchmark over 5 days"
                >
                  Excess 5d
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ source, summary }) => {
                const op = operatorOf(source)
                const five = horizonOf(summary, 5)
                const settled = Math.max(...HORIZONS.map((h) => horizonOf(summary, h)?.settled ?? 0))
                const thin = settled < THIN
                return (
                  <tr key={source} className="border-b border-border/50">
                    <td className="px-2 py-1 font-medium">{source}</td>
                    <td className="px-2 py-1">
                      <DenseTag variant={op.variant} size="cell">
                        {op.label}
                      </DenseTag>
                    </td>
                    <td
                      className={cn(
                        'px-2 py-1 text-right font-mono tabular-nums',
                        thin && 'text-warning',
                      )}
                      title={thin ? `Fewer than ${THIN} settled — read this row as anecdote` : undefined}
                    >
                      {settled}
                    </td>
                    {HORIZONS.map((h) => {
                      const row = horizonOf(summary, h)
                      return (
                        <td
                          key={h}
                          className={cn(
                            'px-2 py-1 text-right font-mono tabular-nums',
                            thin
                              ? 'text-warning'
                              : row?.hit_rate != null && row.hit_rate >= 0.55
                                ? 'text-success'
                                : 'text-muted-foreground',
                          )}
                        >
                          {fmtPct0(row?.hit_rate)}
                        </td>
                      )
                    })}
                    <td className="px-2 py-1 text-right font-mono tabular-nums text-muted-foreground">
                      {fmtSignedPct(five?.avg_excess)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-0.5 border-t border-border/50 pt-2 text-dense-meta text-muted-foreground">
        <div className="text-dense-micro font-semibold uppercase tracking-wide">
          Columns the design scores that nothing here can
        </div>
        {UNSCORED.map((u) => (
          <p key={u.column}>
            <span className="text-foreground/80">{u.column}</span> — {u.missing}.
          </p>
        ))}
        <p>
          <span className="text-foreground/80">Weight</span> — a preference, not a score. It is set
          per persona in the editor below; a change to it is a policy patch and goes through the
          Decision Inbox, and adding or retiring a judge always waits for you.
        </p>
      </div>
    </Card>
  )
}
