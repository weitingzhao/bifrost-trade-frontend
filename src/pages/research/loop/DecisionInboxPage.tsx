/**
 * Decision Inbox — `/research/loop/decisions`.
 *
 * Design: `Autopilot Decision Inbox.dc.html`, walked at Rev 2026-10-02.144.
 * The page's one standing ruling is a narrative retirement rather than a
 * layout: **approving is not a handoff to the Desk.** It accepts research into
 * The Book — a candidate enters the pool, a hypothesis opens, a patch merges
 * into its policy — and nothing here reaches Trade, because an order is the
 * Owner's to originate (D10).
 *
 * Rev .143 made the stream one card per question (`lib/harness/inboxCards`):
 * a hypothesis's verdict and vehicle are one call, an objective's newest run
 * covers its earlier ones, and the cards are grouped by where Approve writes.
 * Rev .144 put Dismiss (and a call's Record answer) on the folded row and gave
 * the page keys (`inbox/inboxKeys`).
 *
 * What the page shows is still what the server does, not what the prototype
 * draws: `approveEffect` reads the branches of `apply_draft_approval`, so a
 * kind whose approval writes nothing says that instead of naming a
 * destination the design imagined for it.
 */
import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import { HeroCard, HeroRow, PageHead, PageShell } from '@/components/layout'
import { EmptyState, SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { Skeleton } from '@/components/ui/skeleton'
import { ApprovalsLanded, landedApproval, type LandedApproval } from '@/pages/research/loop/ApprovalsLanded'
import type { ApprovedDraftResult } from '@/components/cockpit/ApprovedStrip'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { useObjectiveList } from '@/hooks/useLoopHarness'
import { draftParentId } from '@/lib/research/draftProvenance'
import { NewDraftDialog } from '@/components/research/NewDraftDialog'
import { useInboxCards } from '@/hooks/useInboxCards'
import { WRITES_TO_LABEL, WRITES_TO_ORDER, type WritesTo } from '@/lib/harness/writesTo'
import { buildProposals } from '@/pages/research/loop/proposals/proposalsModel'
import { NO_RULES_STORE } from '@/pages/research/loop/proposals/RuleProposalCard'
import { useReviewHabits } from '@/hooks/useReviewHabits'
import { digestFirst, isDailyDigest } from '@/lib/harness/dailyDigest'
import { unreadCount, useReadDrafts } from '@/lib/harness/inboxRead'
import { LeashPanel } from '@/pages/research/loop/LeashPanel'
import { approveEffect, draftAskedBy } from '@/lib/harness/draftText'
import { draftHeadline, type DraftHeadline } from '@/lib/harness/draftHeadline'
import {
  cardApproveToast,
  cardDismissToast,
  cardHoldingDraft,
  hiddenDecisionCount,
  inboxSections,
  type InboxCard,
} from '@/lib/harness/inboxCards'
import { useDraftWriteFailures } from '@/lib/harness/draftWriteFailures'
import { openDraftInCopilot } from '@/lib/harness/loopCopilotPrefill'
import { useInSurface } from '@/lib/surfaceScope'
import { notify } from '@/lib/shellNotify'
import { InboxDecisionList, InboxKeyHints, type InboxItem } from '@/pages/research/loop/inbox/InboxDecisionList'
import { InboxBriefings } from '@/pages/research/loop/inbox/InboxBriefings'
import { InboxStrips } from '@/pages/research/loop/inbox/InboxStrips'
import { cardWrites, recordToast } from '@/pages/research/loop/inbox/inboxCardText'
import { revealCard, useInboxKeys, type InboxKeyAction } from '@/pages/research/loop/inbox/inboxKeys'

/** Enough to see a working session's worth without the rail outgrowing the queue. */
const LANDED_MAX = 8

type View = 'decisions' | 'briefings' | 'all'

/** The alias the design keeps for the queue that merged in (§5a.8). */
const PROPOSALS_PATH = '/review/proposals'

const INBOX_LEDE =
  'Drafts that need a call. Approving accepts the draft into The Book — a candidate enters the pool, a hypothesis opens, a patch merges into its policy, a rule change edits Rules. Nothing is handed to Trade: an order is yours to originate, always. Posts that only need reading live under Briefings and have no Approve button.'

/** `any` plus the design's five places. */
type Dest = 'any' | WritesTo

/**
 * Three views, as in the design: what needs a call, what needs reading,
 * everything. The page used to offer nine peers in one row — the three views
 * beside six kinds — so "EOD" sat next to "Decisions" as if it were another
 * answer to the same question.
 */
const VIEW_OPTIONS: { value: View; label: string; title?: string }[] = [
  { value: 'decisions', label: 'Decisions' },
  { value: 'briefings', label: 'Briefings' },
  { value: 'all', label: 'All' },
]

function itemDest(i: InboxItem): WritesTo {
  return i.type === 'rule' ? 'rules' : i.card.dest
}

export default function DecisionInboxPage() {
  // `/review/proposals` is a deep-link alias (design Rev 2026-09-23.1): it
  // lands on the Decisions view narrowed to what writes to Rules. `?card=<draft
  // id>` lands on that draft's card — first, ringed, open, its provenance out.
  const { pathname, search } = useLocation()
  const inSurface = useInSurface()
  const cardParam = useMemo(() => new URLSearchParams(search).get('card'), [search])
  const [view, setViewState] = useState<View>('decisions')
  const [dest, setDestState] = useState<Dest>(pathname === PROPOSALS_PATH ? 'rules' : 'any')
  // One card open at a time (design Rev 2026-09-23.1). `null` means "the first
  // pending one", resolved at render so it follows the list rather than
  // freezing on whatever was first when the page loaded; '' means none.
  const [openId, setOpenId] = useState<string | null>(null)
  // The keyboard cursor (Rev .144). '' until a key or a click places it.
  const [cur, setCur] = useState('')
  const setView = (next: View) => {
    setViewState(next)
    setOpenId(null)
    if (next === 'briefings') setDestState('any')
  }
  const setDest = (next: Dest) => {
    setDestState(next)
    setOpenId(null)
    if (next !== 'any' && view === 'briefings') setViewState('decisions')
  }

  // The whole queue, one kind at a time (`useInboxQueue`): a single page of
  // every kind was 200 rows of which 184 were briefings.
  // Shared with the Copilot's waiting queue (`useInboxCards`), so "To decide"
  // and "N waiting on you" count the same cards.
  const {
    queue,
    decisionRows,
    briefingRows: briefingsHeldOut,
    heldCount,
    pendingIds,
    hidden: { ids: hidden, setMany: setHidden },
    cards,
    dismiss,
    approve,
    record,
  } = useInboxCards()
  const failures = useDraftWriteFailures()
  // The card leaves on approval and the server cannot take one back, so what
  // was accepted is only ever recorded here.
  const [landed, setLanded] = useState<LandedApproval[]>([])
  const land = useCallback(
    (result: ApprovedDraftResult) => setLanded((prev) => [landedApproval(result), ...prev].slice(0, LANDED_MAX)),
    [],
  )

  const briefingRows = useMemo(() => digestFirst(briefingsHeldOut), [briefingsHeldOut])
  const digest = briefingRows.find(isDailyDigest)

  // Read state, kept in this browser (inboxRead.ts), pruned only against the whole queue.
  const { read, setRead } = useReadDrafts(pendingIds)

  // Three kinds carry only a `hypothesis_id`; the Book holds the sentence.
  const hypotheses = useHypothesisList({ limit: 200 })
  const objectives = useObjectiveList()
  const headlineOf = useMemo(() => {
    const hypTitle = new Map<string, string>()
    for (const h of hypotheses.data?.rows ?? []) hypTitle.set(h.id, h.title)
    const objName = new Map<string, string>()
    // A batch names its objective in its title; the list wins where it has one.
    for (const d of decisionRows) {
      if (d.kind === 'candidate_batch' && typeof d.payload.objective_id === 'string' && typeof d.payload.title === 'string') {
        objName.set(d.payload.objective_id, d.payload.title)
      }
    }
    for (const o of objectives.data?.items ?? []) objName.set(o.id, o.title)
    const cache = new Map<string, DraftHeadline>()
    return (card: InboxCard): DraftHeadline => {
      const hit = cache.get(card.head.id)
      if (hit) return hit
      const h = draftHeadline(card.head, {
        hypothesisTitle: hypTitle.get(draftParentId(card.head) ?? '') ?? null,
        objectiveName: (id) => objName.get(id) ?? null,
      })
      cache.set(card.head.id, h)
      return h
    }
  }, [hypotheses.data?.rows, objectives.data?.items, decisionRows])

  // Rule proposals, read off the habits rather than fetched: a Rules card in
  // this queue since Rev 2026-09-23.1. `thin` ones are named on a strip.
  const habitsQ = useReviewHabits('all')
  const proposals = useMemo(
    () => buildProposals(habitsQ.habits, habitsQ.trades, habitsQ.paths),
    [habitsQ.habits, habitsQ.trades, habitsQ.paths],
  )
  const ruleCards = useMemo(() => proposals.filter((p) => !p.thin), [proposals])
  const thin = useMemo(() => proposals.filter((p) => p.thin), [proposals])

  const items = useMemo<InboxItem[]>(
    () => [
      ...cards.map((card) => ({ type: 'draft' as const, key: card.key, card })),
      ...ruleCards.map((proposal) => ({ type: 'rule' as const, key: `rule:${proposal.key}`, proposal })),
    ],
    [cards, ruleCards],
  )
  const itemByKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items])
  const focusCard = cardParam ? cardHoldingDraft(cards, cardParam) : null
  const litKey = focusCard?.key ?? null

  // A `?card=` is resolved once the queue is in: it may name a briefing, which
  // lives under its own view. Adjusted during render, not in an effect, so the
  // first painted frame is already the right view.
  const [cardSeen, setCardSeen] = useState<string | null>(null)
  if (cardParam && cardParam !== cardSeen && queue.complete) {
    setCardSeen(cardParam)
    if (focusCard) {
      setViewState('decisions')
      setDestState('any')
    } else if (briefingRows.some((b) => b.id === cardParam)) {
      setViewState('briefings')
      setDestState('any')
    }
  }

  const showDecisions = view !== 'briefings'
  const sections = useMemo(() => {
    if (!showDecisions) return []
    const shown = dest === 'any' ? items : items.filter((i) => itemDest(i) === dest)
    return inboxSections(shown, itemDest, litKey ? (i) => i.key === litKey : undefined)
  }, [showDecisions, dest, items, litKey])
  const order = useMemo(() => sections.flatMap((s) => s.items.map((i) => i.key)), [sections])
  const openKey = openId ?? (litKey && order.includes(litKey) ? litKey : (order[0] ?? ''))

  const counts = useMemo(() => {
    const unread = unreadCount(briefingRows.map((d) => d.id), read)
    return {
      // One per question, not per draft: a call is one, an objective's runs are one.
      decisions: items.length,
      rules: ruleCards.length,
      inert: cards.filter((c) => !cardWrites(c)).length,
      folded: cards.reduce((n, c) => n + c.folded.length + c.hiddenEarlier.length, 0),
      briefings: briefingRows.length,
      unreadBriefings: unread,
      total: (queue.pendingCount ?? queue.listed) - heldCount,
      hiddenHere: hiddenDecisionCount(decisionRows, hidden),
    }
  }, [items.length, ruleCards.length, cards, briefingRows, read, queue.pendingCount, queue.listed, heldCount, decisionRows, hidden])

  const pendingByDest = useMemo(() => {
    const n: Record<WritesTo, number> = { rules: 0, policy: 0, book: 0, pool: 0, nothing: 0 }
    for (const i of items) n[itemDest(i)] += 1
    return n
  }, [items])

  const destOptions = useMemo(
    () => [
      { value: 'any' as Dest, label: 'Any' },
      ...WRITES_TO_ORDER.map((w) => ({ value: w as Dest, label: `${WRITES_TO_LABEL[w]} ${pendingByDest[w]}` })),
    ],
    [pendingByDest],
  )

  // ── Answers ──────────────────────────────────────────────────────────────
  // After a verdict the next pending card opens (the accordion's `null`).
  const settle = () => {
    setOpenId(null)
    setCur('')
  }
  // Deciding a run also folds away the runs it covered, here only: they stay
  // pending on the server (Owner 2026-10-04 #11).
  const hideFolded = (card: InboxCard) => setHidden(card.folded.map((d) => d.id), true)
  const recordCard = (card: InboxCard) => {
    record(
      card.answers.map((d) => d.id),
      recordToast(card, headlineOf(card)),
      { onLanded: land },
    )
    settle()
  }
  // An objective's newest run covers the earlier ones: they leave with it, and
  // once the write lands they stay folded away here (Owner 2026-10-04 #11).
  const foldAway = (card: InboxCard) =>
    card.shape === 'objective' && card.folded.length > 0
      ? { alsoHide: card.folded.map((d) => d.id), onCommitted: () => hideFolded(card) }
      : {}
  // Approve is held like Dismiss and Record answer (batch 4 follow-up): the
  // card leaves at once, Undo or ⌘Z for five seconds, then the write.
  const approveCard = (card: InboxCard) => {
    if (card.shape === 'call') return recordCard(card)
    const head = headlineOf(card)
    approve(card.head.id, cardApproveToast(card, head.sym ?? head.title), { onLanded: land, ...foldAway(card) })
    settle()
  }
  const dismissCard = (card: InboxCard) => {
    dismiss(
      card.answers.map((d) => d.id),
      cardDismissToast(card),
      foldAway(card),
    )
    settle()
  }
  const discussCard = (card: InboxCard) =>
    openDraftInCopilot({
      id: card.head.id,
      kind: card.head.kind,
      title: headlineOf(card).title,
      askedBy: draftAskedBy(card.head.generated_by),
      landsIn: approveEffect(card.head)?.label ?? null,
    })
  const toggle = (key: string) => {
    setCur(key)
    setOpenId(openKey === key ? '' : key)
  }

  // ── Keys (Rev .144) — the route page only (Owner 2026-10-04 #13) ─────────
  const onKey = (a: InboxKeyAction) => {
    const target = itemByKey.get(a.type === 'move' ? a.to : a.id)
    if (!target) return
    if (a.type === 'move') {
      setCur(a.to)
      setOpenId(a.to)
      revealCard(a.to)
    } else if (a.type === 'toggle') {
      toggle(a.id)
    } else if (a.type === 'open-to-approve') {
      setCur(a.id)
      setOpenId(a.id)
      revealCard(a.id)
      notify('Opened — read it, then A again to approve.')
    } else if (target.type === 'rule') {
      notify(`Rule proposals: ${NO_RULES_STORE}.`)
    } else if (a.type === 'approve') {
      approveCard(target.card)
    } else {
      dismissCard(target.card)
    }
  }
  useInboxKeys({
    enabled: !inSurface && showDecisions,
    order,
    cur,
    openId: openKey,
    isCall: (key) => {
      const i = itemByKey.get(key)
      return i?.type === 'draft' && i.card.shape === 'call'
    },
    onAction: onKey,
  })

  // The toolbar's old sentence, whole — the heroes' shared title.
  const countsLine = `${counts.decisions} to decide${
    counts.rules > 0 ? ` (${counts.rules} rule change${counts.rules === 1 ? '' : 's'})` : ''
  }${counts.inert > 0 ? ` · ${counts.inert} would write nothing` : ''} · ${counts.unreadBriefings} of ${
    counts.briefings
  } briefing${counts.briefings === 1 ? '' : 's'} unread · ${counts.total} pending${
    counts.folded > 0 ? ` · ${counts.folded} earlier runs folded in` : ''
  }`

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead title="Decision Inbox" info={INBOX_LEDE} actions={<NewDraftDialog />} />

      <div data-sr-toolbar="">
        {/* Which operator wrote the queue you are looking at; the level is soft ink (Rev .85). */}
        <span className="inline-flex h-5.5 shrink-0 items-center gap-1.5 border px-2 text-dense-meta mat-tag">
          <span className="font-mono font-bold text-[var(--sk-soft)]">L3</span>
          <span className="text-muted-foreground">the engine</span>
        </span>
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">View</span>
        <SegmentControl size="xs" value={view} onChange={(v) => setView(v as View)} options={VIEW_OPTIONS} ariaLabel="View" />
        {view === 'briefings' ? null : (
          <>
            <span data-sr-tb="sep" />
            <span data-sr-tb="label" title="Kind, read as where Approve writes. The tag colour on each card says the same thing.">
              Writes to
            </span>
            <SegmentControl size="xs" value={dest} onChange={(v) => setDest(v as Dest)} options={destOptions} ariaLabel="Writes to" />
          </>
        )}
        {dest !== 'any' || queue.unaccounted > 0 || counts.hiddenHere > 0 ? (
          <span data-sr-tb="meta">
            {dest !== 'any' ? `${pendingByDest[dest]} shown · ${counts.total} pending` : null}
            {counts.hiddenHere > 0 ? (
              <>
                {dest !== 'any' ? ' · ' : ''}
                {counts.hiddenHere} earlier run{counts.hiddenHere === 1 ? '' : 's'} hidden here ·{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setHidden([...hidden], false)}
                  title="Hidden in this browser by Dismiss earlier; still pending on the server"
                >
                  Show all
                </button>
              </>
            ) : null}
            {queue.unaccounted > 0 ? (
              <span
                className="text-warning"
                title="The server counts more pending drafts than the kinds this page reads add up to — a kind it does not know yet."
              >
                {dest !== 'any' || counts.hiddenHere > 0 ? ' · ' : ''}
                {queue.unaccounted} pending in kinds this page does not read
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {/* §16.2 (Rev .85): the toolbar's count sentence as three heroes. */}
      <HeroRow label="The queue">
        <HeroCard
          label="To decide"
          value={queue.decisionsLoading ? '—' : String(counts.decisions)}
          valueClassName={counts.decisions > 0 ? 'text-foreground' : 'text-muted-foreground'}
          state={counts.decisions > 0 ? 'warn' : null}
          title={countsLine}
          sub={`${counts.rules} rule change${counts.rules === 1 ? '' : 's'} among them${
            counts.inert > 0 ? ` · ${counts.inert} would write nothing` : ''
          }`}
        />
        <HeroCard
          label="Unread briefings"
          value={queue.briefingsLoading ? '—' : String(counts.unreadBriefings)}
          valueClassName={counts.unreadBriefings > 0 ? 'text-foreground' : 'text-muted-foreground'}
          title={countsLine}
          sub={`of ${counts.briefings} · need reading, not a decision`}
        />
        <HeroCard
          label="Pending"
          value={queue.pendingCount == null ? '—' : String(counts.total)}
          valueClassName="text-[var(--sk-soft)]"
          title={countsLine}
          sub={`drafts and briefings${counts.folded > 0 ? ` · ${counts.folded} earlier runs folded in` : ''}`}
        />
      </HeroRow>

      <InboxStrips
        thin={thin.length > 0 && view !== 'briefings' && (dest === 'any' || dest === 'rules') ? thin : []}
        digest={digest && !read.has(digest.id) && view !== 'briefings' && dest === 'any' ? digest : null}
        onReadDigest={() => setView('briefings')}
      />

      {/* The queue, and beside it the leash: what reaches this page is what the
          leash did not accept on its own, so the rule sits next to its result. */}
      <div className="grid gap-4 @4xl/page:grid-cols-[minmax(0,1fr)_18rem] @4xl/page:items-start">
        <div className="min-w-0 space-y-3">
          {queue.error ? (
            <ResearchAuthGap error={queue.error} />
          ) : showDecisions && queue.decisionsLoading ? (
            <Skeleton className="h-48 w-full rounded-md" />
          ) : showDecisions && sections.length === 0 && view === 'decisions' ? (
            <EmptyState
              icon={<Inbox />}
              title={dest === 'any' ? 'Nothing needs a call' : 'Nothing waiting'}
              description={
                dest !== 'any'
                  ? `Nothing pending that writes to ${WRITES_TO_LABEL[dest]}.`
                  : counts.briefings > 0
                    ? `No draft needs a call. ${counts.briefings} agent briefing${counts.briefings === 1 ? '' : 's'} waiting under Briefings.`
                    : 'Every decision draft has a verdict. Approved ones are in The Book; the leash accepted the rest on its own.'
              }
              action={
                dest === 'any' && counts.briefings > 0 ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => setView('briefings')}>
                    Read briefings
                  </Button>
                ) : undefined
              }
            />
          ) : showDecisions && sections.length > 0 ? (
            <>
              {/* The keys work on the route page only, so a surfaced Inbox does not advertise them. */}
              {inSurface ? null : <InboxKeyHints />}
              <InboxDecisionList
                sections={sections}
                openKey={openKey}
                curKey={cur}
                litKey={litKey}
                headlineOf={headlineOf}
                failures={failures}
                handlers={{
                  toggle,
                  approve: approveCard,
                  record: recordCard,
                  dismiss: dismissCard,
                  discuss: discussCard,
                  hideEarlier: hideFolded,
                  showEarlier: (card) => setHidden(card.hiddenEarlier.map((d) => d.id), false),
                }}
              />
            </>
          ) : null}
          {view === 'decisions' || queue.error ? null : (
            <InboxBriefings
              rows={briefingRows}
              loading={queue.briefingsLoading}
              read={read}
              setRead={setRead}
              litId={cardParam}
              onDismiss={(id) => dismiss(id)}
              onApprove={(id) => approve(id, 'Approved', { onLanded: land })}
            />
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
