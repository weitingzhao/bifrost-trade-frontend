/**
 * Daily Brief — `/research/daily-brief`, walked against
 * `Research Daily Brief.dc.html` (Rev 2026-09-17.1) on 2026-09-22.
 *
 * ## The page was answering a different question
 *
 * This is the largest mismatch the walk has found, and it was not a shape: the
 * design's Daily Brief has **no symbol at all** (`symbol=""` in the prototype).
 * It is the morning's reading of *the book* — the Morning Prep run's output
 * kept as a page, "a sedimented conversation" in its own words. This side had
 * built a **per-symbol lens dashboard**: a symbol context bar, a verdict strip
 * and nine cards — terrain, forecast, gex, opex, iv, vrp, skew, term slope,
 * sentiment — for one name on one date.
 *
 * Every one of those nine is now a row on a Symbol face. The page was a second
 * rendering of the Symbol page's lenses with a date picker on it, which is the
 * same duplication this round removed from Pipeline and from the Symbol
 * Overview. The Owner ruled on 2026-09-22 that it goes.
 *
 * ## What it reads now, measured before it was built
 *
 * The design's page **is the `daily_digest` draft**, which this app already
 * receives and already renders in the dock. Measured on DEV 2026-09-22:
 *
 * | the design's block | where it comes from | state |
 * |---|---|---|
 * | run · persona · cost | `generated_by`, `prose.{provider,model,cost_usd}` | real |
 * | The one thing | the agent's `### What changed / needs a decision` | real |
 * | Overnight — book + pipeline | fills · signal health · decay alerts, read from their own stores | real (book row owed) |
 * | Today & next — events | `/research/events/calendar` + OPEX arithmetic | real (re-measured 2026-09-26) |
 * | Loop — what Autopilot left | `loop.{pending,runs,objectives,trust}` | real |
 *
 * Two of the design's four blocks are drawn from the artifact and two from
 * the stores that own them (`DailyBriefReadings.tsx`); the one row still owed —
 * the book's overnight move — says so where it sits.
 *
 * The artifact carries three sections the design does not draw (the holdings'
 * readings, the dissents, the resolutions). They are not dropped: the design's
 * page is a summary of a run and this *is* that run, so they render below
 * under the run's own heading, by the same component the dock uses.
 */
import { Link, useNavigate } from 'react-router-dom'
import { PageHead, PageHeadLink, PageShell, SectionPanel } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { ViewState } from '@bifrost/ui'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail } from '@/lib/viewState'
import { BriefCalendar, BriefOvernight } from './DailyBriefReadings'
import { DailyDigestBody } from '@/components/cockpit/DailyDigestBody'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { useDailyDigest } from '@/hooks/useDailyDigest'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { classifyResearchAuthError } from '@/lib/auth/researchAuthGap'
import { useResearchAuth } from '@/lib/auth/researchUser'
import { digestSection } from '@/lib/harness/dailyDigest'
import { loopLines } from '@/lib/harness/digestRead'
import { fmtIsoTs } from '@/lib/format'

/** The lifted section, named once — the page and the body must agree on it. */
const ONE_THING = 'What changed'

/** `deepseek-chat · $0.0011` — what the run cost, when the payload says. */
function runCost(payload: Record<string, unknown> | null): string | null {
  const prose = (payload?.prose ?? null) as Record<string, unknown> | null
  if (!prose) return null
  const model = typeof prose.model === 'string' ? prose.model : null
  const cost = typeof prose.cost_usd === 'number' ? prose.cost_usd : null
  return [model, cost != null ? `$${cost.toFixed(4)}` : null].filter(Boolean).join(' · ') || null
}

