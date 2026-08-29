/**
 * Candidate Pool — Research Loop v1.
 * `/research/loop/candidates`
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ListFilter, X } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
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

export default function CandidatePoolPage() {
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

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Candidate Pool"
        description="Staging queue for symbols before promotion to a Hypothesis. Observe-only (D10)."
      />

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
              <DenseTableHead>Tags</DenseTableHead>
              <DenseTableHead>Book</DenseTableHead>
              <DenseTableHead>Status</DenseTableHead>
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
                        to={`/research/iv-radar?symbol=${encodeURIComponent(row.symbol)}`}
                        className="text-entity-symbol font-semibold hover:underline"
                      >
                        {row.symbol}
                      </Link>
                    </div>
                  </DenseTableCell>
                  <DenseTableCell>
                    <DenseTag variant="neutral">{row.source}</DenseTag>
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtScore(row.score)}</DenseTableCell>
                  <DenseTableCell className="font-mono tabular-nums text-dense-meta">
                    {row.trade_date || '—'}
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
