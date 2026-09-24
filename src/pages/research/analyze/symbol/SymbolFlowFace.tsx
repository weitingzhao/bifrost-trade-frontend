/**
 * The Flow face — one name only (design `Research Symbol.dc.html`, §isFlow).
 * The D-RLA-4 banner first: the tape endpoints answer 403 on this plan, so
 * everything below is an OI × volume proxy from the daily snapshot, and the
 * real tape drops in without a rebuild. Then the sentiment proxy's verdict
 * with its notional split, the concentration table off the chain's own
 * rows, and the multi-leg section as the design's named empty state.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { DenseTag, EmptyState } from '@/components/data-display'
import { LensVerdictBlock } from '@/components/research/LensVerdictBlock'
import { FaceKv } from '@/components/research/FaceKv'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH, TAB_PARAM } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { chainFromSnapshots } from '@/utils/optionChain'

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

const fmtN = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}k`

export function SymbolFlowFace({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const exQ = useExhibitComposite(['order_sentiment', 'gex_regime'], sym)
  const flowEx = exQ.data?.find((e) => e.lens === 'order_sentiment' || e.lens_id === 'order_sentiment')
  const gexEx = exQ.data?.find((e) => e.lens === 'gex_regime' || e.lens_id === 'gex_regime')
  const r = (flowEx?.readings ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const call = num(r.call_notional)
  const put = num(r.put_notional)
  const total = call != null && put != null ? call + put : null
  const score = num(r.sentiment_score)
  const expiry = typeof (gexEx?.readings as Record<string, unknown> | undefined)?.expiry === 'string'
    ? ((gexEx!.readings as Record<string, unknown>).expiry as string)
    : null

  const chainQ = useQuery({
    queryKey: ['market', 'option-snapshots', sym, expiry, 'flow'],
    queryFn: () => fetchOptionSnapshots(sym, expiry!),
    enabled: Boolean(sym && expiry),
    staleTime: 5 * 60_000,
  })
  const top = useMemo(() => {
    const contracts = chainFromSnapshots(chainQ.data?.rows ?? [])
      .map((c) => ({
        ...c,
        notional: c.mark != null && c.volume != null ? c.mark * c.volume * 100 : 0,
      }))
      .filter((c) => c.notional > 0)
      .sort((a, b) => b.notional - a.notional)
      .slice(0, 6)
    const sum = contracts.reduce((a, c) => a + c.notional, 0)
    return { contracts, sum }
  }, [chainQ.data?.rows])

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-md border border-warning/60 bg-warning/5 px-3 py-2 text-dense-meta leading-normal text-secondary-foreground text-pretty">
        <DenseTag variant="warning" size="cell" title="Owner decision D-RLA-4">
          D-RLA-4
        </DenseTag>
        <span>
          Options trades and quotes are not on the current Massive plan — the tape endpoints
          answer 403. What follows is an <b className="text-foreground">OI × volume proxy</b>{' '}
          from the daily option snapshot, not order flow. The real tape drops in here without a
          rebuild.
        </span>
      </div>

      <div className="grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr))]">
        <section className={panel}>
          <header className={panelHead}>
            <span className={cap}>Order sentiment</span>
            <span className="text-dense-body font-semibold">proxy · {flowEx?.as_of ?? '—'}</span>
            <span className="ml-auto text-dense-caption text-muted-foreground">source · order_sentiment lens</span>
          </header>
          <LensVerdictBlock lensId="order_sentiment" exhibit={flowEx} />
          <div className="grid grid-cols-2 gap-2.5 px-3 py-2.5 sm:grid-cols-4">
            <FaceKv label="total notional" value={total != null ? fmtN(total) : '—'} />
            <FaceKv label="call" value={call != null ? fmtN(call) : '—'} cls="text-profit" />
            <FaceKv label="put" value={put != null ? fmtN(put) : '—'} cls="text-loss" />
            <FaceKv label="sentiment score" value={score != null ? score.toFixed(1) : '—'} />
          </div>
          {call != null && put != null && total ? (
            <div className="px-3 pb-2.5">
              <div className={cn(cap, 'mb-1')}>call · put split</div>
              <div className="flex h-2 overflow-hidden rounded-[4px]">
                <span className="bg-profit" style={{ width: `${(call / total) * 100}%` }} />
                <span className="flex-1 bg-loss" />
              </div>
            </div>
          ) : null}
          <p className={note}>
            Score = (call − put) / total, notional-weighted, from OI × volume. It cannot see
            aggressor side; a big put print that was sold reads as bearish here. Treat as a
            tilt, not a signal.
          </p>
        </section>

        <section className={panel}>
          <header className={panelHead}>
            <span className={cap}>Concentration</span>
            <span className="text-dense-body font-semibold">where the proxy notional sits</span>
            <span className="ml-auto text-dense-caption text-muted-foreground">{expiry ?? '—'}</span>
          </header>
          {top.contracts.length === 0 ? (
            <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
              No traded contracts in the snapshot at the anchor expiry.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={cn(th, 'text-left')}>Contract</th>
                    <th className={th}>Notional</th>
                    <th className={cn(th, 'text-left')}>Share</th>
                    <th className={th}>Vol / OI</th>
                  </tr>
                </thead>
                <tbody>
                  {top.contracts.map((c) => {
                    const vo = c.oi != null && c.oi > 0 && c.volume != null ? c.volume / c.oi : null
                    return (
                      <tr key={c.ticker}>
                        <td className={cn(td, 'text-left text-entity-option')}>
                          <Link
                            to={withSymbolParam(`${SYMBOL_PATH}?${TAB_PARAM}=chain`, sym)}
                            className="hover:underline"
                            title="Rule this strike in the Chain face."
                          >
                            {c.strike}
                            {c.right}
                          </Link>
                        </td>
                        <td className={td}>{fmtN(c.notional)}</td>
                        <td className={cn(td, 'text-left')}>
                          <span className="flex items-center gap-1.5">
                            <span className="relative block h-[5px] w-[60px] overflow-hidden rounded-[3px] bg-[var(--sk-line0)]">
                              <span
                                className="absolute inset-y-0 left-0 bg-[var(--sk-accent)]"
                                style={{ width: `${(c.notional / (top.sum || 1)) * 100}%` }}
                              />
                            </span>
                            <span className="text-dense-micro text-muted-foreground">
                              {Math.round((c.notional / (top.sum || 1)) * 100)}%
                            </span>
                          </span>
                        </td>
                        <td className={cn(td, vo != null && vo > 1 ? 'text-warning' : 'text-muted-foreground')}>
                          {vo != null ? vo.toFixed(2) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className={note}>
            Vol / OI above 1 is new positioning, not rolls. The share is of the six largest
            books at the anchor expiry, session notional = last × volume × 100.
          </p>
        </section>

        <section className={cn(panel, 'col-[1/-1]')}>
          <header className={panelHead}>
            <span className={cap}>Multi-leg flow</span>
            <span className="text-dense-body font-semibold">spreads · sweeps · blocks</span>
          </header>
          <div className="px-3 py-3">
            <EmptyState
              title="Needs the options tape"
              description="Multi-leg detection reads aggressor-signed trades (market.option_trades). It stays a named empty section so the page shape does not change when the plan does."
            />
          </div>
        </section>
      </div>
    </div>
  )
}
