/**
 * The Dealer face — one name only (design `Research Symbol.dc.html`,
 * §isDealer). Gamma levels with the walls on a ruler and the strike GEX
 * distribution under them, then the OpEx cycle with the pin's own record.
 * Everything drawn is the store's: the gex_regime and opex_pin exhibits,
 * `/research/gex/distribution`'s per-strike rows at the exhibit's own
 * expiry, the opex store's daily row and cycle history, and — since
 * 2026-09-26 — the two histories this face had seated as unmeasured: the
 * levels store answers any past trade date (the regime timeline), and the
 * market-data plugin keeps max pain per session (SymbolDealerHistory). What
 * no store keeps — a pin score, per-strike vanna/charm — keeps its seat.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchGexDistribution } from '@/api/researchEngine'
import { fetchOpexCurrent, fetchOpexHistory, fetchOpexPinAnalysis } from '@/api/research/opexCycle'
import { classifyExpiration } from '@/utils/optionDiscovery/expirationMeta'
import { DealerMaxPainTrend, DealerRegimeTimeline, useDealerTimeline } from './SymbolDealerHistory'
import { Link } from 'react-router-dom'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH, TAB_PARAM } from '@/lib/symbolTabs'
import { VannaCharmMap } from '@/components/charts/VannaCharmMap'
import { LensVerdictBlock } from '@/components/research/LensVerdictBlock'
import { FaceKv } from '@/components/research/FaceKv'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { cn } from '@/lib/utils'

const cap =
  'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'
const panel =
  'min-w-0 border mat-card'
const panelHead =
  'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal'
const note =
  'm-0 border-t border-border/60 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td =
  'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums'

interface DistRow {
  strike: number
  expiry: string
  call_oi: number
  put_oi: number
  call_gex: number
  put_gex: number
  call_volume: number
  put_volume: number
}

function parseDist(rows: unknown[]): DistRow[] {
  return rows.flatMap((raw) => {
    const r = raw as Record<string, unknown>
    const strike = typeof r.strike === 'number' ? r.strike : null
    const expiry = typeof r.expiry === 'string' ? r.expiry : null
    if (strike == null || expiry == null) return []
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    return [
      {
        strike,
        expiry,
        call_oi: num(r.call_oi),
        put_oi: num(r.put_oi),
        call_volume: num(r.call_volume),
        put_volume: num(r.put_volume),
        call_gex: num(r.call_gex),
        put_gex: num(r.put_gex),
      },
    ]
  })
}

const netOf = (r: DistRow) => r.call_gex + r.put_gex

/* The store keeps per-strike volumes beside the OI (gex_source says so:
   oi_gamma+volume) — the volume-basis GEX is the same per-contract gamma
   re-weighted by what actually traded, not a second aggregation. */
const volGexOf = (r: DistRow) => {
  const c = r.call_oi > 0 ? (r.call_gex / r.call_oi) * r.call_volume : 0
  const put = r.put_oi > 0 ? (r.put_gex / r.put_oi) * r.put_volume : 0
  return c + put
}

function walkGex(rows: DistRow[]): { maxAbs: number; cums: number[] } {
  let c = 0
  const cums: number[] = []
  let maxAbs = 1
  for (const r of rows) {
    const v = netOf(r)
    maxAbs = Math.max(maxAbs, Math.abs(v))
    c += v
    cums.push(c)
  }
  return { maxAbs, cums }
}

function nearMoneyRows(raw: unknown[], expiry: string | null, spot: number | null): DistRow[] {
  if (!expiry || spot == null) return []
  return parseDist(raw)
    .filter((r) => r.expiry === expiry && Math.abs(r.strike / spot - 1) <= 0.25)
    .sort((a, b) => a.strike - b.strike)
}

const fmtM = (v: number) =>
  `${v < 0 ? '−' : ''}${Math.abs(v) >= 1e6 ? `${(Math.abs(v) / 1e6).toFixed(1)}M` : `${(Math.abs(v) / 1e3).toFixed(0)}k`}`

