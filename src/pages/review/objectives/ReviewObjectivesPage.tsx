/**
 * Objectives — did the machine earn its keep. `/review/objectives`
 *
 * Design `Review Objectives.dc.html`. Research builds machines; only settled
 * money says whether one was worth running. The page reads the whole chain
 * for each — proposed → accepted → traded → settled — and it is the one place
 * the loop closes, because a verdict here is what sends a patch back.
 *
 * **Built with the chain broken, deliberately** (Owner's option (c),
 * 2026-09-20). Nothing on this side links a hypothesis to a settled position:
 * 29 hypotheses, none carrying an opportunity id, against 25 opportunity ids
 * on the settled side — intersection zero. So `traded`, `settled`, `hit` and
 * `net` read `—` per objective, every closed trade sits in Unattributed, and
 * every verdict is NO VERDICT.
 *
 * That is not a page waiting to be useful. It is the only surface that can
 * say *which field* is missing, and it names it: `hypothesis.
 * linked_opportunity_ids`. The alternative was to backfill first and build
 * later, which would have left the sentence with nowhere to be said. The
 * request is R5 in `REQUEST-research-data-2026-09-20.md`.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ObjectiveScopeBanner,
  PageHeader,
  PageShell,
  SectionPanel,
  SECTION_CAP_CLASS,
} from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
  denseTableNumCell,
} from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { cn } from '@/lib/utils'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { pnlColorClass } from '@/utils/dailyChange'
import { useActiveObjectives } from '@/hooks/useLoopHarness'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { fetchCandidates } from '@/api/research/candidates'
import { useObjectiveScope, ALL_OBJECTIVES } from '@/lib/objectiveScope'
import {
  BROKEN_LINK,
  VERDICT_FLOOR,
  chainAction,
  chainWindow,
  objectiveChain,
  widestGate,
  type ChainRow,
  type Verdict,
} from '@/pages/review/objectives/objectiveChainModel'

/**
 * §5a.5 split the second half out of the h1 and into the grey subtitle, so
 * the page is headed by the name its menu row promised and the question it
 * answers is the first thing under it.
 */
const LEAD =
  'Did the machine earn its keep? Research builds machines, and only settled money says whether one was worth running — so this page reads the whole chain for each of them, proposed through settled, and it is the one place the loop closes: a verdict here is what sends a patch back to the objective.'

const VERDICT_TAG: Record<Verdict, { variant: 'success' | 'danger' | 'warning' | 'neutral' }> = {
  EARNING: { variant: 'success' },
  'DID NOT EARN': { variant: 'danger' },
  'BELOW FLOOR': { variant: 'warning' },
  'NO VERDICT': { variant: 'neutral' },
  'NOT A MACHINE': { variant: 'neutral' },
}

/** `—` is a reading here, not a blank: it means the link is missing. */
function Num({ v, money = false }: { v: number | null; money?: boolean }) {
  if (v == null) return <span className="text-muted-foreground">—</span>
  if (money) return <span className={pnlColorClass(v)}>{fmtUsd(v)}</span>
  return <>{v}</>
}

/** The design's last column: what this row argues for, or why it argues for nothing. */
function ChainActionCell({ row }: { row: ChainRow }) {
  const a = chainAction(row)
  if (a.to == null) {
    // Not a link, because there is nowhere for it to go — and it says why on
    // hover rather than looking like a control that does nothing.
    return (
      <span className="text-dense-meta text-muted-foreground" title={a.why}>
        {a.label}
      </span>
    )
  }
  return (
    <Link to={a.to} className="text-dense-meta text-primary hover:underline" title={a.why}>
      {a.label}
    </Link>
  )
}

