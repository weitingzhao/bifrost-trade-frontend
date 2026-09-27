/**
 * Copilot Desk — `/research/copilot`, the level-2 seat's landing.
 *
 * The models work when asked. The desk is what they did today and how to
 * ask for more: the digest in full, the threads you had, what the chat asked
 * to write and what was allowed, what it cost — and the two things it works
 * from, the personas and your trading system. The panel stays global; this
 * page opens it with the thread you pick.
 */
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, ClipboardList, MessageCircle, Users } from 'lucide-react'
import {
  PageHead,
  PageHeadAction,
  PageHeadLink,
  PageShell,
  SectionHead,
  SectionPanel,
} from '@/components/layout'
import { COPILOT_TAB_HINT, useCopilotHeadTabs, useCopilotTab } from '@/components/research/CopilotTabs'
import { ViewState } from '@bifrost/ui'
import { Button } from '@/components/ui/button'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { DailyDigestBody } from '@/components/cockpit/DailyDigestBody'
import { DigestLampRow, DigestRead } from '@/components/cockpit/DigestRead'
import { listResearchDrafts, type DraftStatus } from '@/api/researchDrafts'
import { useCopilotStanding } from '@/hooks/useCopilotStanding'
import { fmtIsoTs } from '@/lib/format'
import { openDigestInCopilot, openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'
import { copilotSessionStore } from '@/hooks/useCopilotSession'
import { digestExhibits } from '@/lib/harness/dailyDigest'
import { WaitingOnYou } from '@/pages/research/seats/WaitingOnYou'
import { RanToday } from '@/pages/research/seats/RanToday'
import { Threads } from '@/pages/research/seats/Threads'
import { ProviderChip, SpendChip } from '@/pages/research/seats/DeskHeaderChips'
import { spendAgainstCap } from '@/pages/research/seats/deskHeader'

export default function CopilotDeskPage() {
  const standingQ = useCopilotStanding()
  const s = standingQ.data
  const tab = useCopilotTab()
  const a = s?.approvals ?? {}
  const spent = s ? spendAgainstCap(s.usage).spent : 0

  const head = useCopilotHeadTabs(tab)

  return (
    <PageShell padding="default" className="min-w-0 space-y-3 overflow-x-hidden">
      {/* §16.10 · Rev .89: the three faces are the head's tabs; the spend and
          the provider are the toolbar's, right-aligned, with the face's hint
          in its title — on one line, so nothing sits on the panel below. */}
      <PageHead
        title="Copilot"
        info="Level 2 · on request · reads every page · writes only with your approval · D10 advisory. Open it from any page with ⌘J or an Ask on a panel; this page is what it did today and what it is waiting on."
        tabs={head.tabs}
        tab={head.tab}
        onTab={head.onTab}
        actions={
          <>
            <AskCopilotButton
              originPage="research-copilot-desk"
              originLabel="Copilot Desk"
              snapshot={compactSnapshot({
                digest: s?.brief?.status ?? 'none',
                conversations_today: s?.sessions.today ?? 0,
                spent_today_usd: spent,
              })}
              suggestedPrompt="What should I look at first today? Use the digest and the memos waiting in the Inbox."
            />
            <PageHeadLink to="/research/daily-brief" title="The morning's reading of the book">
              <ClipboardList className="mr-1 inline size-3.5" /> Daily Brief
            </PageHeadLink>
            {/* The catalogue's only door used to be the dock's empty state —
                the «all starters →» link on its book group — which appears on
                a blank thread and nowhere else, so a reader with a thread
                open could not reach it at all (Owner, 2026-09-21). It is not
                a menu row on either side; this is the fixed entry instead. */}
            <PageHeadLink to="/research/copilot/trading" title="The book's starter catalogue">
              <BookOpen className="mr-1 inline size-3.5" /> Book starters
            </PageHeadLink>
            {/* The design's primary action on this page: a thread with
                nothing attached, as ⌘J opens one from anywhere. `Ask Copilot`
                beside it is the other kind — this page's own context. */}
            <PageHeadAction
              primary
              title="Start a thread with nothing attached — the same panel ⌘J opens"
              onClick={() => {
                copilotSessionStore.clearSession()
                openResearchCopilot()
              }}
            >
              ＋ New thread <span className="ml-1 font-mono text-dense-micro opacity-80">⌘J</span>
            </PageHeadAction>
          </>
        }
      />
      <div data-sr-toolbar="" className="justify-end" title={COPILOT_TAB_HINT[tab]}>
        <SpendChip usage={s?.usage} />
        <ProviderChip />
      </div>

      {standingQ.isError ? (
        <ResearchAuthGap error={standingQ.error} onRetry={() => void standingQ.refetch()} />
      ) : null}

      {/* Design dissolved the three tiles into what each counts (Copilot Desk
          response ⑫): the digest's status lives on the digest panel, today's
          conversations on the Threads heading. This one's home is the design's
          Writes table — kind · change · thread · result — and that table needs
          a row-level read of the chat's write ledger. The ledger keeps the
          thread (research.ai_action_log.session_id, re-measured 2026-09-26);
          what is missing is a route that lists its rows. The count stays
          until that read exists. */}
      {tab === 'threads' ? (
        <section className="min-w-0 space-y-2">
          <SectionHead
            note="Conversations that moved today — the table below lists every thread, not only today's"
            meta={s ? `${s.sessions.today} today` : '—'}
          >
            Threads
          </SectionHead>
          {/* The design gives the threads a face of their own, and the table
              is wide: eight columns, one of them the thread's own title. */}
          <Threads />
        </section>
      ) : (
        <>
      {/* The design's Today is four panels, and the order is the argument:
          what is waiting comes before what already happened, and the digest
          — the longest read — sits at the foot (Rev 2026-09-20.20). */}
      <WaitingOnYou />

      <div className="grid gap-3 @3xl/page:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionPanel cap="Ran today" title="scheduled agents" note="ET">
          <div className="px-3 py-2">
            <RanToday />
          </div>
        </SectionPanel>

        <SectionPanel
          cap="Writes"
          title="what the chat asked to change"
          note="every write goes through a card · nothing silent"
        >
          <div className="space-y-1.5 px-3 py-2.5">
            <p className="m-0 flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-lg font-semibold tabular-nums">{a.proposed ?? 0}</span>
              <span className="text-dense-label text-muted-foreground">
                proposed · {a.executed ?? 0} ran · {a.rejected ?? 0} refused
              </span>
            </p>
            {/* The design's table is kind · change · thread · result, one row
                per write. Re-measured 2026-09-26: the ledger exists —
                research.ai_action_log keeps every chat write with its
                session_id, kind and status, and these three counts are read
                from it — but no route lists the rows; `/standing` returns
                the counts only. The read is filed as its own piece of work,
                so the count stands in for the table rather than a table of
                invented rows. */}
            <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
              Row by row — which thread asked, and what became of it — is in the write ledger (each
              write keeps its thread), but no read lists those rows yet: the standing returns the
              counts only. This panel counts what it can and names what it cannot.
            </p>
          </div>
        </SectionPanel>
      </div>

      <DigestPanel
        draftId={s?.brief?.draft_id ?? null}
        status={s?.brief?.status ?? null}
        loading={standingQ.isLoading}
      />

      <div className="grid gap-3 @3xl/page:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {/* Kept beyond the design, and the tab strip now repeats one of its
              three rows: it is the only place that says what the Copilot
              reads *from*, which the strip does not. Its fate is the Owner's
              to call. */}
          <SectionHead>What it works from</SectionHead>
          <section className="mt-2 border px-4 py-3 mat-card">
            <ul className="space-y-1.5 text-dense-label">
              <li>
                <Link to="/research/agent-personas" className="inline-flex items-center gap-2 hover:underline">
                  <Users className="size-3.5 text-muted-foreground" /> Personas
                </Link>
                <span className="text-muted-foreground"> — who judges, and how each one argues.</span>
              </li>
              <li>
                <Link to="/trade/playbook" className="inline-flex items-center gap-2 hover:underline">
                  <BookOpen className="size-3.5 text-muted-foreground" /> Playbook
                </Link>
                <span className="text-muted-foreground"> — the rules, cases and notes it is told to follow.</span>
              </li>
              <li>
                <Link to="/research/loop/decisions" className="inline-flex items-center gap-2 hover:underline">
                  <ClipboardList className="size-3.5 text-muted-foreground" /> Decision Inbox
                </Link>
                <span className="text-muted-foreground"> — where every write it proposes waits for you.</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
        </>
      )}
    </PageShell>
  )
}


