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
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchObjectiveRuns } from '@/api/research/harness'
import { fetchCandidates } from '@/api/research/candidates'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { ALL_OBJECTIVES, candidateObjectiveId, useObjectiveScope } from '@/lib/objectiveScope'
import { useActiveObjectives } from '@/hooks/useLoopHarness'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { ObjectiveScopeBanner, PageHeader, PageShell } from '@/components/layout'
import { DenseTag, EmptyState, type DenseTagVariant } from '@/components/data-display'
import { Card } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { approveResearchDraft, listResearchDrafts } from '@/api/researchDrafts'
import { useHeldDraftDismiss } from '@/hooks/useResearchDrafts'
import { draftTitle } from '@/lib/harness/draftText'
import { resolutionLine } from '@/lib/hypothesisResolution'
import { cardEvidence, splitTitleRef } from '@/lib/hypothesisCardModel'
import type { Hypothesis, HypothesisStatus } from '@/api/researchHypothesis'
import { cn } from '@/lib/utils'
import { OPERATOR_CHIP, operatorOf } from '@/lib/research/operatorOf'
import {
  ageOf,
  BOARD_LANES,
  laneCounts,
  laneRows,
  hypothesisObjectiveId,
  objectiveScopeReading,
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
        <DenseTag variant={STATUS_VARIANT[hypothesis.status]}>
          {hypothesis.status.toUpperCase()}
        </DenseTag>
        <span className="font-mono text-dense-meta font-bold text-entity-symbol">
          {scopeOf(hypothesis)}
        </span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          {ageOf(hypothesis.created_at, nowIso) ?? ''}
        </span>
      </div>
      <p className="text-dense-label font-medium leading-snug">{title}</p>
      {/* One sentence, as the design draws it — see `cardEvidence` for why
          the whole thesis cannot be the card's evidence line. The full text
          is on the element, so nothing is lost by the cut. */}
      <p
        className="line-clamp-2 text-dense-meta leading-normal text-muted-foreground"
        title={hypothesis.thesis ?? undefined}
      >
        {hypothesis.origin_page ? `Born on ${hypothesis.origin_page}. ` : ''}
        {cardEvidence(hypothesis.thesis)}
      </p>
      {/* The design's own order: what it is worth, what is riding on it, who
          wrote it, where it lives. The record leads because that is the
          column a reader scans down. */}
      <div className="flex items-baseline gap-2 border-t border-border/60 pt-1.5">
        <span
          className={cn(
            'min-w-0 shrink truncate font-mono text-dense-caption',
            settled ? 'text-foreground' : 'text-muted-foreground',
          )}
          title={record ?? 'no settled record — the outcome rule has not ruled'}
        >
          {record ?? '— unsettled'}
        </span>
        {/* The design's stake — "backing: 2 short puts", "1 CSP · $1.2k
            risk". Marked, not dropped: not one of the 53 hypotheses links an
            opportunity, so nothing on this side knows what is riding on a
            belief. */}
        <span
          className="whitespace-nowrap text-dense-caption text-muted-foreground/50"
          title="What is riding on this belief. No hypothesis on this side links an opportunity or a position, so nothing records a stake."
        >
          no stake recorded
        </span>
        <span
          className={cn(
            'border px-1 font-mono text-dense-micro font-bold mat-tag',
            OPERATOR_CHIP[operatorOf(hypothesis.origin_page)],
          )}
          title="Who wrote this hypothesis — the Book keeps every operator's, side by side. Read off the birthplace until provenance is stored (W2)."
        >
          {operatorOf(hypothesis.origin_page)}
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
  /**
   * Two kinds feed one queue. `hypothesis_suggestion` is what the Copilot
   * writes from a note or a reading; `hypothesis_draft` is what an agent
   * writes from a run. Both are answered the same way, so they are one list
   * rather than two panels saying the same thing.
   */
  const drafts = useQuery({
    queryKey: ['research', 'drafts', 'hypothesis-queue'],
    queryFn: async () => {
      const pages = await Promise.all(
        (['hypothesis_suggestion', 'hypothesis_draft'] as const).map((kind) =>
          listResearchDrafts({ kind, status: 'pending' }),
        ),
      )
      return { rows: pages.flatMap((p) => p.rows) }
    },
  })
  const act = useMutation({
    mutationFn: (id: string) => approveResearchDraft(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['research', 'drafts', 'hypothesis-queue'] }),
  })
  // Dismiss with Undo (Rev .75): the draft leaves at once, the write goes with the toast.
  const { isHeld, dismiss } = useHeldDraftDismiss()
  const rows = (drafts.data?.rows ?? []).filter((d) => !isHeld(d.id))
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
          the hypothesis queue · the same card as every other write
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
                onClick={() => act.mutate(d.id)}
              >
                Approve
              </button>
              <button
                type="button"
                className="text-dense-meta text-muted-foreground hover:text-foreground disabled:opacity-50"
                onClick={() => dismiss(d.id)}
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
  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const nowIso = new Date().toISOString()

  // The shell's objective scope. The design scopes this page by provenance and
  // the Lens tells the reader so; until this landed the board showed every row
  // under any scope, which is the shell claiming a filter the page ignores.
  const { objective, select: setObjective } = useObjectiveScope()
  const objectivesQ = useActiveObjectives()
  const runsQ = useQuery({
    queryKey: ['research', 'objective-runs', 'board'],
    queryFn: () => fetchObjectiveRuns({ limit: 200 }),
    staleTime: 5 * 60_000,
    enabled: objective !== ALL_OBJECTIVES,
  })
  const runToObjective = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of runsQ.data?.items ?? []) {
      if (r.id && r.objective_id) m.set(r.id, r.objective_id)
    }
    return m
  }, [runsQ.data])
  /**
   * The second road to an objective: a hypothesis promoted from a candidate
   * carries `origin_ref.candidate_id`, and the candidate carries the
   * objective that proposed it. On DEV that path answers for 9 rows where the
   * run path answers for none, because the runs those hypotheses name have
   * been deleted.
   */
  const candidatesQ = useQuery({
    queryKey: QUERY_KEYS.research.candidates({ status: 'all', days: 365 }),
    queryFn: () => fetchCandidates({ status: 'all', days: 365 }),
    staleTime: 5 * 60_000,
    enabled: objective !== ALL_OBJECTIVES,
  })
  const candidateToObjective = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of candidatesQ.data?.items ?? []) {
      const obj = candidateObjectiveId(c)
      if (c.id && obj) m.set(c.id, obj)
    }
    return m
  }, [candidatesQ.data])
  const scope = useMemo(
    () =>
      objective === ALL_OBJECTIVES
        ? null
        : objectiveScopeReading(rows, runToObjective, candidateToObjective, objective),
    [rows, runToObjective, candidateToObjective, objective],
  )
  /**
   * Filter when anything resolves; report when nothing does.
   *
   * The design filters, and so does this — but emptying the board because the
   * runs that wrote it were deleted would be a statement about the record
   * rather than about the machine, and that is the one case where hiding
   * every row answers nothing.
   */
  const scopeFilters = scope != null && scope.attributable > 0
  const inScope = useMemo(
    () =>
      !scopeFilters
        ? rows
        : rows.filter(
            (r) => hypothesisObjectiveId(r, runToObjective, candidateToObjective) === objective,
          ),
    [rows, scopeFilters, runToObjective, candidateToObjective, objective],
  )
  // The lane counts read the scoped set, so a chip never promises rows the
  // scope has already taken away.
  const counts = laneCounts(inScope)
  const shown = laneRows(inScope, lane)
  const scopeName =
    objectivesQ.data?.items?.find((o) => o.id === objective)?.title ?? objective

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

      {scope != null ? (
        <ObjectiveScopeBanner
          name={scopeName}
          onClear={() => setObjective(ALL_OBJECTIVES)}
          clearLabel="Clear — show every origin"
        >
          {scopeFilters ? (
            <>
              {scope.attributable} of {scope.total} hypotheses came from it — {scope.byHand} were
              opened by hand or by the Copilot queue and carry no provenance to follow,{' '}
              {scope.danglingRun} name a run or a candidate that no longer exists
              {scope.otherObjective > 0 ? `, and ${scope.otherObjective} came from another objective` : ''}
              . All of those are hidden; clearing the scope brings them back.
            </>
          ) : (
            <>
              None of the {scope.total} hypotheses resolves to it — {scope.byHand} carry no
              provenance to follow and {scope.danglingRun} name a run or a candidate that no
              longer exists. The board is not filtered while that is true: emptying it would say
              something about the record, not about this objective.
            </>
          )}
        </ObjectiveScopeBanner>
      ) : null}

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
        <div className="grid grid-cols-1 gap-2.5 @xl/page:grid-cols-2 @4xl/page:grid-cols-3">
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
        thesis text as its own falsifier. A hypothesis the machine proposes arrives in the
        Copilot queue above rather than on the board, and the queue has been empty in every
        status since it was last read — the panel appears when something is waiting, as the
        design draws it.
      </footer>
    </PageShell>
  )
}
