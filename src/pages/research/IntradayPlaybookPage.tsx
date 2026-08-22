import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
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
} from '@/components/data-display'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { ProbabilityBar } from '@/components/charts/ProbabilityBar'
import { ScenarioFanChart } from '@/components/charts/ScenarioFanChart'
import {
  fetchTerrainIntraday,
  type TerrainIntraday,
} from '@/api/researchEngine'
import { cn } from '@/lib/utils'

type ScenarioKind = 'rangy' | 'bull' | 'bear' | 'squeeze'

interface ScenarioCardProps {
  kind: ScenarioKind
  probability: number
  latest: TerrainIntraday
  live?: boolean
}

const SCENARIO_META: Record<
  ScenarioKind,
  { label: string; color: string; tagVariant: 'neutral' | 'success' | 'danger' | 'warning'; hint: string }
> = {
  rangy: {
    label: 'Rangy',
    color: 'border-violet-500/40',
    tagVariant: 'neutral',
    hint: 'Mean-reversion inside gamma zone',
  },
  bull: {
    label: 'Bull',
    color: 'border-emerald-500/40',
    tagVariant: 'success',
    hint: 'Upside release toward call wall',
  },
  bear: {
    label: 'Bear',
    color: 'border-red-500/40',
    tagVariant: 'danger',
    hint: 'Downside release toward put wall',
  },
  squeeze: {
    label: 'Squeeze',
    color: 'border-amber-500/40',
    tagVariant: 'warning',
    hint: 'Vol compression / pin risk',
  },
}

/** Invalidate / Stop lines from levels only — no invented strategy copy. */
function invalidateLine(kind: ScenarioKind, latest: TerrainIntraday): string {
  const low = latest.gamma_zone_low
  const high = latest.gamma_zone_high
  const mid = (low + high) / 2
  const halfWidth = Math.abs(high - low) / 2
  const inputs = latest.inputs_json ?? {}
  const sigmaRaw =
    typeof inputs.sigma === 'number'
      ? inputs.sigma
      : typeof inputs['1sigma'] === 'number'
        ? (inputs['1sigma'] as number)
        : typeof inputs.one_sigma === 'number'
          ? (inputs.one_sigma as number)
          : null
  const sigma = sigmaRaw != null && Number.isFinite(sigmaRaw) ? sigmaRaw : halfWidth > 0 ? halfWidth : null

  switch (kind) {
    case 'rangy':
      return `Invalidate: break below ${low.toFixed(2)} or above ${high.toFixed(2)}`
    case 'bull':
      return `Invalidate: fall back through zone mid ${mid.toFixed(2)}`
    case 'bear':
      return `Invalidate: reclaim zone mid ${mid.toFixed(2)}`
    case 'squeeze':
      if (sigma == null) return 'Invalidate: leave pin ±1σ —'
      return `Invalidate: leave pin ${mid.toFixed(2)} ±1σ (${sigma.toFixed(2)})`
  }
}

function liveScenario(latest: TerrainIntraday): ScenarioKind {
  const scores: { kind: ScenarioKind; p: number }[] = [
    { kind: 'rangy', p: latest.prob_rangy },
    { kind: 'bull', p: latest.prob_bull },
    { kind: 'bear', p: latest.prob_bear },
    { kind: 'squeeze', p: latest.prob_squeeze },
  ]
  scores.sort((a, b) => b.p - a.p)
  return scores[0].kind
}

