/**
 * The underlying's candles at the top of Overview (Rev 2026-09-26.98, Shell
 * Spec §10). Every judgement on this page has to be put on price before it
 * reads; the overlays are this page's own readings only — put/call wall, zero
 * γ, max pain, the ±1σ cone to the selected expiry, earnings and OpEx — never
 * moving averages or drawing tools. Trend lives in Ratings › Stocks.
 *
 * The trade-history overlay is the review layer: an option position has a
 * natural drawing on the underlying's chart — strike is a price, the holding
 * period a span of time. Fills come from the ledger's performance book, paired
 * by `buildOptExecutionGroups`; open positions take their mark from the same
 * monitor rows `My legs` above already shows.
 *
 * Windows never squeeze the candles to fit history: 60d–2y presets aggregate
 * to weekly past 130 sessions, and the 2-year mini strip below carries every
 * fill as a colour bar that jumps the window to reach it.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBars } from '@/api/market'
import { fetchOpexCurrent } from '@/api/research/opexCycle'
import {
  INDICATOR_SIGNALS,
  fetchIndicatorSeries,
  indicatorSignal,
} from '@/api/research/indicators'
import { fetchPineSignals } from '@/api/research/pine'
import { SectionPanel } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import {
  BARS_CHART_FRAME,
  BarsCandlestickChart,
  type ChartOverlayContext,
  type ChartPriceLevel,
  type ChartSessionVertical,
} from '@/components/charts/BarsCandlestickChart'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { useEarningsDates } from '@/hooks/useNarrative'
import { withSymbolParam } from '@/lib/symbolLink'
import { todayIso } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'
import { fmtExpiry } from '@/utils/positions'
import type { Bar } from '@/types/market'
import { useSymbolLegs } from '@/hooks/useSymbolLegs'
import {
  PRICE_WINDOWS,
  type PriceWindow,
  type PriceView,
  type TradeTrack,
  clampView,
  panView,
  aggFor,
  aggregateBars,
  barIsoDate,
  fmtPl,
  holdingFor,
  tradeTracksFor,
  sessionIndexFor,
  sessionsForWindow,
  sessionsUntil,
  windowForSessionsAgo,
} from '@/components/symbolChart/symbolPriceModel'
import { SymbolTradeOverlay } from '@/components/symbolChart/SymbolTradeOverlay'
import { SymbolChartPointer } from '@/components/symbolChart/SymbolChartPointer'
import { useOpenTrade } from '@/layout/tradeGo'
import { usePersistedChoice } from '@/hooks/usePersistedChoice'
import { useTradeIndex } from '@/hooks/useTradeIndex'
import { useChartSignal } from '@/components/symbolChart/useChartSignal'

/** The vendor keeps two rolling years; the API caps a page at 500. */
const HISTORY_LIMIT = 500
const CONE_CAP_SESSIONS = 30

interface PlacedTrack {
  track: TradeTrack
  /** Index into the full daily history; null = before it. */
  openIdx: number | null
  closeIdx: number | null
  openAgo: number
}

/**
 * `tradeId` (Rev .103, the Instance page): the same chart with one instance
 * lit and labelled; every other trade is dimmed to 20% or hidden (the reader's
 * choice, kept on this machine), a hover lights one for a moment, and the
 * window opens on the instance's whole life.
 */
