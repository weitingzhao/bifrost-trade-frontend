/**
 * Pipeline — `/research/workbench`, the layer page for the stations.
 *
 * It was the Research home before the seats, and a dashboard of five stacked
 * blocks after them: the bench directory, the universe funnel, active
 * hypotheses, today's discoveries, recent backtests. Shell Spec §5a.6 turned
 * it into a layer page, and Design's mapping (Rev 2026-09-21.5) folded all
 * five into the reading rather than dropping them — the bench cards and the
 * funnel are the census's section headings, the discovery lanes and the
 * backtests open out of the row that produced each, and the hypotheses are
 * **Left the pipeline**, listed by the station they came out of.
 *
 * So the page is its header and `PipelineCensus`. Everything the five blocks
 * showed is still here; each of them now sits next to what it is about.
 */
import { PageHeader, PageShell } from '@/components/layout'
import { PipelineCensus } from '@/pages/research/pipeline/PipelineCensus'
import { usePipelineCensus } from '@/pages/research/pipeline/usePipelineCensus'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { useResearchHomeData } from '@/hooks/useResearchHomeData'

export default function WorkbenchPage() {
  // The same reading the census panel renders — one computation, two readers
  // (the panel and the header's Copilot snapshot).
  const census = usePipelineCensus()
  const home = useResearchHomeData()
  // Both feed the census; the page reports a failure only when neither the
  // stores nor the lanes answered, because one of the two still makes a page.
  const hardError = census.error != null && home.isError

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Pipeline"
        description="Your hand on the stations. Discover · Analyze · Validate — every store the stations wrote today on one scale, and how much of it nothing came out of. Made is what the engine kept; moved on is a hypothesis that carries the page as its origin. Most stuck first. Advisory only — D10 blocked."
        actions={
          /* Design's ruling (Rev 2026-09-21.5) on the three controls this
             page's header carried. **Ask Copilot stays** — Copilot is a shell
             capability (⌘J on any page), so the button belongs to the shell,
             not to the page — but its snapshot changes: the three numbers it
             used to carry named blocks this page no longer has, so it carries
             the census instead. **Save as Hypothesis went**, and the reason is
             the question we asked: under the new scale a hypothesis is the
             numerator of this page's own `moved on` column, so writing one
             here, with the layer page as its origin, would add to a number
             this page reads. It belongs on the hit that produced it.
             **Daily Brief went** too — it is Copilot's sediment and already a
             menu row; a page repeating a menu row is furniture. */
          <AskCopilotButton
            originPage="research-workbench"
            originLabel="Pipeline"
            snapshot={compactSnapshot({
              stores: `${census.totals.withStore}/${census.totals.onBench}`,
              written: census.totals.written,
              left: census.totals.left,
              worst_station: census.worst ? `${census.worst.label} ${Math.round((census.worst.stuck ?? 0) * 100)}%` : null,
            })}
            suggestedPrompt="From this Pipeline census: which station should I open first, and what is it waiting on?"
          />
        }
      />

      {/* The design's seat-context strip (Research Overview.dc.html, the seat
          homes, Rev 2026-09-18.2): the seat as a tag on the page rather than a
          rail state. The prototype's own ruling is that this home is not
          redesigned — what changed is around it. */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-md border border-border bg-background px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Context
        </span>
        <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-0.5 text-dense-meta">
          <span className="font-mono font-bold text-foreground">hand</span>
          <span className="text-muted-foreground">operator</span>
        </span>
        <span className="text-dense-meta text-muted-foreground">
          the stations all three operators run — your hand is the one at the controls here
        </span>
      </div>

      {/* The layer's own reading (§5a.6), above the bench it is about: a layer
          page leads with the verdict and then shows the detail, the way Risk
          and Portfolio do. */}
      {/* The layer's reading, and now the whole of it. Design's mapping
          (Rev 2026-09-21.5) folds five blocks that used to sit below into it:
          the bench directory and the universe funnel became the census's
          section headings, the four discovery lanes and the recent backtests
          became the expand area of the row that produced each, and the active
          hypotheses became **Left the pipeline** — they have left the
          pipeline, their original is on the Hypothesis Board, and what this
          page wants of them is which station they came out of. */}
      <PipelineCensus />


      {hardError ? (
        <QueryErrorAlert
          error={census.error ?? new Error('Pipeline census unavailable')}
          onRetry={() => home.refetch()}
        />
      ) : null}

    </PageShell>
  )
}
