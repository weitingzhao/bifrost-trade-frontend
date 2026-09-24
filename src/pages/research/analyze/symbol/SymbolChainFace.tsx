/**
 * The Chain face — one name only (design `Research Symbol.dc.html`,
 * §isOptions). Four numbered steps: pick when (expiry cards off the fit's
 * own ATM vols), read the chain (±1σ · straddle · max pain · the levels the
 * other faces ruled), walk the strikes (puts left, calls right, Δ beside
 * the strike), open a contract. The old Discovery page's own symbol input,
 * wishlist strip and chart config stay retired — the shell's symbol is the
 * page's, and the universe lives in Discover.
 *
 * The snapshots carry the session's last trade and no bid/ask, so every
 * quote-shaped column says mark and the contract card dashes the NBBO row
 * with the reason instead of dressing a close as a market.
 */
import { useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchChainExpirations, fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { FaceKv } from '@/components/research/FaceKv'
import { PlanThisButton } from '@/components/research'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useResiduals, useVolSurfaceFit } from '@/hooks/useVolSurfaceData'
import { todayIso } from '@/lib/researchFreshness'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH, TAB_PARAM } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { bsComputeDetail, normalCDF } from '@/utils/blackScholes'
import { chainFromSnapshots, type ChainContract } from '@/utils/optionChain'
import { sviFromRow, sviIvPts } from '@/utils/sviSmile'
import { ContractCandles, OiMini, SmileMini } from './symbolChainCharts'
import {
  LADDER_COLUMNS,
  ladderRows,
  maxPain,
  oiTotals,
  richToSvi,
  sigmaMove,
  straddleMid,
  type LadderColumnSet,
} from './symbolChainModel'
import { useQuery } from '@tanstack/react-query'
import { SegmentControl } from '@/components/data-display'

const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
const mono = 'font-mono tabular-nums'
const panel =
  'min-w-0 rounded-[10px] border border-[var(--sk-line0)] bg-[var(--sk-raised)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const panelHead =
  'flex flex-wrap items-center gap-2.5 rounded-t-[9px] border-b border-[var(--sk-line0)] bg-[var(--sk-raised2)] px-3 py-1.75 text-dense-body leading-normal'
const note =
  'm-0 border-t border-border/60 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td =
  'whitespace-nowrap border-b border-border/55 px-2 py-1 text-right font-mono text-xs tabular-nums'

const numOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export interface CompareEntry {
  sym: string
  expiry: string
  strike: number
  right: 'C' | 'P'
  ticker: string
}

const COMPARE_KEY = 'bifrost.chain.compare'

function readCompare(): CompareEntry[] {
  try {
    const raw = sessionStorage.getItem(COMPARE_KEY)
    const list = raw ? (JSON.parse(raw) as CompareEntry[]) : []
    return Array.isArray(list) ? list.slice(0, 12) : []
  } catch {
    return []
  }
}

function writeCompare(list: CompareEntry[]): void {
  try {
    sessionStorage.setItem(COMPARE_KEY, JSON.stringify(list))
  } catch {
    // private mode — the drawer just will not persist
  }
}

