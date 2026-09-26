/**
 * The Scenario face — one name only (design `Research Symbol.dc.html`,
 * §isScenario). The analysis model's own verdict with the close expectation
 * on a ruler and the gamma zone behind it, then the design's own two panels:
 * Forecast sessions (how the paths settled) and the Intraday playbook
 * (scenario fan · LIVE bias). The retired SessionsSection's per-session
 * drilldown opens from the Forecast sessions table (Owner 2026-09-26: what
 * the stores answer goes on the page, DESIGN_CONTRACTS §15.6).
 *
 * The terrain's own history (`/research/forecast/terrain/history`, 30
 * sessions on DEV) feeds the recent-regimes strip, each score's path and the
 * regime changes; its newest row carries the terrain's own gamma zone, which
 * the ruler draws — the store widens the dealer walls into it, so it keeps a
 * width when both walls sit on one strike (PLTR 09-25: walls 190/190, zone
 * 189.05–190.95).
 */
import { useQuery } from '@tanstack/react-query'
import { fetchTerrainHistory, type TerrainData } from '@/api/researchEngine'
import { DenseSparkline } from '@/components/charts/DenseSparkline'
import { LensVerdictBlock } from '@/components/research/LensVerdictBlock'
import { SymbolForecastSessions } from '@/pages/research/analyze/symbol/SymbolForecastSessions'
import { SymbolPlaybookPanel } from '@/pages/research/analyze/symbol/SymbolPlaybookPanel'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { cn } from '@/lib/utils'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 border mat-card'
const panelHead =
  'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal'

function BarKv({
  label,
  value,
  barCls,
  pct,
  path,
}: {
  label: string
  value: string
  barCls: string
  pct: number | null
  path?: number[]
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={cap}>{label}</span>
      <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
        {pct != null ? (
          <span className={cn('absolute inset-y-0 left-0', barCls)} style={{ width: `${Math.min(100, pct)}%` }} />
        ) : null}
      </span>
      <span className="flex items-center gap-2">
        <b className={cn(mono, 'text-dense-meta font-semibold')}>{value}</b>
        {path && path.length >= 2 ? (
          <DenseSparkline values={path} width={64} height={14} strokeClassName="stroke-muted-foreground" />
        ) : null}
      </span>
    </div>
  )
}

/** The design's regime inks: range green, trending amber, crash-risk red. */
function terrainRegimeBg(regime: string): string {
  if (regime === 'crash-risk') return 'bg-destructive'
  if (regime === 'trending') return 'bg-warning'
  return 'bg-success'
}

/** One reading per trade date, oldest first — the route can hold more than one a day. */
function terrainDays(rows: readonly TerrainData[]): TerrainData[] {
  const byDate = new Map<string, TerrainData>()
  for (const r of rows) {
    const d = String(r.trade_date).slice(0, 10)
    const cur = byDate.get(d)
    if (!cur || String(r.computed_at) > String(cur.computed_at)) byDate.set(d, r)
  }
  return [...byDate.values()].sort((a, b) => String(a.trade_date).localeCompare(String(b.trade_date)))
}

