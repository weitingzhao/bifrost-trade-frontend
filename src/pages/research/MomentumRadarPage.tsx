import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Radar } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  DenseTag,
  EmptyState,
  SegmentControl,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { fetchMomentumRadar, type MomentumScore } from '@/api/researchEngine'

type GradeFilter = 'all' | 'A+' | 'A' | 'B' | 'C' | 'D'

const GRADE_OPTIONS: { value: GradeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
]

function gradeTagVariant(grade: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (grade === 'A+') return 'success'
  if (grade === 'A') return 'success'
  if (grade === 'B') return 'success'
  if (grade === 'C') return 'warning'
  if (grade === 'D') return 'danger'
  return 'neutral'
}

function gradeAccentColor(grade: string): string {
  if (grade === 'A+') return 'border-cyan-500/40'
  if (grade === 'A') return 'border-emerald-500/40'
  if (grade === 'B') return 'border-emerald-400/30'
  if (grade === 'C') return 'border-amber-500/40'
  if (grade === 'D') return 'border-red-500/40'
  return 'border-border'
}

function MomentumCard({ item }: { item: MomentumScore }) {
  const spot =
    typeof item.factors_json?.latest_close === 'number'
      ? item.factors_json.latest_close
      : null
  return (
    <Card variant="elevated" className={`border ${gradeAccentColor(item.grade)}`}>
      <CardContent className="flex flex-col items-center gap-1 px-3 py-3">
        <p className="text-dense-body font-semibold text-entity-symbol">{item.symbol}</p>
        {spot != null ? (
          <p className="font-mono text-dense-meta tabular-nums text-muted-foreground">
            ${spot.toFixed(2)}
          </p>
        ) : null}
        <p className="font-mono text-2xl font-bold tabular-nums">{item.score.toFixed(0)}</p>
        <div className="flex items-center gap-1.5">
          <DenseTag variant={gradeTagVariant(item.grade)}>{item.grade}</DenseTag>
          {item.path ? (
            <DenseTag variant="neutral">{item.path}</DenseTag>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MomentumRadarPage() {
  const [grade, setGrade] = useState<GradeFilter>('all')
  const [legendOpen, setLegendOpen] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['momentum-radar', grade],
    queryFn: () => fetchMomentumRadar({ grade: grade === 'all' ? undefined : grade }),
    refetchInterval: 60_000,
  })

  const items = data?.rows ?? []

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader title="Momentum Radar" />

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Grade:</span>
          <SegmentControl
            ariaLabel="Filter by momentum grade"
            size="sm"
            value={grade}
            onChange={(v) => setGrade(v as GradeFilter)}
            options={GRADE_OPTIONS}
          />
        </CardContent>
      </Card>

      {isError && <QueryErrorAlert error={error} onRetry={() => void refetch()} />}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Radar />}
          title="No momentum scores"
          description={grade === 'all' ? 'Momentum radar has no data. Wait for the engine to run.' : `No stocks with grade ${grade} found.`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <MomentumCard key={item.symbol} item={item} />
          ))}
        </div>
      )}

      <CollapsibleGroup variant="card">
        <CollapsibleGroupHeader expanded={legendOpen} onToggle={() => setLegendOpen((o) => !o)}>
          <CollapsibleGroupTitle>How to read momentum factors</CollapsibleGroupTitle>
        </CollapsibleGroupHeader>
        {legendOpen ? (
          <CollapsibleGroupBody>
            <div className="grid gap-2 md:grid-cols-2 text-dense-meta text-muted-foreground">
              <p><strong>z_sdt</strong> — Short-term trend deviation; high = extended up.</p>
              <p><strong>z_v</strong> — Volume z-score; spikes flag participation.</p>
              <p><strong>accept_vwap</strong> — Price vs session VWAP acceptance.</p>
              <p><strong>z_ofi</strong> — Order flow imbalance proxy.</p>
              <p><strong>h_52w</strong> — Distance from 52-week high.</p>
              <p><strong>o_plus</strong> — Opening range extension factor.</p>
              <p><strong>a_factor</strong> — Acceleration / momentum persistence.</p>
              <p><strong>r_sec</strong> — Sector relative strength.</p>
              <p><strong>crash</strong> — Tail-risk / crash sensitivity.</p>
              <p>Grade A+/A/B = constructive; C/D = caution. Path EXT/PB = expansion vs pullback.</p>
            </div>
          </CollapsibleGroupBody>
        ) : null}
      </CollapsibleGroup>

      <p className="text-dense-caption text-muted-foreground">
        Momentum radar — observe only (D10). Not investment advice.
      </p>
    </PageShell>
  )
}
