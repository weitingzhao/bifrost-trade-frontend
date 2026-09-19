/**
 * Hypothesis Board — `/research/loop/hypotheses`, walked against
 * Research Hypothesis Board.dc.html (2026-09-17.1).
 *
 * The design's lanes are drawn in the server's own vocabulary (active /
 * validated / rejected / archived — its testing · parked lifecycle has no
 * column), and the card's record cell reads the outcome-rule resolution, the
 * only settled record a hypothesis stores. The Copilot queue panel is real:
 * `hypothesis_suggestion` drafts, approved or dismissed through the same card
 * queue as every other loop write — approving records the call and writes no
 * hypothesis, and the panel says so.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, EmptyState, type DenseTagVariant } from '@/components/data-display'
import { Card } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { useHypothesisList } from '@/hooks/useHypotheses'
import {
  approveResearchDraft,
  dismissResearchDraft,
  listResearchDrafts,
} from '@/api/researchDrafts'
import { draftTitle } from '@/lib/harness/draftText'
import { resolutionLine } from '@/lib/hypothesisResolution'
import { salientThesis, splitTitleRef } from '@/lib/hypothesisCardModel'
import type { Hypothesis, HypothesisStatus } from '@/api/researchHypothesis'
import { cn } from '@/lib/utils'
import { OPERATOR_CHIP, operatorOf } from '@/lib/research/operatorOf'
import {
  ageOf,
  BOARD_LANES,
  laneCounts,
  laneRows,
  originDest,
  scopeOf,
  type BoardLane,
} from './hypothesisBoardModel'

const STATUS_VARIANT: Record<HypothesisStatus, DenseTagVariant> = {
  active: 'info',
  validated: 'success',
  rejected: 'danger',
  archived: 'neutral',
}

function BoardCard({ hypothesis, nowIso }: { hypothesis: Hypothesis; nowIso: string }) {
  const { title } = splitTitleRef(hypothesis.title)
  const dest = originDest(hypothesis.origin_page)
  const settled = resolutionLine(hypothesis.resolution_json)
  const record = settled ?? hypothesis.conclusion ?? null
  const backtestTo = `/research/backtest?tab=event-query&hypothesis_id=${encodeURIComponent(hypothesis.id)}${
    hypothesis.symbols.length > 0
      ? `&symbols=${encodeURIComponent(hypothesis.symbols.join(','))}`
      : ''
  }`
  return (
    <Card
      variant="elevated"
      className={cn('space-y-1.5 p-3', hypothesis.status === 'archived' && 'opacity-60')}
    >
      <div className="flex items-baseline gap-2">
        <DenseTag variant={STATUS_VARIANT[hypothesis.status]}>{hypothesis.status}</DenseTag>
        <span className="font-mono text-dense-meta font-bold text-entity-symbol">
          {scopeOf(hypothesis)}
        </span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          {ageOf(hypothesis.created_at, nowIso) ?? ''}
        </span>
      </div>
      <p className="text-dense-label font-medium leading-snug">{title}</p>
      <p className="line-clamp-3 text-dense-meta leading-normal text-muted-foreground">
        {hypothesis.origin_page ? `Born on ${hypothesis.origin_page}. ` : ''}
        {salientThesis(hypothesis.thesis)}
      </p>
      <div className="flex items-baseline gap-2 border-t border-border/60 pt-1.5">
        <span
          className={cn(
            'rounded border px-1 font-mono text-dense-micro font-bold',
            OPERATOR_CHIP[operatorOf(hypothesis.origin_page)],
          )}
          title="Who wrote this hypothesis — the Book keeps every operator's, side by side. Read off the birthplace until provenance is stored (W2)."
        >
          {operatorOf(hypothesis.origin_page)}
        </span>
        <span
          className={cn(
            'min-w-0 truncate font-mono text-dense-caption',
            settled ? 'text-foreground' : 'text-muted-foreground',
          )}
          title={record ?? 'no settled record — the outcome rule has not ruled'}
        >
          {record ?? '— unsettled'}
        </span>
        <Link
          to={dest?.to ?? backtestTo}
          className="ml-auto whitespace-nowrap text-dense-caption text-primary hover:underline"
        >
          {dest ? `${dest.label} →` : 'Backtest →'}
        </Link>
      </div>
    </Card>
  )
}

function SuggestionQueue() {
  const qc = useQueryClient()
  const drafts = useQuery({
    queryKey: ['research', 'drafts', 'hypothesis_suggestion'],
    queryFn: () => listResearchDrafts({ kind: 'hypothesis_suggestion', status: 'pending' }),
  })
  const act = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: 'approve' | 'dismiss' }) =>
      verb === 'approve' ? approveResearchDraft(id) : dismissResearchDraft(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['research', 'drafts', 'hypothesis_suggestion'] }),
  })
  const rows = drafts.data?.rows ?? []
  if (rows.length === 0) return null
  return (
    <section className="overflow-hidden rounded-md border border-warning/45">
      <header className="flex flex-wrap items-center gap-2.5 border-b border-border/60 bg-secondary px-3 py-2">
        <span className="text-dense-micro font-semibold uppercase tracking-wider text-warning">
          Proposed by Copilot
        </span>
        <span className="text-dense-label font-medium">
          {rows.length} draft{rows.length > 1 ? 's' : ''} awaiting your call
        </span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          hypothesis_suggestion queue · the same card as every other write (§11.3)
        </span>
      </header>
      <div className="space-y-2.5 px-3 py-2.5">
        {act.error ? (
          <p className="text-dense-meta text-destructive">{(act.error as Error).message}</p>
        ) : null}
        {rows.map((d) => (
          <div key={d.id} className="space-y-1">
            <div className="flex items-baseline gap-2.5">
              <DenseTag variant="warning">DRAFT</DenseTag>
              <span className="text-dense-label font-medium">{draftTitle(d)}</span>
            </div>
            {typeof d.payload.summary === 'string' && d.payload.summary ? (
              <p className="text-dense-meta leading-normal text-secondary-foreground">
                {d.payload.summary}
              </p>
            ) : null}
            <div className="flex gap-3.5">
              <button
                type="button"
                className="text-dense-meta text-primary hover:underline disabled:opacity-50"
                disabled={act.isPending}
                title="Records your call on the draft — no hypothesis is written; create one from its evidence page"
                onClick={() => act.mutate({ id: d.id, verb: 'approve' })}
              >
                Approve
              </button>
              <button
                type="button"
                className="text-dense-meta text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={act.isPending}
                onClick={() => act.mutate({ id: d.id, verb: 'dismiss' })}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function HypothesisBoardPage() {
  const [lane, setLane] = useState<BoardLane>('all')
  const query = useHypothesisList({ include_retired: true, limit: 100 })
  const rows = query.data?.rows ?? []
  const counts = laneCounts(rows)
  const shown = laneRows(rows, lane)
  const nowIso = new Date().toISOString()

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Hypothesis Board"
        description="Every tradable belief, with its evidence and its record — hypotheses are born next to evidence (D2), never typed in here."
        actions={
          <Link
            to="/review/playbook-stats"
            className="whitespace-nowrap text-dense-label text-primary hover:underline"
          >
            Settled record → Playbook stats
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {BOARD_LANES.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setLane(k)}
            className={cn(
              'inline-flex h-6 items-center gap-1.5 rounded-md border px-2.5 text-dense-meta',
              lane === k
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {k === 'all' ? 'All' : k}
            <span className="font-mono text-dense-caption opacity-80">{counts[k]}</span>
          </button>
        ))}
      </div>

      <SuggestionQueue />

      {query.isError ? (
        <QueryErrorAlert error={query.error} />
      ) : query.isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-md" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No hypotheses in this lane"
          description="Promote a candidate from the Pool, or Save as Hypothesis from Scan and the other evidence pages — the board itself writes nothing."
          action={
            <Link
              to="/research/loop/candidates"
              className="text-dense-meta text-primary underline-offset-2 hover:underline"
            >
              Open Candidate Pool
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,21.25rem),1fr))] items-start gap-2.5">
          {shown.map((h) => (
            <BoardCard key={h.id} hypothesis={h} nowIso={nowIso} />
          ))}
        </div>
      )}

      <footer className="text-dense-caption leading-normal text-muted-foreground">
        Candidate-born theses settle by the objective's outcome rule at its horizon; the rest wait
        for your call. There is no falsifier field yet — a thesis that cannot fail belongs in the
        thesis text as its own falsifier.
      </footer>
    </PageShell>
  )
}
