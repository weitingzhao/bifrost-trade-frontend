import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { SimilarRegimeCard } from '@/components/research/SimilarRegimeCard'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { CompositeRegimeRibbon } from '@/components/research/CompositeRegimeRibbon'
import {
  AnalyzeVerdictStrip,
  type AnalyzeVerdictTone,
} from '@/components/research/AnalyzeVerdictStrip'
import { CopilotAutoInsightChip } from '@/components/research/CopilotAutoInsightChip'
import { withWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  usePortfolioSymbols,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { useResearchContext } from '@/hooks/useResearchContext'
import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { copilotViewStore } from '@/store/copilotViewStore'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  fetchAtmIv,
  fetchRecentTerrainRegimes,
  fetchTerrain,
  fetchTerrainHistory,
  fetchVolatilitySmile,
  type AtmIvRow,
  type TerrainData,
  type TerrainRegimePoint,
  type VolatilitySmileRow,
} from '@/api/researchEngine'
import { DenseSparkline } from '@/components/charts/DenseSparkline'
import { cn } from '@/lib/utils'

function regimeVariant(r: string): 'danger' | 'warning' | 'success' | 'neutral' {
  const lo = r.toLowerCase()
  if (lo.includes('high') || lo.includes('crisis') || lo.includes('crash')) return 'danger'
  if (lo.includes('low') || lo.includes('calm')) return 'success'
  if (lo.includes('transition') || lo.includes('squeeze')) return 'warning'
  return 'neutral'
}

function regimeVerdictTone(r: string | undefined): AnalyzeVerdictTone {
  if (!r) return 'neutral'
  return regimeVariant(r)
}

function terrainVerdictSummary(terrain: TerrainData | undefined, sym: string): string {
  if (!terrain) return `No terrain for ${sym} — wait for forecast terrain compute before sizing.`
  const lo = terrain.regime.toLowerCase()
  if (lo.includes('high') || lo.includes('crisis') || lo.includes('crash')) {
    return `Do not add risk in ${sym}: regime ${terrain.regime}, tail ${terrain.tail_risk.toFixed(0)}, pin ${terrain.pin_score.toFixed(0)}. Prefer hedges / wait for calm.`
  }
  if (lo.includes('low') || lo.includes('calm')) {
    return `${sym} calm regime — fade extremes; pin ${terrain.pin_score.toFixed(0)} / tail ${terrain.tail_risk.toFixed(0)}. Short premium only if VRP supports.`
  }
  if (lo.includes('transition') || lo.includes('squeeze')) {
    return `${sym} ${terrain.regime}: wait for confirmation; squeeze/transition risk elevated (tail ${terrain.tail_risk.toFixed(0)}).`
  }
  return `${sym} regime ${terrain.regime} · pin ${terrain.pin_score.toFixed(0)} · tail ${terrain.tail_risk.toFixed(0)}. Size only with GEX walls aligned.`
}

