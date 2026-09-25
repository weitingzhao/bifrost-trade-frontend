/**
 * Decision Inbox — `/research/loop/decisions`.
 *
 * Design: `Research Autopilot Decisions.dc.html`. Walked 2026-09-20 against
 * package 2026-09-20.1, whose one ruling for this page is a narrative
 * retirement rather than a layout: **approving is not a handoff to the Desk.**
 * It accepts research into The Book — a candidate enters the pool, a
 * hypothesis opens, a patch merges into its policy — and nothing here reaches
 * Trade, because an order is the Owner's to originate (D10). Every surface on
 * the page that used to imply otherwise says so now: the header, the rail, and
 * the line under each card's buttons.
 *
 * What the page shows is still what the server does, not what the prototype
 * draws: `approveEffect` reads the branches of `apply_draft_approval`, so a
 * kind whose approval writes nothing says that instead of naming a
 * destination the design imagined for it.
 */
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { EmptyState, SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { Skeleton } from '@/components/ui/skeleton'
import { ApprovalsLanded, landedApproval, type LandedApproval } from '@/pages/research/loop/ApprovalsLanded'
import { DraftCard } from '@/components/cockpit/DraftCard'
import { typedFirst } from '@/lib/harness/inboxOrder'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { draftParentId } from '@/lib/research/draftProvenance'
import { NewDraftDialog } from '@/components/research/NewDraftDialog'
import {
  useApproveDraft,
  useDismissDraft,
  useResearchDrafts,
  DRAFTS_PAGE_MAX,
} from '@/hooks/useResearchDrafts'
import {
  WRITES_TO_LABEL,
  WRITES_TO_ORDER,
  writesTo,
  type WritesTo,
} from '@/lib/harness/writesTo'
import { buildProposals } from '@/pages/research/loop/proposals/proposalsModel'
import { RuleProposalCard } from '@/pages/research/loop/proposals/RuleProposalCard'
import { Link } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { cn } from '@/lib/utils'
import { useReviewHabits } from '@/hooks/useReviewHabits'
import {
  BRIEFING_KINDS,
  groupIdenticalDrafts,
  isActionableDraft,
  isDecisionKind,
} from '@/lib/harness/harnessDraftHelpers'
import { digestFirst, isDailyDigest } from '@/lib/harness/dailyDigest'
import { unreadCount, useReadDrafts } from '@/pages/research/loop/inboxRead'
import { LeashPanel } from '@/pages/research/loop/LeashPanel'

/** Enough to see a working session's worth without the rail outgrowing the queue. */
const LANDED_MAX = 8

type View = 'decisions' | 'briefings' | 'all'

/** The alias the design keeps for the queue that merged in (§5a.8). */
const PROPOSALS_PATH = '/review/proposals'

const INBOX_LEDE =
  'Drafts that need a call. Approving accepts the draft into The Book — a candidate enters the pool, a hypothesis opens, a patch merges into its policy, a rule change edits Rules. Nothing is handed to Trade: an order is yours to originate, always (D10). Posts that only need reading live under Briefings and have no Approve button.'

/** `any` plus the design's five places. */
type Dest = 'any' | WritesTo

/**
 * Three views, as in the design (`Research Autopilot Decisions.dc.html`):
 * what needs a call, what needs reading, everything. The page used to offer
 * nine peers in one row — the three views beside six kinds — so "EOD" sat next
 * to "Decisions" as if it were another answer to the same question.
 */
const VIEW_OPTIONS: { value: View; label: string; title?: string }[] = [
  { value: 'decisions', label: 'Decisions' },
  { value: 'briefings', label: 'Briefings' },
  { value: 'all', label: 'All' },
]

/**
 * The kind filter, along the axis the kind tag's colour already used.
 *
 * It was thirteen server kinds in a Select — the record's name rather than
 * the consequence, so "Candidate batches" and "Hypothesis drafts" read as two
 * unrelated choices when the reader is deciding between the pool and the book.
 * Design Rev 2026-09-23.1 collapses them to the five places Approve writes,
 * each carrying what is pending there.
 */

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
  // The route seeds the view, so `/review/proposals` still lands on what it
  // names — the same way `/research/workbench` lands on the census face.
  //
  // `/review/proposals` is a deep-link alias (design Rev 2026-09-23.1): it
  // lands on the Decisions view narrowed to what writes to Rules, which is
  // where its rows went. It is not a view and not a row.
  const { pathname } = useLocation()
  const [view, setViewState] = useState<View>('decisions')
  const [dest, setDestState] = useState<Dest>(pathname === PROPOSALS_PATH ? 'rules' : 'any')
  // One card open at a time (design Rev 2026-09-23.1). A queue of eleven cards
  // each carrying a diff, a table and a paragraph is a page you scroll past
  // rather than read; folded, the header line is what a reader chooses from.
  // `null` means "the first pending one", resolved at render so it follows the
  // list rather than freezing on whatever was first when the page loaded.
  const [openId, setOpenId] = useState<string | null>(null)
  // A place belongs to the decisions side, so narrowing to one inside Briefings
  // would show an empty list for a place that has cards.
  const setView = (next: View) => {
    setViewState(next)
    if (next === 'briefings') setDestState('any')
  }
  const setDest = (next: Dest) => {
    setDestState(next)
    if (next !== 'any' && view === 'briefings') setViewState('decisions')
  }

  // The whole queue is read and narrowed here: `Writes to` is a grouping over
  // kinds rather than one of them, so there is no server filter that answers it.
  const apiKind = undefined

  // The whole queue, not a page of it: every count on this page is computed
  // from what comes back, and the cards are the work itself.
  const query = useResearchDrafts({ status: 'pending', kind: apiKind, limit: DRAFTS_PAGE_MAX })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()
  // The card leaves on approval and the server cannot take one back, so what
  // was accepted is only ever recorded here. The rail keeps the session's
  // list; the six-second strip belongs to the two surfaces that have no rail.
  const [landed, setLanded] = useState<LandedApproval[]>([])

  const digest = (query.data?.rows ?? []).find(isDailyDigest)

  // Read state for briefings, kept in this browser (see inboxRead.ts). It is
  // pruned only against the whole queue: a narrowed list, or a page that could
  // not hold every pending draft, would un-read everything it did not contain.
  const allRows = query.data?.rows ?? []
  const wholeQueue =
    query.data != null && (query.data.pending_count ?? 0) <= allRows.length
  const { read, setRead } = useReadDrafts(wholeQueue ? allRows.map((d) => d.id) : null)

  // Three kinds — decision_draft, order_intent, policy_suggestion — carry only
  // a `hypothesis_id`, so without this every one of their cards was headed by
  // its scope: `hypothesis:intc-stage-2a-setup-perfect-…`. The Book already
  // holds the sentence; all ten pending on DEV resolve. Same list the Watchlist
  // reads, so it is one query between them rather than a second copy.
  const hypotheses = useHypothesisList({ limit: 200 })
  const titleById = useMemo(() => {
    const m = new Map<string, string>()
    for (const h of hypotheses.data?.rows ?? []) m.set(h.id, h.title)
    return m
  }, [hypotheses.data?.rows])

  // The proposals, read off the habits rather than fetched: they are the fourth
  // thing the engine proposes, and since Rev 2026-09-23.1 they are cards in
  // this queue rather than a queue of their own. `thin` ones are not cards at
  // all — a sample of one is a habit still being measured, and it is named on
  // a strip instead of asked about.
  const habitsQ = useReviewHabits('all')
  const proposals = useMemo(
    () =>
      buildProposals(
        habitsQ.habits,
        habitsQ.trades,
        habitsQ.paths,
      ),
    [habitsQ.habits, habitsQ.trades, habitsQ.paths],
  )
  const ruleCards = useMemo(() => proposals.filter((p) => !p.thin), [proposals])
  const thin = useMemo(() => proposals.filter((p) => p.thin), [proposals])

  const rows = useMemo(() => {
    const all = query.data?.rows ?? []
    const place = (d: { kind: string }) => writesTo(d.kind)
    const narrowed = dest === 'any' ? all : all.filter((d) => place(d) === dest)
    if (view === 'decisions') {
      return typedFirst(narrowed.filter((d) => isDecisionKind(d.kind)))
    }
    if (view === 'briefings') {
      return digestFirst(all.filter((d) => BRIEFING_KINDS.has(d.kind)))
    }
    return narrowed
  }, [query.data?.rows, view, dest])

  // Rule cards ride the same two filters as everything else: they write to
  // Rules, and they are decisions rather than posts to read.
  const shownRules = useMemo(
    () => (view === 'briefings' || (dest !== 'any' && dest !== 'rules') ? [] : ruleCards),
    [ruleCards, view, dest],
  )

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

  /** Pending per place, for the segment's own labels. */
  const pendingByDest = useMemo(() => {
    const all = query.data?.rows ?? []
    const n: Record<WritesTo, number> = { rules: 0, policy: 0, book: 0, pool: 0, nothing: 0 }
    for (const d of all) {
      const place = writesTo(d.kind)
      if (place && isDecisionKind(d.kind)) n[place] += 1
    }
    n.rules += ruleCards.length
    return n
  }, [query.data?.rows, ruleCards.length])

  /**
   * Which card is open when nothing has been picked: the first pending one, in
   * the order the list draws. A collapsed card carries no Approve, so opening
   * on none would mean nothing could be answered without a click first.
   */
  const firstCardId =
    shownRules.length > 0
      ? `rule:${shownRules[0].key}`
      : groups.length > 0
        ? `draft:${groups[0].draft.id}`
        : ''

  const destOptions = useMemo(
    () => [
      { value: 'any' as Dest, label: 'Any' },
      ...WRITES_TO_ORDER.map((w) => ({
        value: w as Dest,
        label: `${WRITES_TO_LABEL[w]} ${pendingByDest[w]}`,
      })),
    ],
    [pendingByDest],
  )

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Decision Inbox"
        description={INBOX_LEDE}
        actions={<NewDraftDialog />}
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* The design's chip. It reads "the engine", not "autopilot seat": the
            seat model was retired on 2026-09-19, and what the tag is for is
            saying which operator wrote the queue you are looking at. */}
        <span className="inline-flex h-5.5 shrink-0 items-center gap-1.5 border px-2 text-dense-micro mat-tag">
          <span className="font-mono font-bold text-primary">L3</span>
          <span className="text-muted-foreground">the engine</span>
        </span>
        <span className="text-dense-meta font-medium text-muted-foreground shrink-0">View:</span>
        <SegmentControl value={view} onChange={(v) => setView(v as View)} options={VIEW_OPTIONS} />
        {/* Not a second row of views: the kind tag's colour already says where
            Approve writes, and this narrows along that same axis. Hidden under
            Briefings, which are read rather than written anywhere. */}
        {view === 'briefings' ? null : (
          <>
            <span
              className="text-dense-meta font-medium text-muted-foreground shrink-0"
              title="Kind, read as where Approve writes. The tag colour on each card says the same thing."
            >
              Writes to:
            </span>
            <SegmentControl
              value={dest}
              onChange={(v) => setDest(v as Dest)}
              options={destOptions}
              aria-label="Writes to"
            />
          </>
        )}
        <span className="text-dense-meta text-muted-foreground ml-auto">
          {dest !== 'any' ? (
            // Counted over one place, the decisions and briefings split says
            // nothing: the list itself is narrowed. Say what the list is.
            `${groups.length + shownRules.length} shown · ${counts.total} pending`
          ) : (
            <>
              {counts.decisions + shownRules.length} to decide
              {/* The design's own line: rule changes are named inside the
                  count rather than beside it, because they are decisions of
                  the same kind and not a second queue. */}
              {shownRules.length > 0
                ? ` (${shownRules.length} rule change${shownRules.length === 1 ? '' : 's'})`
                : ''}
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

      {/* A thin proposal is not a card: it has not argued anything yet, and
          asking about it would be asking a question the sample cannot answer.
          Named on one strip so it is visible as measured-but-not-yet-arguing
          rather than absent. */}
      {thin.length > 0 && view !== 'briefings' && (dest === 'any' || dest === 'rules') ? (
        <div className="flex flex-wrap items-center gap-2 border px-3 py-1.5 text-dense-meta mat-card">
          <StatusLamp lamp="gray" variant="dot" title="Measured, not yet arguing" />
          <span className={cn(positionsUi.mono, 'font-semibold')}>
            {thin.map((p) => `${p.title} · n ${p.n}`).join(' · ')}
          </span>
          <span className="min-w-0 text-muted-foreground">
            measured on too few trades to argue a rule. Not a card until the sample is.
          </span>
          <Link to="/review/habits" className="ml-auto shrink-0 text-dense-micro text-primary hover:underline">
            Habits →
          </Link>
        </div>
      ) : null}

      {/* Until it is read: the strip exists to say the digest is waiting, and a read digest is not.
          Neutral, not a hue: classification is not colour (§7 / Design 09-13 ④). */}
      {digest && !read.has(digest.id) && view !== 'briefings' && dest === 'any' ? (
        <div className="flex flex-wrap items-center gap-2 border px-3 py-1.5 text-dense-meta mat-card">
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
      <div className="grid gap-4 @4xl/page:grid-cols-[minmax(0,1fr)_18rem] @4xl/page:items-start">
      <div className="min-w-0">
      {query.isError ? (
        <ResearchAuthGap error={query.error} />
      ) : query.isLoading ? (
        <Skeleton className="h-48 w-full rounded-md" />
      ) : rows.length === 0 && shownRules.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={view === 'decisions' && dest === 'any' ? 'Nothing needs a call' : 'Nothing waiting'}
          description={
            dest !== 'any'
              ? `Nothing pending that writes to ${WRITES_TO_LABEL[dest]}.`
              : view === 'decisions' && counts.briefings > 0
                ? `No draft needs a call. ${counts.briefings} agent briefing${counts.briefings === 1 ? '' : 's'} waiting under Briefings.`
                : 'Every decision draft has a verdict. Approved ones are in The Book; the leash accepted the rest on its own.'
          }
          action={
            view === 'decisions' && dest === 'any' && counts.briefings > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setView('briefings')}>
                Read briefings
              </Button>
            ) : undefined
          }
        />
      ) : (
        // No cap at all (design §5a.3): a page container fills the pane and
        // only continuous text is measured. The cards were capped at 48rem,
        // then at 80rem, and both were the same mistake at different sizes —
        // width belongs to the content that needs it, and the content that
        // does not need it already carries its own measure (`max-w-prose` on
        // the card's prose and its policy diff).
        //
        // Gap is 4, not 2: at 2 the space between two decisions matched the
        // space between a card's own lines, so eleven cards read as one wall.
        <div className="space-y-4">
          {shownRules.map((p) => (
            <RuleProposalCard
              key={p.key}
              proposal={p}
              expanded={(openId ?? firstCardId) === `rule:${p.key}`}
              onToggle={() =>
                setOpenId((openId ?? firstCardId) === `rule:${p.key}` ? '' : `rule:${p.key}`)
              }
            />
          ))}
          {groups.map(({ draft, superseded }) => {
            // A card that would write nothing on Approve keeps its content and
            // its colour, at lower weight — the calls that matter sit forward,
            // and nothing is hidden or reordered to get there.
            const actionable = isActionableDraft(draft)
            return (
              <div key={draft.id} className="space-y-1">
                <DraftCard
                  draft={draft}
                  expanded={(openId ?? firstCardId) === `draft:${draft.id}`}
                  onToggle={() =>
                    setOpenId(
                      (openId ?? firstCardId) === `draft:${draft.id}` ? '' : `draft:${draft.id}`,
                    )
                  }
                  hypothesisTitle={titleById.get(draftParentId(draft) ?? '') ?? null}
                  muted={!actionable}
                  approving={approve.isPending && approve.variables === draft.id}
                  dismissing={dismiss.isPending && dismiss.variables === draft.id}
                  onApprove={() =>
                    approve.mutate(draft.id, {
                      // The rail lists this session's approvals, so what the
                      // server says it wrote is recorded as it answers —
                      // reading it back off the queue is impossible, because
                      // an approved draft leaves the queue.
                      onSuccess: (result) =>
                        setLanded((prev) => [landedApproval(result), ...prev].slice(0, LANDED_MAX)),
                    })
                  }
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
      <div className="space-y-3">
        <ApprovalsLanded landed={landed} />
        <LeashPanel />
      </div>
      </div>
    </PageShell>
  )
}