function DigestPanel({ draftId, status, loading }: { draftId: string | null; status: string | null; loading: boolean }) {
  const q = useQuery({
    queryKey: ['research', 'drafts', 'digest', draftId, status],
    queryFn: () => listResearchDrafts({ kind: 'daily_digest', status: (status ?? 'pending') as DraftStatus, limit: 10 }),
    enabled: Boolean(draftId),
    staleTime: 60_000,
  })
  const draft = useMemo(() => q.data?.rows.find((r) => r.id === draftId) ?? null, [q.data, draftId])

  const navigate = useNavigate()
  if (loading || (draftId && q.isLoading)) {
    return (
      <section className="overflow-hidden mat-card">
        <ViewState kind="loading" title="Loading the digest" rows={4} cols={3} />
      </section>
    )
  }
  if (!draftId) {
    return (
      <section className="overflow-hidden mat-card">
        <ViewState
          kind="empty"
          title="No digest yet today"
          detail="The daily digest runs at 11:30 UTC on trading days and lands in the Decision Inbox. Yesterday’s is still there."
          actionLabel="Open Decision Inbox"
          onAction={() => navigate('/research/loop/decisions')}
        />
      </section>
    )
  }
  if (q.isError) return <ResearchAuthGap error={q.error} onRetry={() => void q.refetch()} />
  if (!draft) {
    return (
      <p className="text-dense-label text-muted-foreground">
        The digest moved on since this page loaded —{' '}
        <Link to="/research/loop/decisions" className="hover:underline">
          find it in the Decision Inbox
        </Link>
        .
      </p>
    )
  }
  // The design's digest panel: the lamps and the two ways out sit in the
  // header, and the body is the read — a line per name with the page its
  // lens came from. The draft's own prose keeps its place behind a toggle.
  return (
    <SectionPanel
      cap="Digest"
      title={`${fmtIsoTs(draft.created_at)} · ${draft.status}`}
      note={<DigestLampRow payload={draft.payload} />}
      action={
        <span className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-2"
            title="Prefills the Copilot with this digest — does not send"
            onClick={() =>
              openDigestInCopilot({
                draftId: draft.id,
                day: typeof draft.payload.day === 'string' ? draft.payload.day : null,
                symbols: digestExhibits(draft.payload).map((r) => r.symbol),
              })
            }
          >
            <MessageCircle className="size-3.5" /> Ask about it
          </Button>
          <Link to="/research/loop/decisions" className="inline-flex items-center gap-1 text-dense-meta hover:underline">
            {draft.status === 'pending' ? 'Approve or dismiss in the Inbox' : 'Open in the Inbox'}{' '}
            <ArrowRight className="size-3" />
          </Link>
        </span>
      }
    >
      <DigestRead
        payload={draft.payload}
        prose={<DailyDigestBody payload={draft.payload} clampProse={false} />}
      />
    </SectionPanel>
  )
}

