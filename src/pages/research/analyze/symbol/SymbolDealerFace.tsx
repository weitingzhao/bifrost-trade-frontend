/**
 * The Dealer face — one name only (design `Research Symbol.dc.html`,
 * §isDealer). Gamma levels with the walls on a ruler and the strike GEX
 * distribution under them, then the OpEx cycle with the pin's own record.
 * Everything drawn is the store's: the gex_regime and opex_pin exhibits,
 * and `/research/gex/distribution`'s per-strike rows at the exhibit's own
 * expiry. What no store keeps — vanna/charm, the 12-session regime
 * timeline, the pin history — keeps its seat and says so.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchGexDistribution } from '@/api/researchEngine'
import { LensVerdictBlock } from '@/components/research/LensVerdictBlock'
import { FaceKv } from '@/components/research/FaceKv'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { cn } from '@/lib/utils'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const panel =
  'min-w-0 rounded-[10px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const panelHead =
  'flex flex-wrap items-center gap-2.5 rounded-t-[9px] border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3 py-1.75 text-dense-body leading-normal'
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
        call_gex: num(r.call_gex),
        put_gex: num(r.put_gex),
      },
    ]
  })
}

const netOf = (r: DistRow) => r.call_gex + r.put_gex

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

  const topStrikes = [...rows]
    .sort((a, b) => Math.abs(netOf(b)) - Math.abs(netOf(a)))
    .slice(0, 11)
    .sort((a, b) => a.strike - b.strike)
  const dist = (v: number | null) =>
    v == null || spot == null || spot === 0 ? '—' : `${(((v - spot) / spot) * 100).toFixed(1)}%`

  // ── OpEx readings ──
  const pinDist = num(p.pin_pct_distance)
  const maxPain = num(p.max_pain_strike)
  const close = num(p.close)
  const dte = num(p.dte)
  const totalOi = num(p.total_oi)
  const oiMax = Math.max(1, ...rows.map((r) => r.call_oi + r.put_oi))
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
                  <line x1={strikeX(zeroG)!} x2={strikeX(zeroG)!} y1="0" y2={plotH} stroke="var(--color-amber-400,var(--color-warning))" strokeWidth="1" strokeDasharray="3 3" />
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
              value="—"
              cls="text-muted-foreground"
              title="The levels store keeps only the current session — no streak to count. Unmeasured, not omitted."
            />
          </div>
        </div>
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>Strike GEX</span>
          <span className="text-dense-body font-semibold">largest books near spot</span>
          <span className="ml-auto text-dense-caption text-muted-foreground">OI basis · {expiry ?? '—'}</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(th, 'text-left')}>Strike</th>
                <th className={cn(th, 'w-[44%] text-left')}>− puts · calls +</th>
                <th className={th}>OI GEX</th>
                <th className={th}>OI</th>
              </tr>
            </thead>
            <tbody>
              {topStrikes.map((r) => {
                const v = netOf(r)
                const tag =
                  r.strike === callWall
                    ? 'call wall'
                    : r.strike === putWall
                      ? 'put wall'
                      : null
                return (
                  <tr key={r.strike}>
                    <td className={cn(td, 'text-left', tag ? 'font-bold text-foreground' : 'text-secondary-foreground')}>
                      {r.strike}
                      {tag ? <span className="ml-1.5 font-sans text-dense-micro text-muted-foreground">{tag}</span> : null}
                    </td>
                    <td className={cn(td, 'text-left')}>
                      <div className="relative h-3">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--sk-line2)]" />
                        <span
                          className={cn('absolute top-0.5 h-2 opacity-80', v >= 0 ? 'bg-profit' : 'bg-loss')}
                          style={
                            v >= 0
                              ? { left: '50%', width: `${(Math.abs(v) / maxAbs) * 50}%` }
                              : { right: '50%', width: `${(Math.abs(v) / maxAbs) * 50}%` }
                          }
                        />
                      </div>
                    </td>
                    <td className={cn(td, v >= 0 ? 'text-profit' : 'text-loss')}>{fmtM(v)}</td>
                    <td className={cn(td, 'text-muted-foreground')}>
                      {(r.call_oi + r.put_oi).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className={note}>
          Positive = dealers long gamma at that strike (they sell rallies, buy dips into it).
          Walls are the largest books each side; zero γ is where the cumulative sum crosses. A
          volume-basis GEX column needs the ledger&rsquo;s other aggregation, which no store keeps
          per strike — unmeasured, not omitted.
        </p>
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>OpEx cycle</span>
          <span className="text-dense-body font-semibold">
            {expiry ?? '—'}{dte != null ? ` · ${dte} days` : ''}
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">source · opex_pin exhibit</span>
        </header>
        <LensVerdictBlock lensId="opex_pin" exhibit={pinEx} />
        <div className="grid grid-cols-2 gap-2.5 px-3 py-2.5 sm:grid-cols-3">
          <FaceKv label="max-pain strike" value={maxPain != null ? String(maxPain) : '—'} />
          <FaceKv
            label="distance"
            value={pinDist != null ? `${(pinDist * 100).toFixed(1)}%` : '—'}
            cls={pinDist != null && pinDist < 0.01 ? 'text-warning' : undefined}
          />
          <FaceKv label="close" value={close != null ? close.toFixed(2) : '—'} />
          <FaceKv label="total OI" value={totalOi != null ? totalOi.toLocaleString() : '—'} />
          <FaceKv label="vanna" value="—" cls="text-muted-foreground" title="The vanna/charm store is not exposed per name — unmeasured, not omitted." />
          <FaceKv label="charm" value="—" cls="text-muted-foreground" title="The vanna/charm store is not exposed per name — unmeasured, not omitted." />
        </div>
        {rows.length > 0 ? (
          <div className="px-3 pb-1">
            <div className={cn(cap, 'mb-1')}>OI by strike · {expiry?.slice(5) ?? ''}</div>
            <svg viewBox="0 0 600 150" className="block h-auto w-full" role="img" aria-label="Open interest by strike, calls above puts, with max pain and spot">
              {rows.map((r, i) => {
                const x = (i / Math.max(1, rows.length - 1)) * 580 + 10
                const ch = (r.call_oi / oiMax) * 130
                const ph = (r.put_oi / oiMax) * 130
                return (
                  <g key={r.strike}>
                    <rect x={x - 2.5} y={140 - ch} width="5" height={ch} fill="var(--color-profit)" opacity="0.75" />
                    <rect x={x - 2.5} y={140 - ch - ph} width="5" height={ph} fill="var(--color-loss)" opacity="0.75" />
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
              <span><i className="mr-1 inline-block h-0.5 w-3.5 bg-profit align-[3px]" />call OI</span>
              <span><i className="mr-1 inline-block h-0.5 w-3.5 bg-loss align-[3px]" />put OI (stacked)</span>
              <span><i className="mr-1 inline-block w-3.5 border-t-2 border-dashed border-foreground align-[3px]" />max pain</span>
              <span><i className="mr-1 inline-block w-3.5 border-t-2 border-[var(--sk-ticker)] align-[3px]" />spot</span>
            </div>
          </div>
        ) : null}
        <p className={note}>
          Charm accelerates in the last three sessions; that is when a pin either takes or fails.
          The design&rsquo;s pin history and its seller-liability curve need a max-pain history no
          endpoint serves yet, and the 12-session regime timeline the same — each keeps its seat
          here rather than vanishing.
        </p>
      </section>
    </div>
  )
}
