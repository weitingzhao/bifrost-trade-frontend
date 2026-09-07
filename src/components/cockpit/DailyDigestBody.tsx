/**
 * The daily digest card body (research-loop-automation D2): the prose, then
 * the candidate batches it summarises folded beneath — reachable, not the
 * first thing seen.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { digestBatches, digestDissents, digestResolutions } from '@/lib/harness/dailyDigest'

export function DailyDigestBody({ payload }: { payload: Record<string, unknown> }) {
  const [batchesOpen, setBatchesOpen] = useState(false)
  const batches = digestBatches(payload)
  const dissents = digestDissents(payload)
  const resolutions = digestResolutions(payload)
  const markdown = typeof payload.markdown === 'string' ? payload.markdown : ''
  const model = typeof payload.model === 'string' ? payload.model : 'heuristic'
  const holdings = typeof payload.holdings_status === 'string' ? payload.holdings_status : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <DenseTag variant="neutral" size="cell">
          {batches.length} batch{batches.length === 1 ? '' : 'es'}
        </DenseTag>
        {dissents.length > 0 ? (
          <DenseTag variant="danger" size="cell">
            {dissents.length} dissent{dissents.length === 1 ? '' : 's'}
          </DenseTag>
        ) : null}
        {resolutions.length > 0 ? (
          <DenseTag variant="success" size="cell">
            {resolutions.length} resolved
          </DenseTag>
        ) : null}
        {holdings && holdings !== 'ok' ? (
          <DenseTag variant="warning" size="cell" title="Holdings were not applied; the symbol list is the Loop's candidates">
            holdings {holdings}
          </DenseTag>
        ) : null}
        <span className="text-dense-micro text-muted-foreground">prose: {model}</span>
      </div>

      {markdown ? (
        <div className="max-w-prose max-h-80 overflow-y-auto">
          <MarkdownContent className="text-foreground/90">{markdown}</MarkdownContent>
        </div>
      ) : null}

      {batches.length > 0 ? (
        <div className="rounded-sm border border-border/60">
          <button
            type="button"
            onClick={() => setBatchesOpen((o) => !o)}
            aria-expanded={batchesOpen}
            className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-dense-meta text-foreground hover:bg-secondary/60"
          >
            {batchesOpen ? <ChevronDown className="size-3 shrink-0" aria-hidden /> : <ChevronRight className="size-3 shrink-0" aria-hidden />}
            Candidate batches since yesterday ({batches.length}) — each is its own decision below
          </button>
          {batchesOpen ? (
            <ul className="space-y-1 border-t border-border/60 px-2 py-1.5">
              {batches.map((b) => (
                <li key={b.run_id} className="text-dense-meta">
                  <span className="font-medium">{b.objective_title ?? b.objective_id}</span>
                  <span className="text-muted-foreground"> · {b.status}</span>
                  {b.repeats > 1 ? <span className="text-muted-foreground"> · ×{b.repeats} runs</span> : null}
                  {' · '}
                  <span className="font-mono">{b.candidates.join(', ') || '—'}</span>
                  {b.dissent > 0 ? (
                    <DenseTag variant="danger" size="cell" className="ml-1">
                      {b.dissent} dissent
                    </DenseTag>
                  ) : null}
                  {' · '}
                  <Link to={loopPipelinePath(b.run_id)} className="text-primary hover:underline">
                    Pipeline
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