/** Σ vanna / Σ charm in the store's own units, signed, k past a thousand. */
const fmtSignedK = (v: number | null) =>
  v == null
    ? '—'
    : `${v >= 0 ? '+' : '−'}${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(1)}k` : Math.abs(v).toFixed(0)}`

export function SymbolDealerFace({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const exQ = useExhibitComposite(['gex_regime', 'opex_pin'], sym)
  const exOf = (id: string) => exQ.data?.find((e) => e.lens === id || e.lens_id === id)
  const gexEx = exOf('gex_regime')
  const pinEx = exOf('opex_pin')
  const g = (gexEx?.readings ?? {}) as Record<string, unknown>
  const p = (pinEx?.readings ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  const spot = num(g.spot)
  const zeroG = num(g.zero_gamma)
  const callWall = num(g.major_call_wall)
  const putWall = num(g.major_put_wall)
  const netGex = num(g.total_net_gex)
  const expiry = typeof g.expiry === 'string' ? g.expiry : null

  const distQ = useQuery({
    queryKey: ['research', 'gex-distribution', sym],
    queryFn: () => fetchGexDistribution(sym),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  // Vanna/charm live in the opex store's own daily row; the past cycles in
  // its pin analysis — both were owed until the endpoint was probed.
  const opexQ = useQuery({
    queryKey: ['research', 'opex-current', sym],
    queryFn: () => fetchOpexCurrent(sym),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  // The store's whole pin record (the route's own cap, 24 cycles) — the
  // retired OpEx section read 24 where this face had read 8.
  const pinsQ = useQuery({
    queryKey: ['research', 'opex-pins', sym, 24],
    queryFn: () => fetchOpexPinAnalysis(sym, 24),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  // Σ vanna / Σ charm as each cycle closed, joined to its pin row by date.
  const cyclesQ = useQuery({
    queryKey: ['research', 'opex-history', sym, 24],
    queryFn: () => fetchOpexHistory(sym, 24),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const vanna = opexQ.data?.row?.total_vanna ?? null
  const charm = opexQ.data?.row?.total_charm ?? null
  const vannaZero = opexQ.data?.row?.vanna_zero_strike ?? null
  const charmZero = opexQ.data?.row?.charm_zero_strike ?? null
  const pins = pinsQ.data?.rows ?? []
  const pinRate = pinsQ.data?.pin_rate ?? null
  const cycleOn = new Map((cyclesQ.data ?? []).map((c) => [c.opex_date ?? '', c]))
  const timeline = useDealerTimeline(sym, expiry)
  // The opex strike map is `ORDER BY strike LIMIT 60` on the server — for a
  // name above its 60th strike (PLTR: 5…145 against spot 190) it misses the
  // money entirely, and the map says so rather than passing for a near-money read.
  const mapStrikes = (opexQ.data?.strike_map ?? []).map((r) => r.strike).filter((k): k is number => k != null)
  const mapSpot = opexQ.data?.row?.spot ?? spot
  const mapMax = mapStrikes.length > 0 ? Math.max(...mapStrikes) : null
  const mapMin = mapStrikes.length > 0 ? Math.min(...mapStrikes) : null
  const mapOutOfRange = mapSpot != null && mapMax != null && mapMin != null && (mapSpot > mapMax || mapSpot < mapMin)
  const pinExpiry = typeof p.expiry === 'string' ? p.expiry : expiry

  // The exhibit's own expiry, near-the-money — the chart the regime was read from.
  const rows = nearMoneyRows(distQ.data?.rows ?? [], expiry, spot)

  // Bar scale and the cumulative walk in one pass — where the cumulative
  // crosses zero is the flip.
  const { maxAbs, cums } = walkGex(rows)
  const cumLo = Math.min(0, ...cums)
  const cumHi = Math.max(0, ...cums)

  const marks =
    spot != null && zeroG != null && callWall != null && putWall != null
      ? (() => {
          const vals = [spot, zeroG, callWall, putWall]
          const lo = Math.min(...vals)
          const hi = Math.max(...vals)
          const pad = (hi - lo) * 0.12 || 1
          const posOf = (v: number) => ((v - lo + pad) / (hi - lo + 2 * pad)) * 100
          return { posOf, lo: lo - pad, hi: hi + pad }
        })()
      : null

  const W = 900
  const H = 170
  const plotH = 156
  const zeroY = plotH * (cumHi / (cumHi - cumLo || 1)) * 0 + plotH / 2 // bars sit on the middle line
  const barY = (v: number) => (v >= 0 ? zeroY - (v / maxAbs) * (plotH / 2 - 6) : zeroY)
  const barH = (v: number) => Math.max(1.5, (Math.abs(v) / maxAbs) * (plotH / 2 - 6))
  const cumY = (v: number) =>
    plotH - ((v - cumLo) / (cumHi - cumLo || 1)) * (plotH - 12) - 6
  const X = (i: number) => (rows.length <= 1 ? W / 2 : (i / (rows.length - 1)) * (W - 20) + 10)
  const strikeX = (k: number) => {
    if (rows.length === 0) return null
    const lo = rows[0].strike
    const hi = rows[rows.length - 1].strike
    if (hi <= lo) return null
    return ((k - lo) / (hi - lo)) * (W - 20) + 10
  }

  // The design's window is contiguous around spot — the small put books
  // below are half the reading, and a top-N cut hides them.
  const tableRows = (() => {
    if (rows.length === 0 || spot == null) return []
    let idx = 0
    for (let i = 1; i < rows.length; i++)
      if (Math.abs(rows[i].strike - spot) < Math.abs(rows[idx].strike - spot)) idx = i
    const lo = Math.max(0, idx - 5)
    return rows.slice(lo, Math.min(rows.length, idx + 6))
  })()
  const sideMax = Math.max(
    1,
    ...tableRows.flatMap((r) => [Math.abs(r.call_gex), Math.abs(r.put_gex)]),
  )
  const nearestTo = (v: number | null) => {
    if (v == null || tableRows.length === 0) return null
    let best = tableRows[0].strike
    for (const r of tableRows) if (Math.abs(r.strike - v) < Math.abs(best - v)) best = r.strike
    return best
  }
  const zeroRowStrike = nearestTo(zeroG)
  const spotRowStrike = nearestTo(spot)
  const dist = (v: number | null) =>
    v == null || spot == null || spot === 0 ? '—' : `${(((v - spot) / spot) * 100).toFixed(1)}%`

  // ── OpEx readings ──
  const pinDist = num(p.pin_pct_distance)
  const maxPain = num(p.max_pain_strike)
  const close = num(p.close)
  const dte = num(p.dte)
  const totalOi = num(p.total_oi)
  const oiMax = Math.max(1, ...rows.map((r) => r.call_oi + r.put_oi))
  /* What option sellers pay out if the cycle closes at each strike — the
     max-pain payout function on the same book, ×100 shares a contract. The
     minimum of this curve is the max pain the exhibit already names. */
  const liab = rows.map((s0) => ({
    strike: s0.strike,
    v:
      rows.reduce(
        (a, r) =>
          a + Math.max(0, s0.strike - r.strike) * r.call_oi + Math.max(0, r.strike - s0.strike) * r.put_oi,
        0,
      ) * 100,
  }))
  const liabMax = Math.max(1, ...liab.map((l) => l.v))
  const liabPath =
    liab.length >= 2
      ? liab
          .map((l, i) => `${i === 0 ? 'M' : 'L'}${((i / Math.max(1, liab.length - 1)) * 580 + 10).toFixed(1)},${(8 + (1 - l.v / liabMax) * 100).toFixed(1)}`)
          .join(' ')
      : null
  const liabAtMp =
    maxPain != null && liab.length > 0
      ? liab.reduce((best, l) => (Math.abs(l.strike - (maxPain ?? 0)) < Math.abs(best.strike - (maxPain ?? 0)) ? l : best)).v
      : null
  const mpX = maxPain != null ? strikeX(maxPain) : null
  const spotX = spot != null ? strikeX(spot) : null

  return (
    <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr))]">
      <section className={cn(panel, 'col-[1/-1]')}>
        <header className={panelHead}>
          <span className={cap}>Gamma levels</span>
          <span className="text-dense-body font-semibold">where the dealers sit</span>
          <span className="text-dense-caption text-muted-foreground">
            OI-GEX · {expiry ?? '—'}
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">
            source · gex_regime exhibit
          </span>
        </header>
        <LensVerdictBlock lensId="gex_regime" exhibit={gexEx} />
        <div className="px-4 pb-1 pt-8">
          {marks ? (
            <div className="relative mb-7 h-1.5 rounded-full bg-[var(--sk-line0)]">
              {putWall != null ? (
                <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap font-mono text-dense-micro text-loss" style={{ left: `${marks.posOf(putWall)}%` }}>
                  Put wall {putWall}
                </span>
              ) : null}
              {zeroG != null ? (
                <span className="absolute -bottom-5 -translate-x-1/2 whitespace-nowrap font-mono text-dense-micro text-warning" style={{ left: `${marks.posOf(zeroG)}%` }}>
                  Zero γ {zeroG.toFixed(1)}
                </span>
              ) : null}
              {spot != null ? (
                <>
                  <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap font-mono text-dense-micro font-bold text-[var(--sk-ticker)]" style={{ left: `${marks.posOf(spot)}%` }}>
                    Spot {spot.toFixed(2)}
                  </span>
                  <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--sk-ticker)]" style={{ left: `${marks.posOf(spot)}%` }} />
                </>
              ) : null}
              {callWall != null ? (
                <span className="absolute -bottom-5 -translate-x-1/2 whitespace-nowrap font-mono text-dense-micro text-profit" style={{ left: `${marks.posOf(callWall)}%` }}>
                  Call wall {callWall}
                </span>
              ) : null}
            </div>
          ) : null}
          {rows.length > 0 ? (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 block h-auto w-full" role="img" aria-label="Dealer gamma exposure by strike with cumulative curve">
                <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="var(--sk-line2)" strokeWidth="1" />
                {rows.map((r, i) => {
                  const v = netOf(r)
                  return (
                    <rect
                      key={r.strike}
                      x={X(i) - 3}
                      y={barY(v)}
                      width="6"
                      height={barH(v)}
                      fill={v >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'}
                      opacity="0.8"
                    />
                  )
                })}
                <polyline
                  points={cums.map((c, i) => `${X(i).toFixed(1)},${cumY(c).toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeWidth="1.4"
                />
                {spotX != null ? (
                  <line x1={spotX} x2={spotX} y1="0" y2={plotH} stroke="var(--sk-ticker)" strokeWidth="1" />
                ) : null}
                {zeroG != null && strikeX(zeroG) != null ? (
                  <line x1={strikeX(zeroG)!} x2={strikeX(zeroG)!} y1="0" y2={plotH} stroke="var(--sk-warn)" strokeWidth="1" strokeDasharray="3 3" />
                ) : null}
              </svg>
              <div className="flex justify-between pt-0.5 font-mono text-dense-micro text-muted-foreground">
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const i = Math.round(t * (rows.length - 1))
                  return <span key={t}>{rows[i]?.strike}</span>
                })}
              </div>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1 pt-1.5 text-dense-micro text-muted-foreground">
                <span><i className="mr-1 inline-block h-0.5 w-3.5 bg-profit align-[3px]" />calls · dealers long γ</span>
                <span><i className="mr-1 inline-block h-0.5 w-3.5 bg-loss align-[3px]" />puts · dealers short γ</span>
                <span><i className="mr-1 inline-block h-0.5 w-3.5 bg-foreground align-[3px]" />cumulative — crosses zero at the flip</span>
                <span><i className="mr-1 inline-block w-3.5 border-t-2 border-dashed border-warning align-[3px]" />zero γ</span>
                <span><i className="mr-1 inline-block w-3.5 border-t-2 border-[var(--sk-ticker)] align-[3px]" />spot</span>
              </div>
            </>
          ) : (
            <p className="m-0 py-2 text-dense-meta text-muted-foreground">
              No strike distribution at the exhibit&rsquo;s expiry.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5 py-2.5 sm:grid-cols-5">
            <FaceKv label="to put wall" value={dist(putWall)} cls="text-loss" />
            <FaceKv label="to zero γ" value={dist(zeroG)} cls="text-warning" />
            <FaceKv label="to call wall" value={dist(callWall)} cls="text-profit" />
            <FaceKv label="net GEX" value={netGex != null ? fmtM(netGex) : '—'} />
            <FaceKv
              label="sessions in regime"
              value={
                timeline.streak != null
                  ? `${timeline.streak} · ${timeline.longGamma ? 'long γ' : 'short γ'}`
                  : '—'
              }
              cls={timeline.streak == null ? 'text-muted-foreground' : timeline.longGamma ? undefined : 'text-warning'}
              title={`Sessions on today's side of zero γ without a break, from the regime timeline (levels at ${expiry ?? 'the exhibit expiry'}).`}
            />
          </div>
        </div>
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>Strike GEX</span>
          <span className="text-dense-body font-semibold">OI solid · volume inner</span>
          <span className="ml-auto text-dense-caption text-muted-foreground">{expiry ?? '—'}</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(th, 'text-left')}>Strike</th>
                <th className={cn(th, 'w-[38%] text-left')}>− puts · calls +</th>
                <th className={th}>OI GEX</th>
                <th className={th}>Vol GEX</th>
                <th className={cn(th, 'w-8')} />
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => {
                const v = netOf(r)
                const vv = volGexOf(r)
                const isZero = r.strike === zeroRowStrike
                const tag = [
                  r.strike === callWall ? 'call wall' : null,
                  r.strike === putWall ? 'put wall' : null,
                  isZero ? 'zero γ' : null,
                  !isZero && r.strike === spotRowStrike ? 'spot' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || null
                return (
                  <tr key={r.strike} className={cn(isZero && 'shadow-[inset_0_0_0_1px_var(--color-warning)]')}>
                    <td className={cn(td, 'text-left', tag ? 'font-bold text-foreground' : 'text-secondary-foreground')}>
                      {r.strike}
                      {tag ? (
                        <span className={cn('ml-1.5 font-sans text-dense-micro', isZero ? 'text-warning' : 'text-muted-foreground')}>
                          {tag}
                        </span>
                      ) : null}
                    </td>
                    <td className={cn(td, 'text-left')}>
                      {/* Puts left, calls right of one axis — the design's bar;
                          the solid bar is the OI book, the thinner inner one is
                          the session's volume on the same per-contract gamma. */}
                      <div className="relative h-3.5">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--sk-line2)]" />
                        <span
                          className="absolute top-0.5 h-1.5 bg-destructive opacity-80"
                          style={{ right: '50%', width: `${(Math.abs(r.put_gex) / sideMax) * 50}%` }}
                        />
                        <span
                          className="absolute top-0.5 h-1.5 bg-success opacity-80"
                          style={{ left: '50%', width: `${(Math.abs(r.call_gex) / sideMax) * 50}%` }}
                        />
                        <span
                          className="absolute bottom-0.5 h-[3px] bg-destructive opacity-50"
                          style={{
                            right: '50%',
                            width: `${(Math.min(Math.abs(r.put_oi > 0 ? (r.put_gex / r.put_oi) * r.put_volume : 0), sideMax) / sideMax) * 50}%`,
                          }}
                        />
                        <span
                          className="absolute bottom-0.5 h-[3px] bg-success opacity-50"
                          style={{
                            left: '50%',
                            width: `${(Math.min(Math.abs(r.call_oi > 0 ? (r.call_gex / r.call_oi) * r.call_volume : 0), sideMax) / sideMax) * 50}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className={cn(td, v >= 0 ? 'text-success' : 'text-destructive')}>{fmtM(v)}</td>
                    <td className={cn(td, vv >= 0 ? 'text-success' : 'text-destructive')}>{fmtM(vv)}</td>
                    <td className={cn(td, 'w-8 text-center')}>
                      <Link
                        to={withSymbolParam(
                          `${SYMBOL_PATH}?${TAB_PARAM}=chain&expiration=${expiry ?? ''}&strike=${r.strike}`,
                          sym
                        )}
                        className="text-muted-foreground no-underline hover:text-foreground"
                        title="Rule this strike in the Chain face's ladder"
                      >
                        ⇢
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className={note}>
          Positive = dealers long gamma at that strike (they sell rallies, buy dips into it).
          Walls are the largest books each side; zero γ is where the cumulative sum crosses,
          ringed amber. The volume column is real after all — the store keeps per-strike
          volumes beside the OI, so both bases are drawn at once and the design’s OI/Volume
          toggle has nothing left to switch. ⇢ rules the strike in the Chain ladder.
        </p>
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>Regime timeline</span>
          <span className="text-dense-body font-semibold">last 12 sessions</span>
          <span className="ml-auto text-dense-caption text-muted-foreground">spot vs zero γ</span>
        </header>
        <DealerRegimeTimeline rows={timeline.rows} loading={timeline.loading} expiry={expiry} />
        <p className={note}>
          A flip that held two sessions is a regime; a one-day cross is noise. Next-day move is the
          realised check of damp vs chase. Each session is read at {expiry ?? 'the exhibit’s'} expiry,
          so its walls are the panel above&rsquo;s.
        </p>
      </section>

      <section className={cn(panel, 'col-[1/-1]')}>
        <header className={panelHead}>
          <span className={cap}>OpEx cycle</span>
          <span className="text-dense-body font-semibold">
            {/* Only a monthly is a third Friday; the pin exhibit's expiry is often a weekly (PLTR 09-25: 10-23). */}
            {pinExpiry && classifyExpiration(pinExpiry) !== 'weeklies' ? 'third Friday · ' : ''}
            {pinExpiry ?? '—'}
            {dte != null ? ` · ${dte} days` : ''}
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">source · opex_pin exhibit</span>
        </header>
        <LensVerdictBlock lensId="opex_pin" exhibit={pinEx} />
        <div className="grid grid-cols-1 items-start border-b border-border/60 md:grid-cols-[250px_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5 px-3 py-2.5 md:border-r md:border-border/60">
          <FaceKv label="pin strike" value={maxPain != null ? String(maxPain) : '—'} title="The strike the current cycle would pin to — today's max pain." />
          <FaceKv
            label="distance"
            value={pinDist != null ? `${(pinDist * 100).toFixed(1)}%` : '—'}
            cls={pinDist != null && pinDist < 0.01 ? 'text-warning' : undefined}
          />
          <FaceKv
            label="pin score"
            value="—"
            cls="text-muted-foreground"
            title="The design scores the pin 0–100 as OpEx approaches; no store computes one — unmeasured, not omitted."
          />
          <FaceKv label="close · OI" value={`${close != null ? close.toFixed(2) : '—'} · ${totalOi != null ? totalOi.toLocaleString() : '—'}`} />
          <FaceKv
            label="vanna"
            value={vanna != null ? `${vanna >= 0 ? '+' : '−'}${Math.abs(vanna) >= 1000 ? `${(Math.abs(vanna) / 1000).toFixed(1)}k` : Math.abs(vanna).toFixed(0)} /vol pt` : '—'}
            cls={vanna != null ? (vanna >= 0 ? 'text-success' : 'text-destructive') : 'text-muted-foreground'}
            title="Delta picked up per point of IV — vanna > 0 with falling IV means dealers buy into strength, supportive into the print."
          />
          <FaceKv
            label="charm"
            value={charm != null ? `${charm >= 0 ? '+' : '−'}${Math.abs(charm) >= 1000 ? `${(Math.abs(charm) / 1000).toFixed(1)}k` : Math.abs(charm).toFixed(0)} /day` : '—'}
            cls={charm != null ? (charm >= 0 ? 'text-success' : 'text-destructive') : 'text-muted-foreground'}
            title="Delta decaying off per day — charm accelerates in the last three sessions, when a pin either takes or fails."
          />
          <FaceKv
            label="vanna₀ · charm₀"
            value={`${vannaZero != null ? vannaZero.toFixed(1) : '—'} · ${charmZero != null ? charmZero.toFixed(1) : '—'}`}
            title="The strikes where the store's net vanna and net charm cross zero."
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 px-3 pt-2">
            <span className={cap}>past cycles</span>
            <span className="ml-auto font-mono text-dense-micro tabular-nums text-muted-foreground">
              pinned within 0.5% · {pinRate != null ? `${Math.round(pinRate * 100)}%` : '—'} of {pins.length}
            </span>
          </div>
          {pins.length === 0 ? (
            <p className="m-0 px-3 py-2 text-dense-micro text-muted-foreground">
              No settled cycles in the store yet for this name.
            </p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(th, 'text-left')}>Cycle</th>
                  <th className={th}>Pin strike</th>
                  <th className={th}>Close</th>
                  <th className={th} title="Settle against max pain, signed: + closed above it.">Dist</th>
                  <th className={th}>OI</th>
                  <th className={th} title="Σ vanna · Σ charm as the cycle closed, from the opex store's cycle history.">
                    Σ vanna · Σ charm
                  </th>
                  <th className={th} title="The design scores each cycle at T-6; no store keeps a per-cycle pin score history — unmeasured, not omitted.">
                    Score at T−6
                  </th>
                  <th className={cn(th, 'text-left')}>Pinned?</th>
                </tr>
              </thead>
              <tbody>
                {pins.map((r) => {
                  const pct = r.pct_distance != null ? Math.abs(r.pct_distance) * 100 : null
                  const tier = pct == null ? null : pct < 0.5 ? 'pinned' : pct < 1.25 ? 'near' : 'no'
                  const tierCls =
                    tier === 'pinned' ? 'text-success' : tier === 'near' ? 'text-warning' : 'text-muted-foreground'
                  const signed = r.pct_distance != null ? r.pct_distance * 100 : null
                  const cyc = cycleOn.get(r.opex_date ?? '')
                  return (
                    <tr key={r.opex_date ?? r.expiry ?? ''}>
                      <td className={cn(td, 'text-left text-muted-foreground')}>{r.opex_date?.slice(5) ?? '—'}</td>
                      <td className={td}>{r.max_pain_strike ?? '—'}</td>
                      <td className={td}>{r.settle_close != null ? r.settle_close.toFixed(2) : '—'}</td>
                      <td className={cn(td, tierCls)}>
                        {signed != null ? `${signed >= 0 ? '+' : '−'}${Math.abs(signed).toFixed(1)}%` : '—'}
                      </td>
                      <td className={cn(td, 'text-muted-foreground')}>
                        {r.total_oi != null ? Math.round(r.total_oi).toLocaleString() : '—'}
                      </td>
                      <td className={cn(td, 'text-muted-foreground')}>
                        {cyc ? `${fmtSignedK(cyc.total_vanna)} · ${fmtSignedK(cyc.total_charm)}` : '—'}
                      </td>
                      <td className={cn(td, 'text-muted-foreground/60')}>—</td>
                      <td className={cn(td, 'text-left font-sans', tierCls)}>{tier ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
        </div>
        <div className="grid grid-cols-1 items-start md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {rows.length > 0 ? (
          <div className="px-3 pb-1">
            <div className="mb-1 flex flex-wrap items-baseline gap-2">
              <span className={cap}>OI by strike · {expiry?.slice(5) ?? ''}</span>
              {liabAtMp != null ? (
                <span className="ml-auto font-mono text-dense-micro tabular-nums text-muted-foreground">
                  max pain <b className="text-foreground">{maxPain}</b> · seller liability there{' '}
                  <b className="text-foreground">${fmtM(liabAtMp)}</b>
                </span>
              ) : null}
            </div>
            <svg viewBox="0 0 600 150" className="block h-auto w-full" role="img" aria-label="Open interest by strike, calls above puts, seller liability curve, max pain and spot">
              {liabPath ? <path d={liabPath} fill="none" stroke="var(--foreground)" strokeWidth="1.1" opacity="0.85" /> : null}
              {rows.map((r, i) => {
                const x = (i / Math.max(1, rows.length - 1)) * 580 + 10
                const ch = (r.call_oi / oiMax) * 130
                const ph = (r.put_oi / oiMax) * 130
                return (
                  <g key={r.strike}>
                    <rect x={x - 2.5} y={140 - ch} width="5" height={ch} fill="var(--color-success)" opacity="0.75" />
                    <rect x={x - 2.5} y={140 - ch - ph} width="5" height={ph} fill="var(--color-destructive)" opacity="0.75" />
                  </g>
                )
              })}
              {mpX != null ? (
                <line x1={(mpX / W) * 600} x2={(mpX / W) * 600} y1="0" y2="140" stroke="var(--foreground)" strokeWidth="1" strokeDasharray="3 3" />
              ) : null}
              {spotX != null ? (
                <line x1={(spotX / W) * 600} x2={(spotX / W) * 600} y1="0" y2="140" stroke="var(--sk-ticker)" strokeWidth="1" />
              ) : null}
            </svg>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 pt-1 text-dense-micro text-muted-foreground">
              <span><i className="mr-1 inline-block h-0.5 w-3.5 bg-success align-[3px]" />call OI</span>
              <span><i className="mr-1 inline-block h-0.5 w-3.5 bg-destructive align-[3px]" />put OI (stacked)</span>
              <span><i className="mr-1 inline-block w-3.5 border-t border-foreground align-[3px]" />seller liability if it closes here</span>
              <span><i className="mr-1 inline-block w-3.5 border-t-2 border-dashed border-foreground align-[3px]" />max pain</span>
              <span><i className="mr-1 inline-block w-3.5 border-t-2 border-[var(--sk-ticker)] align-[3px]" />spot</span>
            </div>
          </div>
        ) : null}
        <div className="border-l border-border/60 px-3 pb-1 pt-0 md:pt-0">
          <DealerMaxPainTrend sym={sym} expiry={pinExpiry} />
        </div>
        </div>
        {/* Owner 2026-09-26: keep the retired OpEx section's map, named for
            what it is — the strike map carries OI and GEX, not vanna, so the
            bars are OI-weighted shapes, not the store's exposure. */}
        <div className="border-t border-border/60 px-3 pb-1 pt-2">
          <div className="mb-1 flex flex-wrap items-baseline gap-2">
            <span className={cap}>Vanna / charm by strike · OI-weighted proxy</span>
            <span
              className="ml-auto text-dense-micro text-muted-foreground"
              title="The store keeps vanna and charm as totals and zero strikes only; per strike it keeps OI and GEX. These bars are the OI shapes a dealer book would carry — direction and relative size, not dollars."
            >
              a proxy, not the store&rsquo;s vanna
            </span>
          </div>
          {mapOutOfRange ? (
            <p className="m-0 pb-1 text-dense-micro text-warning">
              The strike map stops at {mapMax} — the route returns the lowest 60 strikes, so spot{' '}
              {mapSpot?.toFixed(2)} and the book around it are not in it. A Research fix is pending.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <VannaCharmMap
              rows={opexQ.data?.strike_map ?? []}
              spot={mapSpot}
              vannaZeroStrike={vannaZero}
              charmZeroStrike={charmZero}
            />
          </div>
        </div>
        <p className={note}>
          Charm accelerates in the last three sessions; that is when a pin either takes or fails.
          Pin history is this symbol&rsquo;s own, {pins.length} settled cycle{pins.length === 1 ? '' : 's'}.
        </p>
      </section>
    </div>
  )
}