function ProgressBar({
  label,
  value,
  spark,
}: {
  label: string
  value: number
  spark?: number[]
}) {
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
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-dense-label text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {spark && spark.length >= 2 ? (
            <DenseSparkline values={spark} width={56} height={14} />
          ) : null}
          <span className="font-mono text-dense-label tabular-nums">{clamped.toFixed(0)}</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

function fmtChipDate(iso: string): string {
  const d = iso.slice(0, 10)
  // MM-DD for density; full date available via title
  return d.length >= 10 ? d.slice(5) : d
}

/** Compact ≤5-day regime chip strip — only real terrain rows, never invented. */
function RegimeChipStrip({ points }: { points: TerrainRegimePoint[] }) {
  if (points.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-dense-caption font-medium text-muted-foreground shrink-0">
        Regime · {points.length}d
      </span>
      {points.map((p, i) => {
        const isLatest = i === points.length - 1
        return (
          <span
            key={p.trade_date}
            className="inline-flex items-center gap-1"
            title={`${p.trade_date} · ${p.regime}`}
          >
            <span className="text-dense-micro tabular-nums text-muted-foreground">
              {fmtChipDate(p.trade_date)}
            </span>
            <DenseTag variant={regimeVariant(p.regime)} className={isLatest ? undefined : 'opacity-80'}>
              {p.regime}
            </DenseTag>
          </span>
        )
      })}
    </div>
  )
}

function TerrainCard({
  terrain,
  pinSpark,
  tailSpark,
  trendSpark,
  squeezeSpark,
}: {
  terrain: TerrainData
  pinSpark?: number[]
  tailSpark?: number[]
  trendSpark?: number[]
  squeezeSpark?: number[]
}) {
  return (
    <Card variant="elevated">
      <CardContent className="space-y-3 px-4 py-3">
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Market Terrain
        </p>
        <ProgressBar label="PIN Score" value={terrain.pin_score} spark={pinSpark} />
        <ProgressBar label="Trend Release" value={terrain.trend_release} spark={trendSpark} />
        <ProgressBar label="Vol Squeeze" value={terrain.vol_squeeze} spark={squeezeSpark} />
        <ProgressBar label="Tail Risk" value={terrain.tail_risk} spark={tailSpark} />
        <div className="flex items-center justify-between pt-1">
          <span className="text-dense-meta text-muted-foreground">Regime</span>
          <DenseTag variant={regimeVariant(terrain.regime)}>{terrain.regime}</DenseTag>
        </div>
      </CardContent>
    </Card>
  )
}

function RegimeForwardCard({ history }: { history: TerrainData[] }) {
  const stats = useMemo(() => {
    const asc = [...history].sort((a, b) =>
      String(a.trade_date).localeCompare(String(b.trade_date)),
    )
    const counts = new Map<string, number>()
    for (let i = 1; i < asc.length; i++) {
      const from = asc[i - 1].regime
      const to = asc[i].regime
      if (!from || !to || from === to) continue
      const key = `${from} → ${to}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([transition, n]) => ({ transition, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
  }, [history])

  if (stats.length === 0) {
    return (
      <Card variant="elevated">
        <CardContent className="px-4 py-3 text-dense-meta text-muted-foreground">
          Not enough terrain history for regime-transition stats yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardContent className="space-y-2 px-4 py-3">
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Regime transitions · last {history.length}d
        </p>
        <p className="text-dense-caption text-muted-foreground">
          After each shift, confirm with GEX / VRP before sizing. Counts only (no fabricated forwards).
        </p>
        <ul className="space-y-1">
          {stats.map((s) => (
            <li
              key={s.transition}
              className="flex items-center justify-between text-dense-label"
            >
              <span>{s.transition}</span>
              <span className="font-mono tabular-nums">{s.n}×</span>
            </li>
          ))}
        </ul>
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
  const [universe, setUniverse] = useState<PortfolioUniverse>('all')
  const { filterSymbols } = usePortfolioSymbols()
  const symbolOutOfUniverse =
    universe !== 'all' && filterSymbols(universe, [sym]).length === 0

  const terrainQ = useQuery({
    queryKey: ['terrain', sym],
    queryFn: () => fetchTerrain(sym),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const terrainHistoryQ = useQuery({
    queryKey: ['terrain-regime-history', sym],
    queryFn: () => fetchRecentTerrainRegimes(sym, { limit: 5 }),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const terrainScoreHistoryQ = useQuery({
    queryKey: ['terrain-score-history', sym],
    queryFn: async () => {
      const res = await fetchTerrainHistory(sym, 30)
      return res.rows ?? []
    },
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
  // Prefer probed history; fall back to the single current terrain point (no fake days).
  const regimePoints: TerrainRegimePoint[] =
    terrainHistoryQ.data && terrainHistoryQ.data.length > 0
      ? terrainHistoryQ.data
      : terrain
        ? [{ trade_date: String(terrain.trade_date).slice(0, 10), regime: terrain.regime }]
        : []
  const scoreHistory = useMemo(() => {
    const rows = terrainScoreHistoryQ.data ?? []
    return [...rows].sort((a, b) =>
      String(a.trade_date).localeCompare(String(b.trade_date)),
    )
  }, [terrainScoreHistoryQ.data])
  const pinSpark = useMemo(() => scoreHistory.map((r) => r.pin_score), [scoreHistory])
  const tailSpark = useMemo(() => scoreHistory.map((r) => r.tail_risk), [scoreHistory])
  const trendSpark = useMemo(() => scoreHistory.map((r) => r.trend_release), [scoreHistory])
  const squeezeSpark = useMemo(() => scoreHistory.map((r) => r.vol_squeeze), [scoreHistory])
  const smileRows = smileQ.data?.rows ?? []
  const smile = smileRows[0] ?? null
  const atm = nearestAtmIv(atmQ.data?.rows ?? [], terrain?.spot ?? smile?.spot ?? 0)

  const isLoading = terrainQ.isLoading
  const isError = terrainQ.isError

  const verdictTone = regimeVerdictTone(terrain?.regime)
  const verdictLabel = terrain?.regime ?? 'Observe'
  const verdictSummary = terrainVerdictSummary(terrain, sym)

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Analysis Model"
        actions={
          <div className="flex items-center gap-1.5">
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
            <SaveAsHypothesisButton
              originPage="analysis-model"
              defaultTitle={`${sym} terrain ${terrain?.regime ?? 'regime'} hypothesis`}
              defaultThesis={verdictSummary}
              defaultSymbols={[sym]}
              defaultTags={['terrain', 'regime', 'analysis-model']}
              originRef={withWatchlistContractKey(
                {
                  symbol: sym,
                  regime: terrain?.regime ?? null,
                  spot: terrain?.spot ?? null,
                  pin_score: terrain?.pin_score ?? null,
                  tail_risk: terrain?.tail_risk ?? null,
                  atm_iv: atm?.atm_iv ?? null,
                },
                sym,
              )}
            />
          </div>
        }
      />

      <ResearchContextBar showDate={false} />

      <SymbolContextGuard symbol={symbol}>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dense-label font-semibold text-entity-symbol">{sym}</span>
        <PortfolioTag symbol={sym} variant="inline" />
        {symbolOutOfUniverse ? (
          <span className="text-dense-meta text-muted-foreground">Not in holdings/watchlist</span>
        ) : null}
      </div>

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-dense-meta font-medium text-muted-foreground shrink-0">Universe:</span>
          <SegmentControl
            ariaLabel="Portfolio universe filter"
            size="sm"
            value={universe}
            onChange={(v) => setUniverse(v as PortfolioUniverse)}
            options={[...PORTFOLIO_UNIVERSE_OPTIONS]}
          />
        </CardContent>
      </Card>

      <CompositeRegimeRibbon symbol={sym} />

      {(verdictTone === 'success' || verdictTone === 'danger') && terrain ? (
        <CopilotAutoInsightChip
          message={`${sym} terrain reads ${terrain.regime.toLowerCase()} — tail risk ${terrain.tail_risk.toFixed(0)}.`}
          tone={verdictTone}
          onAsk={() => {
            copilotViewStore.unsuppress()
            askCopilotIntentStore.open({
              originPage: 'analysis-model',
              originLabel: 'Analysis Model',
              symbol: sym,
              suggestedPrompt: `Walk through the ${sym} analysis-model terrain — what regime is this and what would invalidate it?`,
              snapshot: compactSnapshot({
                regime: terrain.regime,
                spot: terrain.spot,
                tail_risk: terrain.tail_risk,
              }),
            })
          }}
        />
      ) : null}

      <AnalyzeVerdictStrip
        tone={verdictTone}
        verdictLabel={verdictLabel}
        narrative={verdictSummary}
        signals={
          terrain
            ? [
                { label: 'PIN', value: terrain.pin_score.toFixed(0) },
                { label: 'Tail', value: terrain.tail_risk.toFixed(0) },
                { label: 'Spot', value: terrain.spot.toFixed(2) },
              ]
            : []
        }
        nextMoves={[
          {
            label: 'Intraday Playbook',
            href: `/research/intraday-playbook?symbol=${encodeURIComponent(sym)}`,
          },
          { label: 'GEX Intraday', href: `/research/gex-intraday?symbol=${encodeURIComponent(sym)}` },
        ]}
      />

      <SimilarRegimeCard
        lens="regime"
        symbol={sym}
        value={terrain?.regime ?? null}
      />

      {isError && <QueryErrorAlert error={terrainQ.error} onRetry={() => void terrainQ.refetch()} />}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : terrain ? (
        <div className="space-y-2">
          <RegimeChipStrip points={regimePoints} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TerrainCard
              terrain={terrain}
              pinSpark={pinSpark}
              tailSpark={tailSpark}
              trendSpark={trendSpark}
              squeezeSpark={squeezeSpark}
            />
            <CloseExpectationCard terrain={terrain} />
            <IvSurfaceCard terrain={terrain} smile={smile} atm={atm} />
          </div>
          <RegimeForwardCard history={scoreHistory} />
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
      </SymbolContextGuard>
    </PageShell>
  )
}
