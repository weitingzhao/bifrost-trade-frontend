/**
 * What the Pilot Console took in from the retired Copilot Desk (design Rev
 * .100, Owner 2026-09-27, Vision §22.1: one Pilot, one console).
 *
 * The design moved two things — Conversations and the bench strip. The Owner
 * chose (2026-09-28) to move everything the Desk had data for, business
 * first: the chat's writes, the scheduled agents that ran today and the
 * daily digest land here too. Waiting on you did not move: it is the Decision
 * Inbox's own queue, one click away on the toolbar.
 */
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { ViewState } from '@bifrost/ui'
import { SectionPanel } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { DailyDigestBody } from '@/components/cockpit/DailyDigestBody'
import { DigestLampRow, DigestRead } from '@/components/cockpit/DigestRead'
import { listResearchDrafts, type DraftStatus } from '@/api/researchDrafts'
import { TRACK_DAYS, TRACK_THIN, horizonOf, sourceLabel, useSourceTrackRecord } from '@/hooks/useSourceTrackRecord'
import { useCopilotStanding } from '@/hooks/useCopilotStanding'
import { fmtIsoTs } from '@/lib/format'
import { openDigestInCopilot, openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'
import { digestExhibits } from '@/lib/harness/dailyDigest'
import { Threads } from './Threads'
import { Writes } from './Writes'
import { RanToday } from './RanToday'

/**
 * The bench strip: **Track record · by source** (design Rev .104, answering the
 * app's receipt Q8). Per-judge hit rates have no attribution store, so the
 * strip reads the outcome store by nomination source — the Personas Track
 * record table's rule and the same query (5d · 365d · n < 10 amber, ink not
 * profit green, §14.8).
 */
function BenchStrip() {
  const navigate = useNavigate()
  const { rows, loading } = useSourceTrackRecord(TRACK_DAYS)
  const chips = rows
    .map(({ source, summary }) => {
      const five = horizonOf(summary, 5)
      return { source, n: five?.settled ?? 0, hit: five?.hit_rate ?? null }
    })
    .filter((c) => c.n > 0)
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-border px-3 py-2">
      <span
        className="text-dense-micro font-semibold tracking-[.08em] whitespace-nowrap text-muted-foreground uppercase"
        title={`Where a candidate came from, not which judge graded it — nothing records a judge's verdict against the outcome yet. Settled at 5 days over ${TRACK_DAYS}; n under ${TRACK_THIN} amber.`}
      >
        Track record · by source
      </span>
      {loading ? <span className="text-dense-meta text-muted-foreground">…</span> : null}
      {!loading && chips.length === 0 ? (
        <span className="text-dense-meta text-muted-foreground">nothing settled at 5 days in {TRACK_DAYS} days</span>
      ) : null}
      {chips.map((c) => {
        const thin = c.n < TRACK_THIN
        return (
          <span
            key={c.source}
            className="font-mono text-dense-meta whitespace-nowrap text-[var(--sk-soft)]"
            title={
              thin
                ? 'Fewer than 10 settled — a hit rate this thin is a coincidence'
                : `Settled at 5 days over ${TRACK_DAYS} · candidates nominated by ${sourceLabel(c.source)}`
            }
          >
            {sourceLabel(c.source)}{' '}
            <span style={{ color: thin ? 'var(--sk-warn)' : 'var(--sk-ink)' }}>
              {c.hit == null ? '—' : `${Math.round(c.hit * 100)}%`} · n {c.n}
            </span>
          </span>
        )
      })}
      <span className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/review/playbook')}
          title="The rules, cases and notes the Pilot is told to follow"
          className="text-dense-meta whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline"
        >
          Playbook →
        </button>
        <button
          type="button"
          onClick={() => navigate('/research/agent-personas')}
          className="text-dense-meta whitespace-nowrap text-primary hover:underline"
        >
          Personas · manage the bench →
        </button>
      </span>
    </div>
  )
}

/** Conversations — the hand-held end of the same Pilot, with the bench under it. */
export function PilotConversations() {
  const standingQ = useCopilotStanding()
  const today = standingQ.data?.sessions.today
  return (
    <SectionPanel
      title="Conversations"
      note={`${today != null ? `${today} today · ` : ''}the hand-held end of the same Pilot — a thread keeps its origin page and symbol`}
      action={
        <button type="button" onClick={() => openResearchCopilot()} className="text-dense-meta text-primary hover:underline">
          Ask (⌘J) →
        </button>
      }
    >
      <div className="px-3 pt-1 pb-2">
        <Threads />
      </div>
      <BenchStrip />
    </SectionPanel>
  )
}

/** What the Pilot did today without being asked: scheduled agents, the chat's writes, the digest. */
export function PilotToday() {
  const standingQ = useCopilotStanding()
  const s = standingQ.data
  return (
    <>
      {standingQ.isError ? <ResearchAuthGap error={standingQ.error} onRetry={() => void standingQ.refetch()} /> : null}
      <div className="grid gap-3 @3xl/page:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionPanel cap="Ran today" title="scheduled agents" note="ET">
          <div className="px-3 py-2">
            <RanToday />
          </div>
        </SectionPanel>
        <Writes approvals={s?.approvals} />
      </div>
      <PilotDigest draftId={s?.brief?.draft_id ?? null} status={s?.brief?.status ?? null} loading={standingQ.isLoading} />
    </>
  )
}

function PilotDigest({ draftId, status, loading }: { draftId: string | null; status: string | null; loading: boolean }) {
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
            {draft.status === 'pending' ? 'Approve or dismiss in the Inbox' : 'Open in the Inbox'} <ArrowRight className="size-3" />
          </Link>
        </span>
      }
    >
      <DigestRead payload={draft.payload} prose={<DailyDigestBody payload={draft.payload} clampProse={false} />} />
    </SectionPanel>
  )
}