function scenarioLevels(kind: ScenarioKind, latest: TerrainIntraday): { a: string; aLabel: string; b: string; bLabel: string } {
  const spot = latest.spot
  const low = latest.gamma_zone_low
  const high = latest.gamma_zone_high
  const mid = (low + high) / 2
  switch (kind) {
    case 'rangy':
      return {
        aLabel: 'Zone Low',
        a: low.toFixed(2),
        bLabel: 'Zone High',
        b: high.toFixed(2),
      }
    case 'bull':
      return {
        aLabel: 'Target',
        a: high.toFixed(2),
        bLabel: 'Upside',
        b: `${(((high - spot) / Math.max(spot, 1)) * 100).toFixed(2)}%`,
      }
    case 'bear':
      return {
        aLabel: 'Target',
        a: low.toFixed(2),
        bLabel: 'Downside',
        b: `${(((low - spot) / Math.max(spot, 1)) * 100).toFixed(2)}%`,
      }
    case 'squeeze':
      return {
        aLabel: 'Pin / Pivot',
        a: mid.toFixed(2),
        bLabel: 'Vol Squeeze',
        b: latest.vol_squeeze.toFixed(0),
      }
  }
}

function ScenarioCard({ kind, probability, latest, live }: ScenarioCardProps) {
  const meta = SCENARIO_META[kind]
  const levels = scenarioLevels(kind, latest)
  return (
    <Card variant="elevated" className={cn('border', meta.color)}>
      <CardContent className="space-y-2 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <DenseTag variant={meta.tagVariant}>{meta.label}</DenseTag>
            {live ? <DenseTag variant="success">LIVE</DenseTag> : null}
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {(probability * 100).toFixed(0)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <SmallMetric label={levels.aLabel} value={levels.a} />
          <SmallMetric label={levels.bLabel} value={levels.b} />
        </div>
        <p className="text-dense-meta text-muted-foreground line-clamp-2">{meta.hint}</p>
        <p className="text-dense-caption text-muted-foreground leading-snug">
          {invalidateLine(kind, latest)}
        </p>
      </CardContent>
    </Card>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-dense-micro text-muted-foreground">{label}</p>
      <p className="font-mono text-dense-label tabular-nums">{value}</p>
    </div>
  )
}

function biasTagVariant(regime: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const lo = regime.toLowerCase()
  if (lo.includes('bull')) return 'success'
  if (lo.includes('bear')) return 'danger'
  if (lo.includes('squeeze') || lo.includes('transition')) return 'warning'
  return 'neutral'
}

function buildPathTransitions(rows: TerrainIntraday[]): { time: string; from: string; to: string; price: string }[] {
  const transitions: { time: string; from: string; to: string; price: string }[] = []
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]
    const cur = rows[i]
    if (prev.regime !== cur.regime) {
      transitions.push({
        time: cur.asof_ts,
        from: prev.regime,
        to: cur.regime,
        price: cur.spot.toFixed(2),
      })
    }
  }
  return transitions
}

