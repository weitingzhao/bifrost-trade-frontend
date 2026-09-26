/**
 * What the retired Volatility sections carried that the one-name face had
 * not re-seated — each measured on DEV before it was drawn (Owner
 * 2026-09-26, DESIGN_CONTRACTS §15.6):
 *
 * - this name's own lens record (`/research/signal-decay/by-symbol`, 365 d):
 *   the verdict block's hit rates are the lens's pooled record, not the name's;
 * - the VRP exhibit's forward record from each extreme (`fwd20_by_band`);
 * - the year's VRP-percentile distribution and IV-against-RV levels, over the
 *   vrp store's own rows with History's IV30 fault rule (`suspectIvDates`);
 * - the picked tenor's SVI numbers, and the second smile fitter's choice
 *   (`/research/volatility/smile`: polynomial against SVI per expiry);
 * - the residual heatmap across the fitted expiries — the retired section fed
 *   it one expiry, so its «strike × expiry» grid was a single row.
 */
import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchVolatilitySmile } from '@/api/researchEngine'
import { fetchSignalDecayBySymbol, type SignalDecayLens } from '@/api/research/signalDecay'
import { fetchResiduals, type VolSurfaceFitRow } from '@/api/research/volSurface'
import type { ExhibitPayload } from '@/api/research/exhibit'
import type { VrpRow } from '@/api/research/vrp'
import { SegmentControl } from '@/components/data-display'
import { VolSurfaceHeatmap } from '@/components/charts/VolSurface3DChart'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fwd20Line, type LensHitBySymbol } from '@/lib/analyzeDepth'
import { cn } from '@/lib/utils'
import { suspectIvDates } from '@/utils/ivHistory'

const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const mono = 'font-mono tabular-nums'
const line = 'm-0 px-3 py-1 text-dense-meta leading-normal text-muted-foreground text-pretty'

