/**
 * The Dealer face's two history panels — the ones its first walk seated as
 * «unmeasured» and the stores answer (Owner 2026-09-26, DESIGN_CONTRACTS
 * §15.6):
 *
 * - Regime timeline — `/research/gex/levels` answers any past trade date, one
 *   date a call. Each session is read at the gex_regime exhibit's own expiry,
 *   so the timeline's walls are the same figures as the Gamma levels panel
 *   above it (the terrain's inputs carry a front-expiry set that disagrees:
 *   PLTR 09-25 walls 190/190 there, 180/175 at the exhibit's 10-23).
 * - Max pain vs spot — the market-data plugin's
 *   `/market/analytics/max-pain/compute/history` (PLTR 10-23: 55 sessions)
 *   against the name's own daily closes.
 */
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchGexLevels } from '@/api/researchEngine'
import { fetchStockDailyCloses, type DailyBar } from '@/api/marketData/dailyBars'
import { fetchMaxPainComputeHistory } from '@/api/research/optionDiscovery'
import { todayIso } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'

const cap = 'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td = 'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums'
const TIMELINE_SESSIONS = 12
const TREND_SESSIONS = 30

/** A year of daily closes — the same query the Volatility face reads, so one cache serves both. */
function useSymbolCloses(sym: string) {
  return useQuery({
    queryKey: ['market', 'stock-daily-closes-1y', sym],
    queryFn: () =>
      fetchStockDailyCloses(sym, new Date(Date.now() - 420 * 86_400_000).toISOString().slice(0, 10), todayIso()),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
}

export interface TimelineRow {
  date: string
  spot: number | null
  zeroGamma: number | null
  callWall: number | null
  putWall: number | null
  /** Spot above zero γ: dealers long gamma, they damp. */
  longGamma: boolean | null
  /** Close-to-close change into the next session; null on the newest. */
  nextMove: number | null
}

const numOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * The last sessions' levels at one expiry, oldest first. Trading dates come
 * from the name's closes, which also give the next-day move.
 */
export function useDealerTimeline(sym: string, expiry: string | null) {
  const closesQ = useSymbolCloses(sym)
  const closes: DailyBar[] = closesQ.data ?? []
  const tail = closes.slice(-TIMELINE_SESSIONS)
  const levelQs = useQueries({
    queries: tail.map((b) => ({
      queryKey: ['research', 'gex-levels', sym, b.date, expiry],
      queryFn: () => fetchGexLevels(sym, b.date, expiry ?? undefined),
      enabled: Boolean(sym && expiry),
      staleTime: 30 * 60_000,
    })),
  })
  const rows: TimelineRow[] = tail.map((b, i) => {
    const raw = (levelQs[i]?.data?.rows ?? [])[0] as Record<string, unknown> | undefined
    const spot = numOf(raw?.spot)
    const zeroGamma = numOf(raw?.zero_gamma)
    const at = closes.length - tail.length + i
    const next = closes[at + 1]?.close
    const cur = b.close
    return {
      date: b.date,
      spot,
      zeroGamma,
      callWall: numOf(raw?.major_call_wall),
      putWall: numOf(raw?.major_put_wall),
      longGamma: spot != null && zeroGamma != null ? spot > zeroGamma : null,
      nextMove: next != null && cur != null && cur > 0 ? (next / cur - 1) * 100 : null,
    }
  })
  // Sessions on the newest row's side of zero γ, counted back without a break.
  const newest = [...rows].reverse().find((r) => r.longGamma != null)
  let streak = 0
  if (newest) {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].longGamma == null) continue
      if (rows[i].longGamma !== newest.longGamma) break
      streak += 1
    }
  }
  const loading = closesQ.isLoading || levelQs.some((q) => q.isLoading)
  return { rows, streak: newest ? streak : null, longGamma: newest?.longGamma ?? null, loading }
}

