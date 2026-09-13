/**
 * Copilot Desk — `/research/copilot`, the level-2 seat's landing.
 *
 * The models work when asked. The desk is what they did today and how to
 * ask for more: the digest in full, the threads you had, what the chat asked
 * to write and what was allowed, what it cost — and the two things it works
 * from, the personas and your trading system. The panel stays global; this
 * page opens it with the thread you pick.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, ClipboardList, MessageCircle, Users, Zap } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { DailyDigestBody } from '@/components/cockpit/DailyDigestBody'
import { fetchCopilotSession, fetchCopilotSessions } from '@/api/researchCopilotSessions'
import { listResearchDrafts, type DraftStatus } from '@/api/researchDrafts'
import { AgentActionsMenu } from '@/components/cockpit/AgentActionsMenu'
import { agentsThatWroteOn, humanKind, nyDate } from '@/pages/research/seats/agentActivity'
import { useCopilotStanding } from '@/hooks/useCopilotStanding'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import { copilotSessionStore } from '@/hooks/useCopilotSession'
import { hydrateCopilotMessages } from '@/lib/cockpit/hydrateCopilotMessages'
import { fmtIsoTs } from '@/lib/format'
import { fmtUsd } from '@/lib/harness/runSpend'
import { openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'

export default function CopilotDeskPage() {
  const standingQ = useCopilotStanding()
  const s = standingQ.data
  const a = s?.approvals ?? {}
  const spent = s ? s.usage.cost_estimate_usd + (s.usage.bridge_cost_usd_today ?? 0) : 0

  return (
    <PageShell padding="default" className="min-w-0 space-y-3 overflow-x-hidden">
      <PageHeader
        title="Copilot"
        description="Level 2 · on request. A brief each morning, a chat that reads every page, writes only with your approval. Advisory only, D10 BLOCKED."
        actions={
          <div className="flex items-center gap-2">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Fact label="Today’s digest" title="The daily digest runs at 11:30 UTC on trading days">
          {s?.brief ? (
            <DenseTag variant={s.brief.status === 'pending' ? 'warning' : 'neutral'} size="cell">
              {s.brief.status}
            </DenseTag>
          ) : (
            <span className="text-dense-label text-muted-foreground">not yet</span>
          )}
        </Fact>
        <Fact label="Conversations today">
          <span className="font-mono text-lg font-semibold tabular-nums">{s?.sessions.today ?? '—'}</span>
        </Fact>
        <Fact label="Chat asked to write" title="Writes the chat proposed today, by what happened to them in the ledger">
          <span className="font-mono text-lg font-semibold tabular-nums">{a.proposed ?? 0}</span>
          <span className="text-dense-label text-muted-foreground">
            proposed · {a.executed ?? 0} ran · {a.rejected ?? 0} refused
          </span>
        </Fact>
        <Fact label="Spent today" title="Chat and bridge spend against the daily cap">
          <span className="font-mono text-lg font-semibold tabular-nums">{fmtUsd(spent)}</span>
          <span className="text-dense-label text-muted-foreground">/ {s ? fmtUsd(s.usage.cap_usd) : '—'}</span>
        </Fact>
      </div>

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
              <span className="ml-auto">
                <AgentActionsMenu />
              </span>
            </div>
            <RanToday />
          </section>
          <section className="space-y-2">
            <h2 className="text-dense-body font-semibold">Threads</h2>
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
        <Link to="/research/loop/decisions" className="ml-auto inline-flex items-center gap-1 hover:underline">
          {draft.status === 'pending' ? 'Approve or dismiss in the Inbox' : 'Open in the Inbox'} <ArrowRight className="size-3" />
        </Link>
      </div>
      <DailyDigestBody payload={draft.payload} />
    </div>
  )
}

/**
 * Which scheduled agents wrote today.
 *
 * Drafts are the record: the agents already write `generated_by`,
 * `created_at` and `kind`, so this reads the rows the Decision Inbox reads
 * instead of a second table that could disagree with it. The design's fourth
 * column, Cost, is not recorded anywhere in this system — it says so rather
 * than showing a zero, which on a spend column would be a claim.
 *
 * All four statuses, because an agent that ran and whose drafts you have since
 * approved still ran. The backend filters to `pending` when the parameter is
 * omitted, so each status is asked for separately; a status that comes back
 * full may be hiding more, and the count says so instead of rounding down
 * silently.
 */
