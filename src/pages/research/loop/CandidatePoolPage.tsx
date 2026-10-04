/**
 * Candidate Pool — Research Loop v1.
 * `/research/loop/candidates`
 */
import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import {
  HeroCard,
  HeroRow,
  ObjectiveScopeBanner,
  PageHead,
  PageHeadLink,
  PageShell,
  SectionPanel,
} from '@/components/layout'
import { ViewState } from '@bifrost/ui'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { ALL_OBJECTIVES, useObjectiveScope } from '@/lib/objectiveScope'
import { useActiveObjectives } from '@/hooks/useLoopHarness'
import {
  candidateOwnTags,
  candidateRunId,
  candidateSketch,
  curatorRunReading,
  scoreShare,
  splitByObjective,
} from '@/pages/research/loop/objectiveLapModel'
import { fetchObjectiveRuns } from '@/api/research/harness'
import { runSpend } from '@/lib/harness/runSpend'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { fmtUsd } from '@/utils/positions'
import { useQuery } from '@tanstack/react-query'
import type { CandidateOutcomeRow } from '@/api/research/candidateOutcome'
import { CandidateOutcomeSummary } from '@/components/research/CandidateOutcomeSummary'
import { useCandidateOutcomeByCandidate } from '@/hooks/useCandidateOutcome'
import { cn } from '@/lib/utils'
import { sourceOperatorOf } from '@/lib/research/operatorOf'
import { fmtPctSigned } from '@/lib/format'
import { labHref } from '@/lib/analyzeHubs'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  SegmentControl,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import {
  useCandidates,
  usePromoteCandidate,
} from '@/hooks/useCandidates'
import { dismissCandidate, type CandidateStatus, type ResearchCandidate } from '@/api/research/candidates'
import { useHeldRemoval } from '@/hooks/useHeldRemoval'

type StatusFilter = CandidateStatus | 'all'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'promoted', label: 'Promoted' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
]

function fmtScore(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(1)
}

/**
 * The Source tag's ink (Rev .88): a source is provenance, so it never borrows
 * an entity ink. Your hand is ink, a screen is the state blue, the loop's
 * Curator a muted grey, the Copilot its own module hue. The word is the
 * store's (`harness`, `scan` …), not the design's YOU / CURATOR / SCREEN.
 */
const SCREEN_SOURCES = ['scan', 'screen', 'screener', 'sepa', 'momentum']
function sourceInk(source: string | null | undefined): string {
  const s = (source ?? '').toLowerCase()
  if (SCREEN_SOURCES.some((t) => s.includes(t))) return 'text-[var(--sk-state-blue)]'
  const op = sourceOperatorOf(source)
  if (op === 'loop') return 'text-muted-foreground'
  if (op === 'copilot') return 'text-[var(--sk-copilot-ink)]'
  return 'text-foreground'
}

/**
 * Excess return over SPY for one candidate, five sessions on.
 *
 * A candidate whose window has not elapsed shows "pending", not a dash and not a
 * zero — the pool is usually younger than its shortest horizon, and an em dash
 * there reads as "no result" rather than "not yet".
 */
function CandidateOutcomeCell({ outcome }: { outcome?: CandidateOutcomeRow }) {
  if (!outcome) {
    return <span className="text-dense-micro text-muted-foreground">pending</span>
  }
  const excess = outcome.excess_return
  if (excess == null) {
    return <span className="text-dense-micro text-muted-foreground">no benchmark</span>
  }
  return (
    // A signed return — direction inks are right here (Rev .93 #7).
    <span className={excess > 0 ? 'text-profit' : excess < 0 ? 'text-loss' : 'text-foreground'}>
      {fmtPctSigned(excess * 100)}
    </span>
  )
}

/** 'new' the day it landed, amber once its ttl is within two days — the design's age cell on real fields. */
function candidateAge(
  row: Pick<ResearchCandidate, 'created_at' | 'ttl_at' | 'status'>,
  nowIso: string,
): { label: string; tone: 'fresh' | 'expiring' | 'quiet' } {
  const now = Date.parse(nowIso)
  const born = Date.parse(row.created_at)
  const days = Number.isFinite(born) ? Math.max(0, Math.floor((now - born) / 86_400_000)) : null
  const label = days == null ? '—' : days === 0 ? 'new' : `${days}d`
  if (days === 0 && row.status === 'open') return { label, tone: 'fresh' }
  const ttl = row.ttl_at ? Date.parse(row.ttl_at) : NaN
  if (row.status === 'open' && Number.isFinite(ttl) && ttl - now < 2 * 86_400_000) {
    return { label, tone: 'expiring' }
  }
  return { label, tone: 'quiet' }
}

