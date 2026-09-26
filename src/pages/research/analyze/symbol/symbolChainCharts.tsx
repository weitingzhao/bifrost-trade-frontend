/**
 * The Chain face’s drawings — the per-expiry smile, the stacked open
 * interest, and the contract’s last sessions. Split from the face when it
 * crossed the 800-line ratchet; same feature folder, no new surface.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchOptionDailyBars, type DailyBar } from '@/api/marketData/dailyBars'
import { daysBack } from '@/lib/researchFreshness'
import { type ChainContract } from '@/utils/optionChain'

const cap =
  'whitespace-nowrap text-dense-meta font-semibold text-muted-foreground'

/** The 600×110 smile: call IVs, put IVs, the fit dashed, σ band shaded. */
export function SmileMini({
  chain,
  spot,
  move,
  fitIvPts,
  selStrike,
}: {
  chain: ChainContract[]
  spot: number | null
  move: number | null
  fitIvPts: ((k: number) => number) | null
  selStrike: number | null
}) {
  const pts = chain.filter((c) => c.iv != null && c.iv > 0)
  if (pts.length === 0 || spot == null) {
    return <p className="m-0 py-3 text-dense-micro text-muted-foreground">No IVs on this expiry&rsquo;s rows.</p>
  }
  const ks = pts.map((c) => c.strike)
  const lo = Math.min(...ks)
  const hi = Math.max(...ks)
  const ivs = pts.map((c) => (c.iv as number) * 100)
  const vLo = Math.min(...ivs) - 2
  const vHi = Math.max(...ivs) + 2
  const X = (k: number) => ((k - lo) / (hi - lo || 1)) * 580 + 10
  const Y = (v: number) => 100 - ((v - vLo) / (vHi - vLo || 1)) * 92
  const line = (right: 'C' | 'P') =>
    pts
      .filter((c) => c.right === right)
      .sort((a, b) => a.strike - b.strike)
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${X(c.strike).toFixed(1)} ${Y((c.iv as number) * 100).toFixed(1)}`)
      .join('')
  const fit =
    fitIvPts != null
      ? ks
          .slice()
          .sort((a, b) => a - b)
          .map((k, i) => `${i === 0 ? 'M' : 'L'}${X(k).toFixed(1)} ${Y(fitIvPts(Math.log(k / spot))).toFixed(1)}`)
          .join('')
      : null
  return (
    <>
      <svg viewBox="0 0 600 110" className="block h-auto w-full" role="img" aria-label="IV smile for the selected expiry">
        {move != null ? (
          <rect x={X(spot - move)} y="0" width={Math.max(0, X(spot + move) - X(spot - move))} height="104" fill="color-mix(in srgb, var(--sk-ink) 4%, transparent)" />
        ) : null}
        {fit ? <path d={fit} fill="none" stroke="var(--sk-faint,var(--border))" strokeWidth="1" strokeDasharray="4 3" /> : null}
        <path d={line('P')} fill="none" stroke="var(--color-loss)" strokeWidth="1.5" />
        <path d={line('C')} fill="none" stroke="var(--color-profit)" strokeWidth="1.5" />
        <line x1={X(spot)} x2={X(spot)} y1="0" y2="104" stroke="var(--sk-ticker)" strokeWidth="1" />
        {selStrike != null ? (
          <line x1={X(selStrike)} x2={X(selStrike)} y1="0" y2="104" stroke="var(--foreground)" strokeWidth="1" strokeDasharray="2 2" />
        ) : null}
      </svg>
      <div className="flex justify-between pt-0.5 font-mono text-dense-micro text-muted-foreground">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t}>{(lo + (hi - lo) * t).toFixed(0)}</span>
        ))}
      </div>
    </>
  )
}

/** The 600×110 OI columns: calls above puts, max pain dashed, spot ruled. */
export function OiMini({ chain, spot, mp }: { chain: ChainContract[]; spot: number | null; mp: number | null }) {
  const strikes = [...new Set(chain.map((c) => c.strike))].sort((a, b) => a - b)
  if (strikes.length === 0 || spot == null) {
    return <p className="m-0 py-3 text-dense-micro text-muted-foreground">No open interest on this expiry&rsquo;s rows.</p>
  }
  const lo = strikes[0]
  const hi = strikes[strikes.length - 1]
  const X = (k: number) => ((k - lo) / (hi - lo || 1)) * 580 + 10
  const oiAt = (k: number, right: 'C' | 'P') => chain.find((c) => c.strike === k && c.right === right)?.oi ?? 0
  const maxOi = Math.max(1, ...strikes.map((k) => oiAt(k, 'C') + oiAt(k, 'P')))
  return (
    <>
      <svg viewBox="0 0 600 110" className="block h-auto w-full" role="img" aria-label="Open interest by strike for the selected expiry">
        {strikes.map((k) => {
          const c = (oiAt(k, 'C') / maxOi) * 96
          const p = (oiAt(k, 'P') / maxOi) * 96
          return (
            <g key={k}>
              <rect x={X(k) - 2.5} y={104 - c} width="5" height={c} fill="var(--color-profit)" opacity="0.75" />
              <rect x={X(k) - 2.5} y={104 - c - p} width="5" height={p} fill="var(--color-loss)" opacity="0.75" />
            </g>
          )
        })}
        {mp != null ? <line x1={X(mp)} x2={X(mp)} y1="0" y2="104" stroke="var(--foreground)" strokeWidth="1" strokeDasharray="3 3" /> : null}
        <line x1={X(spot)} x2={X(spot)} y1="0" y2="104" stroke="var(--sk-ticker)" strokeWidth="1" />
      </svg>
      <div className="flex justify-between pt-0.5 font-mono text-dense-micro text-muted-foreground">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t}>{(lo + (hi - lo) * t).toFixed(0)}</span>
        ))}
      </div>
    </>
  )
}

/**
 * The contract's last 20 sessions off the option daily store — candles,
 * session volume, and the volume-weighted close (close × volume — the store
 * keeps no intraday VWAP, and this line says what it is instead).
 */
export function ContractCandles({
  ticker,
  mark,
  today,
}: {
  ticker: string
  mark: number | null
  today: string
}) {
  const barsQ = useQuery({
    queryKey: ['market', 'option-daily', ticker],
    queryFn: () => fetchOptionDailyBars(ticker, daysBack(today, 45), today),
    enabled: Boolean(ticker),
    staleTime: 10 * 60_000,
  })
  const bars: DailyBar[] = (barsQ.data ?? [])
    .filter((b) => b.open != null && b.high != null && b.low != null && b.close != null)
    .slice(-20)
  if (barsQ.isLoading) {
    return <p className="m-0 border-b border-border/60 px-3 py-2 text-dense-micro text-muted-foreground">Reading the contract&rsquo;s sessions…</p>
  }
  if (bars.length === 0) {
    return (
      <p className="m-0 border-b border-border/60 px-3 py-2 text-dense-micro leading-normal text-muted-foreground text-pretty">
        No daily bars for this contract yet — the option backfill runs by expiry month, and this
        one&rsquo;s month has not landed.
      </p>
    )
  }
  const lo = Math.min(...bars.map((b) => b.low as number))
  const hi = Math.max(...bars.map((b) => b.high as number))
  const span = hi - lo || 1
  const X = (i: number) => (bars.length === 1 ? 160 : (i / (bars.length - 1)) * 300 + 10)
  const Y = (v: number) => 84 - ((v - lo) / span) * 78
  const volMax = Math.max(1, ...bars.map((b) => b.volume ?? 0))
  const wSum = bars.reduce((a, b) => a + (b.volume ?? 0), 0)
  const vwClose = wSum > 0 ? bars.reduce((a, b) => a + (b.close as number) * (b.volume ?? 0), 0) / wSum : null
  const vsVw = vwClose != null && mark != null && vwClose > 0 ? (mark / vwClose - 1) * 100 : null
  return (
    <div className="border-b border-border/60 px-3 py-2">
      <div className="mb-1 flex gap-2 text-dense-micro text-muted-foreground">
        <span className={cap}>contract · {bars.length} sessions</span>
        <span className="ml-auto font-mono">
          vw close{' '}
          <b className="text-secondary-foreground" title="Volume-weighted mean of session closes — the store keeps no intraday VWAP.">
            {vwClose != null ? vwClose.toFixed(2) : '—'}
          </b>
          {vsVw != null ? (
            <>
              {' '}· mark vs{' '}
              <b className={vsVw >= 0 ? 'text-profit' : 'text-loss'}>
                {vsVw >= 0 ? '+' : '−'}
                {Math.abs(vsVw).toFixed(1)}%
              </b>
            </>
          ) : null}
        </span>
      </div>
      <svg viewBox="0 0 320 90" className="block h-auto w-full" role="img" aria-label="Contract OHLC over its last sessions">
        {bars.map((b, i) => {
          const up = (b.close as number) >= (b.open as number)
          const x = X(i)
          const top = Y(Math.max(b.open as number, b.close as number))
          const bot = Y(Math.min(b.open as number, b.close as number))
          return (
            <g key={b.date}>
              <line x1={x} x2={x} y1={Y(b.high as number)} y2={Y(b.low as number)} stroke="var(--sk-faint,var(--border))" strokeWidth="1" />
              <rect x={x - 2.5} y={top} width="5" height={Math.max(1, bot - top)} fill={up ? 'var(--color-profit)' : 'var(--color-loss)'} />
            </g>
          )
        })}
        {vwClose != null ? (
          <line x1="10" x2="310" y1={Y(vwClose)} y2={Y(vwClose)} stroke="var(--sk-ticker)" strokeWidth="1" strokeDasharray="3 2" />
        ) : null}
      </svg>
      <div className="mt-0.5 flex h-3.5 items-end gap-px">
        {bars.map((b) => (
          <span
            key={b.date}
            className="w-full min-w-[2px] flex-1 bg-[var(--sk-line2)]"
            style={{ height: `${Math.max(8, ((b.volume ?? 0) / volMax) * 100)}%` }}
            title={`${b.date} · vol ${(b.volume ?? 0).toLocaleString('en-US')}`}
          />
        ))}
      </div>
    </div>
  )
}