export default function DailyBriefPage() {
  const { digest, payload, isLoading, isError, error, refetch } = useDailyDigest({
    refetchIntervalMs: 60_000,
  })
  // Not signed in is not a failed read (Design 2026-09-15 Q2=A).
  const { token } = useResearchAuth()
  const authGap = classifyResearchAuthError(error, token)

  const day = typeof payload?.day === 'string' ? payload.day : null
  const oneThing = typeof payload?.markdown === 'string'
    ? digestSection(payload.markdown, ONE_THING)
    : null
  const loop = payload ? loopLines(payload) : []
  const advisory = typeof payload?.advisory === 'string' ? payload.advisory : null
  const navigate = useNavigate()
  const preview = usePreviewState()
  // §17.1 on the digest read: the other blocks keep their own states.
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale'
      ? preview
      : isError
        ? digest
          ? 'stale'
          : authGap
            ? 'signed-out'
            : 'failed'
        : isLoading && !digest
          ? 'loading'
          : 'ready'

  return (
    <PageShell padding="default" className="space-y-3">
      {/* §16.10: the run behind ⓘ and as the head's meta; the Desk and the
          Inbox as its doors. */}
      <PageHead
        title="Daily Brief"
        info="Morning Prep run · the brief is a Copilot post: read it here, discuss it in the Desk thread."
        meta={
          digest
            ? `${digest.generated_by ?? 'the morning run'} · ${fmtIsoTs(digest.created_at)}${
                runCost(payload) ? ` · ${runCost(payload)}` : ''
              }`
            : undefined
        }
        actions={
          <>
            {/* The design's `Thread in Desk →`, pointed at the Pilot Console
                since the Desk merged into it (Rev .100). The digest carries no
                thread or session id — `generated_by: digest_agent` is all it
                says about where it came from — so this opens the Console, where
                the digest and the conversations now live, rather than a
                conversation it cannot name. */}
            <PageHeadLink
              to="/research/loop/harness"
              title="The digest carries no thread id, so this opens the Pilot Console — its digest and conversations — rather than a conversation it cannot name."
            >
              Pilot Console →
            </PageHeadLink>
            <PageHeadLink to="/research/loop/decisions" title="Approve or leave the digest">
              Inbox →
            </PageHeadLink>
            {/* The design's `⟳ Re-run` queues the Morning Prep run. Nothing on
                this side triggers a digest: the agent runs on its own schedule
                and there is no route that asks for another. Marked rather than
                drawn — a button that queued nothing would be worse. */}
            <span
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-dense-caption text-muted-foreground/70"
              title="The design offers ⟳ Re-run here. The digest agent runs on a schedule and no route asks it for another run, so there is nothing to queue."
            >
              ⟳ re-run · not on this side
            </span>
            <AskCopilotButton
              originPage="daily-brief"
              originLabel="Daily Brief"
              snapshot={compactSnapshot({ day, one_thing: oneThing?.slice(0, 400) })}
              suggestedPrompt="From this morning's digest: what is the one thing I should decide before the open?"
            />
          </>
        }
      />

      {/* The design's note, and it is the page's whole argument: this is a
          conversation that was kept, not a dashboard that was computed. */}
      <p
        role="note"
        className="max-w-[92ch] border px-3 py-2 text-dense-meta leading-relaxed text-muted-foreground mat-card"
      >
        The brief is a <span className="font-semibold text-foreground">sedimented conversation</span>{' '}
        — the morning run&rsquo;s output kept as a page. Every claim cites the page it read; nothing
        here is knowable only here.
        {advisory ? <span className="ml-1 text-warning">{advisory}</span> : null}
      </p>

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the digest"
          detail="Showing the last copy — a newer post may be waiting in the Inbox."
          onAction={() => void refetch()}
        />
      ) : null}
      {pageState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading the brief" rows={6} cols={3} />
        </section>
      ) : pageState === 'signed-out' ? (
        <ResearchAuthGap error={error} onRetry={() => void refetch()} />
      ) : pageState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load the brief"
            detail={failedDetail(
              { data: null, isPending: false, isError: true, error },
              'No post was read — an empty page here would not mean the morning run wrote nothing.',
            )}
            onAction={() => void refetch()}
          />
        </section>
      ) : !digest || !payload ? (
        <>
          <section className="overflow-hidden mat-card">
            <ViewState
              kind="empty"
              title="No digest for today"
              detail="The digest agent writes one post per trading day and none is waiting. It appears here the moment it is written, and is approved or left in the Inbox."
              actionLabel="Open the Inbox"
              onAction={() => navigate('/research/loop/decisions')}
            />
          </section>
          {/* These two read their own stores, not the digest — a morning with
              no post still has fills, a pipeline and a calendar. */}
          <BriefOvernight />
          <BriefCalendar />
        </>
      ) : (
        <>
          <SectionPanel cap="The one thing" title={day ? `for ${day}` : 'this morning'}>
            <div className="px-3 py-2.5">
              {oneThing ? (
                <MarkdownContent className="max-w-[92ch] text-foreground/90">
                  {oneThing}
                </MarkdownContent>
              ) : (
                <p className="text-dense-meta text-muted-foreground">
                  This run wrote no <span className="font-mono">{ONE_THING}…</span> section — the
                  heuristic digest has one only when something changed.
                </p>
              )}
            </div>
          </SectionPanel>

          {/* Read from the stores that own them (§15.6) — the digest carries
              neither. Full width, one after the other, as the design stacks
              them: what moved, then what is coming. */}
          <BriefOvernight />
          <BriefCalendar />

          <SectionPanel
            cap="Loop"
            title="what Autopilot left for you"
            note="the same queue as the Inbox — one queue, two readings"
          >
            {loop.length === 0 ? (
              <p className="px-3 py-2.5 text-dense-meta text-muted-foreground">
                The loop left nothing waiting.
              </p>
            ) : (
              loop.map((row) => (
                <div
                  key={row.text}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <DenseTag variant={row.tag === 'AWAITING' ? 'warning' : 'neutral'} size="cell">
                    {row.tag ?? row.sym}
                  </DenseTag>
                  <span className="min-w-0 flex-1 text-dense-meta leading-relaxed">{row.text}</span>
                  {row.cite ? (
                    <Link to={row.cite.to} className="text-dense-meta text-primary hover:underline">
                      {row.cite.label} →
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </SectionPanel>

          {/* The run's own sections — the three the design does not draw. The
              page is a summary of a run and this is that run, so they render
              by the component the dock already uses, with the section this
              page lifted taken out so nothing prints twice. */}
          <SectionPanel
            cap="The run"
            title="everything else it wrote"
            note={`read ${(payload.symbols as unknown[] | undefined)?.length ?? 0} names`}
          >
            <div className="px-3 py-2.5">
              <DailyDigestBody payload={payload} clampProse={false} omitSection={ONE_THING} />
            </div>
          </SectionPanel>

          <p className="text-dense-caption leading-relaxed text-muted-foreground">
            Sources read by this run: the lens exhibits for{' '}
            {(payload.symbols as unknown[] | undefined)?.length ?? 0} names, the loop&rsquo;s own
            queue and its objectives. Window:{' '}
            <span className="font-mono">{fmtIsoTs(String(payload.since ?? ''))}</span> →{' '}
            <span className="font-mono">{fmtIsoTs(String(payload.generated_at ?? ''))}</span>. The
            design&rsquo;s footer also names Positions, Risk Exposure, Events and the Playbook; the
            run itself reads none of them — Overnight and Today &amp; next above read their stores
            directly.
          </p>
        </>
      )}
    </PageShell>
  )
}
