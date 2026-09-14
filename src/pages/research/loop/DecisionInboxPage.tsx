/**
 * Decision Inbox — Research Loop v1.
 * `/research/loop/decisions`
 *
 * Surfaces pending AI drafts (Morning / EOD / hypothesis suggestions).
 */
import { useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { EmptyState, SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DraftCard } from '@/components/cockpit/DraftCard'
import { NewDraftDialog } from '@/components/research/NewDraftDialog'
import {
  useApproveDraft,
  useDismissDraft,
  useResearchDrafts,
  DRAFTS_PAGE_MAX,
} from '@/hooks/useResearchDrafts'
import type { DraftKind } from '@/api/researchDrafts'
import {
  BRIEFING_KINDS,
  LOOP_KINDS,
  groupIdenticalDrafts,
  isActionableDraft,
  isDecisionKind,
} from '@/lib/harness/harnessDraftHelpers'
import { digestFirst, isDailyDigest } from '@/lib/harness/dailyDigest'
import { unreadCount, useReadDrafts } from '@/pages/research/loop/inboxRead'
import { LeashPanel } from '@/pages/research/loop/LeashPanel'

type View = 'decisions' | 'briefings' | 'all'
type Narrow = 'any' | 'loop' | DraftKind

/**
 * Three views, as in the design (`Research Autopilot Decisions.dc.html`):
 * what needs a call, what needs reading, everything. The page used to offer
 * nine peers in one row — the three views beside six kinds — so "EOD" sat next
 * to "Decisions" as if it were another answer to the same question.
 */
const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'decisions', label: 'Decisions' },
  { value: 'briefings', label: 'Briefings' },
  { value: 'all', label: 'All' },
]

/** Narrowing to one kind is still one step away — every kind the API knows, and the Loop as a group. */
const NARROW_OPTIONS: { value: Narrow; label: string }[] = [
  { value: 'any', label: 'Any kind' },
  { value: 'loop', label: 'Loop · batches + policy' },
  { value: 'candidate_batch', label: 'Candidate batches' },
  { value: 'policy_suggestion', label: 'Policy suggestions' },
  { value: 'decision_draft', label: 'Curator decisions' },
  { value: 'playbook_rule', label: 'Playbook rules' },
  { value: 'playbook_note', label: 'Playbook notes' },
  { value: 'hypothesis_suggestion', label: 'Hypothesis suggestions' },
  { value: 'hypothesis_draft', label: 'Hypothesis drafts' },
  { value: 'order_intent', label: 'Order intents' },
  { value: 'eod_verdict', label: 'EOD verdicts' },
  { value: 'morning_brief', label: 'Morning briefs' },
  { value: 'daily_digest', label: 'Daily digests' },
]

/**
 * Recurring agent posts — read them, then move on.
 *
 * These used to sit in the decisions bucket, so even the Decisions filter
 * carried the two agents' daily status posts — "no material change; keep
 * active", "Today's Discoveries: SEPA PAYS 82.75…". Those need reading, not a
 * verdict, and putting an Approve button on them teaches you to clear the queue
 * without looking, which is how a real decision gets waved through.
 */
