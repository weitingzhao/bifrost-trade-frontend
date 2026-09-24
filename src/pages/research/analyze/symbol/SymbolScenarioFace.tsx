/**
 * The Scenario face — one name only (design `Research Symbol.dc.html`,
 * §isScenario). The analysis model's own verdict with the close expectation
 * on a ruler and the gamma zone behind it, then the forecast sessions and
 * the intraday playbook the page already carried — both were one-name
 * sections all along; only the model panel was missing its face.
 */
import { LensVerdictBlock } from '@/components/research/LensVerdictBlock'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { cn } from '@/lib/utils'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 rounded-[10px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const panelHead =
  'flex flex-wrap items-center gap-2.5 rounded-t-[9px] border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3 py-1.75 text-dense-body leading-normal'

function BarKv({ label, value, barCls, pct }: { label: string; value: string; barCls: string; pct: number | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={cap}>{label}</span>
      <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
        {pct != null ? (
          <span className={cn('absolute inset-y-0 left-0', barCls)} style={{ width: `${Math.min(100, pct)}%` }} />
        ) : null}
      </span>
      <b className={cn(mono, 'text-dense-meta font-semibold')}>{value}</b>
    </div>
  )
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

  const spot = num(t.spot) ?? num(g.spot)
  const expected = num(t.expected_close)
  const iv30 = num(v.atm_iv_30d)
  const callWall = num(g.major_call_wall)
  const putWall = num(g.major_put_wall)
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
    const vals = [lo, hi, spot, expected, callWall, putWall].filter((x): x is number => x != null)
    if (vals.length < 2) return null
    const mn = Math.min(...vals)
    const mx = Math.max(...vals)
    const pad = (mx - mn) * 0.1 || 1
    return { posOf: (x: number) => ((x - mn + pad) / (mx - mn + 2 * pad)) * 100 }
  })()

  return (
    <section className={panel}>
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
              {putWall != null && callWall != null ? (
                <span
                  className="absolute -inset-y-0.5 rounded-[3px] bg-warning/35"
                  style={{ left: `${marks.posOf(putWall)}%`, right: `${100 - marks.posOf(callWall)}%` }}
                  title={`gamma zone ${putWall}–${callWall} — the dealer walls`}
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
            {putWall != null && callWall != null ? (
              <span>
                <i className="mr-1 inline-block h-2 w-2.5 rounded-[2px] bg-warning/35 align-middle" />
                gamma zone {putWall}–{callWall}
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
            <span className={cap}>trend release · vol squeeze</span>
            <b className={cn(mono, 'text-dense-body font-semibold')}>
              {trendRelease != null ? trendRelease.toFixed(0) : '—'} · {volSqueeze != null ? volSqueeze.toFixed(0) : '—'}
            </b>
          </div>
          <BarKv label="pin score" value={pinScore != null ? pinScore.toFixed(0) : '—'} barCls="bg-warning" pct={pinScore} />
          <BarKv label="tail risk" value={tailRisk != null ? tailRisk.toFixed(1) : '—'} barCls="bg-loss" pct={tailRisk} />
          <div className="col-span-2 flex min-w-0 flex-col gap-0.5">
            <span className={cap}>similar regimes on {sym}</span>
            <span className="text-dense-meta leading-normal text-secondary-foreground text-pretty">
              {sim && sim.n > 0
                ? `${sim.n} neighbours · median ${sim.median_fwd != null ? `${sim.median_fwd >= 0 ? '+' : '−'}${Math.abs(sim.median_fwd * 100).toFixed(1)}%` : '—'} over ${sim.horizon}d · ${sim.share_positive != null ? `${Math.round(sim.share_positive * 100)}% positive` : ''}`
                : 'no settled neighbours yet'}
            </span>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-0.5" title="A per-session regime history is not served — the exhibit answers today only. Unmeasured, not omitted.">
            <span className={cap}>recent regimes</span>
            <span className="text-dense-micro text-muted-foreground">no history served — today only</span>
          </div>
        </div>
      </div>
    </section>
  )
}