export function DealerRegimeTimeline({
  rows,
  loading,
  expiry,
}: {
  rows: TimelineRow[]
  loading: boolean
  expiry: string | null
}) {
  const shown = rows.filter((r) => r.spot != null)
  if (shown.length === 0) {
    return (
      <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
        {loading
          ? 'Loading the levels history…'
          : expiry
            ? `The levels store holds no session at the ${expiry} expiry in the last ${TIMELINE_SESSIONS} trading days.`
            : 'No gex_regime expiry to read the levels at.'}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={cn(th, 'text-left')}>Session</th>
            <th className={th}>Spot</th>
            <th className={th}>Zero γ</th>
            <th className={th}>Call wall</th>
            <th className={th}>Put wall</th>
            <th className={cn(th, 'text-left')}>Regime</th>
            <th className={th} title="Close-to-close change into the next session — the realised check of damp vs chase.">
              Next-day move
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.date}>
              <td className={cn(td, 'text-left text-muted-foreground')}>{r.date.slice(5)}</td>
              <td className={td}>{r.spot?.toFixed(2)}</td>
              <td className={cn(td, 'text-warning')}>{r.zeroGamma != null ? r.zeroGamma.toFixed(1) : '—'}</td>
              <td className={cn(td, 'text-muted-foreground')}>{r.callWall ?? '—'}</td>
              <td className={cn(td, 'text-muted-foreground')}>{r.putWall ?? '—'}</td>
              <td className={cn(td, 'text-left font-sans', r.longGamma === false ? 'text-warning' : 'text-foreground')}>
                {r.longGamma == null ? '—' : r.longGamma ? 'long γ' : 'short γ'}
              </td>
              <td
                className={cn(
                  td,
                  r.nextMove == null ? 'text-muted-foreground' : Math.abs(r.nextMove) > 3 ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {r.nextMove == null ? '—' : `${r.nextMove >= 0 ? '+' : '−'}${Math.abs(r.nextMove).toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DealerMaxPainTrend({ sym, expiry }: { sym: string; expiry: string | null }) {
  const closesQ = useSymbolCloses(sym)
  const mpQ = useQuery({
    queryKey: ['market', 'max-pain-history', sym, expiry],
    queryFn: () => fetchMaxPainComputeHistory({ symbol: sym, expiry: expiry as string, lookbackDays: 60 }),
    enabled: Boolean(sym && expiry),
    staleTime: 30 * 60_000,
  })
  const closeOn = new Map((closesQ.data ?? []).map((b) => [b.date, b.close]))
  const pts = (mpQ.data?.series ?? [])
    .map((p) => ({ date: p.trade_date.slice(0, 10), mp: p.max_pain_strike, close: closeOn.get(p.trade_date.slice(0, 10)) ?? null }))
    .filter((p): p is { date: string; mp: number; close: number } => Number.isFinite(p.mp) && p.close != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-TREND_SESSIONS)

  if (pts.length < 2) {
    return (
      <p className="m-0 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
        {mpQ.isLoading || closesQ.isLoading
          ? 'Loading the max-pain history…'
          : mpQ.data && !mpQ.data.ok
            ? `The plugin's max-pain history did not answer for ${expiry ?? 'this expiry'}: ${mpQ.data.error ?? 'no detail'}.`
            : `Fewer than two sessions of max pain at ${expiry ?? 'this expiry'} line up with a close.`}
      </p>
    )
  }

  const all = pts.flatMap((p) => [p.close, p.mp * 1.01, p.mp * 0.99])
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const W = 600
  const H = 170
  const x = (i: number) => 4 + (i / Math.max(1, pts.length - 1)) * (W - 8)
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo || 1)) * (H - 20)
  const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')
  const band =
    line(pts.map((p) => p.mp * 1.01)) +
    pts
      .map((p, i) => ({ p, i }))
      .reverse()
      .map(({ p, i }) => `L${x(i).toFixed(1)} ${y(p.mp * 0.99).toFixed(1)}`)
      .join('') +
    'Z'
  const last = pts[pts.length - 1]
  const gap = ((last.close - last.mp) / last.mp) * 100
  const held = pts.slice(-10).filter((p) => Math.abs(p.close - p.mp) / p.mp < 0.01).length
  const n = pts.length

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className={cap}>Max pain vs spot · {n} sessions</span>
        <span className="ml-auto font-mono text-dense-micro tabular-nums text-muted-foreground">
          gap now{' '}
          <b className={Math.abs(gap) < 1 ? 'text-warning' : 'text-foreground'}>
            {`${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(1)}%`}
          </b>{' '}
          · pin held {held} of last {Math.min(10, n)}
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Max pain at the ${expiry} expiry versus the close over ${n} sessions`}
        >
          <path d={band} fill="color-mix(in srgb, var(--sk-ink) 6%, transparent)" />
          <path d={line(pts.map((p) => p.mp))} fill="none" stroke="var(--sk-mute2)" strokeWidth="1.4" strokeDasharray="4 3" />
          <path d={line(pts.map((p) => p.close))} fill="none" stroke="var(--sk-ticker)" strokeWidth="1.6" />
        </svg>
        <span className="pointer-events-none absolute right-1 top-0.5 font-mono text-dense-micro text-muted-foreground">
          {hi.toFixed(0)}
        </span>
        <span className="pointer-events-none absolute bottom-2 right-1 font-mono text-dense-micro text-muted-foreground">
          {lo.toFixed(0)}
        </span>
      </div>
      <div className="flex justify-between pt-0.5 font-mono text-dense-micro text-muted-foreground">
        <span>{pts[0].date.slice(5)}</span>
        <span>{pts[Math.floor((n - 1) / 2)].date.slice(5)}</span>
        <span>{last.date.slice(5)}</span>
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 pt-1.5 text-dense-micro text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-0 w-3.5 border-t-2 border-[var(--sk-ticker)]" />
          close
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-0 w-3.5 border-t-2 border-dashed border-[var(--sk-mute2)]" />
          max pain · {expiry}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-3.5 bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]" />
          ±1% of max pain
        </span>
      </div>
    </div>
  )
}