export default function CandidatePoolPage() {
  const nowIso = new Date().toISOString()
  const [status, setStatus] = useState<StatusFilter>('open')

  const query = useCandidates({ status })
  const promote = usePromoteCandidate()
  // Drop with Undo (Rev .79) rather than a confirm: the row leaves at once and
  // the dismissal is written when the toast leaves, since none can be undone
  // on the server.
  const { isHeld, hold } = useHeldRemoval('research-candidate')
  const drop = (row: ResearchCandidate) =>
    hold(row.id, {
      msg: `${row.symbol} dropped`,
      commit: () => dismissCandidate(row.id),
      invalidate: [['research-engine', 'candidates']],
      failed: `${row.symbol} was not dropped`,
    })

  const all = useMemo(() => (query.data?.items ?? []).filter((c) => !isHeld(c.id)), [query.data?.items, isHeld])

  // The shell's objective scope, applied. Every row here carries the objective
  // that proposed it on `source_ref.objective_id` — 55 of 62 on DEV — so the
  // link resolves and the scope really filters. That is the difference from
  // the Hypothesis Board, where the same scope is reported with the filter off
  // because its link points at runs that no longer exist.
  const { objective, select: setObjective } = useObjectiveScope()
  const objectivesQ = useActiveObjectives()
  const split = useMemo(
    () => (objective === ALL_OBJECTIVES ? null : splitByObjective(all, objective)),
    [all, objective],
  )
  const items = split ? split.kept : all
  const scopeName =
    objectivesQ.data?.items?.find((o) => o.id === objective)?.title ?? objective
  const busyId = promote.isPending ? promote.variables?.id : null

  // The bar's ceiling: the best score on screen. Nothing documents the
  // composite's own ceiling, so this is the only one that cannot lie.
  // The design's Curator-run cell reads the machine's last act, not the rows'
  // newest date: the two diverge exactly when a run proposes nothing, which is
  // when you most want to know it ran.
  const runsQ = useQuery({
    queryKey: ['research-engine', 'objective-runs', 'pool'],
    queryFn: () => fetchObjectiveRuns({ limit: 200 }),
    staleTime: 5 * 60_000,
  })
  const curator = useMemo(
    () => curatorRunReading(runsQ.data?.items ?? [], all, (r) => runSpend(r).total_usd),
    [runsQ.data, all],
  )

  const bestScore = useMemo(
    () => items.reduce<number | null>((b, c) => (c.score != null && (b == null || c.score > b) ? c.score : b), null),
    [items],
  )

  const openCount = useMemo(
    () => items.filter((c) => c.status === 'open').length,
    [items],
  )

  /** The newest trade_date in view and how many rows it brought. */
  const latestBatch = useMemo(() => {
    const dated = items.filter((c) => c.trade_date)
    if (dated.length === 0) return null
    const sorted = dated.map((c) => c.trade_date).sort()
    const date = sorted[sorted.length - 1]
    return { date, n: dated.filter((c) => c.trade_date === date).length }
  }, [items])

  async function handlePromote(row: ResearchCandidate) {
    if (row.status !== 'open' || promote.isPending) return
    try {
      await promote.mutateAsync({ id: row.id })
    } catch {
      /* silent — table refetch / QueryErrorAlert covers load errors */
    }
  }

  const { data: outcomeByCandidate } = useCandidateOutcomeByCandidate(5)
  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(query)

  return (
    <PageShell padding="default" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the Inbox as the head's door. */}
      <PageHead
        title="Candidate Pool"
        info="What the loop is considering — the Curator screens in, ttl expiry screens out, you promote (Add to Pool from Scan and the discovery pages). Observe-only."
        actions={
          <PageHeadLink to="/research/loop/decisions" title="Where the loop's proposals wait for your call">
            Decision Inbox →
          </PageHeadLink>
        }
      />

      {/* Rev .88: In pool and Above promote line are the heroes; the Curator
          run and the pool policy stay on the strip. `Above promote line`
          keeps its sentence and no number — no fit line exists to be above. */}
      <HeroRow label="The pool">
        <HeroCard label="In pool" value={pageState === 'ready' ? String(openCount) : '—'} />
        <HeroCard
          label="Above promote line"
          value="—"
          valueClassName="text-muted-foreground"
          sub="no promote line exists — promotion is always yours; the loop only proposes"
        />
      </HeroRow>
      <div data-sr-kpi="strip">
        <span data-sr-kpi="stat">
          <span data-sr-kpi-l="">Curator run</span>
          <span
            data-sr-kpi-v=""
            className="font-mono text-dense-label font-semibold text-[var(--sk-soft)]"
            title="When the loop last ran for any objective. The pool's newest trade_date is a fact about the rows; this is a fact about the machine, and they part company the moment a run proposes nothing."
          >
            {curator?.startedAt ? curator.startedAt.slice(0, 16).replace('T', ' ') : '—'}
          </span>
          <span data-sr-kpi-s="">
            {curator == null
              ? 'no run recorded'
              : `+${curator.proposed} in · ${curator.expired} expired · ${fmtUsd(curator.usd)}`}
            {latestBatch ? ` · newest batch ${latestBatch.date} · ${latestBatch.n}` : ''}
          </span>
        </span>
        <span data-sr-kpi="stat" className="ml-auto max-w-[22rem]">
          <span data-sr-kpi-l="">Pool policy</span>
          <span className="text-dense-caption leading-normal whitespace-normal text-muted-foreground">
            a candidate carries a ttl_at and expiry screens it out as expired; Promote writes a
            Hypothesis and the row keeps the link
          </span>
        </span>
      </div>

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the pool"
          detail={staleDetail(query, 'a candidate proposed since may be missing.')}
          onAction={() => void query.refetch()}
        />
      ) : null}

      {/* Applied, not just reported: the rows this hides were proposed by
          another machine or by nobody's, and both are part of the answer to
          "what did THIS one produce". */}
      {split != null ? (
        <ObjectiveScopeBanner
          name={scopeName}
          onClear={() => setObjective(ALL_OBJECTIVES)}
          clearLabel="Clear — show every origin"
        >
          {split.kept.length} of {split.total} candidates came from it — {split.otherObjective}{' '}
          {split.otherObjective === 1 ? 'was' : 'were'} proposed by another objective and{' '}
          {split.noObjective} by no objective at all (a screen, a scan, or your own hand).
        </ObjectiveScopeBanner>
      ) : null}

      <CandidateOutcomeSummary />

      {/* The design puts the pool in a panel of its own with the ranking rule
          in its header, and the app had it bare on the canvas with the filter
          floating above. The Status filter is the panel's action — it decides
          what the panel contains, which is exactly what an action is for. */}
      <SectionPanel
        cap="Pool"
        title={
          status === 'open'
            ? 'ranked by the loop’s score · advisory, not a signal'
            : `${STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status} · ranked by the loop’s score`
        }
        note={
          <>
            {query.data?.count ?? 0} shown
            {status === 'open' || status === 'all' ? ` · ${openCount} open in view` : null}
          </>
        }
        action={
          <SegmentControl
            size="xs"
            ariaLabel="Status"
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            options={STATUS_OPTIONS}
          />
        }
      >
      {pageState === 'failed' ? (
        <ViewState
          kind="failed"
          title="Couldn’t load the pool"
          detail={failedDetail(query, 'No candidate was read — an empty pool here would not mean the loop proposed nothing.')}
          onAction={() => void query.refetch()}
        />
      ) : pageState === 'loading' ? (
        <ViewState kind="loading" title="Loading the pool" rows={6} cols={8} />
      ) : items.length === 0 ? (
        <ViewState
          kind="empty"
          title="No candidates"
          detail="Add symbols from Scan (Add to Pool) or the other discovery pages."
        />
      ) : (
        <DenseDataTable wrapClassName="rounded-none border-0 overflow-x-auto" tableClassName="min-w-[900px]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              {/* Widths, because the table lays out fixed: with none set it
                  split ten ways evenly and squeezed Actions — the page's two
                  verbs — to sixteen pixels. Each needs `max-w-none` beside it;
                  `DenseTableHead` carries `max-w-0`, which silently wins
                  otherwise. Why takes what is left, which is right: it is the
                  only cell that wraps. */}
              <DenseTableHead className="w-24 max-w-none">Symbol</DenseTableHead>
              <DenseTableHead className="w-28 max-w-none">Source</DenseTableHead>
              <DenseTableHead className="w-20 max-w-none text-right">Score</DenseTableHead>
              <DenseTableHead className="w-24 max-w-none">Trade date</DenseTableHead>
              <DenseTableHead className="w-16 max-w-none">Age</DenseTableHead>
              <DenseTableHead>Why</DenseTableHead>
              <DenseTableHead className="w-28 max-w-none">Tags</DenseTableHead>
              <DenseTableHead className="w-24 max-w-none">Book</DenseTableHead>
              {/* A column whose every cell repeats the filter you just chose
                  is a column of noise, and here it was pushing the page's two
                  verbs off the right edge. It comes back under All. */}
              {status === 'all' ? (
                <DenseTableHead className="w-24 max-w-none">Status</DenseTableHead>
              ) : null}
              <DenseTableHead className="w-24 max-w-none text-right">T+5 vs SPY</DenseTableHead>
              <DenseTableHead className="w-32 max-w-none">Actions</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {items.map((row) => {
              const canAct = row.status === 'open'
              const rowBusy = busyId === row.id
              const colCount = status === 'all' ? 11 : 10
              return (
                <Fragment key={row.id}>
                <DenseTableRow>
                  <DenseTableCell className={denseTableEntityCell}>
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={labHref('iv-rank', row.symbol)}
                        className="text-entity-symbol font-semibold hover:underline"
                      >
                        {row.symbol}
                      </Link>
                    </div>
                  </DenseTableCell>
                  {/* One tag, as the design draws it. The operator chip used
                      to sit beside it, and the two said the same thing twice —
                      `harness` maps to `loop` and nothing else. It is on the
                      provenance line under the row now, which is where the
                      design puts it. */}
                  <DenseTableCell>
                    <span
                      className={cn(
                        'inline-flex h-4 items-center px-1.5 mat-tag font-mono text-dense-micro font-bold',
                        sourceInk(row.source),
                      )}
                    >
                      {row.source}
                    </span>
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'max-w-none')}>
                    <span className="block">{fmtScore(row.score)}</span>
                    {/* Against the best in view, not against 100: the composite
                        has no documented ceiling, and a bar drawn to one would
                        invent a scale. */}
                    <span className="mt-0.5 block h-[3px] overflow-hidden rounded-sm bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
                      {scoreShare(row.score, bestScore) != null ? (
                        <span
                          className="block h-full rounded-sm bg-foreground/45"
                          style={{ width: `${Math.max(3, scoreShare(row.score, bestScore)! * 100)}%` }}
                        />
                      ) : null}
                    </span>
                  </DenseTableCell>
                  <DenseTableCell className="font-mono tabular-nums text-dense-meta">
                    {row.trade_date || '—'}
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(
                      'font-mono text-dense-micro',
                      // Rev .88: 'new' is ink, not a colour — it marks age, not a state.
                      candidateAge(row, nowIso).tone === 'fresh'
                        ? 'text-foreground'
                        : candidateAge(row, nowIso).tone === 'expiring'
                          ? 'text-warning'
                          : 'text-muted-foreground',
                    )}
                    title={row.ttl_at ? `ttl ${row.ttl_at.slice(0, 10)}` : 'no ttl'}
                  >
                    {candidateAge(row, nowIso).label}
                  </DenseTableCell>
                  {/* The design's Thesis sketch, in the vocabulary this side
                      has: the lenses that fired when the run proposed it.
                      Empty for a name no run nominated, rather than a
                      sentence invented for it. */}
                  <DenseTableCell className="max-w-none whitespace-normal">
                    {candidateSketch(row).length > 0 ? (
                      <span className="text-dense-meta leading-snug text-muted-foreground">
                        {candidateSketch(row).join(' · ')}
                      </span>
                    ) : (
                      <span
                        className="text-muted-foreground"
                        title="No lens snapshot on this nomination — nothing recorded why it was proposed."
                      >
                        —
                      </span>
                    )}
                  </DenseTableCell>
                  {/* Only the tags this row does not already say elsewhere —
                      see `candidateOwnTags`. An empty cell means they were all
                      repeats of Source or the Why's data_source. */}
                  <DenseTableCell
                    title={
                      (row.tags?.length ?? 0) > candidateOwnTags(row).length
                        ? `Also tagged ${(row.tags ?? []).join(', ')} — the repeats of Source and data_source are not printed twice.`
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap gap-1">
                      {candidateOwnTags(row)
                        .slice(0, 4)
                        .map((t) => (
                          <DenseTag key={t} variant="neutral">
                            {t}
                          </DenseTag>
                        ))}
                      {candidateOwnTags(row).length > 4 ? (
                        <span className="text-dense-micro text-muted-foreground">
                          +{candidateOwnTags(row).length - 4}
                        </span>
                      ) : null}
                      {candidateOwnTags(row).length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : null}
                    </div>
                  </DenseTableCell>
                  <DenseTableCell>
                    <PortfolioTag symbol={row.symbol} variant="inline" />
                  </DenseTableCell>
                  {status === 'all' ? (
                    <DenseTableCell>
                      <DenseTag
                        variant={
                          row.status === 'open'
                            ? 'info'
                            : row.status === 'promoted'
                              ? 'success'
                              : 'neutral'
                        }
                      >
                        {row.status}
                      </DenseTag>
                    </DenseTableCell>
                  ) : null}
                  <DenseTableCell className={denseTableNumCell}>
                    <CandidateOutcomeCell outcome={outcomeByCandidate?.get(row.id)} />
                  </DenseTableCell>
                  <DenseTableCell>
                    {/* The design writes these as words — `◫ Promote` and
                        `Drop` — and they are the point of the page. Two
                        unlabelled 28px icons at the far right of a table that
                        scrolls is the wrong weight for the one action this
                        list exists to offer. */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canAct || rowBusy}
                        onClick={() => void handlePromote(row)}
                        title="Promote to Hypothesis — writes one and keeps the link on this row"
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1 text-dense-meta text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:no-underline"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        Promote
                      </button>
                      <button
                        type="button"
                        disabled={!canAct || rowBusy}
                        onClick={() => drop(row)}
                        title="Drop from the open pool — status becomes dismissed, history is kept"
                        className="whitespace-nowrap rounded px-1 text-dense-meta text-muted-foreground hover:text-destructive hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:no-underline"
                      >
                        Drop
                      </button>
                    </div>
                  </DenseTableCell>
                </DenseTableRow>
                {/* The design gives every candidate a second line: the
                    artifact it is, who wrote it, and what it grew from. The
                    app had scattered those three — the operator into the
                    Source cell, the parent into the Why cell — which said
                    each of them next to something it is not about, and left
                    the rows reading as a thin spreadsheet rather than the
                    design's two-line blocks.

                    The six verbs share this line in the design and are not
                    here: the Owner ruled on 2026-09-21 (option B) that what
                    each verb writes and where it lands is a product decision,
                    so the line says they are owed where they would sit. */}
                <tr>
                  <td colSpan={colCount} className="px-2.5 pb-1.5 pt-0">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-dense-caption text-muted-foreground">
                      <span
                        className="font-mono text-muted-foreground/70"
                        title="The artifact this row is — the same nomination the Journal files under its run."
                      >
                        nomination {row.id}
                      </span>
                      <span
                        className="text-muted-foreground/50"
                        title="The design hangs Explain · Challenge · Fork · Extend · Settle · Distill here. What each writes and where it lands is still open, so the row is a piece of work of its own rather than a guess baked into three pages."
                      >
                        Explain · Challenge · Fork · Extend · Settle · Distill
                      </span>
                      <span className="ml-auto flex flex-wrap items-center gap-x-2 font-mono">
                        <span>operator · {sourceOperatorOf(row.source)}</span>
                        <span aria-hidden>·</span>
                        {candidateRunId(row) ? (
                          <Link
                            // The console's own path for a run, not the
                            // `/research/loop/runs/:id` address that only
                            // redirects to it — one hop, and one definition
                            // of where a run opens.
                            to={loopPipelinePath(candidateRunId(row)!)}
                            className="text-primary hover:underline"
                            title="The run that proposed this name — opens its pipeline"
                          >
                            parent {candidateRunId(row)}
                          </Link>
                        ) : (
                          <span
                            className="text-muted-foreground/60"
                            title="No run proposed this name — it arrived from a screen, a scan, or your own hand."
                          >
                            parent —
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                </tr>
                </Fragment>
              )
            })}
          </DenseTableBody>
        </DenseDataTable>
      )}

      <p className="border-t border-border px-3 py-2 text-dense-caption leading-normal text-muted-foreground">
        Score is the loop's composite at ingest — it ranks attention, it does not size or trade
        anything; its bar is drawn against the best score in view, because nothing documents
        the composite's own ceiling. <span className="text-foreground/80">Why</span> is the lens
        snapshot the run attached when it proposed the name — this side's version of the design's
        thesis sketch, which is a record of what fired rather than prose anybody wrote. Promote
        writes a Hypothesis directly and the row keeps the link; Dismiss and ttl expiry keep
        history. The design ranks this list by <span className="text-foreground/80">Fit</span> —
        how many of the active hypotheses’ entry conditions a name satisfies, weighted by each
        hypothesis’s settled record. Both halves are empty on this side, not merely unbuilt: not
        one active hypothesis links an opportunity, so no entry condition is attached to any of
        them, and not one carries a resolution, so there is no settled record to weight by
        (re-measured 2026-09-26).
        Until one of those fills, a Fit percentage would be a number with nothing behind it.
      </p>
      </SectionPanel>
    </PageShell>
  )
}
