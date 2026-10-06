/**
 * Indicator & Pine signals (W6; design Rev .158 B4) — under the lens decay
 * table, its own block. One row per signal and side: the 13 indicator
 * crossings (`/research/indicators/signal-stats`) and each active Pine
 * library script's buy and sell (`/research/pine/signal-stats`), all read over
 * one basket at one horizon. Edge = signal win − the basket's own baseline:
 * a cross-section, not a decay curve, so there is no monthly series and no
 * alert. Row end `chart ↗` opens the basket's first name on Symbol with the
 * signal marked.
 */
import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CloseButton, DenseTag, SegmentControl } from '@/components/data-display'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useWatchlist } from '@/hooks/useWatchlist'
import { usePineLibrary } from '@/hooks/usePineLibrary'
import { indicatorChartSignal, pineChartSignalOf, pineLibraryPath, withChartSignal, withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { INDICATOR_SIGNALS, fetchSignalStats } from '@/api/research/indicators'
import { fetchPineSignalStats } from '@/api/research/pine'
import { basisNote, cellOf, fmtPt, sortRows, type StatsLike, type WinRateRow } from './signalWinRateModel'

/** When the watchlist has no stock names (or has not answered): the design's basket. */
const FALLBACK_BASKET = ['NVDA', 'AMD', 'AVGO', 'SMCI', 'PLTR', 'TSLA']
const MAX_BASKET = 50
const HORIZONS = [5, 10, 20]

function pct(v: number | null): string {
  return v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`
}

function errText(e: unknown): string | null {
  return e instanceof Error ? e.message : e ? String(e) : null
}

export function SignalWinRatePanel() {
  const watch = useWatchlist()
  const watchSyms = useMemo(
    () => [...new Set((watch.data?.items ?? []).filter((i) => i.sec_type === 'STK').map((i) => i.symbol.toUpperCase()))].slice(0, MAX_BASKET),
    [watch.data],
  )
  // The basket starts as the watchlist (the Watch list) and is the reader's once edited.
  const [edited, setEdited] = useState<string[] | null>(null)
  const basket = edited ?? (watchSyms.length ? watchSyms : watch.isLoading ? [] : FALLBACK_BASKET)
  const basketFrom = edited ? 'edited' : watchSyms.length ? 'watchlist' : 'default'
  const [q, setQ] = useState('')
  const [h, setH] = useState(10)
  const [src, setSrc] = useState<'all' | 'ind' | 'pine'>('all')
  const pine = usePineLibrary()
  const key = basket.join(',')

  const indQs = useQueries({
    queries: INDICATOR_SIGNALS.map((s) => ({
      queryKey: QUERY_KEYS.researchEngine.indicatorSignalStats(s.id, key),
      queryFn: () => fetchSignalStats({ signal: s.id, symbols: basket, horizons: HORIZONS }),
      enabled: basket.length > 0 && src !== 'pine',
      staleTime: 10 * 60_000,
    })),
  })
  const pineCells = pine.scripts.flatMap((s) => (['buy', 'sell'] as const).map((side) => ({ s, side })))
  const pineQs = useQueries({
    queries: pineCells.map(({ s, side }) => ({
      queryKey: QUERY_KEYS.researchEngine.pineSignalStats(s.id, side, key),
      queryFn: () => fetchPineSignalStats({ script: s.id, side, symbols: basket, horizons: HORIZONS }),
      enabled: basket.length > 0 && src !== 'ind',
      staleTime: 10 * 60_000,
    })),
  })

  // useQueries returns a new array each render; its answers are keyed by their update stamps.
  const pineStamp = pineQs.map((x) => x.dataUpdatedAt + x.errorUpdatedAt).join()
  const indStamp = indQs.map((x) => x.dataUpdatedAt + x.errorUpdatedAt).join()
  const rows = useMemo(() => {
    const out: WinRateRow[] = []
    if (src !== 'ind')
      pineCells.forEach(({ s, side }, i) => {
        const qq = pineQs[i]
        out.push({
          key: `pine:${s.id}:${side}`,
          chartSignal: pineChartSignalOf(s.id),
          name: s.label,
          source: 'pine',
          sourceLabel: s.origin === 'user' ? 'pine · mine' : s.origin === 'community' ? 'pine · community' : 'pine',
          side,
          state: qq?.isError ? 'failed' : qq?.data ? 'ok' : 'loading',
          error: errText(qq?.error),
          ...cellOf(qq?.data as StatsLike | undefined, h),
        })
      })
    if (src !== 'pine')
      INDICATOR_SIGNALS.forEach((s, i) => {
        const qq = indQs[i]
        out.push({
          key: `ind:${s.id}`,
          chartSignal: indicatorChartSignal(s.id),
          name: s.label,
          source: 'indicator',
          sourceLabel: 'indicator',
          side: s.direction === 'up' ? 'buy' : 'sell',
          state: qq?.isError ? 'failed' : qq?.data ? 'ok' : 'loading',
          error: errText(qq?.error),
          ...cellOf(qq?.data as StatsLike | undefined, h),
        })
      })
    return sortRows(out)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, h, pine.scripts, pineStamp, indStamp])

  const add = () => {
    const v = q.trim().toUpperCase()
    setQ('')
    if (!v || basket.includes(v) || basket.length >= MAX_BASKET) return
    setEdited([...basket, v])
  }
  const first = basket[0] ?? null
  const windowNote = (() => {
    const anyData = pineQs.find((x) => x.data)?.data ?? indQs.find((x) => x.data)?.data
    return anyData?.window ? `${anyData.window.start.slice(0, 4)}–${anyData.window.end.slice(0, 4)}` : 'daily'
  })()

  return (
    <section className={panel} aria-label="Indicator and Pine signals">
      <header className={panelHead}>
        <span className={cap}>Indicator &amp; Pine signals</span>
        <span className="text-dense-body font-semibold">edge over the basket’s own baseline</span>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          a cross-section, not a decay curve — no monthly series, no alerts
        </span>
      </header>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
        <span className={cap}>Basket</span>
        <span
          className="inline-flex min-h-7 flex-wrap items-center gap-1 rounded-lg bg-foreground/[0.07] py-0.5 pl-2 pr-1"
          title={basketFrom === 'watchlist' ? 'Your watchlist’s stocks, until you edit it' : basketFrom === 'default' ? 'The watchlist has no stocks; a default basket' : undefined}
        >
          {basket.map((sym) => (
            <span key={sym} className="inline-flex h-5 items-center gap-0.5 rounded-full bg-foreground/[0.09] pl-1.5 pr-0.5">
              <span className={cn(mono, 'text-dense-caption font-bold text-entity-symbol')}>{sym}</span>
              <CloseButton size="sm" label={`Remove ${sym}`} onClick={() => setEdited(basket.filter((x) => x !== sym))} />
            </span>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
              if (e.key === 'Backspace' && !q && basket.length) setEdited(basket.slice(0, -1))
            }}
            placeholder="add ↩"
            aria-label="Add a symbol to the basket"
            className={cn(mono, 'h-[22px] w-16 border-0 bg-transparent text-dense-caption outline-none')}
          />
        </span>
        <span className={cap}>Horizon</span>
        <SegmentControl
          ariaLabel="Horizon"
          size="sm"
          options={HORIZONS.map((x) => ({ value: String(x), label: `${x}d` }))}
          value={String(h)}
          onChange={(v) => setH(Number(v))}
        />
        <span className={cap}>Source</span>
        <SegmentControl
          ariaLabel="Source"
          size="sm"
          options={[
            { value: 'all', label: 'All' },
            { value: 'ind', label: 'Indicators' },
            { value: 'pine', label: 'Pine' },
          ]}
          value={src}
          onChange={(v) => setSrc(v as 'all' | 'ind' | 'pine')}
        />
        <span className={cn(mono, 'ml-auto text-dense-caption text-muted-foreground')}>
          {rows.length} rows · {basket.length} names · daily, {windowNote}
        </span>
      </div>
      {basket.length === 0 ? (
        <p className="m-0 px-3 pb-2 text-dense-caption text-muted-foreground">
          {watch.isLoading ? 'Reading the watchlist for the basket…' : 'The basket is empty — add a symbol.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]" data-sr-table="">
            <thead>
              <tr>
                <th className={cn(th, 'text-left')}>Signal</th>
                <th className={cn(th, 'text-left')}>Source</th>
                <th className={cn(th, 'text-left')}>Side</th>
                <th className={th}>n</th>
                <th className={th}>Signal win</th>
                <th className={th}>Baseline</th>
                <th className={th}>Edge</th>
                <th className={cn(th, 'text-left')}>Sample</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const noise = r.sample === 'noise'
                return (
                  <tr key={r.key} className={cn(noise && 'opacity-70')}>
                    <td className={cn(td, 'text-left font-sans text-dense-body font-medium')}>{r.name}</td>
                    <td className={cn(td, 'text-left font-sans text-dense-caption text-muted-foreground')}>{r.sourceLabel}</td>
                    <td className={cn(td, 'text-left font-sans text-dense-caption text-[var(--sk-soft)]')}>
                      {r.side === 'buy' ? '▲ buy' : '▼ sell'}
                    </td>
                    {r.state === 'loading' ? (
                      <td colSpan={5} className={cn(td, 'text-muted-foreground')}>
                        …
                      </td>
                    ) : r.state === 'failed' ? (
                      <td colSpan={5} className={cn(td, 'text-left font-sans text-dense-caption text-destructive')} title={r.error ?? undefined}>
                        not read — {(r.error ?? '').slice(0, 80)}
                      </td>
                    ) : (
                      <>
                        <td
                          className={td}
                          title={r.nRaw != null && r.n != null && r.nRaw !== r.n ? `${r.nRaw} before overlapping signals were deduped` : undefined}
                        >
                          {r.n ?? '—'}
                        </td>
                        <td className={td}>{pct(r.win)}</td>
                        <td className={cn(td, 'text-muted-foreground')}>{pct(r.base)}</td>
                        <td
                          className={cn(
                            td,
                            'font-semibold',
                            noise || r.edge == null || Math.round(r.edge * 100) === 0
                              ? 'text-muted-foreground'
                              : r.edge > 0
                                ? 'text-[var(--color-profit)]'
                                : 'text-[var(--color-loss)]',
                          )}
                        >
                          {fmtPt(r.edge)}
                          {r.edgeCi ? (
                            <div className="text-dense-micro font-normal text-muted-foreground" title="90% interval of the edge">
                              {fmtPt(r.edgeCi[0])} to {fmtPt(r.edgeCi[1])}
                            </div>
                          ) : null}
                        </td>
                        <td className={cn(td, 'text-left')}>
                          {r.sample && r.sample !== 'ok' ? (
                            <DenseTag size="cell" variant={noise ? 'danger' : 'warning'}>
                              {r.sample}
                            </DenseTag>
                          ) : null}
                        </td>
                      </>
                    )}
                    <td className={cn(td, 'whitespace-nowrap')}>
                      {first ? (
                        <Link
                          to={withSymbolParam(withChartSignal(SYMBOL_PATH, r.chartSignal), first)}
                          title={`Open ${first} with ${r.name} marked`}
                          className="font-sans text-dense-caption text-[var(--sk-accent)] hover:underline"
                        >
                          chart ↗
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="m-0 text-pretty border-t border-border px-3 py-2 text-dense-caption leading-normal text-muted-foreground">
        Win = the close {h} sessions after the signal moved its way. Baseline = the same names over every session in the window.{' '}
        {basisNote(rows)} Under 5 signals reads noise, under 30 thin. Same library as the screener, the chart and the simulator —{' '}
        <Link to={pineLibraryPath()} className="text-[var(--sk-accent)] hover:underline">
          Pine library
        </Link>
        .
      </p>
    </section>
  )
}
