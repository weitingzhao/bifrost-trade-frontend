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
 * - It settles at **1, 5 and 20 days**. This table draws 1d and 5d. Hit 20d
 *   stays in the list below rather than being quietly re-based onto 5d.
 * - **Agrees with you** needs a hand verdict beside a machine one on the same
 *   name. The hand-verdict store (Vision §4 · §9.3) does not exist yet.
 * - **Best regime** is the terrain regime with the highest 5-day hit rate among
 *   regimes with at least 5 settled outcomes. Under that floor the cell is an
 *   em dash, never 0.
 * - **Weight** is the persona's own preference, not a scored figure, and it
 *   lives in the editor below — so the row links there instead of restating it.
 *
 * Marked, not dropped: every column the design asks for keeps its place and
 * names the half that is missing. A table quietly shipped with four of eight
 * columns reads as the whole scoreboard.
 */
import type { CandidateOutcomeSummary } from '@/api/research/candidateOutcome'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { DenseTag } from '@/components/data-display'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TRACK_DAYS, TRACK_THIN, horizonOf, useSourceTrackRecord } from '@/hooks/useSourceTrackRecord'
import { cn } from '@/lib/utils'
import { bestRegime, bestRegimeTitle, type BestRegime } from '@/pages/copilot/personas/bestRegime'
import { fmtPct0, fmtSignedPct } from '@/utils/positions'

const DAYS = TRACK_DAYS
const THIN = TRACK_THIN
/** Horizons drawn in the row. The summary also settles 20 days; see the file note. */
const HORIZONS = [1, 5] as const

/** What the design asks for and this side cannot compute, each with the reason. */
const UNSCORED: { column: string; missing: string }[] = [
  {
    column: 'Hit 20d',
    missing: 'the summary settles 20 days; this row still draws 1d and 5d only',
  },
  {
    column: 'Agrees with you',
    missing: 'nothing records a hand verdict beside the machine’s on the same name',
  },
]

function bestRegimeCell(summary: CandidateOutcomeSummary | undefined): {
  text: string
  title: string
} {
  if (summary?.by_regime == null) {
    return { text: '—', title: 'no regime breakdown on this summary' }
  }
  const best: BestRegime | null = bestRegime(summary.by_regime)
  if (!best) return { text: '—', title: bestRegimeTitle() }
  return {
    text: best.regime,
    title: `${best.regime} · ${fmtPct0(best.hit_rate)} at 5d · ${best.settled} settled`,
  }
}

/** Where a nomination came from, as the operator who owns it. */
function operatorOf(source: string): { label: string; variant: 'neutral' | 'category' } {
  if (source === 'copilot') return { label: 'copilot', variant: 'category' }
  if (source === 'harness') return { label: 'loop', variant: 'neutral' }
  return { label: 'screen', variant: 'neutral' }
}


export function JudgeTrackRecord() {
  const { rows, loading, error } = useSourceTrackRecord(DAYS)

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

      {/* Signed out it answers 401: the Research-user line, and no "nothing settled". */}
      {error ? <ResearchAuthGap error={error} layout="banner" /> : null}

      {loading ? (
        <Skeleton className="h-28 w-full rounded-md" />
      ) : error ? null : rows.length === 0 ? (
        <p className="text-dense-meta text-muted-foreground">
          Nothing has settled in the last {DAYS} days. An empty record is not a bad one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-dense-label">
            <colgroup>
              <col className="min-w-[8rem]" />
              <col className="min-w-[5rem]" />
              <col className="min-w-[4.5rem]" />
              <col className="min-w-[5rem]" />
              <col className="min-w-[5rem]" />
              <col className="min-w-[6rem]" />
              <col className="min-w-[6rem]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-dense-micro font-semibold text-muted-foreground">
                  Source
                </th>
                <th className="px-2 py-1 text-left text-dense-micro font-semibold text-muted-foreground">
                  Operator
                </th>
                <th className="px-2 py-1 text-right text-dense-micro font-semibold text-muted-foreground">
                  Settled
                </th>
                {HORIZONS.map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1 text-right text-dense-micro font-semibold text-muted-foreground"
                  >
                    Hit {h}d
                  </th>
                ))}
                <th
                  className="px-2 py-1 text-right text-dense-micro font-semibold text-muted-foreground"
                  title="Average return above the benchmark over 5 days"
                >
                  Excess 5d
                </th>
                <th
                  className="px-2 py-1 text-left text-dense-micro font-semibold text-muted-foreground"
                  title="Terrain regime with the highest 5-day hit rate, when at least 5 settled"
                >
                  Best regime
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ source, summary }) => {
                const op = operatorOf(source)
                const five = horizonOf(summary, 5)
                const regime = bestRegimeCell(summary)
                const settled = Math.max(...HORIZONS.map((h) => horizonOf(summary, h)?.settled ?? 0))
                const thin = settled < THIN
                return (
                  <tr key={source}>
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
                    <td className="px-2 py-1 text-muted-foreground" title={regime.title}>
                      {regime.text}
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
