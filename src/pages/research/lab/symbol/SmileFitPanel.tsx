/**
 * The Surface tab's main column — the fit-residuals panel (smile chart, the
 * near-money table with chain-OI weights, the honesty note about the store's
 * own RMSE) and the grounded Copilot ask.
 */
import { DenseTag } from '@bifrost/ui'
import type { VolSurfaceFitRow } from '@/api/research/volSurface'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { CopilotDraftPanel } from '@/components/research/CopilotDraftPanel'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { THIN_OI, type SmileRow } from './labSymbolModel'
import { mono, panel, panelHead, td, th } from './labSymbolUi'


function SmileChart({ rows }: { rows: SmileRow[] }) {
  const ivs = rows.flatMap((r) => [r.mkt, r.fit])
  const lo = Math.min(...ivs) - 2
  const hi = Math.max(...ivs) + 2
  // The design draws residual bars at 9px per vol point, sized for a fit
  // within a point or two. A rough fit would run its bars through the smile,
  // so past that the scale compresses to keep the worst bar at 40px.
  const worst = rows.reduce((a, r) => Math.max(a, Math.abs(r.resid)), 0)
  const pxPerPt = worst > 40 / 9 ? 40 / worst : 9
  const X = (k: number) => 40 + ((k + 0.2) / 0.4) * 540
  const Y = (v: number) => 150 - ((v - lo) / (hi - lo)) * 132
  const fitPath = rows
    .map((r, i) => `${i ? 'L' : 'M'}${X(r.k).toFixed(1)} ${Y(r.fit).toFixed(1)}`)
    .join(' ')
  const dotFill = (resid: number) =>
    Math.abs(resid) < 0.35
      ? 'var(--foreground)'
      : resid > 0
        ? 'var(--color-profit)'
        : 'var(--color-loss)'
  return (
    <div className="px-3 pb-0.5 pt-2.5">
      <svg
        viewBox="0 0 620 190"
        className="block h-auto w-full"
        role="img"
        aria-label="Implied vol smile with SVI fit and residual bars"
      >
        <line x1="0" x2="620" y1="168" y2="168" stroke="var(--border)" strokeWidth="1" />
        <line
          x1={X(0)}
          x2={X(0)}
          y1="8"
          y2="150"
          stroke="var(--sk-ticker)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path d={fitPath} fill="none" stroke="var(--primary)" strokeWidth="1.7" />
        {rows.map((r) => (
          <circle key={`p${r.strike}`} cx={X(r.k)} cy={Y(r.mkt)} r="3" fill={dotFill(r.resid)} />
        ))}
        {rows.map((r) => (
          <rect
            key={`b${r.strike}`}
            x={X(r.k) - 3.5}
            y={r.resid >= 0 ? 168 - Math.abs(r.resid) * pxPerPt : 168}
            width="7"
            height={Math.max(1.5, Math.abs(r.resid) * pxPerPt)}
            fill={r.resid > 0 ? 'var(--color-profit)' : 'var(--color-loss)'}
            opacity=".85"
          />
        ))}
      </svg>
      <div className="flex justify-between pt-0.5">
        {rows
          .filter((_, i) => i % 2 === 0)
          .map((r) => (
            <span key={r.strike} className={cn(mono, 'text-dense-micro text-muted-foreground')}>
              {r.strike}
            </span>
          ))}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 pt-1.5">
        <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
          <span className="text-primary">—</span> fit
        </span>
        <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>● market IV</span>
        <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
          bars = residual, above line rich{pxPerPt < 9 ? ' · scaled to the worst bar' : ''}
        </span>
      </div>
    </div>
  )
}


