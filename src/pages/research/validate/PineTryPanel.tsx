/**
 * Pine library › Try on a basket (ledger S13, Owner 2026-10-06; research
 * 0.200.0 POST research/pine/try). The source in the editor runs now over a
 * basket of names and its buy / sell sessions are measured the way Signal Decay
 * measures a saved script — next-open entry, net of cost, cooldown, baseline of
 * the same names' other sessions, 90% interval by name. Nothing is saved, so a
 * script can be judged before it reaches the nightly build.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ViewState } from '@bifrost/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SegmentControl } from '@/components/data-display'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { cap, mono, td, th } from '@/components/research/labFaceUi'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import {
  pineIssuesOf,
  tryPineScript,
  type PineBasket,
  type PineHorizonStats,
  type PineIssue,
  type PineSide,
  type PineTryResult,
} from '@/api/research/pine'
import { signedPct } from './simRuns'

type BasketChoice = PineBasket | 'custom'

const BASKETS: { value: BasketChoice; label: string; title: string }[] = [
  { value: 'resident', label: 'Watchlist + SPY/QQQ/IWM', title: 'The option universe’s resident tier: your watchlist and the three index ETFs (about 21 names)' },
  { value: 'liquid50', label: 'Liquid 50', title: 'The 50 common stocks in the universe with the highest average dollar volume over the last 60 sessions' },
  { value: 'custom', label: 'My list', title: 'Up to 50 symbols, separated by spaces or commas' },
]
const WINDOWS = [
  { value: '365', label: '1 y' },
  { value: '730', label: '2 y' },
  { value: '1095', label: '3 y' },
]

function rate(v: number | null | undefined): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`
}

/**
 * One side's signals against the baseline, a row per holding period — the
 * same table for Try on a basket and the script report (B7).
 */
