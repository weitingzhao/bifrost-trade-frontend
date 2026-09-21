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
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, ClipboardList, MessageCircle, Plus, Users } from 'lucide-react'
import { PageHeader, PageShell, SectionPanel } from '@/components/layout'
import { CopilotTabs, useCopilotTab } from '@/components/research/CopilotTabs'
import { EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { Skeleton } from '@/components/ui/skeleton'
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

  return (
    <PageShell padding="default" className="min-w-0 space-y-3 overflow-x-hidden">
      <PageHeader
        title="Copilot"
        description="Level 2 · on request · reads every page · writes only with your approval · D10 advisory. Open it from any page with ⌘J or an Ask on a panel; this page is what it did today and what it is waiting on."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SpendChip usage={s?.usage} />
            <ProviderChip />
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
            <Button asChild variant="outline" size="sm">
              <Link to="/research/daily-brief">
                <ClipboardList className="mr-1 size-3.5" /> Daily Brief
              </Link>
            </Button>
            {/* The design's primary action on this page: a thread with
                nothing attached, as ⌘J opens one from anywhere. `Ask Copilot`
                beside it is the other kind — this page's own context. */}
            <Button
              size="sm"
              onClick={() => {
                copilotSessionStore.clearSession()
                openResearchCopilot()
              }}
              title="Start a thread with nothing attached — the same panel ⌘J opens"
            >
              <Plus className="mr-1 size-3.5" /> New thread
              <span className="ml-1.5 rounded border border-primary-foreground/30 px-1 font-mono text-dense-micro">
                ⌘J
              </span>
            </Button>
          </div>
        }
      />

      {/* The design's three faces under one header (Rev 2026-09-20.20): Today
          and Threads are views of this route, Personas is its own. */}
      <CopilotTabs active={tab} />

      {standingQ.isError ? (
        <ResearchAuthGap error={standingQ.error} onRetry={() => void standingQ.refetch()} />
      ) : null}

      {/* Design dissolved the three tiles into what each counts (Copilot Desk
          response ⑫): the digest's status lives on the digest panel, today's
          conversations on the Threads heading. This one's home is the design's
          Writes table — kind · change · thread · result — and that table needs
          a row-level read of the chat's write ledger. Measured 2026-09-20 on
          DEV: `/research/copilot/standing` returns the three counts and
          nothing else, and `/research/drafts` distinguishes `generated_by`
          (owner · harness · morning_agent · eod_agent) but carries no chat
          origin, so the rows cannot be reconstructed from it. The tile stays
          until that read exists. */}
      {tab === 'threads' ? (
        <section className="min-w-0 space-y-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-dense-body font-semibold">Threads</h2>
            <span
              className="font-mono text-dense-meta tabular-nums text-muted-foreground"
              title="Conversations that moved today — the table below lists every thread, not only today's"
            >
              {s ? `${s.sessions.today} today` : '—'}
            </span>
          </div>
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

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                per write. Measured 2026-09-20 on DEV: the standing returns
                these three counts and nothing else, and `/research/drafts`
                distinguishes `generated_by` (owner · harness · morning_agent
                · eod_agent) but carries no chat origin — so the rows cannot
                be reconstructed. The count stands in for the table until that
                read exists, rather than a table of invented rows. */}
            <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
              Row by row — which thread asked, and what became of it — needs a write ledger that carries
              the chat’s own origin. Nothing on this side records one yet, so this panel counts what it
              can and names what it cannot.
            </p>
          </div>
        </SectionPanel>
      </div>

      <DigestPanel
        draftId={s?.brief?.draft_id ?? null}
        status={s?.brief?.status ?? null}
        loading={standingQ.isLoading}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {/* Kept beyond the design, and the tab strip now repeats one of its
              three rows: it is the only place that says what the Copilot
              reads *from*, which the strip does not. Its fate is the Owner's
              to call. */}
          <section className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <h2 className="text-dense-body font-semibold">What it works from</h2>
            <ul className="mt-2 space-y-1.5 text-dense-label">
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

  if (loading || (draftId && q.isLoading)) return <Skeleton className="h-40 w-full" />
  if (!draftId) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title="No digest yet today"
        description="The daily digest runs at 11:30 UTC on trading days and lands in the Decision Inbox. Yesterday’s is still there."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/research/loop/decisions">Open Decision Inbox</Link>
          </Button>
        }
      />
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