export default function DecisionInboxPage() {
  // Opens on what needs a call (D3: the leash accepts the rest on its own, so
  // what is left here is a real decision). Today's digest is one click away —
  // a strip above the list says it is there. Briefings keep their own count,
  // so nothing is hidden.
  const [view, setViewState] = useState<View>('decisions')
  const [narrow, setNarrowState] = useState<Narrow>('any')
  // A kind belongs to one view or another; narrowing inside the wrong one would
  // show an empty list for a kind that has drafts. So a kind widens to All, and
  // picking a view lets go of the kind.
  const setView = (next: View) => {
    setViewState(next)
    setNarrowState('any')
  }
  const setNarrow = (next: Narrow) => {
    setNarrowState(next)
    if (next !== 'any') setViewState('all')
  }

  // A concrete kind is filtered by the server, so a kind longer than one page
  // still lists in full. The Loop group is two kinds, filtered here.
  const apiKind = narrow === 'any' || narrow === 'loop' ? undefined : narrow

  // The whole queue, not a page of it: every count on this page is computed
  // from what comes back, and the cards are the work itself.
  const query = useResearchDrafts({ status: 'pending', kind: apiKind, limit: DRAFTS_PAGE_MAX })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()

  const digest = (query.data?.rows ?? []).find(isDailyDigest)

  // Read state for briefings, kept in this browser (see inboxRead.ts). It is
  // pruned only against the whole queue: a narrowed list, or a page that could
  // not hold every pending draft, would un-read everything it did not contain.
  const allRows = query.data?.rows ?? []
  const wholeQueue =
    query.data != null && narrow === 'any' && (query.data.pending_count ?? 0) <= allRows.length
  const { read, setRead } = useReadDrafts(wholeQueue ? allRows.map((d) => d.id) : null)

  const rows = useMemo(() => {
    const all = query.data?.rows ?? []
    if (narrow === 'loop') return all.filter((d) => LOOP_KINDS.has(d.kind))
    if (narrow !== 'any') return all
    if (view === 'decisions') {
      return all.filter((d) => isDecisionKind(d.kind))
    }
    if (view === 'briefings') {
      return digestFirst(all.filter((d) => BRIEFING_KINDS.has(d.kind)))
    }
    return all
  }, [query.data?.rows, view, narrow])

  // One card per decision, not per draft. Repeated runs of the same objective
  // post an identical batch each time; they are folded into the newest and
  // listed under it rather than dropped.
  const groups = useMemo(() => groupIdenticalDrafts(rows), [rows])

  // Shown next to the filter so the split is visible without switching views:
  // you can see at a glance whether anything actually needs a call today.
  //
  // `decisions` counts calls, not drafts. Counting drafts is what let the header
  // read "25 to decide" when thirteen were the same eight symbols and eight more
  // were policy suggestions that would write nothing.
  const counts = useMemo(() => {
    const all = query.data?.rows ?? []
    const decisionGroups = groupIdenticalDrafts(all.filter((d) => isDecisionKind(d.kind)))
    // `pending_count` is the whole queue's, whatever `kind` the query asked for:
    // narrowed to EOD verdicts on DEV it still said 182 beside 118 rows, and the
    // line read "182 pending of this kind · 64 not shown". On a narrowed query the
    // rows are the count, and only a full page can be hiding more.
    const total = apiKind ? all.length : (query.data?.pending_count ?? all.length)
    return {
      decisions: decisionGroups.filter((g) => isActionableDraft(g.draft)).length,
      inert: decisionGroups.filter((g) => !isActionableDraft(g.draft)).length,
      collapsed: decisionGroups.reduce((n, g) => n + g.superseded.length, 0),
      briefings: all.filter((d) => BRIEFING_KINDS.has(d.kind)).length,
      total,
      // Every other number here is counted off the rows that arrived. When the
      // queue is longer than one page they describe a subset while `total`
      // describes the queue, and the line reads as though they agree — which
      // is how "24 to decide · 77 pending" came to mean twenty-seven drafts
      // nobody could see.
      unseen: apiKind ? 0 : Math.max(0, total - all.length),
      pageFull: all.length >= DRAFTS_PAGE_MAX,
      unreadBriefings: unreadCount(
        all.filter((d) => BRIEFING_KINDS.has(d.kind)).map((d) => d.id),
        read,
      ),
    }
  }, [query.data?.rows, query.data?.pending_count, apiKind, read])

  const narrowLabel = NARROW_OPTIONS.find((o) => o.value === narrow)?.label ?? narrow

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Decision Inbox"
        description="Drafts that need a call. The daily digest and other agent posts live under Briefings."
        actions={<NewDraftDialog />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dense-meta font-medium text-muted-foreground shrink-0">View:</span>
        <SegmentControl value={view} onChange={(v) => setView(v as View)} options={VIEW_OPTIONS} />
        <Select value={narrow} onValueChange={(v) => setNarrow(v as Narrow)}>
          <SelectTrigger className="h-7 w-52 text-dense-meta" aria-label="Narrow to one kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NARROW_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-dense-meta">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-dense-meta text-muted-foreground ml-auto">
          {narrow !== 'any' ? (
            // Counts of decisions and briefings are meaningless on one kind: the
            // query itself is narrowed. Say what the list is instead.
            `${groups.length} ${narrowLabel.toLowerCase()} shown · ${counts.total} pending${
              apiKind && counts.pageFull ? ` — the newest ${DRAFTS_PAGE_MAX}; older ones not shown` : ''
            }`
          ) : (
            <>
              {counts.decisions} to decide
              {/* Not "nothing to merge": since the kinds the server passes through
                  joined this bucket, most of it is not a merge at all. */}
              {counts.inert > 0 ? ` · ${counts.inert} would write nothing` : ''} ·{' '}
              {counts.unreadBriefings} of {counts.briefings} briefing{counts.briefings === 1 ? '' : 's'} unread ·{' '}
              {counts.total} pending
              {counts.collapsed > 0 ? ` · ${counts.collapsed} repeats folded in` : ''}
            </>
          )}
          {counts.unseen > 0 ? (
            <span className="text-warning" title={`Showing the newest ${DRAFTS_PAGE_MAX}.`}>
              {' '}
              · {counts.unseen} not shown
            </span>
          ) : null}
        </span>
      </div>

      {/* Until it is read: the strip exists to say the digest is waiting, and a read digest is not.
          Neutral, not a hue: classification is not colour (§7 / Design 09-13 ④). */}
      {digest && !read.has(digest.id) && view !== 'briefings' && narrow === 'any' ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-dense-meta">
          <span className="font-medium">
            {typeof digest.payload.title === 'string' ? digest.payload.title : 'Daily digest'}
          </span>
          <span className="text-muted-foreground">is waiting under Briefings — it needs reading, not a verdict.</span>
          <button
            type="button"
            className="ml-auto text-dense-meta text-primary underline"
            onClick={() => setView('briefings')}
          >
            Read it
          </button>
        </div>
      ) : null}

      {approve.isError ? <QueryErrorAlert error={approve.error} /> : null}
      {dismiss.isError ? <QueryErrorAlert error={dismiss.error} /> : null}

      {/* The queue, and beside it the leash: what reaches this page is what the
          leash did not accept on its own, so the rule sits next to its result. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0">
      {query.isError ? (
        <QueryErrorAlert error={query.error} />
      ) : query.isLoading ? (
        <Skeleton className="h-48 w-full rounded-md" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={view === 'decisions' && narrow === 'any' ? 'Nothing to decide' : 'Inbox clear'}
          description={
            view === 'decisions' && narrow === 'any' && counts.briefings > 0
              ? `No draft needs a call. ${counts.briefings} agent briefing${counts.briefings === 1 ? '' : 's'} waiting under Briefings.`
              : narrow !== 'any'
                ? `No pending ${narrowLabel.toLowerCase()}.`
                : 'No pending drafts. Morning Prep / EOD agents write here when they run.'
          }
          action={
            view === 'decisions' && narrow === 'any' && counts.briefings > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setView('briefings')}>
                Read briefings
              </Button>
            ) : undefined
          }
        />
      ) : (
        // Cards were capped at 48rem, using 57% of the canvas while candidate
        // rows wrapped inside them. Width belongs to the content that needs it:
        // the batch rows take it, prose and the policy diff cap themselves.
        //
        // Gap is 4, not 2: at 2 the space between two decisions matched the
        // space between a card's own lines, so eleven cards read as one wall.
        <div className="max-w-7xl space-y-4">
          {groups.map(({ draft, superseded }) => {
            // A card that would write nothing on Approve keeps its content and
            // its colour, at lower weight — the calls that matter sit forward,
            // and nothing is hidden or reordered to get there.
            const actionable = isActionableDraft(draft)
            return (
              <div key={draft.id} className="space-y-1">
                <DraftCard
                  draft={draft}
                  muted={!actionable}
                  approving={approve.isPending && approve.variables === draft.id}
                  dismissing={dismiss.isPending && dismiss.variables === draft.id}
                  onApprove={() => approve.mutate(draft.id)}
                  onDismiss={() => dismiss.mutate(draft.id)}
                  // Briefings are read, decisions are answered: only a briefing can be marked read.
                  read={BRIEFING_KINDS.has(draft.kind) ? read.has(draft.id) : undefined}
                  onToggleRead={
                    BRIEFING_KINDS.has(draft.kind) ? () => setRead(draft.id, !read.has(draft.id)) : undefined
                  }
                />
                {superseded.length > 0 ? (
                  // Indented under its own card: unattached, this line sat
                  // between two cards belonging visibly to neither.
                  <div className="ml-3.5 flex flex-wrap items-center gap-2 border-l-2 border-border/50 pl-2 text-dense-meta text-muted-foreground">
                    <span>
                      {superseded.length} earlier run{superseded.length === 1 ? '' : 's'} proposed
                      exactly this. Folded in, not decided for you.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      disabled={dismiss.isPending}
                      onClick={() => {
                        for (const stale of superseded) dismiss.mutate(stale.id)
                      }}
                    >
                      Dismiss {superseded.length}
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
      </div>
      <LeashPanel />
      </div>
    </PageShell>
  )
}
