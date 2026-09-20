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
import { PageHeader, PageShell, SectionPanel } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
  SegmentControl,
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
  objectiveChain,
  widestGate,
  type ChainRow,
  type Verdict,
} from '@/pages/review/objectives/objectiveChainModel'

const LEAD =
  'Research builds machines. Only settled money says whether one was worth running — so this page reads the whole chain for each of them, proposed through settled, and it is the one place the loop closes: a verdict here is what sends a patch back to the objective.'

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

function ChainTable({ rows, scoped }: { rows: ChainRow[]; scoped: string }) {
  return (
    <DenseDataTable wrapClassName="rounded-none border-0" scrollX={false}>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Objective</DenseTableHead>
          <DenseTableHead className="text-right">Proposed</DenseTableHead>
          <DenseTableHead className="text-right">Accepted</DenseTableHead>
          <DenseTableHead className="text-right">Traded</DenseTableHead>
          <DenseTableHead className="text-right">Settled</DenseTableHead>
          <DenseTableHead className="text-right">Hit</DenseTableHead>
          <DenseTableHead className="text-right">Net</DenseTableHead>
          <DenseTableHead>Verdict</DenseTableHead>
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
              <span className="ml-2 text-dense-micro text-muted-foreground">{r.state}</span>
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.proposed} /></DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.accepted} /></DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.traded} /></DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.settled} /></DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {r.hit == null ? <span className="text-muted-foreground">—</span> : fmtPct0(r.hit)}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}><Num v={r.net} money /></DenseTableCell>
            <DenseTableCell>
              <span title={r.why}>
                <DenseTag variant={VERDICT_TAG[r.verdict].variant} size="cell">
                  {r.verdict}
                </DenseTag>
              </span>
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
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">Review</p>}
        title="Objectives"
        titleSize="large"
        description={LEAD}
        actions={
          chain.rows.length > 1 ? (
            <SegmentControl
              size="xs"
              ariaLabel="Objective scope"
              value={objective}
              onChange={setObjective}
              options={[
                { value: ALL_OBJECTIVES, label: 'All' },
                ...chain.rows.map((r) => ({ value: r.id, label: r.title })),
              ]}
            />
          ) : undefined
        }
      />

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

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
        {[
          {
            label: 'Machines earning',
            value: `${earning} of ${chain.rows.length}`,
            sub: 'by settled money',
          },
          {
            label: 'Settled, attributed',
            value: chain.wired ? '—' : '0',
            sub: `of ${chain.unattributed.settled ?? 0} closed trades`,
          },
          {
            label: 'Verdict floor',
            value: `${VERDICT_FLOOR}`,
            sub: 'settled trades before a hit rate is a claim',
          },
          {
            label: 'Unattributed net',
            value: fmtUsd(chain.unattributed.net ?? 0),
            sub: 'real money, not evidence about any machine',
          },
        ].map((k) => (
          <div key={k.label} className="bg-card px-3 py-2">
            <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="font-mono text-dense-body font-semibold tabular-nums">{k.value}</div>
            <div className="text-dense-micro leading-snug text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      <SectionPanel
        cap="The chain, per objective"
        title="each column is the previous one after a gate"
        note="the shape of the fall is the finding"
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
        <SectionPanel cap="Where they die" title="the widest gate this side records">
          {loading ? (
            <Skeleton className="m-3 h-20 rounded-md" />
          ) : (
            <div className="divide-y divide-border/60">
              {chain.rows.map((r) => {
                const g = widestGate(r)
                return (
                  <div key={r.id} className="space-y-0.5 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-dense-label font-medium">{r.title}</span>
                      <DenseTag variant="neutral" size="cell">
                        {g.label}
                      </DenseTag>
                      {g.share != null ? (
                        <span className="ml-auto font-mono text-dense-label tabular-nums">
                          {fmtPct0(g.share)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-dense-meta leading-snug text-muted-foreground">{g.note}</p>
                  </div>
                )
              })}
            </div>
          )}
        </SectionPanel>

        <SectionPanel cap="↺ 5 → 1" title="the return edge" note="where a verdict becomes a change">
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