export default function IntradayPlaybookPage() {
  const [symbol, setSymbol] = useState('SPX')
  const [date, setDate] = useState('')

  const intradayQ = useQuery({
    queryKey: ['terrain-intraday', symbol, date],
    queryFn: () => fetchTerrainIntraday(symbol, date || undefined),
    enabled: symbol.length > 0,
    refetchInterval: 60_000,
  })

  const rows = useMemo(() => intradayQ.data?.rows ?? [], [intradayQ.data])
  const latest = rows.length > 0 ? rows[rows.length - 1] : null
  const liveKind = latest ? liveScenario(latest) : null

  const transitions = useMemo(() => buildPathTransitions(rows), [rows])

  const fanPoints = useMemo(
    () =>
      rows.map((r) => ({
        time: r.asof_ts.slice(11, 16),
        low: r.gamma_zone_low,
        high: r.gamma_zone_high,
        target: r.expected_close,
      })),
    [rows],
  )

  const spotPoints = useMemo(
    () => rows.map((r) => ({ time: r.asof_ts.slice(11, 16), price: r.spot })),
    [rows],
  )

  const isLoading = intradayQ.isLoading
  const isError = intradayQ.isError

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader title="Intraday Playbook" />

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-3 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Symbol:</span>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="h-7 w-28 font-mono text-sm"
            placeholder="SPX"
          />
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Date:</span>
          <Input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-7 w-36 font-mono text-sm"
            placeholder="YYYY-MM-DD"
          />
        </CardContent>
      </Card>

      {isError && (
        <QueryErrorAlert
          error={intradayQ.error}
          onRetry={() => { void intradayQ.refetch() }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      ) : latest ? (
        <>
          {/* Info bar */}
          <Card variant="elevated">
            <CardContent className="flex flex-wrap items-center gap-4 px-4 py-3">
              <KeyValue label="Close" value={latest.expected_close.toFixed(2)} />
              <KeyValue label="PIN" value={latest.pin_score.toFixed(0)} />
              <KeyValue label="Pivot" value={((latest.gamma_zone_low + latest.gamma_zone_high) / 2).toFixed(2)} />
              <KeyValue label="Spot" value={latest.spot.toFixed(2)} />
              <div className="ml-auto">
                <p className="text-dense-micro text-muted-foreground">Mechanism</p>
                <DenseTag variant={biasTagVariant(latest.regime)}>{latest.regime}</DenseTag>
              </div>
            </CardContent>
          </Card>

          {/* Probability bar */}
          <Card variant="elevated">
            <CardContent className="px-4 py-3">
              <ProbabilityBar
                rangy={latest.prob_rangy}
                bull={latest.prob_bull}
                bear={latest.prob_bear}
                squeeze={latest.prob_squeeze}
                height={36}
              />
            </CardContent>
          </Card>

          {/* Scenario cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ScenarioCard kind="rangy" probability={latest.prob_rangy} latest={latest} live={liveKind === 'rangy'} />
            <ScenarioCard kind="bull" probability={latest.prob_bull} latest={latest} live={liveKind === 'bull'} />
            <ScenarioCard kind="bear" probability={latest.prob_bear} latest={latest} live={liveKind === 'bear'} />
            <ScenarioCard kind="squeeze" probability={latest.prob_squeeze} latest={latest} live={liveKind === 'squeeze'} />
          </div>

          {/* Fan chart */}
          {fanPoints.length > 0 && (
            <Card variant="elevated">
              <CardContent className="px-4 py-3">
                <p className="mb-2 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  Scenario Fan
                </p>
                <ScenarioFanChart
                  fanPoints={fanPoints}
                  spotPoints={spotPoints}
                  className="w-full max-w-none"
                />
              </CardContent>
            </Card>
          )}

          {/* Path transitions table */}
          <Card variant="elevated">
            <CardContent className="space-y-2 px-3 py-3">
              <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Path Transitions
              </p>
              {transitions.length === 0 ? (
                <p className="py-4 text-center text-dense-meta text-muted-foreground">
                  No regime transitions recorded today
                </p>
              ) : (
                <DenseDataTable tableClassName="min-w-[400px]">
                  <colgroup>
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '35%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <DenseTableHeader>
                    <DenseTableHeadRow>
                      <DenseTableHead>Time</DenseTableHead>
                      <DenseTableHead>Transition</DenseTableHead>
                      <DenseTableHead className="text-right">Price</DenseTableHead>
                    </DenseTableHeadRow>
                  </DenseTableHeader>
                  <DenseTableBody>
                    {transitions.map((t, i) => (
                      <DenseTableRow key={i}>
                        <DenseTableCell className="font-mono text-dense-meta">
                          {t.time}
                        </DenseTableCell>
                        <DenseTableCell className="text-dense-label">
                          {t.from} → {t.to}
                        </DenseTableCell>
                        <DenseTableCell className="text-right font-mono text-dense-label tabular-nums">
                          {t.price}
                        </DenseTableCell>
                      </DenseTableRow>
                    ))}
                  </DenseTableBody>
                </DenseDataTable>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={<BookOpen />}
          title="No intraday data"
          description={`No terrain intraday rows for ${symbol}. Check that the forecast engine has run for today.`}
        />
      )}

      <p className="text-dense-caption text-muted-foreground">
        Intraday playbook — observe only (D10). Not investment advice.
      </p>
    </PageShell>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-dense-micro text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}
