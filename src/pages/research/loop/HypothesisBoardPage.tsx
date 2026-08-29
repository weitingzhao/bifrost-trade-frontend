/**
 * Hypothesis Board — Research Loop v1.
 * `/research/loop/hypotheses`
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { EmptyState, SegmentControl } from '@/components/data-display'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { HypothesisCard } from '@/components/research/HypothesisCard'
import { useHypothesisList } from '@/hooks/useHypotheses'
import type { HypothesisStatus } from '@/api/researchHypothesis'

type StatusFilter = HypothesisStatus | 'all'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'validated', label: 'Validated' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

function analyzeHref(symbols: string[]): string | undefined {
  const sym = symbols[0]?.trim().toUpperCase()
  if (!sym) return undefined
  return `/research/iv-radar?symbol=${encodeURIComponent(sym)}`
}

export default function HypothesisBoardPage() {
  const [status, setStatus] = useState<StatusFilter>('active')

  const query = useHypothesisList(
    status === 'all'
      ? { include_retired: true, limit: 100 }
      : { status, limit: 100 },
  )

  const rows = query.data?.rows ?? []

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Hypothesis Board"
        description="Active theses and outcomes. Open Analyze with the first symbol on each card."
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dense-meta font-medium text-muted-foreground shrink-0">Status:</span>
        <SegmentControl
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={STATUS_OPTIONS}
        />
        <span className="text-dense-meta text-muted-foreground ml-auto">
          {query.data?.count ?? rows.length} hypotheses
        </span>
      </div>

      {query.isError ? (
        <QueryErrorAlert error={query.error} />
      ) : query.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No hypotheses"
          description="Promote a candidate from the Pool, or Save as Hypothesis from Scan / discovery pages."
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((h) => {
            const to = analyzeHref(h.symbols)
            return (
              <div key={h.id} className="space-y-1">
                <HypothesisCard hypothesis={h} to={to} />
                {to ? (
                  <Link
                    to={to}
                    className="inline-block px-1 text-dense-caption text-primary underline-offset-2 hover:underline"
                  >
                    Analyze {h.symbols[0]?.toUpperCase()}
                  </Link>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
