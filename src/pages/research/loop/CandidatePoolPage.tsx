/**
 * Candidate Pool — Research Loop v1.
 * `/research/loop/candidates`
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ListFilter, X } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import type { CandidateOutcomeRow } from '@/api/research/candidateOutcome'
import { CandidateOutcomeSummary } from '@/components/research/CandidateOutcomeSummary'
import { useCandidateOutcomeByCandidate } from '@/hooks/useCandidateOutcome'
import { cn } from '@/lib/utils'
import { OPERATOR_CHIP, sourceOperatorOf } from '@/lib/research/operatorOf'
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
  EmptyState,
  IconActionButton,
  SegmentControl,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCandidates,
  useDismissCandidate,
  usePromoteCandidate,
} from '@/hooks/useCandidates'
import type { CandidateStatus, ResearchCandidate } from '@/api/research/candidates'

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
    <span className={excess > 0 ? 'text-success' : 'text-danger'}>
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
  const [dismissTarget, setDismissTarget] = useState<ResearchCandidate | null>(null)

  const query = useCandidates({ status })
  const promote = usePromoteCandidate()
  const dismiss = useDismissCandidate()

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items])
  const busyId = promote.isPending
    ? promote.variables?.id
    : dismiss.isPending
      ? dismiss.variables
      : null

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

  async function confirmDismiss() {
    if (!dismissTarget) return
    try {
      await dismiss.mutateAsync(dismissTarget.id)
    } finally {
      setDismissTarget(null)
    }
  }

  const { data: outcomeByCandidate } = useCandidateOutcomeByCandidate(5)

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Candidate Pool"
        description="What the loop is considering — the Curator screens in, ttl expiry screens out, you promote (Add to Pool from Scan and the discovery pages). Observe-only (D10)."
        actions={
          <Link
            to="/research/loop/decisions"
            className="whitespace-nowrap text-dense-label text-primary hover:underline"
          >
            Decision Inbox →
          </Link>
        }
      />

      {/* The design's strip over the pool. `Above promote line` keeps its
          sentence and no number — no fit line exists to be above. */}
      <div className="flex flex-wrap items-start gap-x-7 gap-y-2 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-dense-micro font-semibold uppercase tracking-wider text-muted-foreground">
            In pool
          </span>
          <span className="font-mono text-base font-bold">{openCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-dense-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Latest batch
          </span>
          <span className="font-mono text-dense-label font-semibold text-secondary-foreground">
            {latestBatch ? latestBatch.date : '—'}
          </span>
          <span className="text-dense-caption text-muted-foreground">
            {latestBatch ? `+${latestBatch.n} in` : 'nothing dated'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-dense-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Above promote line
          </span>
          <span className="font-mono text-base font-bold text-muted-foreground">—</span>
          <span className="text-dense-caption text-muted-foreground">
            no promote line exists — promotion is always yours; the loop only proposes
          </span>
        </div>
        <div className="ml-auto flex max-w-[22rem] flex-col gap-0.5">
          <span className="text-dense-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Pool policy
          </span>
          <span className="text-dense-caption leading-normal text-muted-foreground">
            a candidate carries a ttl_at and expiry screens it out as expired; Promote writes a
            Hypothesis and the row keeps the link
          </span>
        </div>
      </div>

      <CandidateOutcomeSummary />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dense-meta font-medium text-muted-foreground shrink-0">Status:</span>
        <SegmentControl
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={STATUS_OPTIONS}
        />
        <span className="text-dense-meta text-muted-foreground ml-auto">
          {query.data?.count ?? 0} shown
          {status === 'open' || status === 'all' ? ` · ${openCount} open in view` : null}
        </span>
      </div>

      {query.isError ? (
        <QueryErrorAlert error={query.error} />
      ) : query.isLoading ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ListFilter />}
          title="No candidates"
          description="Add symbols from Scan (Add to Pool) or other discovery pages."
        />
      ) : (
        <DenseDataTable tableClassName="min-w-[900px]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Symbol</DenseTableHead>
              <DenseTableHead>Source</DenseTableHead>
              <DenseTableHead className="text-right">Score</DenseTableHead>
              <DenseTableHead>Trade date</DenseTableHead>
              <DenseTableHead>Age</DenseTableHead>
              <DenseTableHead>Tags</DenseTableHead>
              <DenseTableHead>Book</DenseTableHead>
              <DenseTableHead>Status</DenseTableHead>
              <DenseTableHead className="text-right">T+5 vs SPY</DenseTableHead>
              <DenseTableHead className="w-24">Actions</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {items.map((row) => {
              const canAct = row.status === 'open'
              const rowBusy = busyId === row.id
              return (
                <DenseTableRow key={row.id}>
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
                  <DenseTableCell>
                    <span className="flex items-center gap-1.5">
                      <DenseTag variant="neutral">{row.source}</DenseTag>
                      <span
                        className={cn(
                          'rounded border px-1 font-mono text-dense-micro font-bold',
                          OPERATOR_CHIP[sourceOperatorOf(row.source)],
                        )}
                        title="The operator behind this nomination — the design's own rule: YOU → hand, CURATOR → loop, a screen → hand."
                      >
                        {sourceOperatorOf(row.source)}
                      </span>
                    </span>
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtScore(row.score)}</DenseTableCell>
                  <DenseTableCell className="font-mono tabular-nums text-dense-meta">
                    {row.trade_date || '—'}
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(
                      'font-mono text-dense-micro',
                      candidateAge(row, nowIso).tone === 'fresh'
                        ? 'text-success'
                        : candidateAge(row, nowIso).tone === 'expiring'
                          ? 'text-warning'
                          : 'text-muted-foreground',
                    )}
                    title={row.ttl_at ? `ttl ${row.ttl_at.slice(0, 10)}` : 'no ttl'}
                  >
                    {candidateAge(row, nowIso).label}
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="flex flex-wrap gap-1">
                      {(row.tags ?? []).slice(0, 4).map((t) => (
                        <DenseTag key={t} variant="neutral">
                          {t}
                        </DenseTag>
                      ))}
                      {(row.tags?.length ?? 0) > 4 ? (
                        <span className="text-dense-micro text-muted-foreground">
                          +{(row.tags?.length ?? 0) - 4}
                        </span>
                      ) : null}
                      {(row.tags?.length ?? 0) === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : null}
                    </div>
                  </DenseTableCell>
                  <DenseTableCell>
                    <PortfolioTag symbol={row.symbol} variant="inline" />
                  </DenseTableCell>
                  <DenseTableCell>
                    <DenseTag
                      variant={
                        row.status === 'open'
                          ? 'info'
                          : row.status === 'promoted'
                            ? 'success'
                            : row.status === 'dismissed'
                              ? 'danger'
                              : 'neutral'
                      }
                    >
                      {row.status}
                    </DenseTag>
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    <CandidateOutcomeCell outcome={outcomeByCandidate?.get(row.id)} />
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="flex items-center gap-0.5">
                      <IconActionButton
                        title="Promote to Hypothesis"
                        ariaLabel={`Promote ${row.symbol}`}
                        disabled={!canAct || rowBusy}
                        onClick={() => void handlePromote(row)}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </IconActionButton>
                      <IconActionButton
                        title="Dismiss"
                        ariaLabel={`Dismiss ${row.symbol}`}
                        tone="danger"
                        disabled={!canAct || rowBusy}
                        onClick={() => setDismissTarget(row)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </IconActionButton>
                    </div>
                  </DenseTableCell>
                </DenseTableRow>
              )
            })}
          </DenseTableBody>
        </DenseDataTable>
      )}

      <p className="text-dense-caption leading-normal text-muted-foreground">
        Score is the loop's composite at ingest — it ranks attention, it does not size or trade
        anything (D10). Promote writes a Hypothesis directly and the row keeps the link; Dismiss
        and ttl expiry keep history.
      </p>

      <ConfirmDialog
        open={dismissTarget != null}
        title="Dismiss candidate"
        message={
          dismissTarget
            ? `Remove ${dismissTarget.symbol} from the open pool? This does not delete history — status becomes dismissed.`
            : ''
        }
        confirmLabel="Dismiss"
        confirming={dismiss.isPending}
        onConfirm={() => void confirmDismiss()}
        onCancel={() => setDismissTarget(null)}
      />
    </PageShell>
  )
}