function ChainTable({ rows, scoped }: { rows: ChainRow[]; scoped: string }) {
  return (
    // Nine columns do not fit a narrow pane, and crushing them turns the
    // headers into `OBJECTIV` and clips a five-figure total mid-number. The
    // design's own answer: keep the shape and let the panel scroll sideways.
    <DenseDataTable wrapClassName="rounded-none border-0" tableClassName="min-w-[880px]">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Objective</DenseTableHead>
          <DenseTableHead className="text-right">Proposed</DenseTableHead>
          <DenseTableHead className="text-right">Accepted</DenseTableHead>
          <DenseTableHead className="text-right">Traded</DenseTableHead>
          <DenseTableHead className="text-right">Settled</DenseTableHead>
          <DenseTableHead className="text-right">Hit</DenseTableHead>
          <DenseTableHead className="text-right">Net</DenseTableHead>
          <DenseTableHead className="w-32 max-w-none">Verdict</DenseTableHead>
          <DenseTableHead className="w-36 max-w-none" />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((r) => (
          <DenseTableRow
            key={r.id}
            // The comparison is the point of the page, so a scope dims the
            // others rather than hiding them.
            className={cn(scoped !== ALL_OBJECTIVES && r.id !== scoped && r.id !== 'unattributed' && 'opacity-45')}
          >
            <DenseTableCell>
              {r.to ? (
                <Link to={r.to} className="font-medium hover:underline">
                  {r.title}
                </Link>
              ) : (
                <span className="font-medium">{r.title}</span>
              )}
              <DenseTag variant="neutral" size="cell" className="ml-2">
                {r.state}
              </DenseTag>
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.proposed} /></DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.accepted} /></DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.traded} /></DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.settled} /></DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {r.hit == null ? <span className="text-muted-foreground">—</span> : fmtPct0(r.hit)}
              {/* The design prints each objective's own hit floor here. This
                  side stores none, and the settled-count floor is a different
                  claim, so the cell says which rather than borrowing it. */}
              <span className="block text-dense-micro font-normal text-muted-foreground">
                {r.hitFloor == null ? 'no floor set' : `floor ${fmtPct0(r.hitFloor)}`}
              </span>
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.net} money /></DenseTableCell>
            <DenseTableCell className="max-w-none">
              <span title={r.why}>
                <DenseTag variant={VERDICT_TAG[r.verdict].variant} size="cell">
                  {r.verdict}
                </DenseTag>
              </span>
            </DenseTableCell>
            <DenseTableCell className="max-w-none whitespace-nowrap">
              <ChainActionCell row={r} />
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}