export function SymbolPriceChart({
  symbol,
  tradeId,
  variant = 'full',
}: {
  symbol: string
  tradeId?: number
  /**
   * `mini` (Rev .103, the Symbol 440 panel): the same chart with its text layer
   * off — candles, the wall lines, the holding line and the trades, a trade's
   * label only on hover; no window switch, no volume, no events, no minimap.
   */
  variant?: 'full' | 'mini'
}) {
  const isMini = variant === 'mini'
  const sym = symbol.trim().toUpperCase()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [rawView, setView] = useState<PriceView | null>(null)
  const [others, setOthers] = usePersistedChoice<'dim' | 'hide'>('bifrost.chart.others', 'dim', ['dim', 'hide'])
  const [tradesOn, setTradesOn] = useState(true)
  const [hover, setHover] = useState<string | null>(null)
  // Technicals and signal marks come from Research (computed with full warm-up),
  // the same series the simulator and Signal decay evaluate.
  const [techs, setTechs] = useState<{ bb: boolean; macd: boolean; rsi: boolean }>({
    bb: false,
    macd: false,
    rsi: false,
  })
  const { sigId, setSigId, pineId, indSig, pineChoices, pineName } = useChartSignal(isMini)

  const barsQ = useQuery({
    queryKey: ['market', 'bars', sym, '1 D', HISTORY_LIMIT],
    queryFn: () => fetchBars(sym, '1 D', HISTORY_LIMIT),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  const exQ = useExhibitComposite(['gex_regime', 'opex_pin', 'vrp'], sym)
  const opexQ = useQuery({
    queryKey: ['research-engine', 'opex-current', sym, 'no-map'],
    queryFn: () => fetchOpexCurrent(sym, undefined, false),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const earnQ = useEarningsDates(sym)
  const bookQ = useLedgerExecutionsBook({ limit: 0 })

  const daily = useMemo<Bar[]>(() => {
    const rows = (barsQ.data?.bars ?? []).filter(
      (b): b is Bar & { time: number } => b.time != null && Number.isFinite(b.time),
    )
    return [...rows].sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
  }, [barsQ.data])
  const dates = useMemo(() => daily.map((b) => barIsoDate(b.time as number)), [daily])
  const total = daily.length

  const wantIndicators = !isMini && (techs.bb || techs.macd || techs.rsi || indSig !== '')
  const indQ = useQuery({
    queryKey: ['research-engine', 'indicators', 'series', sym, dates[0] ?? '', indSig],
    queryFn: () =>
      fetchIndicatorSeries({ symbol: sym, start: dates[0], signals: indSig ? [indSig] : [] }),
    enabled: Boolean(sym) && wantIndicators && dates.length > 0,
    staleTime: 10 * 60_000,
  })
  const pineQ = useQuery({
    queryKey: ['research-engine', 'pine', 'signals', 'symbol', sym, pineId, dates[0] ?? ''],
    queryFn: () => fetchPineSignals({ scripts: [pineId as string], symbol: sym, start: dates[0] }),
    enabled: !isMini && Boolean(sym) && pineId != null && dates.length > 0,
    staleTime: 10 * 60_000,
  })
  const indByDate = useMemo(
    () => new Map((indQ.data?.bars ?? []).map((b) => [b.date, b])),
    [indQ.data]
  )

  // An instance's page opens on its whole life, a little either side.
  const focusStart = useMemo(() => {
    if (tradeId == null) return null
    const days = (bookQ.data?.items ?? [])
      .filter((e) => e.trade_id === tradeId)
      .map((e) => (e.trade_date ?? '').slice(0, 10))
      .filter(Boolean)
      .sort()
    return days.length ? sessionIndexFor(dates, days[0]) : null
  }, [tradeId, bookQ.data, dates])
  const view = clampView(
    total,
    rawView ?? { span: focusStart != null ? Math.max(60, total - focusStart + 10) : 60, off: 0 },
  )
  const winSessions = view.span
  const agg = aggFor(winSessions)
  const winEnd = total - view.off
  const winStart = winEnd - winSessions
  // Off today (panned into history): the cone and the event lines belong to today.
  const atToday = view.off === 0
  const presetOf =
    PRICE_WINDOWS.find((w) => atToday && sessionsForWindow(w.value, total) === winSessions)
      ?.value ?? ''
  const setPreset = (w: PriceWindow) => setView({ span: sessionsForWindow(w, total), off: 0 })
  const chartBars = useMemo(
    () => aggregateBars(daily.slice(winStart, winEnd), agg),
    [daily, winStart, winEnd, agg]
  )
  // Daily indicator values only line up with daily candles; weekly candles keep the chart's own.
  const indicatorSeries = useMemo(() => {
    if (agg !== 1 || indByDate.size === 0) return undefined
    const rows = dates.slice(winStart, winEnd).map((d) => indByDate.get(d))
    return {
      rsi: rows.map((r) => r?.rsi ?? null),
      macd: rows.map((r) =>
        r && r.macd != null && r.macd_signal != null
          ? { macd: r.macd, signal: r.macd_signal, hist: r.macd_hist }
          : { macd: null, signal: null, hist: null }
      ),
      bollinger: rows.map((r) => ({
        mid: r?.bb_mid ?? null,
        upper: r?.bb_upper ?? null,
        lower: r?.bb_lower ?? null,
      })),
    }
  }, [agg, indByDate, dates, winStart, winEnd])
  // Signal sessions inside the window, as candle indexes (a weekly candle takes its week's).
  const signalMarks = useMemo(() => {
    const rem = (winEnd - winStart) % agg
    const lead = rem === 0 ? 0 : agg - rem
    const source = pineId
      ? (pineQ.data?.rows ?? []).map((r) => ({
          date: r.date,
          signal: `pine:${r.script}`,
          label: `${pineName} ${r.side}`,
          direction: r.side === 'buy' ? ('up' as const) : ('down' as const),
          close: r.close ?? NaN,
        }))
      : (indQ.data?.markers ?? [])
    return source.flatMap((m) => {
      const idx = sessionIndexFor(dates, m.date)
      if (idx == null || dates[idx] !== m.date || idx < winStart || idx >= winEnd) return []
      const close = Number.isFinite(m.close) ? m.close : daily[idx].close
      return [{ ...m, close, at: Math.floor((idx - winStart + lead) / agg) }]
    })
  }, [indQ.data, pineQ.data, pineId, pineName, dates, daily, winStart, winEnd, agg])

  const readings = (id: string) =>
    (exQ.data?.find((e) => e.lens === id || e.lens_id === id)?.readings ?? {}) as Record<
      string,
      unknown
    >
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const g = readings('gex_regime')
  const spot = num(g.spot) ?? (total > 0 ? daily[total - 1].close : null)
  const callWall = num(g.major_call_wall)
  const putWall = num(g.major_put_wall)
  const zeroG = num(g.zero_gamma)
  const maxPain = num(readings('opex_pin').max_pain_strike)
  const iv30 = num(readings('vrp').atm_iv_30d)

  // The cone's expiry is the page's selection (`?expiration=`, shared with the
  // Chain tab); with none picked it runs to the next OpEx — a date the chart
  // already marks. No expiry or no IV30 → no cone, no future zone.
  const today = todayIso()
  const urlExpiry = (params.get('expiration') ?? '').trim() || null
  const expiryRaw = urlExpiry ?? opexQ.data?.next_opex_date ?? null
  const expiryIso = expiryRaw
    ? /^\d{8}$/.test(expiryRaw)
      ? `${expiryRaw.slice(0, 4)}-${expiryRaw.slice(4, 6)}-${expiryRaw.slice(6, 8)}`
      : expiryRaw.slice(0, 10)
    : null
  const dteSessions = expiryIso ? sessionsUntil(today, expiryIso) : null
  const coneSessions =
    dteSessions != null && dteSessions > 0 && iv30 != null && spot != null
      ? Math.min(dteSessions, CONE_CAP_SESSIONS)
      : null
  const coneSlots = atToday && coneSessions != null ? Math.ceil(coneSessions / agg) : 0

  const earnDate = earnQ.data?.expected_next?.date ?? null
  const earnSessions = earnDate ? sessionsUntil(today, earnDate) : null
  const opexSessions = opexQ.data?.next_opex_date
    ? sessionsUntil(today, opexQ.data.next_opex_date)
    : null

  const levels = useMemo<ChartPriceLevel[]>(() => {
    const out: ChartPriceLevel[] = []
    if (callWall != null)
      out.push({
        price: callWall,
        label: `call wall ${callWall}`,
        color: 'var(--color-profit)',
        side: 'left',
      })
    if (putWall != null)
      out.push({
        price: putWall,
        label: `put wall ${putWall}`,
        color: 'var(--color-loss)',
        side: 'left',
        labelPlacement: 'below',
      })
    if (zeroG != null)
      out.push({
        price: zeroG,
        label: `zero γ ${Math.round(zeroG)}`,
        color: 'var(--muted-foreground)',
        dash: '6 4',
        side: 'right',
      })
    if (maxPain != null)
      out.push({
        price: maxPain,
        label: `max pain ${maxPain}`,
        color: 'var(--muted-foreground)',
        dash: '1 3',
        side: 'right',
        labelPlacement: 'below',
        opacity: 0.6,
      })
    return out
  }, [callWall, putWall, zeroG, maxPain])

  const verticals = useMemo<ChartSessionVertical[]>(() => {
    if (coneSessions == null) return []
    const out: ChartSessionVertical[] = []
    if (earnSessions != null && earnSessions > 0 && earnSessions <= coneSessions)
      out.push({
        slot: earnSessions / agg,
        label: 'E',
        color: 'var(--color-warning)',
      })
    if (opexSessions != null && opexSessions > 0 && opexSessions <= coneSessions)
      out.push({
        slot: opexSessions / agg,
        label: 'OpEx',
        color: 'var(--muted-foreground)',
        labelRow: 1,
      })
    return out
  }, [coneSessions, earnSessions, opexSessions, agg])

  const legs = useSymbolLegs(sym)
  const tracks = useMemo(
    () => tradeTracksFor(bookQ.data?.items ?? [], sym, legs),
    [bookQ.data, sym, legs]
  )
  const holding = useMemo(() => holdingFor(legs, tracks), [legs, tracks])
  const known = useTradeIndex()
  const openTrade = useOpenTrade()
  const trackIds = useMemo(
    () => tracks.flatMap((t) => (t.id != null && (known == null || known.has(t.id)) ? [t.id] : [])),
    [tracks, known]
  )
  const openTrack = (t: TradeTrack) => {
    if (t.id != null) openTrade(t.id, { list: trackIds, from: `Symbol · ${sym}` })
    else navigate(withSymbolParam('/portfolio/ledger', sym))
  }
  const placed = useMemo<PlacedTrack[]>(() => {
    if (total === 0) return []
    return tracks.map((track) => {
      const openIdx = sessionIndexFor(dates, track.openDate)
      const closeIdx = track.closeDate ? sessionIndexFor(dates, track.closeDate) : null
      return { track, openIdx, closeIdx, openAgo: total - 1 - (openIdx ?? 0) }
    })
  }, [tracks, dates, total])

  // A closed instance that ended before the window stays off the candles; an
  // open one is always visible, clipped at the left edge when it began earlier.
  const shown = useMemo(
    () =>
      placed.filter(
        (p) =>
          (p.openIdx ?? -1) < winEnd &&
          (p.track.closeDate == null || (p.closeIdx != null && p.closeIdx >= winStart))
      ),
    [placed, winStart, winEnd]
  )
  const hidden = placed.filter((p) => !shown.includes(p))

  const chg =
    total > 1 ? (daily[total - 1].close / daily[total - 2].close - 1) * 100 : null

  const frame = BARS_CHART_FRAME
  const innerWidth = frame.width - frame.paddingLeft - frame.paddingRight
  const xCount = chartBars.length + coneSlots
  const todayPct =
    chartBars.length > 0 && xCount > 1
      ? ((frame.paddingLeft + ((chartBars.length - 1) / (xCount - 1)) * innerWidth) /
          frame.width) *
        100
      : null

  const renderTrades = (ctx: ChartOverlayContext) => (
    <>
      {/* The price scale for the pointer's readout: price = (y0 − y) / perUnit. */}
      <g
        data-price-scale={`${ctx.yForPrice(0)},${ctx.yForPrice(0) - ctx.yForPrice(1)},${ctx.paddingTop},${ctx.paddingTop + ctx.priceHeight}`}
      />
      {signalMarks.map((m) => {
        const x = ctx.xForIndex(m.at)
        const bar = chartBars[m.at]
        const up = m.direction === 'up'
        const y = ctx.yForPrice(bar ? (up ? bar.low : bar.high) : m.close)
        const tip = up ? y + 5 : y - 5
        const base = up ? tip + 10 : tip - 10
        return (
          <path
            key={`${m.signal}-${m.date}`}
            d={`M${x},${tip} L${x - 6},${base} L${x + 6},${base} Z`}
            fill={up ? 'var(--color-profit)' : 'var(--color-loss)'}
            stroke="var(--background)"
            strokeWidth={1.5}
            paintOrder="stroke"
          >
            <title>{`${m.date} · ${m.label} · close ${m.close.toFixed(2)}`}</title>
          </path>
        )
      })}
      {tradesOn && (shown.length > 0 || holding) ? (
        <SymbolTradeOverlay
          ctx={ctx}
          tracks={shown.map((p) => p.track).filter((t) => tradeId == null || others === 'dim' || t.id === tradeId)}
          focusKey={tradeId != null ? `inst:${tradeId}` : null}
          dates={dates}
          winStart={winStart}
          winEnd={winEnd}
          winSessions={winSessions}
          agg={agg}
          today={today}
          coneSessions={atToday ? coneSessions : null}
          hover={hover}
          onHover={setHover}
          onOpen={openTrack}
          onOpenId={(id) => openTrade(id, { list: trackIds, from: `Symbol · ${sym}` })}
          holding={holding}
          spot={spot}
          known={known}
          quiet={isMini}
        />
      ) : null}
    </>
  )

  const title = `${winSessions || '—'} sessions · ${agg > 1 ? 'weekly candles' : 'daily'}`
  const coneLabel =
    coneSessions != null && expiryRaw
      ? `±1σ → ${fmtExpiry(expiryRaw.replace(/-/g, ''))}${
          dteSessions != null && coneSessions < dteSessions ? ` · first ${coneSessions}d shown` : ''
        }`
      : ''

  const mini = useMemo(() => {
    if (total < 2) return null
    const closes = daily.map((b) => b.close)
    const lo = Math.min(...closes)
    const hi = Math.max(...closes)
    const span = hi - lo || 1
    const pts: string[] = []
    for (let i = 0; i < total; i += 4)
      pts.push(`${((i / (total - 1)) * 900).toFixed(1)} ${(23 - ((closes[i] - lo) / span) * 18).toFixed(1)}`)
    return {
      line: `M${pts.join('L')}`,
      brushL: `${((winStart / total) * 100).toFixed(1)}%`,
      brushW: `${((winSessions / total) * 100).toFixed(1)}%`,
      ticks: placed.map((p) => ({
        key: p.track.key,
        x: `${(((p.openIdx ?? 0) / (total - 1)) * 100).toFixed(1)}%`,
        color:
          p.track.pnl == null
            ? 'var(--muted-foreground)'
            : p.track.pnl >= 0
              ? 'var(--color-profit)'
              : 'var(--color-loss)',
        title: `${p.track.name} · ${p.openAgo} sessions ago${
          p.track.pnl != null ? ` · ${fmtPl(p.track.pnl)}` : ''
        } — click to bring it into the window`,
        // Centre the instance in the current span, keeping the zoom.
        jump: () =>
          setView({
            span: winSessions,
            off: total - (p.openIdx ?? 0) - Math.round(winSessions / 2),
          }),
      })),
    }
  }, [daily, total, winSessions, winStart, placed])

  // The minimap's frame drags the window across the whole history.
  const dragBrush = (e: React.MouseEvent<HTMLSpanElement>) => {
    const box = e.currentTarget.parentElement?.getBoundingClientRect()
    if (!box || box.width <= 0) return
    e.preventDefault()
    const start = { x: e.clientX, view }
    const mv = (ev: MouseEvent) =>
      setView(panView(total, start.view, -((ev.clientX - start.x) / box.width) * total))
    const up = () => {
      window.removeEventListener('mousemove', mv)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
  }

  const plot = (
    <SymbolChartPointer
      frame={frame}
      total={total}
      view={view}
      onView={setView}
      bars={chartBars}
      xCount={xCount}
      agg={agg}
      callWall={callWall}
      putWall={putWall}
    >
      <BarsCandlestickChart
        bars={chartBars}
        period="1 D"
        showVwap={false}
        showVolume={!isMini}
        futureSlots={coneSlots}
        levels={isMini ? levels.map((l) => ({ ...l, label: '' })) : levels}
        verticals={atToday && !isMini ? verticals : []}
        cone={
          atToday && coneSessions != null && spot != null && iv30 != null
            ? {
                sessions: coneSlots,
                widthAt: (d) => spot * iv30 * Math.sqrt((d * agg) / 252),
              }
            : undefined
        }
        renderPriceOverlay={renderTrades}
        showBollinger={!isMini && techs.bb}
        showMacd={!isMini && techs.macd}
        showRsi={!isMini && techs.rsi}
        indicatorSeries={indicatorSeries}
      />
    </SymbolChartPointer>
  )

  if (!sym) return null

  if (isMini) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-dense-micro text-muted-foreground">
          <span className="font-semibold text-secondary-foreground">Price</span>
          <span>{winSessions} sessions</span>
          {spot != null ? <span className="font-mono text-foreground">{spot.toFixed(2)}</span> : null}
          {chg != null ? (
            <span className={cn('font-mono', chg >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]')}>
              {chg >= 0 ? '+' : ''}
              {chg.toFixed(2)}%
            </span>
          ) : null}
          <span className={cn('ml-auto font-mono', holding ? 'text-[var(--sk-ticker)]' : '')}>
            {holding ? `held ${holding.qty.toLocaleString('en-US')} sh` : 'not held'}
          </span>
        </div>
        {barsQ.isLoading ? (
          <div className="h-[170px] animate-pulse rounded-md bg-secondary/40" />
        ) : total === 0 ? (
          <p className="m-0 py-4 text-center text-dense-micro text-muted-foreground">No daily bars for {sym}.</p>
        ) : (
          // The plot keeps its height however narrow the panel is.
          <div className="relative [&_svg.data-bars-chart-svg]:h-[190px] [&_svg.data-bars-chart-svg]:w-full">{plot}</div>
        )}
      </div>
    )
  }

  return (
    <SectionPanel
      cap="Price"
      capTitle="The page's readings put on price — walls, zero γ, max pain, the ±1σ cone and your own fills. Trend and technicals live in Ratings › Stocks."
      title={
        <span className="inline-flex flex-wrap items-baseline gap-2">
          {title}
          {spot != null ? <span className="font-mono">{spot.toFixed(2)}</span> : null}
          {chg != null ? (
            <span
              className={cn(
                'font-mono text-dense-meta',
                chg >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]',
              )}
            >
              {chg >= 0 ? '+' : ''}
              {chg.toFixed(2)}%
            </span>
          ) : null}
          <span
            className={cn(
              'font-mono text-dense-meta',
              holding ? 'text-[var(--sk-ticker)]' : 'text-muted-foreground'
            )}
            title={
              holding
                ? 'Shares in the accounts now — the lime line is their blended cost'
                : 'No shares of this name in the accounts'
            }
          >
            {holding ? `held ${holding.qty.toLocaleString('en-US')} sh` : 'not held'}
          </span>
        </span>
      }
      note={
        pineId
          ? pineQ.isError
            ? 'Pine signals: not read from Research'
            : `${signalMarks.length} ${pineName} signals in view`
          : wantIndicators
            ? indQ.isError
              ? 'technicals: Research unreachable — the chart computes its own'
              : indSig
                ? `${signalMarks.length} ${indicatorSignal(indSig)?.label ?? indSig} in view`
                : 'technicals from Research'
            : 'levels from this page'
      }
      action={
        <span className="inline-flex items-center gap-2">
          <SegmentControl
            ariaLabel="Window"
            size="xs"
            value={presetOf}
            onChange={(v) => setPreset(v as PriceWindow)}
            options={[...PRICE_WINDOWS]}
          />
          {tradeId != null ? (
            <SegmentControl
              ariaLabel="Other trades"
              size="xs"
              value={others}
              onChange={(v) => setOthers(v as 'dim' | 'hide')}
              options={[
                { value: 'dim', label: 'others: Dim' },
                { value: 'hide', label: 'Hide' },
              ]}
            />
          ) : tracks.length > 0 ? (
            <button
              type="button"
              onClick={() => setTradesOn((v) => !v)}
              title="Your trades on this symbol, each at its strikes over the days it held them — a roll jumps to its new strike at ↻; click one for its record"
              className={cn(
                'inline-flex h-5 items-center rounded-full border px-1.5 font-mono text-dense-micro',
                tradesOn
                  ? 'border-[var(--sk-accent)] text-foreground'
                  : 'border-border text-muted-foreground',
              )}
            >
              trades · {tracks.length}
            </button>
          ) : null}
          {(['bb', 'macd', 'rsi'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTechs((t) => ({ ...t, [k]: !t[k] }))}
              title={
                k === 'bb'
                  ? 'Bollinger 20 · 2σ'
                  : k === 'macd'
                    ? 'MACD 12 · 26 · 9'
                    : 'RSI 14'
              }
              className={cn(
                'inline-flex h-5 items-center rounded-full border px-1.5 font-mono text-dense-micro uppercase',
                techs[k]
                  ? 'border-[var(--sk-accent)] text-foreground'
                  : 'border-border text-muted-foreground',
              )}
            >
              {k}
            </button>
          ))}
          <select
            aria-label="Mark signal"
            value={sigId}
            onChange={(e) => setSigId(e.target.value)}
            title="Mark the sessions a signal fired — an indicator or a Pine library script, the same signal the Screener, the simulator and Signal Decay read"
            className={cn(
              'h-5 rounded-full border bg-transparent px-1.5 font-mono text-dense-micro',
              sigId ? 'border-[var(--sk-accent)] text-foreground' : 'border-border text-muted-foreground',
            )}
          >
            <option value="">signals · Pine</option>
            <optgroup label="Indicators">
              {INDICATOR_SIGNALS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Pine library">
              {pineChoices.map((p) => (
                <option key={p.id} value={`pine:${p.id}`}>
                  Pine · {p.label}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="button"
            onClick={() => navigate(withSymbolParam('/research/stocks?model=sepa', sym))}
            title="Moving averages, SEPA and structure live in Ratings"
            className="text-dense-meta text-muted-foreground hover:text-foreground hover:underline"
          >
            Trend → Ratings › Stocks
          </button>
        </span>
      }
    >
      {barsQ.isLoading ? (
        <div className="h-[220px] animate-pulse rounded-md bg-secondary/40" />
      ) : total === 0 ? (
        <p className="py-6 text-center text-dense-meta text-muted-foreground">
          No daily bars for {sym} — the market store has nothing to draw.
        </p>
      ) : (
        <div className="relative">
          {plot}
          {tradesOn && hidden.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setPreset(windowForSessionsAgo(Math.max(...hidden.map((p) => p.openAgo))))
              }
              title="Trades before this window — click to widen it"
              className="absolute bottom-8 left-14 rounded-full bg-background/80 px-1.5 py-0.5 font-mono text-dense-micro text-[var(--sk-contract)] shadow-[var(--glass-lens)]"
            >
              ← {hidden.length} earlier trade{hidden.length > 1 ? 's' : ''}
            </button>
          ) : null}
          <div className="relative h-4 font-mono text-dense-micro text-muted-foreground">
            <span className="absolute left-0">−{winSessions + view.off}d</span>
            {!atToday ? (
              <button
                type="button"
                onClick={() => setView({ span: winSessions, off: 0 })}
                title={`${view.off} sessions back — double-click the chart, or here, to return`}
                className="absolute right-0 cursor-pointer border-0 bg-transparent p-0 font-mono text-dense-micro text-[var(--sk-accent)] hover:underline"
              >
                today →
              </button>
            ) : todayPct != null ? (
              <span className="absolute -translate-x-1/2" style={{ left: `${todayPct}%` }}>
                today
              </span>
            ) : null}
            {atToday ? <span className="absolute right-0">{coneLabel}</span> : null}
          </div>
          {tradesOn && mini && tracks.length > 0 ? (
            <div className="relative mt-1 h-[26px]">
              <svg
                viewBox="0 0 900 26"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                <path d={mini.line} fill="none" stroke="var(--sk-line)" strokeWidth={1} />
              </svg>
              <span
                onMouseDown={dragBrush}
                title="Drag to move the window through the two years"
                className="absolute inset-y-0 cursor-grab border-l border-[var(--sk-accent)]"
                style={{
                  left: mini.brushL,
                  width: mini.brushW,
                  background: 'color-mix(in srgb, var(--sk-accent) 12%, transparent)',
                }}
              />
              {mini.ticks.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  title={t.title}
                  onClick={t.jump}
                  className="absolute bottom-1 top-1 w-[3px] cursor-pointer"
                  style={{ left: t.x, background: t.color }}
                />
              ))}
              <span className="pointer-events-none absolute right-0.5 top-0 font-mono text-dense-micro text-muted-foreground">
                2y · every fill · click a bar to bring it into view
              </span>
            </div>
          ) : null}
        </div>
      )}
    </SectionPanel>
  )
}