const pct0 = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`)

/**
 * The name's own settled record on one lens: each side that triggers
 * (hot ≥ 80, cold ≤ 20), 5d and 20d, amber under ten outcomes.
 */
export function LensOwnRecord({ sym, lens }: { sym: string; lens: SignalDecayLens }) {
  const q = useQuery({
    queryKey: ['research', 'signal-decay-by-symbol', lens, 365, sym],
    queryFn: () => fetchSignalDecayBySymbol({ lens, symbols: [sym], windowDays: 365 }),
    enabled: Boolean(sym),
    staleTime: 30 * 60_000,
  })
  const rec = (q.data?.rows as LensHitBySymbol | undefined)?.[sym]
  const sides = (['hot', 'cold'] as const).filter((k) => (rec?.[k]?.n ?? 0) > 0)
  return (
    <p className={line}>
      <span className="font-semibold text-secondary-foreground">{sym}&rsquo;s own record · 365d</span>{' '}
      {q.isLoading
        ? '— loading…'
        : sides.length === 0
          ? '— no reading at either extreme settled in the window.'
          : sides.map((k, i) => {
              const s = rec![k]!
              const thin = Math.min(s.evaluated_5d, s.evaluated_20d) < 10
              return (
                <span key={k}>
                  {i > 0 ? ' · ' : '— '}
                  {k === 'hot' ? 'hot (≥ 80)' : 'cold (≤ 20)'} n {s.n}:{' '}
                  <b
                    className={cn(mono, thin ? 'text-warning' : 'text-foreground')}
                    title={`${s.evaluated_5d} settled at 5 sessions, ${s.evaluated_20d} at 20${thin ? ' — a thin sample' : ''}`}
                  >
                    5d {pct0(s.hit_rate_5d)} · 20d {pct0(s.hit_rate_20d)}
                  </b>
                </span>
              )
            })}
    </p>
  )
}

/** The VRP exhibit's own forward record from each extreme. */
export function VrpForwardRecord({ exhibit }: { exhibit: ExhibitPayload | undefined }) {
  const text = fwd20Line(exhibit)
  return text ? <p className={line}>{text}</p> : null
}

function DistBars({ bins, lit, tone }: { bins: number[]; lit?: number; tone: string }) {
  const max = Math.max(1, ...bins)
  return (
    <div className="flex h-8 items-end gap-px">
      {bins.map((n, i) => (
        <span
          key={i}
          className={cn('flex-1 rounded-[1px]', i === lit ? 'bg-foreground' : tone)}
          style={{ height: `${Math.max(6, (n / max) * 100)}%` }}
          title={`${n} session${n === 1 ? '' : 's'}`}
        />
      ))}
    </div>
  )
}

/**
 * The year's VRP percentile in ten bins (today lit) and the IV30 and RV60
 * levels on one shared scale — rich IV sits right of RV when there is an
 * edge to sell. Suspect IV30 sessions are left out of both and counted.
 */
export function VrpDistributions({ rows }: { rows: readonly VrpRow[] }) {
  const suspects = new Set(suspectIvDates(rows))
  const clean = rows.filter((r) => !(r.trade_date && suspects.has(r.trade_date)))
  const pcts = clean.map((r) => r.vrp_pct_252d).filter((v): v is number => v != null && Number.isFinite(v))
  const pctBins = Array.from({ length: 10 }, () => 0)
  for (const p of pcts) pctBins[Math.min(9, Math.max(0, Math.floor(p / 10)))] += 1
  const now = rows.length > 0 ? rows[rows.length - 1].vrp_pct_252d : null
  const nowBin = now != null && Number.isFinite(now) ? Math.min(9, Math.max(0, Math.floor(now / 10))) : undefined

  const ivs = clean.map((r) => r.atm_iv_30d).filter((v): v is number => v != null && Number.isFinite(v))
  const rvs = clean.map((r) => r.rv_60d).filter((v): v is number => v != null && Number.isFinite(v))
  const all = [...ivs, ...rvs]
  const lo = all.length > 0 ? Math.min(...all) : 0
  const hi = all.length > 0 ? Math.max(...all) : 1
  const binOf = (v: number) => Math.min(9, Math.max(0, Math.floor(((v - lo) / (hi - lo || 1)) * 10)))
  const ivBins = Array.from({ length: 10 }, () => 0)
  const rvBins = Array.from({ length: 10 }, () => 0)
  for (const v of ivs) ivBins[binOf(v)] += 1
  for (const v of rvs) rvBins[binOf(v)] += 1

  if (pcts.length === 0 && all.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-border/40 px-3 py-2 sm:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={cap} title="The store's own 252-session VRP percentile, one bar per decile; today's decile is ink.">
          VRP pctl · {pcts.length} sessions
        </span>
        <DistBars bins={pctBins} lit={nowBin} tone="bg-[var(--sk-line2)]" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={cap}>IV30 levels</span>
        <DistBars bins={ivBins} tone="bg-primary/70" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={cap}>RV60 levels</span>
        <DistBars bins={rvBins} tone="bg-muted-foreground/60" />
      </div>
      <p className="col-span-full m-0 text-dense-micro text-muted-foreground">
        IV30 and RV60 share one scale, {(lo * 100).toFixed(0)}–{(hi * 100).toFixed(0)} vol — IV sitting right of RV is the premium.
        {suspects.size > 0
          ? ` ${suspects.size} IV30 reading${suspects.size === 1 ? '' : 's'} that look like store faults are left out (History's rule).`
          : ''}
      </p>
    </div>
  )
}

/** The picked tenor's own SVI readings — the numbers the smile is drawn from. */
export function SkewFitNumbers({ row }: { row: VolSurfaceFitRow | null }) {
  if (!row) return null
  const slope = row.atm_slope
  return (
    <p className={line}>
      <span className="font-semibold text-secondary-foreground">SVI at {row.expiry?.slice(5) ?? '—'}</span>
      {' — '}ATM slope{' '}
      <b className={cn(mono, 'text-foreground')}>{slope != null ? `${slope >= 0 ? '+' : '−'}${Math.abs(slope).toFixed(4)}` : '—'}</b>
      {/* Under a thousandth the smile is flat at the money (PLTR 10-23 read 0.000035) — no side to name. */}
      {slope != null ? ` (${Math.abs(slope) < 0.001 ? 'flat' : slope < 0 ? 'call skew' : 'put skew'})` : ''} · ATM vol{' '}
      <b className={cn(mono, 'text-foreground')}>{row.atm_vol != null ? `${(row.atm_vol * 100).toFixed(1)}%` : '—'}</b> · RMSE{' '}
      <b className={cn(mono, 'text-foreground')} title="fit_rmse is an IV fraction: 0.20 is 20 vol points.">
        {row.fit_rmse != null ? `${(row.fit_rmse * 100).toFixed(1)} pts` : '—'}
      </b>{' '}
      · {row.n_points ?? '—'} points · {row.dte ?? '—'}d
    </p>
  )
}

