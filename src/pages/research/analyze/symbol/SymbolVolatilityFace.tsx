/**
 * The Volatility face — one name only (design `Research Symbol.dc.html`,
 * §isVol). Four panels, each opening with the lens's own verdict and the
 * record that earned it: IV rank against its year, the IV−RV premium, the
 * ATM term structure, and the SVI skew. The universe tables stay in
 * Ratings › Underlyings — this page is one name.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { LensVerdictBlock } from '@/components/research/LensVerdictBlock'
import { FaceKv } from '@/components/research/FaceKv'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useVrpHistory } from '@/hooks/useVrpData'
import { useResiduals, useTermStructure, useVolSurfaceFit } from '@/hooks/useVolSurfaceData'
import { cn } from '@/lib/utils'
import { chainFromSnapshots } from '@/utils/optionChain'
import { smileRows, sviFromRow } from '@/utils/sviSmile'
import { SviSmileChart } from '@/components/research/SviSmileChart'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 rounded-[10px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const panelHead =
  'flex flex-wrap items-center gap-2.5 rounded-t-[9px] border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3 py-1.75 text-dense-body leading-normal'
const note =
  'm-0 border-t border-border/60 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** Tiny bar strip — the 60d rank path / decile histogram of the prototype. */
function BarStrip({ bars, title }: { bars: { h: number; on?: boolean }[]; title: string }) {
  return (
    <div className="flex h-7 items-end gap-px" title={title}>
      {bars.map((b, i) => (
        <span
          key={i}
          className={cn('w-full min-w-[2px] flex-1 rounded-[1px]', b.on ? 'bg-[var(--sk-ticker)]' : 'bg-[var(--sk-line2)]')}
          style={{ height: `${Math.max(6, b.h)}%` }}
        />
      ))}
    </div>
  )
}

export function SymbolVolatilityFace({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const exQ = useExhibitComposite(['iv_rank', 'vrp', 'term_slope', 'skew'], sym)
  const exOf = (id: string) => exQ.data?.find((e) => e.lens === id || e.lens_id === id)
  const vrpQ = useVrpHistory(sym, 252)
  const termQ = useTermStructure(sym)
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

  // ── Term structure: the fitted ATM IV per expiry ──
  const term = useMemo(
    () =>
      (termQ.data ?? [])
        .filter((p) => p.dte != null && p.atm_vol != null)
        .slice(0, 6)
        .map((p) => ({
          label: p.expiry?.slice(5) ?? '—',
          dte: p.dte as number,
          iv: (p.atm_vol as number) * 100,
        })),
    [termQ.data]
  )
  const termMax = Math.max(1, ...term.map((t) => t.iv))

  // ── Skew: the nearest ~30d fit and its near-money smile, the lab's own rows ──
  const fitRow = useMemo(() => {
    const rows = (fitQ.data ?? []).filter((r) => r.expiry && r.dte != null && sviFromRow(r))
    let best = null as (typeof rows)[number] | null
    for (const r of rows) if (best == null || Math.abs((r.dte ?? 0) - 30) < Math.abs((best.dte ?? 0) - 30)) best = r
    return best
  }, [fitQ.data])
  const residQ = useResiduals(sym, fitRow?.expiry ?? '')
  const chainQ = useQuery({
    queryKey: ['market', 'option-snapshots', sym, fitRow?.expiry],
    queryFn: () => fetchOptionSnapshots(sym, fitRow!.expiry as string),
    enabled: Boolean(sym && fitRow?.expiry),
    staleTime: 5 * 60_000,
  })
  const smile = useMemo(() => {
    const p = fitRow ? sviFromRow(fitRow) : null
    if (!p || fitRow?.dte == null || fitRow.dte <= 0) return []
    return smileRows(residQ.data ?? [], chainFromSnapshots(chainQ.data?.rows ?? []), p, fitRow.dte / 365)
  }, [fitRow, residQ.data, chainQ.data?.rows])
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
          <span className="ml-auto text-dense-caption text-muted-foreground">source · vol-surface fit</span>
        </header>
        <LensVerdictBlock lensId="term_slope" exhibit={exOf('term_slope')} />
        <div className="flex flex-col gap-1.5 px-3 py-2.5">
          {term.length === 0 ? (
            <p className="m-0 text-dense-meta text-muted-foreground">No fitted expiries for this name.</p>
          ) : (
            term.map((t) => (
              <div key={t.label} className="grid grid-cols-[56px_34px_minmax(0,1fr)_52px] items-center gap-2 text-dense-meta">
                <span className={cn(mono, 'text-secondary-foreground')}>{t.label}</span>
                <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>{t.dte}d</span>
                <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
                  <span className="absolute inset-y-0 left-0 bg-[var(--sk-ticker)]" style={{ width: `${(t.iv / termMax) * 100}%` }} />
                </span>
                <span className={cn(mono, 'text-right')}>{t.iv.toFixed(1)}</span>
              </div>
            ))
          )}
          <div className="grid grid-cols-[56px_34px_minmax(0,1fr)_52px] gap-2 text-dense-micro text-muted-foreground">
            <span /> <span /> <span />
            <span className="text-right">ATM IV</span>
          </div>
        </div>
        <p className={note}>
          Front expiries carry more IV than the back in backwardation — an event or a squeeze is
          priced in. The design&rsquo;s 1y cone per horizon needs a term-structure history no store
          keeps yet, and the 25Δ risk-reversal column the same — unmeasured, not omitted.
        </p>
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>Skew &amp; surface</span>
          <span className="text-dense-body font-semibold">
            SVI fit · {fitRow?.expiry ? `${fitRow.expiry.slice(5)} · ${fitRow.dte}d` : '—'}
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">
            own pctl{' '}
            <span className={cn(mono, 'text-foreground')}>
              {typeof skewPctl === 'number' ? skewPctl.toFixed(0) : '—'}
            </span>
          </span>
        </header>
        <LensVerdictBlock lensId="skew" exhibit={exOf('skew')} />
        {smile.length > 0 ? (
          <SviSmileChart rows={smile} />
        ) : (
          <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
            No near-money residual rows for the anchor expiry.
          </p>
        )}
        <p className={note}>
          Market IV by strike against the raw-SVI fit, the lab&rsquo;s own rows at the nearest
          monthly tenor. The hand sliders and the no-arbitrage lamps live on the{' '}
          <Link to="/research/lab/symbol" className="text-primary hover:underline">
            Surface face ⧉
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
