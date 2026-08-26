import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Compass, Target } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableBody,
  DenseTableRow,
  DenseTableCell,
  DenseTableHeader,
  DenseTag,
  SegmentControl,
  EmptyState,
  denseTableCellPadding,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import {
  fetchSepaCandidates,
  fetchSepaDaily,
  type SepaScoreRow,
} from '@/api/researchEngine'

type StageFilter = 'all' | 'STAGE_1' | 'STAGE_2A' | 'STAGE_2B' | 'STAGE_2C' | 'STAGE_3' | 'STAGE_4'
type PathFilter = 'all' | 'SETUP' | 'PIVOT' | 'EXTENDED' | 'WATCH' | 'AVOID'
type GradeFilter = 'all' | 'A+' | 'A' | 'B' | 'C' | 'D'

const STAGE_OPTIONS: { value: StageFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'STAGE_2A', label: '2A Base' },
  { value: 'STAGE_2B', label: '2B Advance' },
  { value: 'STAGE_2C', label: '2C Climax' },
  { value: 'STAGE_3', label: '3 Top' },
  { value: 'STAGE_4', label: '4 Decline' },
  { value: 'STAGE_1', label: '1 Base' },
]

const PATH_OPTIONS: { value: PathFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'SETUP', label: 'Setup' },
  { value: 'PIVOT', label: 'Pivot' },
  { value: 'EXTENDED', label: 'Ext' },
  { value: 'WATCH', label: 'Watch' },
  { value: 'AVOID', label: 'Avoid' },
]

const GRADE_OPTIONS: { value: GradeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
]

function gradeTagVariant(grade: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (grade === 'A+' || grade === 'A' || grade === 'B') return 'success'
  if (grade === 'C') return 'warning'
  if (grade === 'D') return 'danger'
  return 'neutral'
}

function stageTagVariant(stage: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (stage === 'STAGE_2A' || stage === 'STAGE_2B') return 'success'
  if (stage === 'STAGE_2C') return 'warning'
  if (stage === 'STAGE_3') return 'warning'
  if (stage === 'STAGE_4') return 'danger'
  return 'neutral'
}

function pathTagVariant(path: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (path === 'PIVOT' || path === 'SETUP') return 'success'
  if (path === 'EXTENDED') return 'warning'
  if (path === 'WATCH') return 'neutral'
  if (path === 'AVOID') return 'danger'
  return 'neutral'
}

function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}

function CandidateCard({ item }: { item: SepaScoreRow }) {
  const stageLabel = (item.stage ?? '').replace('STAGE_', 'S') || '—'
  return (
    <Card variant="elevated" className="border border-emerald-500/40">
      <CardContent className="flex flex-col items-center gap-1 px-3 py-3">
        <p className="text-dense-body font-semibold text-entity-symbol">{item.symbol}</p>
        <p className="font-mono text-2xl font-bold tabular-nums">{fmt(item.sepa_score, 0)}</p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <DenseTag variant={gradeTagVariant(item.grade ?? '')}>{item.grade || '—'}</DenseTag>
          <DenseTag variant={pathTagVariant(item.path ?? '')}>{item.path || '—'}</DenseTag>
          <DenseTag variant={stageTagVariant(item.stage ?? '')}>{stageLabel}</DenseTag>
        </div>
        <p className="text-dense-caption tabular-nums text-muted-foreground">
          F {fmt(item.fundamental_score, 0)} · T {fmt(item.trend_template_score, 0)} · M{' '}
          {fmt(item.momentum_score, 0)} · O {fmt(item.structure_score, 0)}
        </p>
      </CardContent>
    </Card>
  )
}

