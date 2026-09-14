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
import { ArrowRight, BookOpen, ClipboardList, MessageCircle, Users } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { DailyDigestBody } from '@/components/cockpit/DailyDigestBody'
import { listResearchDrafts, type DraftStatus } from '@/api/researchDrafts'
import { useCopilotStanding } from '@/hooks/useCopilotStanding'
import { fmtIsoTs } from '@/lib/format'
import { openDigestInCopilot } from '@/lib/harness/loopCopilotPrefill'
import { digestExhibits } from '@/lib/harness/dailyDigest'
import { WaitingOnYou } from '@/pages/research/seats/WaitingOnYou'
import { RanToday } from '@/pages/research/seats/RanToday'
import { Threads } from '@/pages/research/seats/Threads'
import { ProviderChip, SpendChip } from '@/pages/research/seats/DeskHeaderChips'
import { spendAgainstCap } from '@/pages/research/seats/deskHeader'

export default function CopilotDeskPage() {
  const standingQ = useCopilotStanding()
  const s = standingQ.data
  const a = s?.approvals ?? {}
  const spent = s ? spendAgainstCap(s.usage).spent : 0

  return (
    <PageShell padding="default" className="min-w-0 space-y-3 overflow-x-hidden">
      <PageHeader
        title="Copilot"
        description="Level 2 · on request. A brief each morning, a chat that reads every page, writes only with your approval. Advisory only, D10 BLOCKED."
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
          </div>
        }
      />

      {standingQ.isError ? (
        <QueryErrorAlert error={standingQ.error} onRetry={() => void standingQ.refetch()} />
      ) : null}

      {/* Design dissolved the three tiles into what each counts (Copilot Desk response ⑫):
          the digest's status lives on the digest panel, today's conversations on the
          Threads heading. This one's home is the Writes panel, which waits on a
          Research read route — so it stays until that panel exists (Owner, 2026-09-13). */}
      <div className="flex">
        <Fact label="Chat asked to write" title="Writes the chat proposed today, by what happened to them in the ledger">
          <span className="font-mono text-lg font-semibold tabular-nums">{a.proposed ?? 0}</span>
          <span className="text-dense-label text-muted-foreground">
            proposed · {a.executed ?? 0} ran · {a.rejected ?? 0} refused
          </span>
        </Fact>
      </div>

      {/* First, as in the design's Today: what is waiting for an answer comes
          before what already happened. */}
      <WaitingOnYou />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="min-w-0 space-y-2">
          <h2 className="text-dense-body font-semibold">Today’s digest</h2>
          <DigestToday draftId={s?.brief?.draft_id ?? null} status={s?.brief?.status ?? null} loading={standingQ.isLoading} />
        </section>
        <div className="min-w-0 space-y-3">
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-dense-body font-semibold">Ran today</h2>
              <span className="text-dense-meta text-muted-foreground">scheduled agents · ET</span>
            </div>
            <RanToday />
          </section>
          <section className="space-y-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-dense-body font-semibold">Threads</h2>
              <span
                className="font-mono text-dense-meta tabular-nums text-muted-foreground"
                title="Conversations that moved today — every thread, not only the latest shown below"
              >
                {s ? `${s.sessions.today} today` : '—'}
              </span>
            </div>
            <Threads />
          </section>
          <section className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <h2 className="text-dense-body font-semibold">What it works from</h2>
            <ul className="mt-2 space-y-1.5 text-dense-label">
              <li>
                <Link to="/research/agent-personas" className="inline-flex items-center gap-2 hover:underline">
                  <Users className="size-3.5 text-muted-foreground" /> Agent Personas
                </Link>
                <span className="text-muted-foreground"> — who judges, and how each one argues.</span>
              </li>
              <li>
                <Link to="/research/playbook" className="inline-flex items-center gap-2 hover:underline">
                  <BookOpen className="size-3.5 text-muted-foreground" /> My Trading System
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
    </PageShell>
  )
}

function Fact({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3" title={title}>
      <div className="text-dense-meta uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">{children}</div>
    </div>
  )
}

function DigestToday({ draftId, status, loading }: { draftId: string | null; status: string | null; loading: boolean }) {
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
  if (q.isError) return <QueryErrorAlert error={q.error} onRetry={() => void q.refetch()} />
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
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-dense-label text-muted-foreground">
        <span>{fmtIsoTs(draft.created_at)}</span>
        <DenseTag variant={draft.status === 'pending' ? 'warning' : 'neutral'} size="cell">
          {draft.status}
        </DenseTag>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 gap-1 px-2"
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
        <Link to="/research/loop/decisions" className="inline-flex items-center gap-1 hover:underline">
          {draft.status === 'pending' ? 'Approve or dismiss in the Inbox' : 'Open in the Inbox'} <ArrowRight className="size-3" />
        </Link>
      </div>
      <DailyDigestBody payload={draft.payload} readingsOpen />
    </div>
  )
}