const DRAFT_STATUSES: DraftStatus[] = ['pending', 'approved', 'dismissed', 'expired']
const DRAFT_PAGE = 100

function RanToday() {
  const queries = useQueries({
    queries: DRAFT_STATUSES.map((status) => ({
      queryKey: ['research', 'drafts', 'ran-today', status],
      queryFn: () => listResearchDrafts({ status, limit: DRAFT_PAGE }),
      staleTime: 60_000,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const errored = queries.filter((q) => q.isError)
  const rows = useMemo(() => {
    const drafts = queries.flatMap((q) => q.data?.rows ?? [])
    return agentsThatWroteOn(drafts, nyDate(new Date()))
  }, [queries])
  // A page that came back full is a page that may have been cut off.
  const maybeShort = queries.some((q) => (q.data?.rows.length ?? 0) >= DRAFT_PAGE)

  if (isLoading) return <Skeleton className="h-24 w-full" />
  // Partial is not clean: some agents may be missing from this list entirely.
  if (errored.length === DRAFT_STATUSES.length) {
    return <QueryErrorAlert error={errored[0].error} onRetry={() => queries.forEach((q) => void q.refetch())} />
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Zap />}
        title="Nothing has run yet today"
        description="Morning Prep and the EOD review write into the Decision Inbox when they run. Run one from Agents."
      />
    )
  }

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border bg-secondary/40">
        {rows.map((r) => (
          <li key={r.agent} className="flex items-start gap-2 px-3 py-2">
            <Zap className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-dense-label">{r.agent}</span>
              <span className="block text-dense-meta text-muted-foreground">
                {r.produced.map((p) => `${p.n} ${humanKind(p.kind)}`).join(' · ')}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-dense-meta tabular-nums text-muted-foreground">
                {fmtIsoTs(r.lastAt)}
              </span>
              <span className="block text-dense-micro text-muted-foreground/60" title="No agent run in this system records what it spent">
                cost not recorded
              </span>
            </span>
          </li>
        ))}
      </ul>
      {(errored.length > 0 || maybeShort) && (
        <p className="text-dense-meta text-warning">
          {errored.length > 0
            ? `${errored.length} of ${DRAFT_STATUSES.length} draft states could not be read — an agent may be missing from this list.`
            : 'A draft page came back full, so these counts are a floor.'}
        </p>
      )}
    </>
  )
}

function Threads() {
  const q = useQuery({
    queryKey: ['research', 'copilot', 'sessions', 'desk'],
    queryFn: () => fetchCopilotSessions(8),
    staleTime: 30_000,
  })
  const [opening, setOpening] = useState<string | null>(null)

  async function open(id: string) {
    setOpening(id)
    try {
      const detail = await fetchCopilotSession(id)
      copilotSessionStore.setState({
        messages: hydrateCopilotMessages(detail.messages ?? [], id, detail.session?.model),
        sessionId: id,
        streaming: false,
        lastError: null,
      })
      openResearchCopilot()
    } catch {
      // best effort — the panel's own list can still open it
      copilotDockStore.getState().setSessionsOpen(true)
      openResearchCopilot()
    } finally {
      setOpening(null)
    }
  }

  if (q.isLoading) return <Skeleton className="h-32 w-full" />
  if (q.isError) return <QueryErrorAlert error={q.error} onRetry={() => void q.refetch()} />
  const rows = q.data ?? []
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle />}
        title="No threads yet"
        description="Ask the Copilot from any page; the conversation is kept here."
      />
    )
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-secondary/40">
      {rows.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/40 disabled:opacity-60"
            disabled={opening === r.id}
            onClick={() => void open(r.id)}
            title="Open this thread in the Copilot panel"
          >
            <MessageCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-dense-body">{r.title || '(untitled)'}</span>
              <span className="block text-dense-meta text-muted-foreground">
                {fmtIsoTs(r.updated_at ?? null)}
                {r.model ? ` · ${r.model}` : ''}
                {r.message_count != null ? ` · ${r.message_count} turns` : ''}
                {r.group_name ? ` · ${r.group_name}` : ''}
              </span>
            </span>
            {r.pinned ? (
              <DenseTag variant="neutral" size="cell">
                pinned
              </DenseTag>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  )
}
