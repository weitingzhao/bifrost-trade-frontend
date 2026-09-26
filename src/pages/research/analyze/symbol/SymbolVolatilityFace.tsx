/**
 * The Volatility face — one name only (design `Research Symbol.dc.html`,
 * §isVol). Four panels, each opening with the lens's own verdict and the
 * record that earned it: IV rank against its year, the IV−RV premium, the
 * ATM term structure, and the SVI skew. The universe tables stay in
 * Ratings › Underlyings — this page is one name.
 */
import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchStockDailyCloses } from '@/api/marketData/dailyBars'
import { fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { SegmentControl } from '@/components/data-display'
import { LensVerdictBlock } from '@/components/research/LensVerdictBlock'
import { FaceKv } from '@/components/research/FaceKv'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useEarningsDates } from '@/hooks/useNarrative'
import { useVrpHistory } from '@/hooks/useVrpData'
import { useAtmIvTerm, useResiduals, useVolSurfaceFit } from '@/hooks/useVolSurfaceData'
import { todayIso } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'
import { chainFromSnapshots, type ChainContract } from '@/utils/optionChain'
import { daysTo } from '@/utils/optionTicker'
import { sviFromRow, sviIvPts } from '@/utils/sviSmile'
import { SkewSurfaceChart, TermCurveChart } from '@/pages/research/analyze/symbol/symbolVolCharts'
import { lateLead, termEarningsLegend, termEarningsMark, termEarningsNote } from '@/utils/earningsEstimate'
import {
  LensOwnRecord,
  ResidualHeatmap,
  SkewFitNumbers,
  SmileSecondFit,
  VrpDistributions,
  VrpForwardRecord,
} from './SymbolVolatilityDepth'

const cap =
  'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
/** The term panel's window, in calendar days to expiry. */
const TERM_MIN_DTE = 5
const TERM_MAX_DTE = 100
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 border mat-card'
const panelHead =
  'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal'
const thCls =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const tdCls =
  'whitespace-nowrap border-b border-border/40 px-2 py-1 text-right font-mono text-dense-meta tabular-nums'
const note =
  'm-0 border-t border-border/60 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** Tiny bar strip — the 60d rank path / decile histogram of the prototype. */
function BarStrip({ bars, title }: { bars: { h: number; on?: boolean }[]; title: string }) {
  return (
    <div className="flex h-7 items-end gap-px" title={title}>
      {bars.map((b, i) => (
        <span
          key={i}
          // The current bar is ink, not the ticker's lime (Rev .92): it marks now, not the name.
          className={cn('w-full min-w-[2px] flex-1 rounded-[1px]', b.on ? 'bg-foreground' : 'bg-[var(--sk-line2)]')}
          style={{ height: `${Math.max(6, b.h)}%` }}
        />
      ))}
    </div>
  )
}

/** Annualised realised vol over the last n closes, in pts; null under 6 samples. */
function realisedVol(closes: readonly { close: number | null }[], n: number): number | null {
  const vals = closes.map((c) => c.close).filter((v): v is number => v != null && v > 0)
  const take = vals.slice(-Math.max(2, Math.min(n, vals.length)))
  if (take.length < 6) return null
  const rets = take.slice(1).map((v, i) => Math.log(v / take[i]))
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length
  const varr = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (rets.length - 1)
  return Math.sqrt(varr * 252) * 100
}

/**
 * The 25Δ risk reversal off the chain's own greeks: the call nearest
 * Δ +.25 minus the put nearest Δ −.25, in vol pts. A sparse chain whose
 * nearest legs sit further than .08 from the target answers nothing.
 */
function rr25Of(chain: readonly ChainContract[]): number | null {
  let call: ChainContract | null = null
  let put: ChainContract | null = null
  for (const c of chain) {
    if (c.delta == null || c.iv == null) continue
    if (c.right === 'C') {
      if (call == null || Math.abs(c.delta - 0.25) < Math.abs((call.delta ?? 9) - 0.25)) call = c
    } else if (put == null || Math.abs(c.delta + 0.25) < Math.abs((put.delta ?? 9) + 0.25)) {
      put = c
    }
  }
  if (!call?.iv || !put?.iv || call.delta == null || put.delta == null) return null
  if (Math.abs(call.delta - 0.25) > 0.08 || Math.abs(put.delta + 0.25) > 0.08) return null
  return (call.iv - put.iv) * 100
}