export function SmileFitPanel({
  sym,
  rows,
  quality,
  fitRow,
  expiry,
  skewPctl,
  handFit,
}: {
  sym: string
  rows: SmileRow[]
  quality: { rmse: number | null; maxResid: number | null }
  fitRow: VolSurfaceFitRow | null
  expiry: string | null
  skewPctl: number | null
  handFit: boolean
}) {
  return (
            <section className="flex min-w-0 flex-[999_1_32rem] flex-col gap-3">
              <div className={panel}>
                <header className={panelHead}>
                  <span className="text-dense-body font-semibold">Fit residuals</span>
                  <span className="text-dense-caption text-muted-foreground">
                    market minus raw-SVI, vol points
                  </span>
                  <span className="ml-auto inline-flex flex-wrap items-center gap-1.5">
                    {quality.rmse != null ? (
                      <DenseTag
                        size="cell"
                        variant={quality.rmse < 0.6 ? 'success' : quality.rmse < 1.2 ? 'warning' : 'danger'}
                      >
                        RMSE {quality.rmse.toFixed(3)}
                      </DenseTag>
                    ) : null}
                    <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                      max |resid| {quality.maxResid?.toFixed(2) ?? '—'}
                    </span>
                  </span>
                </header>
                {rows.length === 0 ? (
                  <p className="p-3 text-dense-meta text-muted-foreground">
                    The residual store holds no near-money rows for this expiry — the smile below
                    ±0.20 of log-moneyness is what the table would show.
                  </p>
                ) : (
                  <>
                    <SmileChart rows={rows} />
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse">
                        <thead>
                          <tr>
                            <th className={cn(th, 'text-left')}>Strike</th>
                            <th className={th}>log k</th>
                            <th className={th}>Mkt IV</th>
                            <th className={th}>Fit IV</th>
                            <th className={th}>Resid</th>
                            <th className={th}>Chain OI</th>
                            <th className={cn(th, 'text-left')}>Weight in fit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.strike}>
                              <td
                                className={cn(
                                  td,
                                  'text-left',
                                  Math.abs(r.k) < 0.005
                                    ? 'font-bold text-[var(--sk-ticker)]'
                                    : 'text-foreground'
                                )}
                              >
                                {r.strike}
                              </td>
                              <td className={cn(td, 'text-muted-foreground')}>{r.k.toFixed(3)}</td>
                              <td className={td}>{r.mkt.toFixed(2)}</td>
                              <td className={cn(td, 'text-primary')}>{r.fit.toFixed(2)}</td>
                              <td
                                className={cn(
                                  td,
                                  Math.abs(r.resid) < 0.35 ? 'text-muted-foreground' : pnlColorClass(r.resid)
                                )}
                              >
                                {r.resid >= 0 ? '+' : '−'}
                                {Math.abs(r.resid).toFixed(2)}
                              </td>
                              <td className={cn(td, r.thin ? 'text-warning' : 'text-foreground')}>
                                {r.oi != null ? r.oi.toLocaleString() : '—'}
                              </td>
                              <td className={cn(td, 'text-left')}>
                                {r.weightPct != null ? (
                                  <span className="flex items-center gap-1.75">
                                    <span className="h-[5px] max-w-[90px] flex-1 overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
                                      <span
                                        className={cn(
                                          'block h-[5px]',
                                          r.thin ? 'bg-warning' : 'bg-[var(--sk-accent)]'
                                        )}
                                        style={{ width: `${Math.min(100, r.weightPct * 3.2)}%` }}
                                      />
                                    </span>
                                    <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                                      {r.weightPct.toFixed(0)}%
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground" title="No chain OI at this strike — no weight to show.">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                <p className="m-0 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  Residual is market minus fit in vol points, so a positive row is rich to the
                  surface. Weight is the strike&rsquo;s share of chain OI — rows under{' '}
                  {THIN_OI.toLocaleString()} OI are flagged because their mid is mostly modelled,
                  and a fit that chases them is fitting the quote engine rather than the market.
                  The store&rsquo;s own RMSE (
                  {fitRow?.fit_rmse != null ? (fitRow.fit_rmse * 100).toFixed(1) : '—'} vol pts
                  over {fitRow?.n_points ?? '—'} strikes) covers the deep wings this window
                  leaves out — the store writes it as an IV fraction, converted once here.
                </p>
              </div>
              <CopilotDraftPanel>
                No per-run draft store exists yet — the drafts the engine writes today are
                hypothesis reviews, not surface narrations. The panel keeps its seat; the ask
                below answers live with this tab&rsquo;s snapshot.
              </CopilotDraftPanel>
              <div className="flex">
                <AskCopilotButton
                  originPage="lab-symbol"
                  originLabel="Symbol lab · surface"
                  symbol={sym}
                  snapshot={compactSnapshot({
                    expiry,
                    rmse_window: quality.rmse,
                    max_resid: quality.maxResid,
                    skew_pctl: skewPctl,
                    hand_fit: handFit,
                  })}
                  suggestedPrompt={`Where does the ${sym} smile misfit, and is the residual concentrated in one strike or spread along the wing?`}
                />
              </div>
            </section>
  )
}