export default function ReviewObjectivesPage() {
  const { objective, select: setObjective } = useObjectiveScope()
  const objectivesQ = useActiveObjectives()
  const hypothesesQ = useHypothesisList({ limit: 200 })
  const candidatesQ = useQuery({
    queryKey: ['research', 'candidates', 'objectives', 'all'],
    queryFn: () => fetchCandidates({ status: 'all' }),
    staleTime: 60_000,
  })
  const review = useReviewTrades('all')

  const chain = useMemo(
    () =>
      objectiveChain({
        objectives: objectivesQ.data?.items ?? [],
        candidates: candidatesQ.data?.items ?? [],
        hypotheses: hypothesesQ.data?.rows ?? [],
        trades: review.trades,
      }),
    [objectivesQ.data, candidatesQ.data, hypothesesQ.data, review.trades],
  )

  const loading = objectivesQ.isLoading || candidatesQ.isLoading || review.loading
  const rows = [...chain.rows, chain.unattributed]
  const earning = chain.rows.filter((r) => r.verdict === 'EARNING').length

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[84ch] flex-[1_1_420px]">
          <PageHeader
            breadcrumb={<p className="text-xs font-medium text-primary/90">Review</p>}
            title="Objectives"
            titleSize="large"
            description={LEAD}
          />
        </div>
        <div className="ml-auto flex flex-none items-center gap-2 pt-1">
          {/* What the figures below are true of. Derived, not the design's
              `trailing 90d`: this side reads every canonical execution with no
              window, and a caption that lies about its own numbers is worse
              than a longer one. */}
          <span className="font-mono text-dense-meta text-muted-foreground">
            {chainWindow(review.trades)}
          </span>
          <Link
            to="/research/loop/harness"
            className="inline-flex h-[22px] items-center rounded-sm border border-border px-2 text-dense-meta hover:border-foreground/30 hover:text-foreground"
          >
            Autopilot Console →
          </Link>
        </div>
      </div>

      {/* The scope is the shell's, set in the Lens — this page reflects it and
          offers the way out, rather than growing a second control that can
          disagree with the first. */}
      {objective !== ALL_OBJECTIVES ? (
        <ObjectiveScopeBanner
          name={chain.rows.find((r) => r.id === objective)?.title ?? objective}
          onClear={() => setObjective(ALL_OBJECTIVES)}
        >
          its row is lit; the others are dimmed, because the comparison is the point of this page
        </ObjectiveScopeBanner>
      ) : null}

      {objectivesQ.isError ? <QueryErrorAlert error={objectivesQ.error} /> : null}
      {review.error ? <QueryErrorAlert error={review.error} /> : null}

      {/* The page's own headline while the chain is broken. It sits above the
          table rather than under it, because every number below inherits it. */}
      {!chain.wired ? (
        <section className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-dense-meta">
          <p className="font-medium text-foreground">
            The chain is broken at <span className="font-mono">traded</span>.
          </p>
          <p className="max-w-[92ch] text-muted-foreground">
            No hypothesis on this side carries an opportunity id —{' '}
            <span className="font-mono text-foreground/80">{BROKEN_LINK}</span> is empty on all{' '}
            {hypothesesQ.data?.rows.length ?? 0} of them. So none of the{' '}
            {chain.unattributed.settled ?? 0} closed trades can be reached from a belief, and no
            position can be traced back to the objective that proposed it: the four columns after{' '}
            <span className="font-mono">accepted</span> read <span className="font-mono">—</span>,
            not zero, and every settled trade sits in Unattributed. Proposed and accepted are real.
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
        {[
          {
            label: 'Machines earning',
            value: `${earning} of ${chain.rows.length}`,
            sub: 'by settled money',
            ink: earning > 0 ? 'text-[var(--color-profit)]' : '',
            tip: `An objective earns when it clears the floor it set itself AND is net positive on settled trades. Both, because either alone can lie. ${VERDICT_FLOOR} settled trades are needed before a hit rate is a claim at all.`,
          },
          {
            label: 'Net from objectives',
            value: chain.wired ? fmtUsd(0) : '—',
            sub: `0 of ${chain.unattributed.settled ?? 0} settled attributed`,
            ink: 'text-muted-foreground',
            tip: `Realised on settled positions whose lineage reaches a run. Nothing reaches one: ${BROKEN_LINK} is empty on every hypothesis, so this is unknown rather than zero.`,
          },
          {
            label: 'Unattributed',
            value: fmtUsd(chain.unattributed.net ?? 0),
            sub: `${chain.unattributed.settled ?? 0} settled`,
            ink: pnlColorClass(chain.unattributed.net ?? 0),
            tip: 'Real money with no machine behind it. Shown so the rates above stay honest — hiding it would make every one of them wrong.',
          },
          {
            label: 'Patches argued for',
            value: '0',
            sub: "by this quarter's record",
            ink: 'text-muted-foreground',
            tip: 'A patch drafted from settled evidence, waiting to be sent to the Decision Inbox. None can be drafted while no settled trade can be attributed to an objective.',
          },
        ].map((k) => (
          <div
            key={k.label}
            title={k.tip}
            className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2"
          >
            <span className={SECTION_CAP_CLASS}>{k.label}</span>
            <span className="flex items-baseline gap-1.5">
              <span className={cn('font-mono text-base font-semibold tabular-nums', k.ink)}>
                {k.value}
              </span>
              <span className="text-dense-caption text-muted-foreground">{k.sub}</span>
            </span>
          </div>
        ))}
      </div>

      <SectionPanel
        title="The chain, per objective"
        note="each column is the previous one after a gate — the shape of the fall is the finding"
      >
        {loading ? <Skeleton className="m-3 h-32 rounded-md" /> : <ChainTable rows={rows} scoped={objective} />}
        <p className="border-t border-border/60 px-3 py-1.5 text-dense-meta leading-snug text-muted-foreground">
          Net is realised on settled positions only, per objective, never summed across accounts —
          margin and buying power do not add. A position whose lineage broke is not silently
          attributed: it lands in the unattributed row, because{' '}
          <span className="text-foreground/80">
            a chain with a missing link is a fact about the record, not a rounding error
          </span>
          .
        </p>
      </SectionPanel>

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionPanel
          title="Where they die"
          note="the widest gate this side records, per objective"
        >
          {loading ? (
            <Skeleton className="m-3 h-20 rounded-md" />
          ) : (
            <div className="divide-y divide-border/60">
              {chain.rows.map((r) => {
                const g = widestGate(r)
                return (
                  <div key={r.id} className="flex flex-col gap-1 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-dense-label">{r.title}</span>
                      <span
                        className={cn(
                          'ml-auto font-mono text-dense-meta tabular-nums',
                          g.share == null
                            ? 'text-muted-foreground'
                            : g.share > 0.8
                              ? 'text-warning'
                              : g.share > 0.5
                                ? 'text-sky-300'
                                : 'text-muted-foreground',
                        )}
                      >
                        {g.label}
                        {g.share == null ? '' : ` · ${fmtPct0(g.share)}`}
                      </span>
                    </div>
                    {/* How wide the gate is, drawn. A share stated only in
                        words makes two objectives incomparable at a glance,
                        which is the whole job of this panel. */}
                    <span className="block h-1.5 overflow-hidden rounded-sm bg-muted">
                      {g.share != null ? (
                        <span
                          className={cn(
                            'block h-full rounded-sm',
                            g.share > 0.8
                              ? 'bg-warning'
                              : g.share > 0.5
                                ? 'bg-sky-300'
                                : 'bg-foreground/45',
                          )}
                          style={{ width: `${Math.max(2, g.share * 100)}%` }}
                        />
                      ) : null}
                    </span>
                    <p className="text-dense-meta leading-relaxed text-muted-foreground">{g.note}</p>
                  </div>
                )
              })}
            </div>
          )}
        </SectionPanel>

        <SectionPanel
          cap="↺ 5 → 1"
          title="The return edge"
          note="this is where a verdict becomes a change"
          className="border-[var(--color-entity-strategy)]/40"
        >
          <div className="space-y-2 px-3 py-2 text-dense-meta">
            <p className="max-w-[78ch] text-muted-foreground">
              Nothing argues for a change yet, and the reason is the one above: a patch has to carry
              the settled evidence that argued for it, and no settled trade can be attributed to an
              objective. With the link written, a verdict here drafts a patch — and that patch is a
              card in the{' '}
              <Link to="/research/loop/decisions" className="text-primary hover:underline">
                Decision Inbox
              </Link>{' '}
              carrying the diff and its evidence, read by the next run only after you approve.
            </p>
            <p className="max-w-[78ch] text-muted-foreground">
              Nothing on this page changes a policy, and nothing on it reaches Trade — the same gate
              a patch drafted anywhere else goes through.
            </p>
          </div>
        </SectionPanel>
      </div>

      <p className="max-w-[96ch] text-dense-micro leading-relaxed text-muted-foreground/70">
        A verdict needs enough settled outcomes to be one. Below the floor this page says so rather
        than showing a number that looks like an answer — an objective with three settled trades has
        a record of three settled trades, not a hit rate.
      </p>
    </PageShell>
  )
}
