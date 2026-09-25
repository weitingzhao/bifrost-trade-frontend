/**
 * The census face of the Research layer page — what `/research/workbench` was.
 *
 * §5a.9 (design Rev 2026-09-22.2) merged the Pipeline fold into the Research
 * layer, and the reason it could is that the design's own FILES table maps
 * `/research/overview` and `/research/workbench` to **one prototype**: the
 * census was always a second face of the layer page, not a second page. This
 * side had built them as two, so the merge is a real move — the body comes
 * here and the two routes render one component with a face switch.
 *
 * Nothing about the reading changed. The Owner's question when the fold left
 * the menu was whether the business value went with it («Pipeline 页面里的业务
 * 价值还是需要保留吧») — it did not: this is the whole of it, one segment away,
 * and `/research/workbench` still lands straight on it.
 */
import { PipelineCensus } from '@/pages/research/pipeline/PipelineCensus'
import { usePipelineCensus } from '@/pages/research/pipeline/usePipelineCensus'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { useResearchHomeData } from '@/hooks/useResearchHomeData'

export function PipelineCensusFace() {
  // The same reading the census panel renders — one computation, two readers.
  const census = usePipelineCensus()
  const home = useResearchHomeData()
  // Both feed the census; the face reports a failure only when neither the
  // stores nor the lanes answered, because one of the two still makes a page.
  const hardError = census.error != null && home.isError

  return (
    <div className="space-y-3">
      {/* The design's seat-context strip (Research Overview.dc.html, the seat
          homes, Rev 2026-09-18.2): the seat as a tag on the page rather than a
          rail state. The prototype's own ruling is that this home is not
          redesigned — what changed is around it. */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border px-3 py-2 mat-card">
        <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Context
        </span>
        <span className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-dense-meta mat-tag">
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

    </div>
  )
}
