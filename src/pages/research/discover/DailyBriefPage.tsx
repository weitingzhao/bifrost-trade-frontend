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
 * | Overnight — book + pipeline | nowhere: P&L, fills and pipeline health are three other stores | owed |
 * | Today & next — events | `/research/events/calendar` answers `count 0` | blocked |
 * | Loop — what Autopilot left | `loop.{pending,runs,objectives,trust}` | real |
 *
 * So two of the design's four blocks are drawn from the artifact, one is owed
 * and one is blocked — and each says which it is rather than being left out.
 *
 * The artifact carries three sections the design does not draw (the holdings'
 * readings, the dissents, the resolutions). They are not dropped: the design's
 * page is a summary of a run and this *is* that run, so they render below
 * under the run's own heading, by the same component the dock uses.
 */
import { Link } from 'react-router-dom'
import { PageHeader, PageShell, SectionPanel } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { DailyDigestBody } from '@/components/cockpit/DailyDigestBody'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { useDailyDigest } from '@/hooks/useDailyDigest'
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

  const day = typeof payload?.day === 'string' ? payload.day : null
  const oneThing = typeof payload?.markdown === 'string'
    ? digestSection(payload.markdown, ONE_THING)
    : null
  const loop = payload ? loopLines(payload) : []
  const advisory = typeof payload?.advisory === 'string' ? payload.advisory : null

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Daily Brief"
        description={
          digest
            ? `${digest.generated_by ?? 'the morning run'} · ${fmtIsoTs(digest.created_at)}${
                runCost(payload) ? ` · ${runCost(payload)}` : ''
              }`
            : 'The morning run, kept as a page.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* The design's `Thread in Desk →`. The digest carries no thread or
                session id — `generated_by: digest_agent` is all it says about
                where it came from — so this opens the Desk rather than a
                conversation it cannot name. */}
            <Link
              to="/research/copilot"
              className="text-dense-meta text-primary hover:underline"
              title="The digest carries no thread id, so this opens the Desk rather than a conversation it cannot name."
            >
              Desk →
            </Link>
            <Link to="/research/loop/decisions" className="text-dense-meta text-primary hover:underline">
              Inbox →
            </Link>
            {/* The design's `⟳ Re-run` queues the Morning Prep run. Nothing on
                this side triggers a digest: the agent runs on its own schedule
                and there is no route that asks for another. Marked rather than
                drawn — a button that queued nothing would be worse. */}
            <span
              className="rounded border border-dashed border-border px-2 py-0.5 text-dense-caption text-muted-foreground/70"
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
          </div>
        }
      />

      {/* The design's note, and it is the page's whole argument: this is a
          conversation that was kept, not a dashboard that was computed. */}
      <p
        role="note"
        className="max-w-[92ch] rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-relaxed text-muted-foreground"
      >
        The brief is a <span className="font-semibold text-foreground">sedimented conversation</span>{' '}
        — the morning run&rsquo;s output kept as a page. Every claim cites the page it read; nothing
        here is knowable only here.
        {advisory ? <span className="ml-1 text-warning">{advisory}</span> : null}
      </p>

      {isError ? <QueryErrorAlert error={error} onRetry={() => void refetch()} /> : null}

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !digest || !payload ? (
        <SectionPanel cap="The one thing" title="No digest for today">
          <p className="px-3 py-3 text-dense-meta leading-relaxed text-muted-foreground">
            The digest agent writes one post per trading day and none is waiting. It is a draft in
            the queue like any other, so it appears here the moment it is written — and it is
            approved, or left, in{' '}
            <Link to="/research/loop/decisions" className="text-primary hover:underline">
              the Inbox
            </Link>
            .
          </p>
        </SectionPanel>
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

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Owed, not forgotten. The design's Overnight reads four stores
                this page does not: the book's overnight mark, the night's
                fills, the pipeline's own run and the decay alerts. Each is a
                page of its own here, and the brief would be quoting them. */}
            <SectionPanel cap="Overnight" title="book + pipeline" note="owed">
              <p className="px-3 py-2.5 text-dense-meta leading-relaxed text-muted-foreground">
                The design opens with what moved while you were away — the book&rsquo;s overnight
                mark, the fills, whether the pipeline ran, and any decay alert that fired. The
                digest does not carry them: they are four other stores, and quoting them here means
                the brief agrees with{' '}
                <Link to="/risk/portfolio" className="text-primary hover:underline">
                  Risk
                </Link>
                ,{' '}
                <Link to="/portfolio/ledger" className="text-primary hover:underline">
                  the Ledger
                </Link>{' '}
                and{' '}
                <Link to="/research/signal-health" className="text-primary hover:underline">
                  Signal Health
                </Link>{' '}
                on every number. Until it does, they are one click away rather than quoted wrong.
              </p>
            </SectionPanel>

            {/* Blocked, and by the same gap three other pages name. */}
            <SectionPanel cap="Today &amp; next" title="events touching the book" note="no calendar">
              <p className="px-3 py-2.5 text-dense-meta leading-relaxed text-muted-foreground">
                The design lists what is on the calendar and what it does to the book — a print
                today, an ex-date on a covered call, Friday&rsquo;s OPEX.{' '}
                <span className="text-foreground/80">No forward calendar reaches this side</span>:{' '}
                <span className="font-mono">/research/events/calendar</span> answers with nothing,
                and the gap behind it is a vendor subscription. It is the same absence the Symbol
                page&rsquo;s Events card and both ratings pages carry.
              </p>
            </SectionPanel>
          </div>

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
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/50 px-3 py-2 last:border-b-0"
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
            design&rsquo;s footer also names Positions, Risk Exposure, Events and the Playbook; this
            run reads none of them, which is the same gap Overnight names above.
          </p>
        </>
      )}
    </PageShell>
  )
}