export function PineEdgeTable({
  side,
  stats: s,
  horizons,
}: {
  side: PineSide
  stats: Pick<PineTryResult['stats'][PineSide], 'signals' | 'sample_note' | 'by_horizon'> | undefined
  horizons: readonly number[]
}) {
  if (!s) return null
  const rows = horizons.map((h) => [h, s.by_horizon[String(h)] as PineHorizonStats | undefined] as const)
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-baseline gap-2">
        <span className={cap}>{side === 'buy' ? '▲ Buy' : '▼ Sell'}</span>
        <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
          {s.signals} signal{s.signals === 1 ? '' : 's'} · {s.sample_note}
        </span>
      </div>
      {s.signals ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-dense-caption">
            <thead>
              <tr>
                <th className={th}>Days</th>
                <th className={cn(th, 'text-right')}>n</th>
                <th className={cn(th, 'text-right')}>Win</th>
                <th className={cn(th, 'text-right')}>Avg net</th>
                <th className={cn(th, 'text-right')}>Baseline</th>
                <th className={cn(th, 'text-right')} title="Average net return after the signal minus the same names’ other sessions; 90% interval by name">
                  Edge [90%]
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([h, r]) => {
                const ci = r?.ci90?.avg_return_edge
                const edge = r?.avg_return_edge ?? null
                const clear = ci != null && (ci[0] > 0 || ci[1] < 0)
                return (
                  <tr key={h}>
                    <td className={cn(td, mono)}>{h}</td>
                    <td className={cn(td, mono, 'text-right')}>{r?.signal.n ?? '—'}</td>
                    <td className={cn(td, mono, 'text-right')}>{rate(r?.signal.win_rate)}</td>
                    <td className={cn(td, mono, 'text-right')}>{signedPct(r?.signal.avg_return)}</td>
                    <td className={cn(td, mono, 'text-right text-muted-foreground')}>{signedPct(r?.baseline.avg_return)}</td>
                    <td
                      className={cn(td, mono, 'text-right', clear && cn('font-semibold', pnlColorClass(edge)))}
                      title={clear ? 'The interval does not cross zero' : 'The interval crosses zero'}
                    >
                      {signedPct(edge)} {ci ? <span className="text-muted-foreground">[{signedPct(ci[0], 1)}, {signedPct(ci[1], 1)}]</span> : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

export function PineTryPanel({
  source,
  canRun,
  blockedWhy,
  onIssues,
}: {
  source: string
  canRun: boolean
  blockedWhy?: string
  /** Lines a refused try named, to mark in the editor (empty clears them). */
  onIssues: (issues: PineIssue[]) => void
}) {
  const [basket, setBasket] = useState<BasketChoice>('resident')
  const [custom, setCustom] = useState('')
  const [days, setDays] = useState('730')
  const run = useMutation({
    mutationFn: () =>
      tryPineScript({
        source,
        ...(basket === 'custom'
          ? { symbols: custom.split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean).slice(0, 50) }
          : { basket }),
        days: Number(days),
      }),
    onMutate: () => onIssues([]),
    onError: (e) => onIssues(pineIssuesOf(e)),
  })
  const customCount = custom.split(/[\s,]+/).filter(Boolean).length
  const ready = canRun && source.trim() !== '' && (basket !== 'custom' || (customCount > 0 && customCount <= 50))
  const res = run.data
  const fired = res?.symbols.filter((s) => s.buy + s.sell > 0).length ?? 0
  const failed = res?.symbols.filter((s) => s.error) ?? []

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-baseline gap-2">
        <span className={cap}>Try on a basket</span>
        <span className="text-dense-caption text-muted-foreground">runs now, measured like Signal Decay · nothing is saved</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentControl
          ariaLabel="Basket"
          options={BASKETS.map((b) => ({ value: b.value, label: b.label }))}
          value={basket}
          onChange={(v) => setBasket(v as BasketChoice)}
        />
        <SegmentControl ariaLabel="Window" options={WINDOWS} value={days} onChange={setDays} />
      </div>
      {basket === 'custom' ? (
        <Input
          aria-label="Symbols to try"
          placeholder="AAPL MSFT NVDA … (up to 50)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="h-8 font-mono text-dense-body"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={!ready || run.isPending} title={!canRun ? blockedWhy : undefined} onClick={() => run.mutate()}>
          {run.isPending ? 'Trying…' : 'Try'}
        </Button>
        {res ? (
          <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
            {res.window.start} → {res.window.end} · {res.symbols.length} names · {fired} fired
            {res.context.length ? ` · reads ${res.context.join(', ')}` : ''}
          </span>
        ) : null}
      </div>
      {run.isError ? (
        firstResearchAuthGapError(run.error) ? (
          <ResearchAuthGap error={run.error} layout="banner" />
        ) : (
          <ViewState
            kind="failed"
            layout="strip"
            title="The try did not run"
            detail={run.error instanceof Error ? run.error.message : String(run.error)}
          />
        )
      ) : null}
      {res ? (
        <div className="space-y-3">
          <PineEdgeTable side="buy" stats={res.stats.buy} horizons={res.horizons} />
          <PineEdgeTable side="sell" stats={res.stats.sell} horizons={res.horizons} />
          {failed.length ? (
            <div className="space-y-0.5">
              <span className={cap}>Did not run on {failed.length}</span>
              {failed.slice(0, 8).map((s) => (
                <p key={s.symbol} className={cn(mono, 'm-0 text-dense-caption text-muted-foreground')}>
                  {s.symbol}: {s.error}
                  {s.line ? ` (line ${s.line})` : ''}
                </p>
              ))}
            </div>
          ) : null}
          <p className="m-0 text-dense-caption text-muted-foreground">
            Win and Avg net: the close N sessions after the next open, net of {res.cost_bps} bps a side; Edge
            subtracts the same names’ other sessions. A 2-year window on about 20 names is a first look, not a verdict.
          </p>
        </div>
      ) : null}
    </div>
  )
}