export function SymbolVolatilityFace({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const exQ = useExhibitComposite(['iv_rank', 'vrp', 'term_slope', 'skew'], sym)
  const exOf = (id: string) => exQ.data?.find((e) => e.lens === id || e.lens_id === id)
  const vrpQ = useVrpHistory(sym, 252)
  const termQ = useAtmIvTerm(sym)
  const fitQ = useVolSurfaceFit(sym)

  // ── IV rank readings, off the vrp store's own year ──
  const year = useMemo(() => vrpQ.data ?? [], [vrpQ.data])
  const ivs = useMemo(
    () => year.map((r) => r.atm_iv_30d).filter((v): v is number => v != null && Number.isFinite(v)),
    [year]
  )
  const last = year.length > 0 ? year[year.length - 1] : null
  const iv30 = last?.atm_iv_30d != null ? last.atm_iv_30d * 100 : null
  const rv20 = last?.rv_20d != null ? last.rv_20d * 100 : null
  const low = ivs.length > 0 ? Math.min(...ivs) * 100 : null
  const high = ivs.length > 0 ? Math.max(...ivs) * 100 : null
  const rank =
    iv30 != null && low != null && high != null && high > low
      ? ((iv30 - low) / (high - low)) * 100
      : null
  const pctl =
    iv30 != null && ivs.length > 0
      ? (ivs.filter((v) => v * 100 < iv30).length / ivs.length) * 100
      : null
  const pos = (v: number | null) =>
    v == null || low == null || high == null || high <= low
      ? null
      : Math.max(0, Math.min(100, ((v - low) / (high - low)) * 100))
  // 60d rank path: each day's IV30 ranked in the whole year's range.
  const rankPath = useMemo(() => {
    if (low == null || high == null || high <= low) return []
    return year.slice(-60).map((r) => {
      const v = r.atm_iv_30d != null ? r.atm_iv_30d * 100 : null
      return { h: v == null ? 0 : ((v - low) / (high - low)) * 100 }
    })
  }, [year, low, high])

  // ── VRP deciles: the year's spread distribution, current decile lit ──
  const vrp = last?.vrp_60d != null ? last.vrp_60d * 100 : null
  const vrpBins = useMemo(() => {
    const spreads = year.map((r) => r.vrp_60d).filter((v): v is number => v != null)
    if (spreads.length < 10) return []
    const sorted = [...spreads].sort((a, b) => a - b)
    const bins = Array.from({ length: 10 }, (_, i) => {
      const a = sorted[Math.floor((i / 10) * (sorted.length - 1))]
      const b = sorted[Math.floor(((i + 1) / 10) * (sorted.length - 1))]
      return spreads.filter((v) => v >= a && (i === 9 ? v <= b : v < b)).length
    })
    const maxN = Math.max(...bins)
    const cur = last?.vrp_60d
    const curIdx =
      cur == null ? -1 : Math.min(9, Math.max(0, sorted.filter((v) => v < cur).length / sorted.length * 10) | 0)
    return bins.map((n, i) => ({ h: (n / maxN) * 100, on: i === curIdx }))
  }, [year, last?.vrp_60d])

  // ── Term structure: the repaired ATM IV store per expiry ──
  // Not the SVI fit's atm_vol: a deep-wing fit pulls the near expiries off
  // (AAPL 10-16 read 17.4 between 40.8 and 31.7 on 2026-09-25). Days count
  // from today, as the earnings estimate's do; the window is the design's
  // 9–100 days, widened to 5 so the first weekly past a few days shows.
  const term = useMemo(() => {
    const asOf = todayIso()
    return (termQ.data?.term ?? [])
      .map((p) => ({ expiry: p.expiry, label: p.expiry.slice(5), dte: daysTo(p.expiry, asOf) ?? 0, iv: p.atm_iv * 100 }))
      .filter((p) => p.dte >= TERM_MIN_DTE && p.dte <= TERM_MAX_DTE)
  }, [termQ.data])
  const termMax = Math.max(1, ...term.map((t) => t.iv))

  // ── Earnings on the term curve: Research's estimate of the next print ──
  const earnQ = useEarningsDates(sym)
  const nextEarnings = earnQ.data?.expected_next ?? null
  const earnMark = termEarningsMark(nextEarnings, term.map((t) => t.dte))
  const earnLegend = termEarningsLegend(nextEarnings, earnMark)

  // Realised vol at roughly each expiry's horizon, from the name's own closes
  // — the design's grey companion line. Calendar days → trading days.
  const today = todayIso()
  const closesQ = useQuery({
    queryKey: ['market', 'stock-daily-closes-1y', sym],
    queryFn: () =>
      fetchStockDailyCloses(sym, new Date(Date.now() - 420 * 86_400_000).toISOString().slice(0, 10), today),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const rvLine = (closesQ.data ?? []).length > 0
    ? term
        .map((t) => ({ dte: t.dte, rv: realisedVol(closesQ.data ?? [], Math.round((t.dte * 252) / 365)) }))
        .filter((r): r is { dte: number; rv: number } => r.rv != null)
    : []

  // One snapshot read per listed expiry, for the 25Δ risk reversal — the
  // same query keys the Chain face uses, so the cache is shared.
  const termSnapQs = useQueries({
    queries: term.map((t) => ({
      queryKey: ['market', 'option-snapshots', sym, t.expiry],
      queryFn: () => fetchOptionSnapshots(sym, t.expiry),
      enabled: Boolean(sym),
      staleTime: 5 * 60_000,
    })),
  })
  const chainsByExpiry = new Map(
    term.map((t, i) => [t.expiry, chainFromSnapshots(termSnapQs[i]?.data?.rows ?? [])])
  )
  const rrByExpiry = new Map(term.map((t) => [t.expiry, rr25Of(chainsByExpiry.get(t.expiry) ?? [])]))

  // ── Skew: the fitted expiries as the design's tenor switch; nearest ~30d
  // opens, and the picked one drives the smile, the table and the term
  // panel's lime row. ──
  const fitRows = useMemo(
    () =>
      (fitQ.data ?? [])
        .filter((r) => r.expiry && r.dte != null && sviFromRow(r))
        .sort((a, b) => (a.dte ?? 0) - (b.dte ?? 0)),
    [fitQ.data]
  )
  const [skewExpiry, setSkewExpiry] = useState<string | null>(null)
  const fitRow = useMemo(() => {
    const picked = skewExpiry ? fitRows.find((r) => r.expiry === skewExpiry) : null
    if (picked) return picked
    let best = null as (typeof fitRows)[number] | null
    for (const r of fitRows) if (best == null || Math.abs((r.dte ?? 0) - 30) < Math.abs((best.dte ?? 0) - 30)) best = r
    return best
  }, [fitRows, skewExpiry])
  const nextFitRow = useMemo(() => {
    if (!fitRow) return null
    return fitRows.find((r) => (r.dte ?? 0) > (fitRow.dte ?? 0)) ?? null
  }, [fitRows, fitRow])
  const residQ = useResiduals(sym, fitRow?.expiry ?? '')
  const chainQ = useQuery({
    queryKey: ['market', 'option-snapshots', sym, fitRow?.expiry],
    queryFn: () => fetchOptionSnapshots(sym, fitRow!.expiry as string),
    enabled: Boolean(sym && fitRow?.expiry),
    staleTime: 5 * 60_000,
  })
  // The chain's own two sides for the picked expiry. The residual rows hand
  // the spot back (strike · e^−k), so no second store is asked for it.
  const chain = chainFromSnapshots(chainQ.data?.rows ?? [])
  const spotVals = (residQ.data ?? [])
    .filter((r) => r.strike != null && r.log_moneyness != null)
    .map((r) => (r.strike as number) * Math.exp(-(r.log_moneyness as number)))
    .sort((a, b) => a - b)
  const spot = spotVals.length > 0 ? spotVals[Math.floor(spotVals.length / 2)] : null
  const svi = fitRow ? sviFromRow(fitRow) : null
  const nextSvi = nextFitRow ? sviFromRow(nextFitRow) : null
  const fitT = fitRow?.dte != null && fitRow.dte > 0 ? fitRow.dte / 365 : null
  const nextT = nextFitRow?.dte != null && nextFitRow.dte > 0 ? nextFitRow.dte / 365 : null
  const inWindow = (K: number) => spot != null && Math.abs(K / spot - 1) <= 0.2
  const sideOf = (right: 'C' | 'P') =>
    chain
      .filter((c) => c.right === right && c.iv != null && inWindow(c.strike))
      .map((c) => ({ strike: c.strike, iv: (c.iv as number) * 100 }))
  const putsSide = sideOf('P')
  const callsSide = sideOf('C')
  // The design's strike table: the OTM side per strike, ±15% of spot,
  // residual against the fit in bp.
  const strikeRows = (() => {
    if (spot == null || !svi || fitT == null) return []
    const picked = chain.filter(
      (c) =>
        c.iv != null &&
        c.right === (c.strike < spot ? 'P' : 'C') &&
        Math.abs(c.strike / spot - 1) <= 0.15,
    )
    const uniq = new Map<number, ChainContract>()
    for (const c of picked) if (!uniq.has(c.strike)) uniq.set(c.strike, c)
    const strikes = [...uniq.keys()]
    if (strikes.length === 0) return []
    const atm = strikes.reduce((a, b) => (Math.abs(b - spot) < Math.abs(a - spot) ? b : a))
    return [...uniq.values()]
      .sort((a, b) => a.strike - b.strike)
      .map((c) => {
        const mkt = (c.iv as number) * 100
        const fitIv = sviIvPts(svi, Math.log(c.strike / spot), fitT)
        return {
          strike: c.strike,
          atm: c.strike === atm,
          delta: c.delta != null ? Math.abs(c.delta) : null,
          mkt,
          fitIv,
          residBp: (mkt - fitIv) * 100,
        }
      })
  })()
  const worstBp = Math.max(30, ...strikeRows.map((r) => Math.abs(r.residBp)))
  /* A residual is only a richness signal when the fit holds near money. This
     store's SVI is routinely wing-dominated (fit_rmse is an IV fraction —
     0.37 is 37 pts), and against a broken fit every strike reads «rich».
     Median |resid| near money is the self-computed check the trap demands. */
  const medResidBp = (() => {
    const v = strikeRows.map((r) => Math.abs(r.residBp)).sort((a, b) => a - b)
    return v.length > 0 ? v[Math.floor(v.length / 2)] : null
  })()
  const fitDegraded = medResidBp != null && medResidBp > 150
  const skewEx = exOf('skew')
  const skewPctl = (skewEx?.readings as Record<string, unknown> | undefined)?.slope_pctile_252d

  return (
    <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr))]">
      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>IV rank</span>
          <span className="text-dense-body font-semibold">30d implied vs its own year</span>
          <span className="ml-auto text-dense-caption text-muted-foreground">source · vrp store · 252d</span>
        </header>
        <LensVerdictBlock lensId="iv_rank" exhibit={exOf('iv_rank')} />
        <div className="px-3 pb-1 pt-2.5">
          <div className="relative mb-6 h-1.5 rounded-full bg-[var(--sk-line0)]">
            {low != null && high != null ? (
              <>
                <span className="absolute -bottom-5 left-0 text-dense-micro text-muted-foreground">1y low {low.toFixed(0)}</span>
                {rv20 != null && pos(rv20) != null ? (
                  <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap font-mono text-dense-micro text-secondary-foreground" style={{ left: `${pos(rv20)}%` }}>
                    RV20 {rv20.toFixed(1)}
                  </span>
                ) : null}
                {iv30 != null && pos(iv30) != null ? (
                  <span className="absolute -bottom-5 -translate-x-1/2 whitespace-nowrap font-mono text-dense-micro font-semibold text-[var(--sk-ticker)]" style={{ left: `${pos(iv30)}%` }}>
                    IV30 {iv30.toFixed(1)}
                  </span>
                ) : null}
                <span className="absolute -bottom-5 right-0 text-dense-micro text-muted-foreground">1y high {high.toFixed(0)}</span>
                {pos(iv30) != null ? (
                  <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--sk-ticker)]" style={{ left: `${pos(iv30)}%` }} />
                ) : null}
              </>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-4">
            <FaceKv label="IV rank" value={rank != null ? rank.toFixed(0) : '—'} cls={rank != null && rank >= 70 ? 'text-profit' : rank != null && rank <= 30 ? 'text-loss' : undefined} />
            <FaceKv label="IV pctl" value={pctl != null ? pctl.toFixed(0) : '—'} />
            <FaceKv label="IV30" value={iv30 != null ? `${iv30.toFixed(1)}%` : '—'} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={cap}>60d rank path</span>
              <BarStrip bars={rankPath} title="Each session's IV30, ranked in the year's range." />
            </div>
          </div>
        </div>
        <LensOwnRecord sym={sym} lens="iv_rank" />
        <p className={note}>
          Rank is where IV30 sits between its 1y low and high; percentile is the share of days
          below it. The universe table stays in Ratings › Underlyings — this page is one name.
        </p>
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>IV − RV</span>
          <span className="text-dense-body font-semibold">Volatility risk premium</span>
          <span className="ml-auto text-dense-caption text-muted-foreground">source · vrp store · 60d pairing</span>
        </header>
        <LensVerdictBlock lensId="vrp" exhibit={exOf('vrp')} />
        <div className="grid grid-cols-2 gap-2.5 px-3 py-2.5 sm:grid-cols-4">
          <FaceKv label="spread" value={vrp != null ? `${vrp >= 0 ? '+' : '−'}${Math.abs(vrp).toFixed(1)} pp` : '—'} cls={vrp != null ? (vrp >= 0 ? 'text-profit' : 'text-loss') : undefined} />
          <FaceKv label="VRP pctl (252d)" value={last?.vrp_pct_252d != null ? last.vrp_pct_252d.toFixed(0) : '—'} />
          <FaceKv label="RV20 · RV60" value={`${rv20 != null ? rv20.toFixed(1) : '—'} · ${last?.rv_60d != null ? (last.rv_60d * 100).toFixed(1) : '—'}`} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={cap}>days in decile</span>
            <BarStrip bars={vrpBins} title="252d distribution of the spread; the current decile is lit." />
          </div>
        </div>
        <LensOwnRecord sym={sym} lens="vrp" />
        <VrpForwardRecord exhibit={exOf('vrp')} />
        <VrpDistributions rows={year} />
        <p className={note}>
          Sell-vol edge when the spread is high in its own history, buy-vol when low. Edge is
          about the spread&rsquo;s percentile, not its sign — a positive spread in its 20th
          percentile is not an edge.
        </p>
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>Term structure</span>
          <span className="text-dense-body font-semibold">ATM IV by expiry</span>
          <span
            className="ml-auto text-dense-caption text-muted-foreground"
            title="features.option_metric_atm_iv_daily — strikes within ±10% of spot, two contracts an expiry, the store the IV history rests on"
          >
            source · ATM IV store · {termQ.data?.trade_date ?? '—'}
          </span>
        </header>
        <LensVerdictBlock lensId="term_slope" exhibit={exOf('term_slope')} />
        {nextEarnings && nextEarnings.days_away < 0 ? (
          <p
            className="m-0 border-y border-warning/30 bg-warning/10 px-3 py-1.5 text-dense-meta leading-normal text-warning text-pretty"
            role="note"
            aria-label="Earnings late"
          >
            {lateLead(nextEarnings)} Its date is unknown, so the curve carries no earnings line — and until it prints,
            any expiry here may still hold its premium.
          </p>
        ) : null}
        {term.length === 0 ? (
          <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
            The ATM IV store holds no expiry {TERM_MIN_DTE}–{TERM_MAX_DTE} days out for this name.
          </p>
        ) : (
          <>
            <div className="pt-2.5">
              <TermCurveChart
                points={term.map((t) => ({ dte: t.dte, iv: t.iv }))}
                rv={rvLine}
                selDte={term.find((t) => t.expiry === fitRow?.expiry)?.dte ?? null}
                event={earnMark}
              />
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 px-3 pb-1.5 text-dense-micro text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-0 w-3.5 border-t-2 border-[var(--sk-ticker)]" />ATM IV today
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-0 w-3.5 border-t-2 border-[var(--sk-mute2)]" />realised (RV) at matching horizon
              </span>
              {earnLegend ? (
                <span className="inline-flex items-center gap-1.5" title={earnMark?.title}>
                  <i className="h-3 w-0 border-l-2 border-dashed border-warning" />
                  {earnLegend}
                </span>
              ) : null}
              <span
                className="text-muted-foreground/60"
                title="The 1y cone per horizon needs a term-structure history no store keeps — unmeasured, not omitted."
              >
                1y cone — owed
              </span>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-border/40 px-3 py-2">
              {term.map((t) => {
                const sel = fitRow?.expiry === t.expiry
                const rr = rrByExpiry.get(t.expiry) ?? null
                return (
                  <div
                    key={t.expiry}
                    className="grid grid-cols-[56px_34px_minmax(0,1fr)_52px_56px] items-center gap-2 text-dense-meta"
                  >
                    <span className={cn(mono, sel ? 'font-semibold text-primary' : 'text-secondary-foreground')}>
                      {t.label}
                    </span>
                    <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>{t.dte}d</span>
                    <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
                      <span
                        className={cn('absolute inset-y-0 left-0', sel ? 'bg-primary' : 'bg-[var(--sk-line2)]')}
                        style={{ width: `${(t.iv / termMax) * 100}%` }}
                      />
                    </span>
                    <span className={cn(mono, 'text-right')}>{t.iv.toFixed(1)}</span>
                    <span
                      className={cn(mono, 'text-right', rr != null && rr <= -5 ? 'text-destructive' : 'text-muted-foreground')}
                      title="25Δ risk reversal — the call nearest Δ +.25 minus the put nearest Δ −.25, off the chain’s own greeks. A chain too sparse to reach .25 answers nothing."
                    >
                      {rr != null ? `${rr >= 0 ? '+' : '−'}${Math.abs(rr).toFixed(1)}` : '—'}
                    </span>
                  </div>
                )
              })}
              <div className="grid grid-cols-[56px_34px_minmax(0,1fr)_52px_56px] gap-2 text-dense-micro text-muted-foreground">
                <span /> <span /> <span />
                <span className="text-right">ATM IV</span>
                <span className="text-right">25Δ RR</span>
              </div>
            </div>
          </>
        )}
        <p className={note}>
          Front expiries carry more IV than the back in backwardation — an event or a squeeze is
          priced in. ATM IV is the repaired store&rsquo;s per expiry, not the SVI fit&rsquo;s, whose
          near expiries the wings can pull off. The lime row is the tenor the Skew panel is reading.
          The design&rsquo;s 1y cone needs a per-horizon history no store keeps yet — owed, not faked.
        </p>
        {/* A late print has its strip above the curve; this line is for a dated one. */}
        {!earnQ.isLoading && term.length > 0 && !(nextEarnings && nextEarnings.days_away < 0) ? (
          <p className={note}>{termEarningsNote(nextEarnings, term, earnQ.data?.filings)}</p>
        ) : null}
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>Skew &amp; surface</span>
          <span className="text-dense-body font-semibold">
            SVI fit · {fitRow?.expiry ? fitRow.expiry.slice(5) : '—'}
          </span>
          {fitRows.length > 1 ? (
            <SegmentControl
              ariaLabel="Skew tenor"
              size="xs"
              value={fitRow?.expiry ?? ''}
              onChange={(v) => setSkewExpiry(v)}
              options={fitRows.slice(0, 6).map((r) => ({ value: r.expiry as string, label: `${r.dte}d` }))}
            />
          ) : null}
          <span className="ml-auto text-dense-caption text-muted-foreground">
            own pctl{' '}
            <span className={cn(mono, 'text-foreground')}>
              {typeof skewPctl === 'number' ? skewPctl.toFixed(0) : '—'}
            </span>
          </span>
        </header>
        <LensVerdictBlock lensId="skew" exhibit={exOf('skew')} />
        {putsSide.length + callsSide.length >= 3 && spot != null ? (
          <>
            <div className="pt-2">
              <SkewSurfaceChart
                puts={putsSide}
                calls={callsSide}
                fit={svi}
                fitT={fitT}
                nextFit={nextSvi}
                nextT={nextT}
                spot={spot}
                richBp={fitDegraded ? Number.POSITIVE_INFINITY : 30}
              />
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 px-3 pb-1.5 text-dense-micro text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-0 w-3.5 border-t-2 border-destructive" />puts
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-0 w-3.5 border-t-2 border-success" />calls
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-0 w-3.5 border-t-2 border-dashed border-[var(--sk-mute2)]" />raw-SVI fit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-0 w-3.5 border-t-2 border-[var(--sk-line2)]" />next expiry
              </span>
              {fitDegraded ? (
                <span
                  className="text-warning"
                  title="Rich/cheap is a reading against the fit, and this fit is not holding the market near money — wing-dominated SVI, the store’s own residuals agree. The no-arbitrage lamps on the Surface face say why."
                >
                  fit off the market · median |resid| {medResidBp?.toFixed(0)} bp — richness unreadable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-1.5 w-1.5 rounded-full bg-warning" />rich to fit &gt; 30 bp
                </span>
              )}
            </div>
            {strikeRows.length > 0 ? (
              <table className="w-full border-collapse border-t border-border/40">
                <thead>
                  <tr>
                    <th className={cn(thCls, 'text-left')}>Strike</th>
                    <th className={thCls}>Δ</th>
                    <th className={thCls}>Mkt IV</th>
                    <th className={thCls}>Fit IV</th>
                    <th className={thCls}>Resid</th>
                    <th className={cn(thCls, 'w-[30%] text-left')}>|resid| vs 30 bp</th>
                  </tr>
                </thead>
                <tbody>
                  {strikeRows.map((r) => (
                    <tr key={r.strike}>
                      <td className={cn(tdCls, 'text-left', r.atm ? 'font-semibold text-foreground' : 'text-secondary-foreground')}>
                        {r.strike}
                      </td>
                      <td className={cn(tdCls, 'text-muted-foreground')}>{r.delta != null ? r.delta.toFixed(2) : '—'}</td>
                      <td className={tdCls}>{r.mkt.toFixed(1)}</td>
                      <td className={tdCls}>{r.fitIv.toFixed(1)}</td>
                      <td className={cn(tdCls, !fitDegraded && r.residBp > 30 ? 'text-destructive' : 'text-muted-foreground')}>
                        {`${r.residBp >= 0 ? '+' : '−'}${Math.abs(r.residBp).toFixed(0)} bp`}
                      </td>
                      <td className={cn(tdCls, 'text-left')}>
                        <span className="relative block h-[5px] w-full overflow-hidden rounded-[3px] bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
                          <span
                            className={cn('absolute inset-y-0 left-0', !fitDegraded && Math.abs(r.residBp) > 30 ? 'bg-destructive' : 'bg-[var(--sk-mute2)]')}
                            style={{ width: `${Math.min(100, (Math.abs(r.residBp) / worstBp) * 100)}%` }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </>
        ) : (
          <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
            No chain snapshot with greeks for this expiry yet.
          </p>
        )}
        <SkewFitNumbers row={fitRow} />
        <SmileSecondFit sym={sym} expiry={fitRow?.expiry ?? null} />
        <ResidualHeatmap
          sym={sym}
          expiries={fitRows.slice(0, 6).map((r) => r.expiry as string)}
          spot={spot}
        />
        <p className={note}>
          Residual = market minus Gatheral raw-SVI fit; strikes rich to the fit are candidates
          to sell, cheap ones to own. Cross-symbol skew extremes live in Vol ratings. The hand
          sliders and the no-arbitrage lamps live on the{' '}
          <Link to="/research/lab/symbol" className="text-primary hover:underline">
            Surface face ⧉
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
