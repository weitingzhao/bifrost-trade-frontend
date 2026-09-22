/**
 * The daily digest card body (research-loop-automation D2): the prose, then
 * the candidate batches it summarises folded beneath — reachable, not the
 * first thing seen.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { DigestReadings } from '@/components/cockpit/DigestReadings'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { StatusLamp } from '@/components/StatusLamp'
import {
  digestBatches,
  digestDissents,
  digestExhibits,
  digestLamps,
  digestResolutions,
  digestWithout,
} from '@/lib/harness/dailyDigest'

export function DailyDigestBody({
  payload,
  readingsOpen = false,
  clampProse = true,
  omitSection,
}: {
  payload: Record<string, unknown>
  /** Open the readings table on arrival — the Desk reads the digest; the Inbox decides on it. */
  readingsOpen?: boolean
  /**
   * Cap the prose and scroll it inside the card.
   *
   * Right in a card: the dock is 440 wide and a draft card sits in a list of
   * them, so one long digest must not push the rest off the screen. Wrong in
   * a page panel: the design's digest has no inner scroller, and a scrollbar
   * inside a panel on a page that already scrolls is two scrollers for one
   * gesture (Owner, 2026-09-21: «纵向滚动条好丑»).
   */
  clampProse?: boolean
  /**
   * A section of the agent's document to leave out, by a prefix of its
   * heading.
   *
   * The Daily Brief page lifts *What changed / needs a decision* into its own
   * panel — the design's **The one thing** — and then renders the rest here.
   * Without this the page would print that paragraph twice, once as the
   * headline and once inside the prose it was lifted from.
   */
  omitSection?: string
}) {
  const [batchesOpen, setBatchesOpen] = useState(false)
  const batches = digestBatches(payload)
  const dissents = digestDissents(payload)
  const resolutions = digestResolutions(payload)
  const raw = typeof payload.markdown === 'string' ? payload.markdown : ''
  const markdown = omitSection ? digestWithout(raw, omitSection) : raw
  const model = typeof payload.model === 'string' ? payload.model : 'heuristic'
  const holdings = typeof payload.holdings_status === 'string' ? payload.holdings_status : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-dense-meta text-muted-foreground">
        {digestLamps(payload).map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5" title={l.why}>
            <StatusLamp lamp={l.lamp} variant="dot" title={l.why} />
            <span className="font-mono">{l.label}</span>
          </span>
        ))}
      </div>
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
        {/* `applied` is the digest's success word (daily_digest.py); this compared against `ok`, which it never writes, and flagged every digest. */}
        {holdings && holdings !== 'applied' ? (
          <DenseTag variant="warning" size="cell" title="Holdings were not applied; the symbol list is the Loop's candidates">
            holdings {holdings}
          </DenseTag>
        ) : null}
        <span className="text-dense-micro text-muted-foreground">prose: {model}</span>
      </div>

      {markdown ? (
        <div className={clampProse ? 'max-w-prose max-h-80 overflow-y-auto' : 'max-w-prose'}>
          <MarkdownContent className="text-foreground/90">{markdown}</MarkdownContent>
        </div>
      ) : null}

      <DigestReadings rows={digestExhibits(payload)} defaultOpen={readingsOpen} />

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