function rmseOf(params: Record<string, unknown> | null, model: 'svi' | 'polynomial'): number | null {
  const m = params?.[model]
  if (!m || typeof m !== 'object') return null
  const v = (m as Record<string, unknown>).rmse
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** The second smile fitter at the same expiry: which model it kept, and how both fit. */
export function SmileSecondFit({ sym, expiry }: { sym: string; expiry: string | null }) {
  const q = useQuery({
    queryKey: ['research', 'volatility-smile', sym],
    queryFn: () => fetchVolatilitySmile(sym),
    enabled: Boolean(sym),
    staleTime: 30 * 60_000,
  })
  const row = (q.data?.rows ?? []).find((r) => r.expiry === expiry)
  if (!row) return null
  const svi = rmseOf(row.smile_params, 'svi')
  const poly = rmseOf(row.smile_params, 'polynomial')
  return (
    <p className={line} title="/research/volatility/smile — a separate fitter that tries a polynomial and an SVI per expiry and keeps the better; its RMSE is in its own units.">
      <span className="font-semibold text-secondary-foreground">Second fitter</span> — kept{' '}
      <b className="text-foreground">{row.fit_model || '—'}</b> · RMSE polynomial{' '}
      <b className={cn(mono, 'text-foreground')}>{poly != null ? poly.toFixed(2) : '—'}</b> vs SVI{' '}
      <b className={cn(mono, 'text-foreground')}>{svi != null ? svi.toFixed(2) : '—'}</b> · {row.n_points ?? '—'} points
    </p>
  )
}

/** Residuals across the fitted expiries, near the money. */
export function ResidualHeatmap({
  sym,
  expiries,
  spot,
}: {
  sym: string
  expiries: readonly string[]
  spot: number | null
}) {
  const [mode, setMode] = useState<'residual_z' | 'iv'>('residual_z')
  const qs = useQueries({
    queries: expiries.map((exp) => ({
      queryKey: QUERY_KEYS.research.volSurface.residuals(sym, 'latest', exp),
      queryFn: () => fetchResiduals(sym, exp),
      enabled: Boolean(sym && exp),
      staleTime: 5 * 60_000,
    })),
  })
  const rows = qs
    .flatMap((q) => q.data ?? [])
    .filter((r) => spot == null || (r.strike != null && Math.abs(r.strike / spot - 1) <= 0.2))
  if (expiries.length === 0) return null
  return (
    <div className="border-t border-border/40 px-3 py-2">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className={cap}>Residuals · strike × expiry</span>
        <SegmentControl
          ariaLabel="Residual heatmap metric"
          size="xs"
          value={mode}
          onChange={(v) => setMode(v as 'residual_z' | 'iv')}
          options={[
            { value: 'residual_z', label: 'Residual z' },
            { value: 'iv', label: 'Market IV' },
          ]}
        />
        <span className="ml-auto text-dense-micro text-muted-foreground">
          {expiries.length} expiries · ±20% of spot
        </span>
      </div>
      {qs.some((q) => q.isLoading) && rows.length === 0 ? (
        <p className="m-0 py-1 text-dense-meta text-muted-foreground">Loading residuals…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-1 text-dense-meta text-muted-foreground">The residual store holds no strike within ±20% of spot for these expiries.</p>
      ) : (
        <VolSurfaceHeatmap rows={rows} mode={mode} />
      )}
    </div>
  )
}