/** Regime changes across the window, most frequent first: `range → trending 3×`. */
function terrainTransitions(days: readonly TerrainData[]): { label: string; n: number }[] {
  const counts = new Map<string, number>()
  for (let i = 1; i < days.length; i++) {
    const from = days[i - 1].regime
    const to = days[i].regime
    if (!from || !to || from === to) continue
    const k = `${from} → ${to}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n)
}

export function SymbolScenarioFace({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const exQ = useExhibitComposite(['terrain_regime', 'vrp', 'gex_regime'], sym)
  const exOf = (id: string) => exQ.data?.find((e) => e.lens === id || e.lens_id === id)
  const terEx = exOf('terrain_regime')
  const t = (terEx?.readings ?? {}) as Record<string, unknown>
  const v = (exOf('vrp')?.readings ?? {}) as Record<string, unknown>
  const g = (exOf('gex_regime')?.readings ?? {}) as Record<string, unknown>
  const num = (val: unknown) => (typeof val === 'number' && Number.isFinite(val) ? val : null)

  const histQ = useQuery({
    queryKey: ['research', 'terrain-history', sym, 30],
    queryFn: () => fetchTerrainHistory(sym, 30),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const days = terrainDays(histQ.data?.rows ?? [])
  const newest = days.length > 0 ? days[days.length - 1] : null
  const transitions = terrainTransitions(days)

  const spot = num(t.spot) ?? num(g.spot)
  const expected = num(t.expected_close)
  const iv30 = num(v.atm_iv_30d)
  const gzLo = num(newest?.gamma_zone_low)
  const gzHi = num(newest?.gamma_zone_high)
  const regime = typeof t.regime === 'string' ? t.regime : null
  const pinScore = num(t.pin_score)
  const tailRisk = num(t.tail_risk)
  const trendRelease = num(t.trend_release)
  const volSqueeze = num(t.vol_squeeze)
  const sim = terEx?.similar ?? null

  // The 1σ close band over 20 sessions, from the stores' own numbers:
  // expected_close ± expected × IV30 × √(20/252).
  const sigma = expected != null && iv30 != null ? expected * iv30 * Math.sqrt(20 / 252) : null
  const lo = expected != null && sigma != null ? expected - sigma : null
  const hi = expected != null && sigma != null ? expected + sigma : null
  const marks = (() => {
    const vals = [lo, hi, spot, expected, gzLo, gzHi].filter((x): x is number => x != null)
    if (vals.length < 2) return null
    const mn = Math.min(...vals)
    const mx = Math.max(...vals)
    const pad = (mx - mn) * 0.1 || 1
    return { posOf: (x: number) => ((x - mn + pad) / (mx - mn + 2 * pad)) * 100 }
  })()

  return (
    <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
    <section className={cn(panel, 'xl:col-span-2')}>
      <header className={panelHead}>
        <span className={cap}>Analysis model</span>
        <span className="text-dense-body font-semibold">terrain · close expectation · gamma zone</span>
        <span className="ml-auto text-dense-caption text-muted-foreground">source · terrain_regime exhibit</span>
      </header>
      <LensVerdictBlock lensId="terrain_regime" exhibit={terEx} />
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="border-b border-border/60 px-4 pb-2 pt-2.5 md:border-b-0 md:border-r">
          <div className={cn(cap, 'mb-6')}>close expectation · 20 sessions</div>
          {marks && lo != null && hi != null ? (
            <div className="relative mb-7 h-1.5 rounded-full bg-[var(--sk-line0)]">
              <span
                className="absolute -inset-y-0.5 rounded-[3px] bg-[rgb(var(--sk-accent-rgb)/0.18)]"
                style={{ left: `${marks.posOf(lo)}%`, right: `${100 - marks.posOf(hi)}%` }}
                title="1σ close band — expected ± expected × IV30 × √(20/252), the stores' own numbers"
              />
              {gzLo != null && gzHi != null ? (
                <span
                  className="absolute -inset-y-0.5 rounded-[3px] bg-warning/35"
                  style={{ left: `${marks.posOf(gzLo)}%`, right: `${100 - marks.posOf(gzHi)}%` }}
                  title={`gamma zone ${gzLo.toFixed(2)}–${gzHi.toFixed(2)} — the terrain's own, the dealer walls widened (${newest?.trade_date ?? ''})`}
                />
              ) : null}
              <span className="absolute -bottom-5 -translate-x-1/2 font-mono text-dense-micro text-secondary-foreground" style={{ left: `${marks.posOf(lo)}%` }}>
                {lo.toFixed(0)}
              </span>
              {expected != null ? (
                <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap font-mono text-dense-micro font-semibold text-[var(--sk-ticker)]" style={{ left: `${marks.posOf(expected)}%` }}>
                  expected {expected.toFixed(1)}
                </span>
              ) : null}
              {spot != null ? (
                <span className="absolute -bottom-5 -translate-x-1/2 font-mono text-dense-micro text-foreground" style={{ left: `${marks.posOf(spot)}%` }}>
                  spot
                </span>
              ) : null}
              <span className="absolute -bottom-5 -translate-x-1/2 font-mono text-dense-micro text-secondary-foreground" style={{ left: `${marks.posOf(hi)}%` }}>
                {hi.toFixed(0)}
              </span>
            </div>
          ) : (
            <p className="m-0 py-2 text-dense-meta text-muted-foreground">
              The model publishes no expected close for this name today.
            </p>
          )}
          <div className="flex flex-wrap gap-x-3.5 gap-y-1 pb-2 text-dense-micro text-muted-foreground">
            <span>
              <i className="mr-1 inline-block h-2 w-2.5 rounded-[2px] bg-[rgb(var(--sk-accent-rgb)/0.18)] align-middle" />
              1σ close band
            </span>
            {gzLo != null && gzHi != null ? (
              <span>
                <i className="mr-1 inline-block h-2 w-2.5 rounded-[2px] bg-warning/35 align-middle" />
                gamma zone {gzLo.toFixed(2)}–{gzHi.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5 px-3 py-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={cap}>terrain</span>
            <b className={cn(mono, 'text-dense-body font-semibold uppercase', regime === 'crash-risk' ? 'text-destructive' : regime === 'trending' ? 'text-warning' : 'text-success')}>
              {regime ?? '—'}
            </b>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            {/* The longest caption on the face; at 1024 it is wider than its column. */}
            <span className={cn(cap, 'whitespace-normal')}>trend release · vol squeeze</span>
            <b className={cn(mono, 'text-dense-body font-semibold')}>
              {trendRelease != null ? trendRelease.toFixed(0) : '—'} · {volSqueeze != null ? volSqueeze.toFixed(0) : '—'}
            </b>
            {days.length >= 2 ? (
              <span className="flex items-center gap-1.5" title={`${days.length}-session paths: trend release, then vol squeeze`}>
                <DenseSparkline values={days.map((d) => d.trend_release)} width={56} height={14} strokeClassName="stroke-muted-foreground" />
                <DenseSparkline values={days.map((d) => d.vol_squeeze)} width={56} height={14} strokeClassName="stroke-muted-foreground" />
              </span>
            ) : null}
          </div>
          <BarKv
            label="pin score"
            value={pinScore != null ? pinScore.toFixed(0) : '—'}
            barCls="bg-warning"
            pct={pinScore}
            path={days.map((d) => d.pin_score)}
          />
          <BarKv
            label="tail risk"
            value={tailRisk != null ? tailRisk.toFixed(1) : '—'}
            barCls="bg-loss"
            pct={tailRisk}
            path={days.map((d) => d.tail_risk)}
          />
          <div className="col-span-2 flex min-w-0 flex-col gap-0.5">
            <span className={cap}>similar regimes on {sym}</span>
            <span className="text-dense-meta leading-normal text-secondary-foreground text-pretty">
              {sim && sim.n > 0
                ? `${sim.n} neighbours · median ${sim.median_fwd != null ? `${sim.median_fwd >= 0 ? '+' : '−'}${Math.abs(sim.median_fwd * 100).toFixed(1)}%` : '—'} over ${sim.horizon}d · ${sim.share_positive != null ? `${Math.round(sim.share_positive * 100)}% positive` : ''}`
                : 'no settled neighbours yet'}
            </span>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-1">
            <span className="flex items-baseline gap-2">
              <span className={cap}>recent regimes</span>
              <span className="ml-auto text-dense-micro text-muted-foreground">
                {days.length > 0 ? `${days.length} sessions · ${days[0].trade_date.slice(5)} → ${days[days.length - 1].trade_date.slice(5)}` : ''}
              </span>
            </span>
            {days.length > 0 ? (
              <div className="flex h-3.5 gap-0.5">
                {days.map((d) => (
                  <span
                    key={d.trade_date}
                    className={cn('flex-1 rounded-[2px]', terrainRegimeBg(d.regime))}
                    title={`${d.trade_date} · ${d.regime}`}
                  />
                ))}
              </div>
            ) : (
              <span className="text-dense-micro text-muted-foreground">
                {histQ.isLoading ? 'Loading the terrain history…' : 'The terrain history holds no session for this name.'}
              </span>
            )}
            {days.length > 1 ? (
              <span className="text-dense-micro text-muted-foreground">
                {transitions.length === 0
                  ? `No regime change in ${days.length} sessions.`
                  : `Changes: ${transitions.map((x) => `${x.label} ${x.n}×`).join(' · ')}`}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
    <SymbolForecastSessions symbol={sym} />
    <SymbolPlaybookPanel symbol={sym} />
    </div>
  )
}
