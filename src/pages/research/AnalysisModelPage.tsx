import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { useResearchContext } from '@/hooks/useResearchContext'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  fetchAtmIv,
  fetchTerrain,
  fetchVolatilitySmile,
  type AtmIvRow,
  type TerrainData,
  type VolatilitySmileRow,
} from '@/api/researchEngine'
import { cn } from '@/lib/utils'

function regimeVariant(r: string): 'danger' | 'warning' | 'success' | 'neutral' {
  const lo = r.toLowerCase()
  if (lo.includes('high') || lo.includes('crisis') || lo.includes('crash')) return 'danger'
  if (lo.includes('low') || lo.includes('calm')) return 'success'
  if (lo.includes('transition') || lo.includes('squeeze')) return 'warning'
  return 'neutral'
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  const color =
    clamped >= 75
      ? 'bg-red-500'
      : clamped >= 50
        ? 'bg-amber-400'
        : clamped >= 25
          ? 'bg-emerald-400'
          : 'bg-sky-400'

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-dense-label text-muted-foreground">{label}</span>
        <span className="font-mono text-dense-label tabular-nums">{clamped.toFixed(0)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

function TerrainCard({ terrain }: { terrain: TerrainData }) {
  return (
    <Card variant="elevated">
      <CardContent className="space-y-3 px-4 py-3">
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Market Terrain
        </p>
        <ProgressBar label="PIN Score" value={terrain.pin_score} />
        <ProgressBar label="Trend Release" value={terrain.trend_release} />
        <ProgressBar label="Vol Squeeze" value={terrain.vol_squeeze} />
        <ProgressBar label="Tail Risk" value={terrain.tail_risk} />
        <div className="flex items-center justify-between pt-1">
          <span className="text-dense-meta text-muted-foreground">Regime</span>
          <DenseTag variant={regimeVariant(terrain.regime)}>{terrain.regime}</DenseTag>
        </div>
      </CardContent>
    </Card>
  )
}

function numFromInputs(inputs: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = inputs[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

function CloseExpectationCard({ terrain }: { terrain: TerrainData }) {
  const gammaWidth = terrain.gamma_zone_high - terrain.gamma_zone_low
  const halfWidth = Math.abs(gammaWidth) / 2
  const inputs = terrain.inputs_json ?? {}
  const maxVolStrike = numFromInputs(inputs, [
    'max_volume_strike',
    'max_vol_strike',
    'max_volume',
    'pin_strike',
  ])
  const sigmaFromInputs = numFromInputs(inputs, ['sigma', '1sigma', 'one_sigma', 'sigma_1'])
  const sigmaDerived = halfWidth > 0 ? halfWidth : null
  const sigma = sigmaFromInputs ?? sigmaDerived
  const sigmaDerivedFlag = sigmaFromInputs == null && sigmaDerived != null

  return (
    <Card variant="elevated">
      <CardContent className="space-y-3 px-4 py-3">
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Close Expectation
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Metric label="Expected Close" value={terrain.expected_close} />
          <Metric label="Spot" value={terrain.spot} />
          <Metric label="Gamma Low" value={terrain.gamma_zone_low} />
          <Metric label="Gamma High" value={terrain.gamma_zone_high} />
          <div>
            <p className="text-dense-meta text-muted-foreground">Max-volume strike</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              {maxVolStrike != null ? maxVolStrike.toFixed(2) : '—'}
            </p>
          </div>
          <div>
            <p className="text-dense-meta text-muted-foreground">1σ</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              {sigma != null ? sigma.toFixed(2) : '—'}
            </p>
            {sigmaDerivedFlag ? (
              <p className="text-dense-micro text-muted-foreground">derived · gamma zone half-width</p>
            ) : null}
          </div>
        </div>
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
          <GammaZoneBar
            spot={terrain.spot}
            low={terrain.gamma_zone_low}
            high={terrain.gamma_zone_high}
            expected={terrain.expected_close}
          />
          <p className="mt-1 text-center text-dense-micro text-muted-foreground">
            Gamma Zone Width: {gammaWidth.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-dense-meta text-muted-foreground">Mechanism</span>
          <DenseTag variant={regimeVariant(terrain.regime)}>{terrain.regime}</DenseTag>
        </div>
      </CardContent>
    </Card>
  )
}

function GammaZoneBar({
  spot,
  low,
  high,
  expected,
}: {
  spot: number
  low: number
  high: number
  expected: number
}) {
  const margin = (high - low) * 0.15
  const lo = low - margin
  const hi = high + margin
  const range = hi - lo || 1
  const pct = (v: number) => ((v - lo) / range) * 100

  return (
    <svg viewBox="0 0 200 24" className="w-full" style={{ height: 24 }} role="img" aria-label="Gamma zone bar">
      <rect x={pct(low)} y={4} width={pct(high) - pct(low)} height={16} rx={3} fill="var(--color-chart-4, #a78bfa)" opacity={0.2} />
      <line x1={pct(spot)} y1={2} x2={pct(spot)} y2={22} stroke="var(--foreground)" strokeWidth={2} />
      <circle cx={pct(expected)} cy={12} r={4} fill="var(--color-chart-2, #34d399)" />
      <text x={pct(spot)} y={24} textAnchor="middle" fill="var(--muted-foreground)" fontSize={5}>S</text>
      <text x={pct(expected)} y={24} textAnchor="middle" fill="var(--muted-foreground)" fontSize={5}>E</text>
    </svg>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-dense-meta text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold tabular-nums">{value.toFixed(2)}</p>
    </div>
  )
}

function fmtIv(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  // Rows may be decimal (0.18) or percent (18)
  const pct = v > 0 && v <= 2 ? v * 100 : v
  return `${pct.toFixed(1)}%`
}

function nearestAtmIv(rows: AtmIvRow[], spot: number): AtmIvRow | null {
  if (rows.length === 0) return null
  if (!Number.isFinite(spot) || spot <= 0) return rows[0]
  let best = rows[0]
  let bestDist = Math.abs((best.atm_strike ?? 0) - spot)
  for (const r of rows) {
    const d = Math.abs((r.atm_strike ?? 0) - spot)
    if (d < bestDist) {
      best = r
      bestDist = d
    }
  }
  return best
}

function IvSurfaceCard({
  terrain,
  smile,
  atm,
}: {
  terrain: TerrainData
  smile: VolatilitySmileRow | null
  atm: AtmIvRow | null
}) {
  const params = smile?.smile_params
  const paramEntries =
    params && typeof params === 'object' && !Array.isArray(params)
      ? Object.entries(params).filter(([, v]) => v != null && typeof v !== 'object')
      : []

  const skewVal = (() => {
    if (!params || typeof params !== 'object') return null
    const v = (params as Record<string, unknown>).skew ?? (params as Record<string, unknown>).skewness
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  })()
  const kurtVal = (() => {
    if (!params || typeof params !== 'object') return null
    const v = (params as Record<string, unknown>).kurtosis ?? (params as Record<string, unknown>).kurt
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  })()

  return (
    <Card variant="elevated">
      <CardContent className="space-y-3 px-4 py-3">
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          IV Surface
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-dense-meta text-muted-foreground">Skew</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              {skewVal != null ? skewVal.toFixed(4) : '—'}
            </p>
          </div>
          <div>
            <p className="text-dense-meta text-muted-foreground">Kurtosis</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              {kurtVal != null ? kurtVal.toFixed(4) : '—'}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-dense-meta text-muted-foreground">ATM IV</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {fmtIv(atm?.atm_iv)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dense-meta text-muted-foreground">Fit model</span>
            <span className="text-dense-label">{smile?.fit_model || '—'}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dense-meta text-muted-foreground">RMSE</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {smile?.rmse != null && Number.isFinite(smile.rmse) ? smile.rmse.toFixed(4) : '—'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dense-meta text-muted-foreground">n_points</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {smile?.n_points != null ? String(smile.n_points) : '—'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dense-meta text-muted-foreground">Regime</span>
            <DenseTag variant={regimeVariant(terrain.regime)}>{terrain.regime}</DenseTag>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dense-meta text-muted-foreground">Spot</span>
            <span className="font-mono text-sm font-semibold tabular-nums">{terrain.spot.toFixed(2)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-dense-meta text-muted-foreground">Trade Date</span>
            <span className="text-dense-label">{smile?.trade_date || terrain.trade_date}</span>
          </div>
          {paramEntries.length > 0 ? (
            <div className="border-t border-border pt-2 space-y-1">
              <p className="text-dense-micro text-muted-foreground">smile_params</p>
              {paramEntries.slice(0, 6).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-dense-meta text-muted-foreground">{k}</span>
                  <span className="font-mono text-dense-meta tabular-nums shrink-0">
                    {typeof v === 'number' ? v.toFixed(4) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dense-micro text-muted-foreground">
              Kurtosis / skew fields not present — showing real keys only.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalysisModelPage() {
  const { symbol } = useResearchContext()
  const sym = symbol.trim().toUpperCase() || 'SPX'

  const terrainQ = useQuery({
    queryKey: ['terrain', sym],
    queryFn: () => fetchTerrain(sym),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const smileQ = useQuery({
    queryKey: ['volatility-smile', sym],
    queryFn: () => fetchVolatilitySmile(sym),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const atmQ = useQuery({
    queryKey: ['atm-iv', sym],
    queryFn: () => fetchAtmIv(sym),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const terrain = terrainQ.data?.terrain ?? undefined
  const smileRows = smileQ.data?.rows ?? []
  const smile = smileRows[0] ?? null
  const atm = nearestAtmIv(atmQ.data?.rows ?? [], terrain?.spot ?? smile?.spot ?? 0)

  const isLoading = terrainQ.isLoading
  const isError = terrainQ.isError

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Analysis Model"
        actions={
          <AskCopilotButton
            originPage="analysis-model"
            originLabel="Analysis Model"
            symbol={sym}
            snapshot={compactSnapshot({
              regime: terrain?.regime,
              spot: terrain?.spot ?? smile?.spot,
              atm_iv: atm?.atm_iv,
            })}
            suggestedPrompt={`Walk through the ${sym} analysis-model terrain and smile — what regime is this?`}
          />
        }
      />

      <ResearchContextBar showDate={false} />

      {isError && <QueryErrorAlert error={terrainQ.error} onRetry={() => void terrainQ.refetch()} />}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : terrain ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <TerrainCard terrain={terrain} />
          <CloseExpectationCard terrain={terrain} />
          <IvSurfaceCard terrain={terrain} smile={smile} atm={atm} />
        </div>
      ) : (
        <Card variant="elevated">
          <CardContent className="py-8 text-center text-dense-label text-muted-foreground">
            No terrain data available for {sym}
          </CardContent>
        </Card>
      )}

      <p className="text-dense-caption text-muted-foreground">
        Terrain model output — observe only (D10). Not investment advice.
      </p>
    </PageShell>
  )
}