export default function SepaDailyCorePage() {
  const [stage, setStage] = useState<StageFilter>('all')
  const [path, setPath] = useState<PathFilter>('all')
  const [grade, setGrade] = useState<GradeFilter>('all')

  const daily = useQuery({
    queryKey: ['sepa-daily', stage, path, grade],
    queryFn: () =>
      fetchSepaDaily({
        stage: stage === 'all' ? undefined : stage,
        path: path === 'all' ? undefined : path,
        grade: grade === 'all' ? undefined : grade,
        limit: 200,
      }),
    refetchInterval: 300_000,
  })

  const candidates = useQuery({
    queryKey: ['sepa-candidates'],
    queryFn: () => fetchSepaCandidates({ top: 10 }),
    refetchInterval: 300_000,
  })

  const rows = useMemo(() => daily.data?.rows ?? [], [daily.data?.rows])
  const candidateRows = useMemo(
    () => candidates.data?.candidates ?? [],
    [candidates.data?.candidates],
  )

  const stats = useMemo(() => {
    if (rows.length === 0) return null
    const setupOrPivot = rows.filter((r) => r.path === 'SETUP' || r.path === 'PIVOT').length
    const avoid = rows.filter((r) => r.path === 'AVOID').length
    const avgScore = rows.reduce((s, r) => s + r.sepa_score, 0) / rows.length
    return { setupOrPivot, avoid, avgScore, total: rows.length }
  }, [rows])

  const topSepaSymbols = useMemo(
    () => candidateRows.slice(0, 5).map((r) => r.symbol),
    [candidateRows],
  )

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="SEPA Daily Core"
        description={
          daily.data?.trade_date
            ? `Fusion score for ${daily.data.trade_date}: Fundamental · Trend Template · Momentum · Options Structure`
            : 'SEPA fusion (Fundamental · Trend Template · Momentum · Options Structure) — advisory only (D10)'
        }
        actions={
          <SaveAsHypothesisButton
            originPage="sepa-daily-core"
            defaultTitle={
              candidateRows.length > 0
                ? `SEPA setups ${daily.data?.trade_date ?? ''}`.trim()
                : 'SEPA Daily Core hypothesis'
            }
            defaultSymbols={topSepaSymbols}
            defaultTags={['sepa']}
            originRef={{
              trade_date: daily.data?.trade_date ?? null,
              stage,
              path,
              grade,
              candidate_count: candidateRows.length,
            }}
          />
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card variant="elevated">
          <CardContent className="flex flex-col gap-0.5 px-3 py-2">
            <span className="text-dense-caption text-muted-foreground">Universe</span>
            <span className="font-mono text-xl font-semibold tabular-nums">
              {stats?.total ?? '—'}
            </span>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="flex flex-col gap-0.5 px-3 py-2">
            <span className="text-dense-caption text-muted-foreground">Setup / Pivot</span>
            <span className="font-mono text-xl font-semibold tabular-nums text-success">
              {stats?.setupOrPivot ?? '—'}
            </span>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="flex flex-col gap-0.5 px-3 py-2">
            <span className="text-dense-caption text-muted-foreground">Avoid (Stage 4)</span>
            <span className="font-mono text-xl font-semibold tabular-nums text-destructive">
              {stats?.avoid ?? '—'}
            </span>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="flex flex-col gap-0.5 px-3 py-2">
            <span className="text-dense-caption text-muted-foreground">Avg composite</span>
            <span className="font-mono text-xl font-semibold tabular-nums">
              {stats?.avgScore ? stats.avgScore.toFixed(1) : '—'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Candidates strip */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-500" />
          <h2 className="text-dense-body font-semibold">Top candidates (SETUP / PIVOT)</h2>
        </div>
        {candidates.isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : candidateRows.length === 0 ? (
          <EmptyState
            icon={<Target />}
            title="No candidates today"
            description="No symbols in SETUP or PIVOT paths for the latest trading day."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {candidateRows.slice(0, 10).map((item) => (
              <CandidateCard key={item.symbol} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-3 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Stage:</span>
            <SegmentControl
              ariaLabel="Filter by stage"
              size="sm"
              value={stage}
              onChange={(v) => setStage(v as StageFilter)}
              options={STAGE_OPTIONS}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Path:</span>
            <SegmentControl
              ariaLabel="Filter by path"
              size="sm"
              value={path}
              onChange={(v) => setPath(v as PathFilter)}
              options={PATH_OPTIONS}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Grade:</span>
            <SegmentControl
              ariaLabel="Filter by grade"
              size="sm"
              value={grade}
              onChange={(v) => setGrade(v as GradeFilter)}
              options={GRADE_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {daily.isError && <QueryErrorAlert error={daily.error} onRetry={() => void daily.refetch()} />}

      {daily.isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Compass />}
          title="No SEPA scores"
          description="Adjust filters or wait for the SEPA fusion CronJob to run (schedule 00:05 UTC Tue–Sat)."
        />
      ) : (
        <DenseDataTable scrollX>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead className={denseTableCellPadding}>Symbol</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>
                Score
              </DenseTableHead>
              <DenseTableHead className={denseTableCellPadding}>Grade</DenseTableHead>
              <DenseTableHead className={denseTableCellPadding}>Stage</DenseTableHead>
              <DenseTableHead className={denseTableCellPadding}>Path</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>F</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>T</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>M</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>O</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>Close</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>SMA200</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>IV %ile</DenseTableHead>
              <DenseTableHead className={`${denseTableCellPadding} text-right`}>PCR OI</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {rows.map((r) => (
              <DenseTableRow key={r.symbol}>
                <DenseTableCell className={denseTableEntityCell}>
                  <strong className="text-entity-symbol">{r.symbol}</strong>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  <span className="font-semibold">{fmt(r.sepa_score, 1)}</span>
                </DenseTableCell>
                <DenseTableCell className={denseTableCellPadding}>
                  <DenseTag variant={gradeTagVariant(r.grade ?? '')}>{r.grade || '—'}</DenseTag>
                </DenseTableCell>
                <DenseTableCell className={denseTableCellPadding}>
                  <DenseTag variant={stageTagVariant(r.stage ?? '')}>
                    {(r.stage ?? '').replace('STAGE_', 'S') || '—'}
                  </DenseTag>
                </DenseTableCell>
                <DenseTableCell className={denseTableCellPadding}>
                  <DenseTag variant={pathTagVariant(r.path ?? '')}>{r.path || '—'}</DenseTag>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmt(r.fundamental_score, 0)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmt(r.trend_template_score, 0)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmt(r.momentum_score, 0)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmt(r.structure_score, 0)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmt(r.latest_close, 2)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmt(r.sma_200, 2)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmt(r.iv_percentile, 0)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmt(r.pcr_oi, 2)}</DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>
      )}

      <p className="text-dense-caption text-muted-foreground">
        SEPA fusion = 0.30 · Fund + 0.35 · Trend Template + 0.20 · Momentum + 0.15 · Options
        Structure. Advisory only (D10) — not investment advice.
      </p>
    </PageShell>
  )
}