export function SymbolChainFace({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const today = todayIso()
  const [userExpiry, setUserExpiry] = useState<string | null>(null)
  const [win, setWin] = useState<5 | 9 | 14>(9)
  const [cols, setCols] = useState<LadderColumnSet>('marks')
  const [sel, setSel] = useState<{ strike: number; right: 'C' | 'P' } | null>(null)
  const [compare, setCompare] = useState<CompareEntry[]>(() => readCompare())
  useEffect(() => writeCompare(compare), [compare])

  const exQ = useExhibitComposite(['gex_regime', 'opex_pin'], sym)
  const g = (exQ.data?.find((e) => e.lens === 'gex_regime')?.readings ?? {}) as Record<string, unknown>
  const p = (exQ.data?.find((e) => e.lens === 'opex_pin')?.readings ?? {}) as Record<string, unknown>
  const spot = numOf(g.spot) ?? numOf(p.close)
  const callWall = numOf(g.major_call_wall)
  const putWall = numOf(g.major_put_wall)
  const zeroG = numOf(g.zero_gamma)
  const pinStrike = numOf(p.max_pain_strike)

  const expQ = useQuery({
    queryKey: ['market', 'chain-expirations', sym, today],
    queryFn: () => fetchChainExpirations(sym, today),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const expiries = (expQ.data ?? []).slice(0, 5)
  const fitQ = useVolSurfaceFit(sym)
  const fitByExpiry = new Map((fitQ.data ?? []).map((r) => [r.expiry, r]))

  // One snapshot read per listed card — the cards' straddle, ±1σ and OI are
  // the chain's own, not the fit's.
  const snapQs = useQueries({
    queries: expiries.map((e) => ({
      queryKey: ['market', 'option-snapshots', sym, e],
      queryFn: () => fetchOptionSnapshots(sym, e),
      enabled: Boolean(sym),
      staleTime: 5 * 60_000,
    })),
  })
  // Plain derivation — the compiler memoises it, and a spread dependency
  // list is not something the lint can reason about.
  const chains = new Map(
    expiries.map((e, i) => [e, chainFromSnapshots(snapQs[i]?.data?.rows ?? [])])
  )

  // Default to the nearest listed expiry the fit covers — a 1-day weekly
  // with no surface behind it makes a poor first read.
  const expiry =
    userExpiry && expiries.includes(userExpiry)
      ? userExpiry
      : (expiries.find((e) => fitByExpiry.has(e)) ?? expiries[0] ?? null)
  const chain = expiry ? (chains.get(expiry) ?? []) : []
  const fitRow = expiry ? fitByExpiry.get(expiry) : null
  const dte = fitRow?.dte ?? (expiry ? Math.max(1, Math.round((Date.parse(expiry) - Date.parse(today)) / 86_400_000)) : null)
  const atmIv = fitRow?.atm_vol ?? null

  const residQ = useResiduals(sym, expiry ?? '')
  const rich = richToSvi(residQ.data ?? [])
  const params = fitRow ? sviFromRow(fitRow) : null
  const fitIvPts =
    params && dte != null && dte > 0 ? (k: number) => sviIvPts(params, k, dte / 365) : null

  const mp = maxPain(chain)
  const oi = oiTotals(chain)
  const move = spot != null && atmIv != null && dte != null ? sigmaMove(spot, atmIv, dte) : null

  const rows = spot != null ? ladderRows(chain, spot, win, cols, fitIvPts) : []
  const colLabels = LADDER_COLUMNS[cols]

  const selected: ChainContract | null = sel
    ? (chain.find((c) => c.strike === sel.strike && c.right === sel.right) ?? null)
    : null
  const bs =
    selected && spot != null && dte != null && dte > 0 && selected.iv != null
      ? bsComputeDetail({ S: spot, K: selected.strike, T: dte / 365, r: 0.043, sigma: selected.iv, right: selected.right })
      : null
  const pItm =
    selected && spot != null && dte != null && dte > 0 && selected.iv != null
      ? (() => {
          const T = dte / 365
          const sigma = selected.iv
          const d2 =
            (Math.log(spot / selected.strike) + (0.043 - 0.5 * sigma * sigma) * T) /
            (sigma * Math.sqrt(T))
          return selected.right === 'C' ? normalCDF(d2) : normalCDF(-d2)
        })()
      : null

  const levelChips = [
    { label: 'Call wall', k: callWall, cls: 'text-profit' },
    { label: 'Zero γ', k: zeroG, cls: 'text-warning' },
    { label: 'Put wall', k: putWall, cls: 'text-loss' },
    ...(rich ? [{ label: 'Rich to SVI', k: rich.strike, cls: 'text-warning', extra: `+${rich.pts.toFixed(0)} pts` }] : []),
    { label: 'OpEx pin', k: pinStrike, cls: 'text-secondary-foreground' },
  ].filter((c) => c.k != null) as { label: string; k: number; cls: string; extra?: string }[]

  const loading = expQ.isLoading || (expiries.length > 0 && snapQs.every((q) => q.isLoading))

  return (
    <div className="space-y-3">
      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>1 · Expiry</span>
          <span className="text-dense-body font-semibold">Term structure — pick when</span>
          <span className={cn(mono, 'ml-auto text-dense-caption text-muted-foreground')}>
            spot {spot != null ? spot.toFixed(2) : '—'}
            {atmIv != null ? ` · ATM IV ${(atmIv * 100).toFixed(1)}` : ''}
          </span>
        </header>
        {loading ? (
          <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">Reading the listed expiries…</p>
        ) : expiries.length === 0 ? (
          <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">No listed expiries in the snapshot store for this name.</p>
        ) : (
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            {expiries.map((e) => {
              const f = fitByExpiry.get(e)
              const c = chains.get(e) ?? []
              const cd = f?.dte ?? Math.max(1, Math.round((Date.parse(e) - Date.parse(today)) / 86_400_000))
              const iv = f?.atm_vol ?? null
              const st = spot != null ? straddleMid(c, spot) : null
              const mv = spot != null && iv != null ? sigmaMove(spot, iv, cd) : null
              const t = oiTotals(c)
              const on = e === expiry
              const ivMax = Math.max(1e-6, ...expiries.map((x) => fitByExpiry.get(x)?.atm_vol ?? 0))
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setUserExpiry(e)
                    setSel(null)
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col gap-1.5 border-r border-border/60 px-3 py-2.5 text-left last:border-r-0 hover:bg-[var(--sk-surface)]',
                    on && 'bg-[rgb(var(--sk-accent-rgb)/0.06)] shadow-[inset_0_-2px_0_var(--sk-ticker)]'
                  )}
                >
                  <span className="flex items-baseline gap-1.5">
                    <span className={cn(mono, 'text-dense-body font-bold', on ? 'text-[var(--sk-ticker)]' : 'text-foreground')}>
                      {e.slice(5)}
                    </span>
                    <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>{cd}d</span>
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className={cn(mono, 'text-lg font-semibold')}>{iv != null ? (iv * 100).toFixed(1) : '—'}</span>
                    <span className={cap}>atm iv</span>
                  </span>
                  <span className="relative block h-[5px] overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
                    {iv != null ? (
                      <span className="absolute inset-y-0 left-0 bg-warning" style={{ width: `${(iv / ivMax) * 100}%` }} />
                    ) : null}
                  </span>
                  <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-dense-caption">
                    <span className={cap}>±1σ</span>
                    <span className={cn(mono, 'text-right text-secondary-foreground')}>
                      {mv != null && spot != null ? `${(spot - mv).toFixed(0)}–${(spot + mv).toFixed(0)}` : '—'}
                    </span>
                    <span className={cap}>straddle</span>
                    <span className={cn(mono, 'text-right text-secondary-foreground')}>
                      {st != null ? st.toFixed(2) : '—'}
                    </span>
                    <span className={cap}>oi · p/c</span>
                    <span className={cn(mono, 'text-right text-secondary-foreground')}>
                      {t.total > 0 ? `${(t.total / 1000).toFixed(0)}k · ${t.pc != null ? t.pc.toFixed(2) : '—'}` : '—'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <p className={note}>
          ATM IV is the fit&rsquo;s own per expiry; the straddle and open interest are the
          chain&rsquo;s. An earnings badge needs the forward date no store carries — unmeasured,
          not omitted.
        </p>
      </section>

      <section className={panel}>
        <header className={panelHead}>
          <span className={cap}>2 · Chain</span>
          <span className={cn(mono, 'text-dense-body font-semibold')}>{expiry ? expiry.slice(5) : '—'}</span>
          <span className={cn(mono, 'text-dense-caption text-secondary-foreground')}>
            ±1σ{' '}
            <span className="text-foreground">
              {move != null && spot != null ? `${(spot - move).toFixed(0)}–${(spot + move).toFixed(0)}` : '—'}
            </span>
          </span>
          <span className={cn(mono, 'text-dense-caption text-secondary-foreground')}>
            max pain <span className="text-foreground">{mp ?? '—'}</span>
          </span>
          <span className={cn(mono, 'text-dense-caption text-secondary-foreground')}>
            OI <span className="text-foreground">{oi.total > 0 ? `${(oi.total / 1000).toFixed(0)}k` : '—'}</span> · p/c{' '}
            <span className="text-foreground">{oi.pc != null ? oi.pc.toFixed(2) : '—'}</span>
          </span>
          <span className="h-4 w-px bg-border" />
          <span className="flex flex-wrap gap-1.5">
            {levelChips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded border border-border px-1.5 py-0.5 text-dense-micro"
                title="Ruled by the face that owns the reading — Dealer for the walls, the lab for the fit."
              >
                <span className="text-muted-foreground">{c.label}</span>
                <span className={cn(mono, c.cls)}>
                  {c.k}
                  {c.extra ? ` ${c.extra}` : ''}
                </span>
              </span>
            ))}
          </span>
        </header>
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
          <div className="border-b border-border/60 px-3 py-2 md:border-b-0 md:border-r">
            <div className="mb-1 flex gap-2 text-dense-micro text-muted-foreground">
              <span className={cap}>smile · this expiry</span>
              <span className="ml-auto">
                calls <i className="mx-0.5 inline-block h-0.5 w-3 bg-profit align-[3px]" /> · puts{' '}
                <i className="mx-0.5 inline-block h-0.5 w-3 bg-loss align-[3px]" /> · fit dashed
              </span>
            </div>
            <SmileMini chain={chain} spot={spot} move={move} fitIvPts={fitIvPts} selStrike={sel?.strike ?? null} />
          </div>
          <div className="px-3 py-2">
            <div className="mb-1 flex gap-2 text-dense-micro text-muted-foreground">
              <span className={cap}>open interest · this expiry</span>
              <span className="ml-auto font-mono">max pain {mp ?? '—'}</span>
            </div>
            <OiMini chain={chain} spot={spot} mp={mp} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-3">
        <section className={cn(panel, 'min-w-0 flex-[999_1_40rem]')}>
          <header className={panelHead}>
            <span className={cap}>3 · Strikes</span>
            <span className="text-dense-body font-semibold">
              {dte ?? '—'} DTE · {rows.length} in window
            </span>
            <span className="ml-auto inline-flex items-center gap-2">
              <span className={cap}>Window</span>
              <SegmentControl
                ariaLabel="Strike window"
                size="xs"
                value={String(win)}
                onChange={(v) => setWin(Number(v) as 5 | 9 | 14)}
                options={[
                  { value: '5', label: '±5' },
                  { value: '9', label: '±9' },
                  { value: '14', label: '±14' },
                ]}
              />
            </span>
            <span className="inline-flex items-center gap-2">
              <span className={cap}>Columns</span>
              <SegmentControl
                ariaLabel="Column set"
                size="xs"
                value={cols}
                onChange={(v) => setCols(v as LadderColumnSet)}
                options={[
                  { value: 'marks', label: 'Marks' },
                  { value: 'greeks', label: 'Greeks' },
                  { value: 'analytics', label: 'Analytics' },
                ]}
              />
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  {colLabels.map((l, i) => (
                    <th key={`p${i}`} className={th}>
                      {l}
                    </th>
                  ))}
                  <th className={cn(th, 'w-24 text-center text-foreground')}>Strike</th>
                  {[...colLabels].reverse().map((l, i) => (
                    <th key={`c${i}`} className={th}>
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ruled =
                    r.strike === callWall
                      ? 'call wall'
                      : r.strike === putWall
                        ? 'put wall'
                        : r.strike === mp
                          ? 'max pain'
                          : null
                  const isSel = (right: 'C' | 'P') => sel?.strike === r.strike && sel.right === right
                  return (
                    <tr
                      key={r.strike}
                      className={cn(r.atm && 'shadow-[inset_2px_0_0_var(--sk-ticker)]')}
                    >
                      {r.put ? (
                        r.put.values.map((v, i) => (
                          <td
                            key={i}
                            onClick={() => setSel({ strike: r.strike, right: 'P' })}
                            className={cn(
                              td,
                              'cursor-pointer',
                              isSel('P') ? 'bg-[rgb(var(--sk-accent-rgb)/0.08)]' : 'hover:bg-[var(--sk-surface)]',
                              i === 3 ? 'text-foreground' : 'text-secondary-foreground'
                            )}
                          >
                            {v}
                          </td>
                        ))
                      ) : (
                        <td className={cn(td, 'text-muted-foreground')} colSpan={4}>
                          —
                        </td>
                      )}
                      <td
                        className={cn(
                          td,
                          'bg-[color-mix(in_srgb,var(--sk-surface)_60%,transparent)] text-center font-bold',
                          r.atm ? 'text-[var(--sk-ticker)]' : 'text-foreground'
                        )}
                      >
                        {r.strike}
                        <span
                          className={cn(
                            'block font-sans text-dense-micro font-normal',
                            ruled ? 'text-warning' : 'text-muted-foreground'
                          )}
                        >
                          {ruled ?? `${r.moneyPct >= 0 ? '+' : '−'}${Math.abs(r.moneyPct).toFixed(1)}%`}
                        </span>
                      </td>
                      {r.call ? (
                        [...r.call.values].reverse().map((v, i) => (
                          <td
                            key={i}
                            onClick={() => setSel({ strike: r.strike, right: 'C' })}
                            className={cn(
                              td,
                              'cursor-pointer',
                              isSel('C') ? 'bg-[rgb(var(--sk-accent-rgb)/0.08)]' : 'hover:bg-[var(--sk-surface)]',
                              i === 0 ? 'text-foreground' : 'text-secondary-foreground'
                            )}
                          >
                            {v}
                          </td>
                        ))
                      ) : (
                        <td className={cn(td, 'text-muted-foreground')} colSpan={4}>
                          —
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className={note}>
            Puts left, calls right, Δ always beside the strike so the three column sets line up.
            Click a side to open the contract; the ATM row is ruled lime, and a strike another
            face ruled is named under its price. The screen band lands here when the contract
            screen sends one — no carry yet, so no chip pretends.
          </p>
        </section>

        <aside className="flex min-w-0 max-w-[26rem] flex-[1_1_19rem] flex-col gap-3">
          <section className={panel}>
            <header className={panelHead}>
              <span className={cap}>4 · Contract</span>
              <span className={cn(mono, 'text-dense-body font-semibold')}>
                {selected ? `${sym} ${expiry?.slice(5)} ${selected.strike}${selected.right}` : 'none selected'}
              </span>
            </header>
            {selected ? (
              <>
                <div className="grid grid-cols-3 gap-2.5 border-b border-border/60 px-3 py-2.5">
                  <FaceKv
                    label="bid / ask"
                    value="—"
                    cls="text-muted-foreground"
                    title="The snapshots carry the session's last trade, never a quote — NBBO is not on the plan."
                  />
                  <FaceKv label="mark · last" value={selected.mark != null ? selected.mark.toFixed(2) : '—'} />
                  <FaceKv
                    label="IV · vs fit"
                    value={
                      selected.iv != null
                        ? `${(selected.iv * 100).toFixed(1)}${
                            fitIvPts && spot != null
                              ? ` ${(() => {
                                  const d = selected.iv! * 100 - fitIvPts(Math.log(selected.strike / spot))
                                  return `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`
                                })()}`
                              : ''
                          }`
                        : '—'
                    }
                  />
                  <FaceKv label="OI · vol" value={`${selected.oi?.toLocaleString('en-US') ?? '—'} · ${selected.volume?.toLocaleString('en-US') ?? '—'}`} />
                  <FaceKv label="Δ" value={selected.delta != null ? selected.delta.toFixed(2) : '—'} />
                  <FaceKv label="Θ / day" value={selected.theta != null ? selected.theta.toFixed(2) : '—'} cls="text-loss" />
                </div>
                <div className="grid grid-cols-3 gap-2.5 border-b border-border/60 px-3 py-2.5">
                  <FaceKv
                    label="break-even"
                    value={
                      selected.mark != null
                        ? (selected.right === 'C' ? selected.strike + selected.mark : selected.strike - selected.mark).toFixed(2)
                        : '—'
                    }
                  />
                  <FaceKv label="P(ITM)" value={pItm != null ? `${Math.round(pItm * 100)}%` : '—'} />
                  <FaceKv
                    label={selected.right === 'P' ? 'CSP yield' : 'yield on spot'}
                    value={
                      selected.mark != null && dte != null && dte > 0
                        ? `${(
                            (selected.mark /
                              (selected.right === 'P' ? selected.strike : (spot ?? selected.strike))) *
                            (365 / dte) *
                            100
                          ).toFixed(1)}%`
                        : '—'
                    }
                    cls="text-[var(--sk-ticker)]"
                    title="The short side's premium against the cash it ties up, annualised — a rate, not a forecast."
                  />
                </div>
                <div className="border-b border-border/60 px-3 py-2">
                  <div className="mb-1 flex gap-2">
                    <span className={cap}>snapshot vs Black-Scholes</span>
                    <span className="ml-auto text-dense-micro text-muted-foreground">r 4.3% · q 0 · σ = snapshot IV</span>
                  </div>
                  {bs && selected.mark != null ? (
                    <div className={cn(mono, 'grid grid-cols-[56px_repeat(3,minmax(0,1fr))] gap-x-2 gap-y-0.5 text-dense-caption')}>
                      <span />
                      <span className={cn(cap, 'text-right')}>snap</span>
                      <span className={cn(cap, 'text-right')}>BS</span>
                      <span className={cn(cap, 'text-right')}>diff</span>
                      {(
                        [
                          ['price', selected.mark, bs.price],
                          ['Δ', selected.delta, bs.delta],
                          ['Θ/day', selected.theta, bs.theta],
                          ['vega', selected.vega, bs.vega],
                        ] as const
                      ).map(([l, s, b]) => {
                        const d = s != null && b != null ? (s as number) - b : null
                        return (
                          <span key={l} className="contents">
                            <span className="text-secondary-foreground">{l}</span>
                            <span className="text-right text-foreground">{s != null ? (s as number).toFixed(2) : '—'}</span>
                            <span className="text-right text-secondary-foreground">{b != null ? b.toFixed(2) : '—'}</span>
                            <span className={cn('text-right', d != null && Math.abs(d) > 0.05 ? 'text-warning' : 'text-muted-foreground')}>
                              {d != null ? `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}` : '—'}
                            </span>
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="m-0 text-dense-micro text-muted-foreground">Needs a mark and an IV on the row.</p>
                  )}
                </div>
                <ContractCandles ticker={selected.ticker} mark={selected.mark} today={today} />
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                  <PlanThisButton
                    symbol={sym}
                    source="symbol:chain"
                    sourceLabel="Symbol · chain"
                    contract={`${sym} ${expiry?.slice(5)} ${selected.strike}${selected.right}`}
                    note="from the ladder"
                    variant="primary"
                  />
                  <Link
                    to={withSymbolParam(
                      `${SYMBOL_PATH}?${TAB_PARAM}=payoff&expiration=${expiry ?? ''}&strike=${selected.strike}&right=${selected.right}`,
                      sym
                    )}
                    className="rounded-[6px] border border-border px-2.5 py-1 text-dense-label text-foreground no-underline hover:bg-[var(--sk-surface)]"
                  >
                    Payoff →
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (!expiry) return
                      const entry: CompareEntry = {
                        sym,
                        expiry,
                        strike: selected.strike,
                        right: selected.right,
                        ticker: selected.ticker,
                      }
                      setCompare((list) =>
                        list.some((e) => e.ticker === entry.ticker) ? list : [...list, entry]
                      )
                    }}
                    className="cursor-pointer rounded-[6px] border border-border px-2.5 py-1 text-dense-label text-muted-foreground hover:bg-[var(--sk-surface)]"
                    title="Keep this contract in the Compare drawer — it holds contracts across expiries and symbols for this session."
                  >
                    Compare +
                  </button>
                </div>
              </>
            ) : (
              <p className="m-0 px-3 py-4 text-dense-meta leading-normal text-muted-foreground text-pretty">
                Click a put or call side in the ladder. The mark, greeks and the short-side yield
                land here; ＋ hands the contract to a Plan with this expiry and strike pre-filled.
              </p>
            )}
          </section>
          <section className={panel}>
            <header className={panelHead}>
              <span className={cap}>Compare</span>
              <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                {compare.length} contract{compare.length === 1 ? '' : 's'}
              </span>
              {compare.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCompare([])}
                  className="ml-auto cursor-pointer text-dense-micro text-muted-foreground hover:text-foreground"
                >
                  clear
                </button>
              ) : null}
            </header>
            {compare.length === 0 ? (
              <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
                The drawer keeps contracts across expiries and symbols for this session —
                Compare + on a contract adds it here.
              </p>
            ) : (
              <div className="flex flex-col">
                {compare.map((e) => {
                  const live =
                    e.sym === sym
                      ? (chains.get(e.expiry) ?? []).find(
                          (c) => c.strike === e.strike && c.right === e.right
                        )
                      : null
                  return (
                    <div
                      key={e.ticker}
                      className="flex items-baseline gap-2 border-b border-border/55 px-3 py-1.5 text-dense-caption"
                    >
                      {e.sym === sym ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUserExpiry(e.expiry)
                            setSel({ strike: e.strike, right: e.right })
                          }}
                          className={cn(mono, 'cursor-pointer font-semibold text-entity-option hover:underline')}
                        >
                          {e.sym} {e.expiry.slice(5)} {e.strike}
                          {e.right}
                        </button>
                      ) : (
                        <Link
                          to={withSymbolParam(`${SYMBOL_PATH}?${TAB_PARAM}=chain`, e.sym)}
                          className={cn(mono, 'font-semibold text-entity-option hover:underline')}
                        >
                          {e.sym} {e.expiry.slice(5)} {e.strike}
                          {e.right}
                        </Link>
                      )}
                      {live ? (
                        <span className={cn(mono, 'ml-auto text-muted-foreground')}>
                          {live.mark != null ? live.mark.toFixed(2) : '—'}
                          {live.iv != null ? ` · ${(live.iv * 100).toFixed(0)}v` : ''}
                          {live.delta != null ? ` · Δ${Math.abs(live.delta).toFixed(2)}` : ''}
                        </span>
                      ) : (
                        <span className="ml-auto text-dense-micro text-muted-foreground">
                          {e.sym === sym ? 'expiry not loaded' : 'other name'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCompare((l) => l.filter((x) => x.ticker !== e.ticker))}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${e.ticker} from compare`}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
                <p className="m-0 px-3 py-1.5 text-dense-micro leading-normal text-muted-foreground">
                  Marks fill in for contracts on the five loaded expiries of this name; a row from
                  another name links to its own chain.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
