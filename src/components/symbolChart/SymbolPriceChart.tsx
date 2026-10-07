/**
 * The underlying's candles at the top of Overview (Shell Spec §10), drawn to
 * design K-LINE-SPEC (Rev .159). Every judgement on this page has to be put on
 * price before it reads, so the chart carries this page's own readings in
 * three weights: candles and the marked signal solid; the walls, zero γ, max
 * pain, the ±1σ cone and E / OpEx at half strength with their names on a right
 * price axis; the trade book and the shares held at 35% until hovered. BB,
 * MACD and RSI are opt-in layers read from Research — the same series the
 * Simulator and Signal Decay evaluate.
 *
 * Panes have fixed pixel heights and no text lives in the svg, so the chart
 * reads the same at any width. Windows never squeeze the candles to fit
 * history: 60d–2y presets aggregate to weekly past 130 sessions, and the
 * two-year strip carries every trade as a bar that brings it into view.
 *
 * `tradeId` (the Trade page): the same chart with one trade lit and labelled;
 * the rest dimmed to 15% or hidden (the reader's choice, kept on this machine),
 * and the window opens on the trade's whole life.
 */
import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FilterChip, FilterTray } from '@bifrost/ui'
import { fetchBars } from '@/api/market'
import { fetchOpexCurrent } from '@/api/research/opexCycle'
import { INDICATOR_SIGNALS, fetchIndicatorSeries } from '@/api/research/indicators'
import { checkPineScript, fetchPineSignals, pricePlots } from '@/api/research/pine'
import { bollingerSeries, macdSeries, rsiSeries, type BollingerPoint, type MacdPoint } from '@/components/charts/barsChartMath'
import { SectionPanel } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { useEarningsDates } from '@/hooks/useNarrative'
import { useContainerWidth } from '@/hooks/useContainerWidth'
import { useSymbolLegs } from '@/hooks/useSymbolLegs'
import { usePersistedChoice } from '@/hooks/usePersistedChoice'
import { useTradeIndex } from '@/hooks/useTradeIndex'
import { usePineLibrary } from '@/hooks/usePineLibrary'
import { useResearchAuth } from '@/lib/auth/researchUser'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'
import { fmtExpiry } from '@/utils/positions'
import type { Bar } from '@/types/market'
import { useOpenTrade } from '@/layout/tradeGo'
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
} from '@/components/symbolChart/symbolPriceModel'
import {
  PLOT_W,
  bbPaths,
  candlePaths,
  linePath,
  sideFlips,
  conePath,
  cx,
  eventPath,
  frameGeom,
  levelPath,
  placeEdges,
  priceTicks,
  signalPaths,
  stackTags,
  subPanes,
  tickLabelsClearOf,
  type AxisTag,
  type SubPaneKind,
} from '@/components/symbolChart/priceFrame'
import { bookGeometry, holdingEdge } from '@/components/symbolChart/tradeLayerModel'
import { TradeLayer } from '@/components/symbolChart/TradeLayer'
import { PriceAxis } from '@/components/symbolChart/PriceAxis'
import { PriceMiniStrip, PriceTimeAxis } from '@/components/symbolChart/PriceTimeAxis'
import { SignalMenu } from '@/components/symbolChart/SignalMenu'
import { SymbolChartPointer } from '@/components/symbolChart/SymbolChartPointer'
import { useChartLayers } from '@/components/symbolChart/useChartLayers'
import { signalLabel, useChartSignal } from '@/components/symbolChart/useChartSignal'
import { etTodayIso } from '@/lib/freshness'

/** The vendor keeps two rolling years; the API caps a page at 500. */
const HISTORY_LIMIT = 500
// Calendar days of bars the pine-runner gets for a script's line: the 500-session history plus its warm-up.
const LINE_DAYS = 900
const CONE_CAP_SESSIONS = 30
const ALL_INDICATOR_IDS = INDICATOR_SIGNALS.map((x) => x.id)
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** `7 Jul`, with the year when it is not this one (`7 Jul 25`). */
const axisDate = (iso: string, today: string) =>
  `${+iso.slice(8, 10)} ${MO[+iso.slice(5, 7) - 1]}${iso.slice(0, 4) !== today.slice(0, 4) ? ` ${iso.slice(2, 4)}` : ''}`
const readingNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

interface Technicals {
  bb: BollingerPoint | null
  macd: MacdPoint | null
  rsi: number | null
}

export function SymbolPriceChart({
  symbol,
  tradeId,
  variant = 'full',
}: {
  symbol: string
  tradeId?: number
  /**
   * `mini` (the Symbol 440 panel): price 150 · volume 28, no switches, no
   * technicals, no strip; a linked `?signal=` is still marked.
   */
  variant?: 'full' | 'mini'
}) {
  const isMini = variant === 'mini'
  const sym = symbol.trim().toUpperCase()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [rawView, setView] = useState<PriceView | null>(null)
  const [others, setOthers] = usePersistedChoice<'dim' | 'hide'>('bifrost.chart.others', 'dim', ['dim', 'hide'])
  const [layers, setLayer] = useChartLayers()
  const [hover, setHover] = useState<string | null>(null)
  const [wantCounts, setWantCounts] = useState(false)
  const { sigId, setSigId, pineId, indSig, pineChoices, pineName } = useChartSignal(isMini)
  const techOn = !isMini && (layers.bb || layers.macd || layers.rsi)

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
    const rows = (barsQ.data?.bars ?? []).filter((b): b is Bar & { time: number } => b.time != null && Number.isFinite(b.time))
    return [...rows].sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
  }, [barsQ.data])
  const dates = useMemo(() => daily.map((b) => barIsoDate(b.time as number)), [daily])
  const total = daily.length

  // One read answers the technicals, the marked indicator and the menu's counts.
  const indQ = useQuery({
    queryKey: ['research-engine', 'indicators', 'series', sym, dates[0] ?? '', 'all-signals'],
    queryFn: () => fetchIndicatorSeries({ symbol: sym, start: dates[0], signals: ALL_INDICATOR_IDS }),
    enabled: Boolean(sym) && dates.length > 0 && (techOn || indSig !== '' || wantCounts),
    staleTime: 10 * 60_000,
  })
  // Every script's firings on this name: the marked one and the menu's counts.
  const pineQ = useQuery({
    queryKey: ['research-engine', 'pine', 'signals', 'symbol', sym, dates[0] ?? ''],
    queryFn: () => fetchPineSignals({ symbol: sym, start: dates[0] }),
    enabled: Boolean(sym) && dates.length > 0 && (pineId != null || wantCounts),
    staleTime: 10 * 60_000,
  })
  // The marked Pine script's own price line (P1 / G10), e.g. the Supertrend line: computed for this
  // name by Research's pine-runner on request, never stored. Only overlay scripts draw prices.
  const { rows: pineRows } = usePineLibrary()
  const auth = useResearchAuth()
  const pineRow = pineId ? pineRows?.find((r) => r.id === pineId) : undefined
  const lineTitles = isMini ? [] : pricePlots(pineRow)
  const lineQ = useQuery({
    queryKey: ['research-engine', 'pine', 'line', sym, pineId ?? '', pineRow?.version ?? 0, lineTitles.join('|')],
    queryFn: () => checkPineScript({ script: pineId as string, symbol: sym, days: LINE_DAYS, plots: lineTitles }),
    enabled: Boolean(sym) && pineId != null && lineTitles.length > 0 && layers.line && Boolean(auth.token),
    staleTime: 30 * 60_000,
  })
  const lineMaps = useMemo(
    () => Object.entries(lineQ.data?.series ?? {}).map(([title, pts]) => ({ title, byDate: new Map(pts) })),
    [lineQ.data],
  )

  // Research's technicals by date; computed here from the daily closes only when Research did not answer.
  const techByDate = useMemo(() => {
    const m = new Map<string, Technicals>()
    if (!techOn) return m
    const rows = indQ.data?.bars ?? []
    if (rows.length) {
      for (const b of rows)
        m.set(b.date, {
          bb: { mid: b.bb_mid, upper: b.bb_upper, lower: b.bb_lower },
          macd: { macd: b.macd, signal: b.macd_signal, hist: b.macd_hist },
          rsi: b.rsi,
        })
      return m
    }
    if (!indQ.isError) return m
    const closes = daily.map((b) => b.close)
    const bb = bollingerSeries(closes)
    const mc = macdSeries(closes)
    const rs = rsiSeries(closes)
    dates.forEach((d, i) => m.set(d, { bb: bb[i], macd: mc[i], rsi: rs[i] }))
    return m
  }, [techOn, indQ.data, indQ.isError, daily, dates])

  // A trade's page opens on its whole life, a little either side.
  const focusStart = useMemo(() => {
    if (tradeId == null) return null
    const days = (bookQ.data?.items ?? [])
      .filter((e) => e.trade_id === tradeId)
      .map((e) => (e.trade_date ?? '').slice(0, 10))
      .filter(Boolean)
      .sort()
    return days.length ? sessionIndexFor(dates, days[0]) : null
  }, [tradeId, bookQ.data, dates])
  const view = clampView(total, rawView ?? { span: focusStart != null ? Math.max(60, total - focusStart + 10) : 60, off: 0 })
  const winSessions = view.span
  const agg = aggFor(winSessions)
  const winEnd = total - view.off
  const winStart = winEnd - winSessions
  const live = view.off === 0
  const presetOf = PRICE_WINDOWS.find((w) => live && sessionsForWindow(w.value, total) === winSessions)?.value ?? ''
  const setPreset = (w: PriceWindow) => setView({ span: sessionsForWindow(w, total), off: 0 })
  const chartBars = useMemo(() => aggregateBars(daily.slice(winStart, winEnd), agg), [daily, winStart, winEnd, agg])
  const nBars = chartBars.length
  const barDates = useMemo(() => chartBars.map((b) => barIsoDate(b.time as number)), [chartBars])

  const readings = (id: string) =>
    (exQ.data?.find((e) => e.lens === id || e.lens_id === id)?.readings ?? {}) as Record<string, unknown>
  const g0 = readings('gex_regime')
  // The last close, not the dealer lens's spot: Research's spot is as of its own run and can trail the bars by a session.
  const lastClose = total > 0 ? daily[total - 1].close : null
  const callWall = readingNum(g0.major_call_wall)
  const putWall = readingNum(g0.major_put_wall)
  const zeroG = readingNum(g0.zero_gamma)
  const maxPain = readingNum(readings('opex_pin').max_pain_strike)
  const iv30 = readingNum(readings('vrp').atm_iv_30d)

  // The cone's expiry is the page's selection (`?expiration=`, shared with the Chain tab), else the next OpEx.
  const today = etTodayIso()
  const urlExpiry = (params.get('expiration') ?? '').trim() || null
  const expiryRaw = urlExpiry ?? opexQ.data?.next_opex_date ?? null
  const expiryIso = expiryRaw
    ? /^\d{8}$/.test(expiryRaw)
      ? `${expiryRaw.slice(0, 4)}-${expiryRaw.slice(4, 6)}-${expiryRaw.slice(6, 8)}`
      : expiryRaw.slice(0, 10)
    : null
  const dteSessions = expiryIso ? sessionsUntil(today, expiryIso) : null
  const coneSessions =
    dteSessions != null && dteSessions > 0 && iv30 != null && lastClose != null ? Math.min(dteSessions, CONE_CAP_SESSIONS) : null
  const coneOn = live && layers.levels && coneSessions != null
  const coneSlots = coneOn && coneSessions != null ? Math.ceil(coneSessions / agg) : 0
  const coneWidthAt = coneOn && lastClose != null && iv30 != null ? (s: number) => lastClose * iv30 * Math.sqrt((s * agg) / 252) : null
  const earnDate = earnQ.data?.expected_next?.date ?? null
  const earnSessions = earnDate ? sessionsUntil(today, earnDate) : null
  const opexSessions = opexQ.data?.next_opex_date ? sessionsUntil(today, opexQ.data.next_opex_date) : null
  const eventSlot = (s: number | null) =>
    coneOn && coneSessions != null && s != null && s > 0 && s <= coneSessions ? s / agg : null
  const earnSlot = eventSlot(earnSessions)
  const opexSlot = eventSlot(opexSessions)

  const subKinds: SubPaneKind[] = isMini ? [] : [...(layers.macd ? (['macd'] as const) : []), ...(layers.rsi ? (['rsi'] as const) : [])]
  const tech = barDates.map((d) => techByDate.get(d) ?? null)
  // §4.9: one line draws as a trailing stop and breaks where it flips sides; two lines (bands, Tenkan / Kijun) never flip.
  const lines =
    layers.line && lineTitles.length
      ? lineMaps.map((m, i) => {
          const vals = barDates.map((d) => m.byDate.get(d) ?? null)
          const breaks = lineMaps.length === 1 ? sideFlips(vals, chartBars.map((b) => b.close)) : undefined
          return { key: `pine-${i}`, title: m.title, vals, breaks }
        })
      : []
  const g = frameGeom({
    bars: chartBars,
    coneSlots,
    coneWidthAt,
    anchor: lastClose,
    walls: { call: callWall, put: putWall },
    levelsOn: layers.levels,
    live,
    bb: !isMini && layers.bb ? tech.map((t) => t?.bb ?? null) : null,
    lines: lines.map((ln) => ln.vals),
    panes: subKinds,
    mini: isMini,
  })
  const plotRef = useRef<HTMLDivElement>(null)
  const plotW = useContainerWidth(plotRef, 900)
  const kx = plotW / PLOT_W

  // Signal firings, by key (an indicator id or `pine:<script>`), on this name.
  const firings = useMemo(() => {
    const m = new Map<string, { date: string; dir: 'up' | 'down' }[]>()
    const add = (k: string, date: string, dir: 'up' | 'down') => {
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push({ date, dir })
    }
    for (const r of pineQ.data?.rows ?? []) add(`pine:${r.script}`, r.date, r.side === 'buy' ? 'up' : 'down')
    for (const r of indQ.data?.markers ?? []) add(r.signal, r.date, r.direction)
    return m
  }, [pineQ.data, indQ.data])
  // A daily session → the drawn bar it falls in (a weekly bar takes its week's), or null outside the window.
  const atBar = (date: string) => {
    const idx = sessionIndexFor(dates, date)
    if (idx == null || dates[idx] !== date || idx < winStart || idx >= winEnd) return null
    const rem = (winEnd - winStart) % agg
    return Math.floor((idx - winStart + (rem === 0 ? 0 : agg - rem)) / agg)
  }
  const counts = new Map<string, number>()
  for (const [k, list] of firings) counts.set(k, list.filter((f) => atBar(f.date) != null).length)
  const marks = (firings.get(sigId) ?? []).flatMap((f) => {
    const at = atBar(f.date)
    return at == null ? [] : [{ at, dir: f.dir }]
  })
  const signalAt = new Map<number, 'up' | 'down' | 'both'>()
  for (const m of marks) signalAt.set(m.at, signalAt.has(m.at) && signalAt.get(m.at) !== m.dir ? 'both' : m.dir)
  const sigName = sigId ? signalLabel(sigId, pineChoices) : ''

  // The trade book.
  const legs = useSymbolLegs(sym)
  const tracks = useMemo(() => tradeTracksFor(bookQ.data?.items ?? [], sym, legs), [bookQ.data, sym, legs])
  const holding = useMemo(() => holdingFor(legs, tracks), [legs, tracks])
  const known = useTradeIndex()
  const openTrade = useOpenTrade()
  const trackIds = useMemo(
    () => tracks.flatMap((t) => (t.id != null && (known == null || known.has(t.id)) ? [t.id] : [])),
    [tracks, known],
  )
  const openTrack = (t: TradeTrack) => {
    if (t.id != null) openTrade(t.id, { list: trackIds, from: `Symbol · ${sym}` })
    else navigate(withSymbolParam('/portfolio/ledger', sym))
  }
  const placed = useMemo(
    () =>
      tracks.map((track) => {
        const openIdx = sessionIndexFor(dates, track.openDate)
        const closeIdx = track.closeDate ? sessionIndexFor(dates, track.closeDate) : null
        return { track, openIdx, closeIdx, openAgo: total - 1 - (openIdx ?? 0) }
      }),
    [tracks, dates, total],
  )
  // A closed trade that ended before the window stays off the candles; an open one is always drawn.
  const shown = placed.filter(
    (p) => (p.openIdx ?? -1) < winEnd && (p.track.closeDate == null || (p.closeIdx != null && p.closeIdx >= winStart)),
  )
  const earlier = placed.filter((p) => p.track.closeDate != null && p.closeIdx != null && p.closeIdx < winStart)
  const focusKey = tradeId != null ? (tracks.find((t) => t.id === tradeId)?.key ?? null) : null
  const drawnTracks = shown
    .map((p) => p.track)
    .filter((t) => tradeId == null || others === 'dim' || t.key === focusKey)
  const book = bookGeometry({
    g,
    tracks: layers.trades ? drawnTracks : [],
    dates,
    winStart,
    winEnd,
    winSessions,
    agg,
    nBars,
    today,
    coneSessions: coneOn ? coneSessions : null,
  })
  const holdEdge = layers.trades ? holdingEdge(g, holding) : null

  // Price axis tags (K-LINE-SPEC §5.2): the last price always; levels while Levels is on; ±1σ while the cone shows.
  const windowClose = nBars > 0 ? chartBars[nBars - 1].close : null
  const pctFrom = (v: number) =>
    lastClose ? ` · ${v >= lastClose ? '+' : '−'}${Math.abs((v / lastClose - 1) * 100).toFixed(1)}% from spot` : ''
  const tags: AxisTag[] = []
  const tagPrice = live ? lastClose : windowClose
  if (tagPrice != null)
    tags.push({ key: 'last', v: tagPrice, text: tagPrice.toFixed(2), bar: null, title: live ? `Last ${tagPrice.toFixed(2)}` : 'Close at the window end' })
  if (layers.levels) {
    const lv = (key: string, v: number | null, name: string, bar: string, text?: string) => {
      if (v != null) tags.push({ key, v, text: text ?? String(v), bar, title: `${name} ${v}${pctFrom(v)}`, hover: key })
    }
    lv('call', callWall, 'Call wall', 'var(--color-profit)')
    lv('put', putWall, 'Put wall', 'var(--color-loss)')
    lv('zg', zeroG, 'Zero γ', 'var(--sk-mute2)', zeroG != null ? String(Math.round(zeroG)) : undefined)
    lv('mp', maxPain, 'Max pain', 'var(--sk-mute)')
    if (coneWidthAt && lastClose != null && coneSlots > 0) {
      const w = coneWidthAt(coneSlots)
      const at = expiryRaw ? fmtExpiry(expiryRaw.replace(/-/g, '')) : ''
      tags.push({ key: 'sdU', v: lastClose + w, text: `+1σ ${(lastClose + w).toFixed(0)}`, bar: 'var(--sk-accent)', title: `+1σ to ${at} · ${(lastClose + w).toFixed(2)}` })
      tags.push({ key: 'sdD', v: lastClose - w, text: `−1σ ${(lastClose - w).toFixed(0)}`, bar: 'var(--sk-accent)', title: `−1σ to ${at} · ${(lastClose - w).toFixed(2)}` })
    }
  }
  // §5.2: each Pine line's value at the window's last bar; hovering it lights the line.
  lines.forEach((ln, i) => {
    const v = ln.vals[nBars - 1]
    if (v == null) return
    const which = lines.length > 1 ? (i ? ' (dashed)' : ' (solid)') : ''
    tags.push({
      key: ln.key,
      v,
      text: v.toFixed(2),
      bar: 'color-mix(in srgb, var(--sk-ink) 50%, transparent)',
      title: `${pineName ?? 'Pine'} · ${ln.title}${which} ${v.toFixed(2)}${pctFrom(v)}`,
      hover: ln.key,
    })
  })
  if (layers.trades && holding?.avg != null && !holdEdge)
    tags.push({ key: 'hold', v: holding.avg, text: holding.avg.toFixed(2), bar: 'var(--sk-ticker)', title: `${holding.qty.toLocaleString('en-US')} sh · avg ${holding.avg.toFixed(2)} · hover for backing / free`, hover: 'hold' })
  const placedTags = stackTags(g, tags)
  const { ticks, grid } = priceTicks(g)
  const tickLabels = tickLabelsClearOf(ticks, placedTags)
  const tradeEdges = book.edges.map((e) => {
    const t = tracks.find((x) => x.key === e.hover)
    return t ? { ...e, open: () => openTrack(t) } : e
  })
  const edges = placeEdges(g, [...tradeEdges, ...(holdEdge ? [holdEdge] : [])])

  const candles = candlePaths(g, chartBars, kx)
  const bb = !isMini && layers.bb ? bbPaths(g, tech.map((t) => t?.bb ?? null)) : { band: '', mid: '' }
  const sub = subPanes(g, kx, layers.macd ? tech.map((t) => t?.macd ?? null) : null, layers.rsi ? tech.map((t) => t?.rsi ?? null) : null)
  const sig = signalPaths(g, chartBars, marks, kx)
  const lvOp = (k: string) => (hover === k ? 1 : 0.5)
  const L = layers.levels

  const chg = total > 1 ? (daily[total - 1].close / daily[total - 2].close - 1) * 100 : null
  const title = `${winSessions || '—'} sessions · ${agg > 1 ? 'weekly candles' : 'daily'}${live || !barDates.length ? '' : ` · ending ${axisDate(barDates[nBars - 1], today)}`}`
  const xPct = (slot: number) => (cx(g, slot) / PLOT_W) * 100
  // When the cone runs to the next OpEx its right-hand label already names that day: one label, not two on top of each other.
  const opexAtConeEnd = opexSlot != null && coneSessions != null && opexSessions != null && opexSessions >= coneSessions

  const mini = useMemo(() => {
    if (total < 2) return null
    const closes = daily.map((b) => b.close)
    const lo = Math.min(...closes)
    const span = Math.max(...closes) - lo || 1
    const pts: string[] = []
    for (let i = 0; i < total; i += 4) pts.push(`${((i / (total - 1)) * 900).toFixed(1)} ${(23 - ((closes[i] - lo) / span) * 18).toFixed(1)}`)
    return {
      line: `M${pts.join('L')}`,
      brushLeft: (winStart / total) * 100,
      brushWidth: (winSessions / total) * 100,
      ticks: placed.map((p) => ({
        key: p.track.key,
        x: ((p.openIdx ?? 0) / (total - 1)) * 100,
        color:
          p.track.closeDate == null
            ? 'var(--color-unrealized)'
            : p.track.pnl == null
              ? 'var(--sk-mute2)'
              : p.track.pnl >= 0
                ? 'var(--color-profit)'
                : 'var(--color-loss)',
        title: `${p.track.name} · ${p.openAgo} sessions ago${p.track.pnl != null ? ` · ${fmtPl(p.track.pnl)}` : ''} — click to bring it into view`,
        // Centre the trade in the current span, keeping the zoom.
        jump: () => setView({ span: winSessions, off: total - (p.openIdx ?? 0) - Math.round(winSessions / 2) }),
      })),
    }
  }, [daily, total, winSessions, winStart, placed])

  // The strip's frame drags the window across the whole history.
  const dragBrush = (e: MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    if (box.width <= 0) return
    e.preventDefault()
    const start = { x: e.clientX, view }
    const mv = (ev: globalThis.MouseEvent) => setView(panView(total, start.view, -((ev.clientX - start.x) / box.width) * total))
    const up = () => {
      window.removeEventListener('mousemove', mv)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
  }

  if (!sym) return null

  const plot = (
    <div className="grid grid-cols-[minmax(0,1fr)_56px]">
      <div ref={plotRef} className="min-w-0">
        <SymbolChartPointer
          g={g}
          total={total}
          view={view}
          onView={setView}
          bars={chartBars}
          agg={agg}
          callWall={callWall}
          putWall={putWall}
          signalAt={signalAt}
          signalName={sigName}
          lines={lines}
        >
          <svg
            viewBox={`0 0 ${PLOT_W} ${g.H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 block h-full w-full overflow-visible"
            aria-label="Daily candles with dealer levels, expected-move cone, volume, optional technicals and signal marks, and your trades"
          >
            {live && coneSlots > 0 ? (
              <rect x={cx(g, nBars - 1)} y={0} width={PLOT_W - cx(g, nBars - 1)} height={g.H} fill="color-mix(in srgb, var(--sk-ink) 4%, transparent)" />
            ) : null}
            <path d={grid} fill="none" stroke="color-mix(in srgb, var(--sk-ink) 5%, transparent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {coneWidthAt && lastClose != null && coneSlots > 0 ? (
              <path d={conePath(g, nBars, coneSlots, lastClose, coneWidthAt)} fill="color-mix(in srgb, var(--sk-accent) 7%, transparent)" />
            ) : null}
            <path d={bb.band} fill="color-mix(in srgb, var(--sk-ink) 5%, transparent)" />
            <path d={bb.mid} fill="none" stroke="color-mix(in srgb, var(--sk-ink) 30%, transparent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {L ? (
              <>
                <path d={levelPath(g, callWall)} fill="none" stroke="var(--color-profit)" strokeDasharray="2 3" opacity={lvOp('call')} vectorEffect="non-scaling-stroke" />
                <path d={levelPath(g, putWall)} fill="none" stroke="var(--color-loss)" strokeDasharray="2 3" opacity={lvOp('put')} vectorEffect="non-scaling-stroke" />
                <path d={levelPath(g, zeroG)} fill="none" stroke="var(--sk-mute2)" strokeDasharray="6 4" opacity={lvOp('zg')} vectorEffect="non-scaling-stroke" />
                <path d={levelPath(g, maxPain)} fill="none" stroke="var(--sk-mute)" strokeDasharray="1 3" opacity={lvOp('mp')} vectorEffect="non-scaling-stroke" />
                {earnSlot != null ? (
                  <path d={eventPath(g, nBars, earnSlot)} fill="none" stroke="var(--color-amber-400, var(--color-warning))" strokeDasharray="3 3" opacity={0.5} vectorEffect="non-scaling-stroke" />
                ) : null}
                {opexSlot != null ? (
                  <path d={eventPath(g, nBars, opexSlot)} fill="none" stroke="var(--sk-mute2)" strokeDasharray="3 3" opacity={0.5} vectorEffect="non-scaling-stroke" />
                ) : null}
              </>
            ) : null}
            {lines.map((ln, i) => (
              <path
                key={`pine-line-${i}`}
                d={linePath(g, ln.vals, ln.breaks)}
                fill="none"
                stroke="var(--sk-ink)"
                opacity={hover === ln.key ? 1 : 0.5}
                strokeWidth={1.25}
                strokeDasharray={i ? '4 3' : undefined}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={candles.volUp} fill="color-mix(in srgb, var(--color-profit) 30%, transparent)" />
            <path d={candles.volDn} fill="color-mix(in srgb, var(--color-loss) 30%, transparent)" />
            <path d={candles.wicks} fill="none" stroke="var(--sk-mute)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path d={candles.up} fill="var(--color-profit)" />
            <path d={candles.dn} fill="var(--color-loss)" />
            <path d={sub.sep} fill="none" stroke="color-mix(in srgb, var(--sk-ink) 8%, transparent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path d={sub.band} fill="color-mix(in srgb, var(--sk-ink) 4%, transparent)" />
            <path d={sub.guide} fill="none" stroke="color-mix(in srgb, var(--sk-ink) 14%, transparent)" strokeDasharray="2 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path d={sub.hUp} fill="color-mix(in srgb, var(--color-profit) 35%, transparent)" />
            <path d={sub.hDn} fill="color-mix(in srgb, var(--color-loss) 35%, transparent)" />
            <path d={sub.l1} fill="none" stroke="var(--sk-soft)" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            <path d={sub.l2} fill="none" stroke="var(--sk-mute)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path d={sig.up} fill="var(--sk-ink)" stroke="var(--background)" strokeWidth={1.5} paintOrder="stroke" vectorEffect="non-scaling-stroke" />
            <path d={sig.dn} fill="var(--sk-ink)" stroke="var(--background)" strokeWidth={1.5} paintOrder="stroke" vectorEffect="non-scaling-stroke" />
          </svg>
          {sub.caps.map((c) => (
            <span key={c.name} className="pointer-events-none absolute left-1 whitespace-nowrap font-mono text-dense-caption leading-3 text-[var(--sk-mute)]" style={{ top: c.top }}>
              {c.name} <span className="text-[var(--sk-soft)]">{c.val}</span>
            </span>
          ))}
          {layers.trades ? (
            <TradeLayer
              g={g}
              width={plotW}
              segs={book.segs}
              joints={book.joints}
              holding={holding}
              spot={lastClose}
              hover={hover}
              focus={focusKey}
              onHover={setHover}
              onOpen={openTrack}
              onOpenId={(id) => openTrade(id, { list: trackIds, from: `Symbol · ${sym}` })}
              known={known}
            />
          ) : null}
          {layers.trades && earlier.length > 0 && !isMini ? (
            <button
              type="button"
              onClick={() => setView({ span: winSessions, off: Math.max(0, total - (earlier[earlier.length - 1].closeIdx ?? 0) - Math.round(winSessions / 2)) })}
              title="Trades before this window — click to bring the latest into view"
              className="absolute left-1 z-[3] h-[18px] rounded-full border-0 px-1.5 font-mono text-dense-caption text-[var(--sk-contract)]"
              style={{ top: g.vT + 2, background: 'color-mix(in srgb, var(--background) 75%, transparent)' }}
            >
              ← {earlier.length} earlier trade{earlier.length > 1 ? 's' : ''}
            </button>
          ) : null}
        </SymbolChartPointer>
      </div>
      <PriceAxis height={g.H} ticks={tickLabels} tags={placedTags} edges={edges} onHover={setHover} />
    </div>
  )
  const timeAxis = (
    <PriceTimeAxis
      left={barDates.length ? axisDate(barDates[0], today) : ''}
      todayAt={live && nBars > 0 ? xPct(nBars - 1) : null}
      earnAt={earnSlot != null ? xPct(nBars - 1 + earnSlot) : null}
      opexAt={opexSlot != null && !opexAtConeEnd ? xPct(nBars - 1 + opexSlot) : null}
      right={
        live
          ? coneOn && expiryIso
            ? `±1σ → ${opexAtConeEnd ? 'OpEx ' : ''}${axisDate(expiryIso, today)}`
            : ''
          : barDates.length
            ? axisDate(barDates[nBars - 1], today)
            : ''
      }
      rightTitle={
        live && coneOn && dteSessions != null && coneSessions != null && coneSessions < dteSessions
          ? `The cone runs ${coneSessions} of the ${dteSessions} sessions to expiry`
          : undefined
      }
      onToday={live ? null : () => setView({ span: winSessions, off: 0 })}
    />
  )
  const body = barsQ.isLoading ? (
    <div className="animate-pulse rounded-md bg-secondary/40" style={{ height: isMini ? 184 : 288 }} />
  ) : total === 0 ? (
    <p className="py-6 text-center text-dense-meta text-muted-foreground">No daily bars for {sym} — the market store has nothing to draw.</p>
  ) : (
    <div className="pt-2.5 pr-2 pb-1.5 pl-3">
      {plot}
      {timeAxis}
      {!isMini && layers.trades && mini && tracks.length > 0 ? (
        <PriceMiniStrip line={mini.line} brushLeft={mini.brushLeft} brushWidth={mini.brushWidth} ticks={mini.ticks} onDrag={dragBrush} />
      ) : null}
    </div>
  )
  const priceHead = (
    <>
      {lastClose != null ? <span className="font-mono text-dense-body font-semibold">{lastClose.toFixed(2)}</span> : null}
      {chg != null ? (
        <span className={cn('font-mono text-dense-label', chg >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]')}>
          {chg >= 0 ? '+' : '−'}
          {Math.abs(chg).toFixed(2)}%
        </span>
      ) : null}
    </>
  )

  if (isMini) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-dense-micro text-muted-foreground">
          <span className="font-semibold text-secondary-foreground">Price</span>
          <span>{winSessions} sessions</span>
          {priceHead}
          <span className={cn('ml-auto font-mono', holding ? 'text-[var(--sk-ticker)]' : '')}>
            {holding ? `held ${holding.qty.toLocaleString('en-US')} sh` : 'not held'}
          </span>
        </div>
        {body}
      </div>
    )
  }

  const layerChip = (k: 'levels' | 'trades' | 'bb' | 'macd' | 'rsi' | 'line', label: string, tip: string, count?: number) => (
    <FilterChip key={k} pressed={layers[k]} onPressedChange={(v) => setLayer(k, v)} count={count != null ? String(count) : undefined} title={tip}>
      {label}
    </FilterChip>
  )
  return (
    <SectionPanel
      cap="Price"
      capTitle="The page's readings put on price — walls, zero γ, max pain, the ±1σ cone, your trades — with optional technicals and one signal's marks."
      title={
        <span className="inline-flex flex-wrap items-baseline gap-2">
          <span className="text-dense-body font-semibold">{title}</span>
          {priceHead}
        </span>
      }
      action={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <SegmentControl ariaLabel="Window" size="xs" value={presetOf} onChange={(v) => setPreset(v as PriceWindow)} options={[...PRICE_WINDOWS]} />
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
          ) : null}
          <FilterTray variant="joined" aria-label="Chart layers">
            {layerChip('levels', 'Levels', `Call wall · put wall · zero γ · max pain · ±1σ${expiryRaw ? ` to ${fmtExpiry(expiryRaw.replace(/-/g, ''))}` : ''} · E / OpEx — names on the price axis`)}
            {tracks.length > 0
              ? layerChip('trades', 'Trades', 'Your option fills on this symbol, at strike level — open dot, close square, dashed to expiry while open. At 35% until hovered', tracks.length)
              : null}
            {layerChip('bb', 'BB', 'Bollinger 20 · 2σ on the price pane — Research indicators, the values the Simulator uses')}
            {layerChip('macd', 'MACD', 'MACD 12 26 9 in its own pane')}
            {layerChip('rsi', 'RSI', 'RSI 14 in its own pane, 30 / 70 guides')}
            {lineTitles.length
              ? layerChip(
                  'line',
                  'Line',
                  `${pineName ?? 'The script'}: ${lineTitles.join(' · ')} on the price pane (solid, then dashed) — the script's own levels, run for this name by Research's pine-runner${auth.token ? '' : '. Needs a Research identity'}${lineQ.isError ? '. Not drawn: Research did not answer' : ''}`,
                )
              : null}
          </FilterTray>
          <SignalMenu
            sigId={sigId}
            onPick={(id) => {
              setSigId(id)
              setWantCounts(true)
            }}
            pine={pineChoices}
            counts={counts}
            onOpen={() => setWantCounts(true)}
          />
        </span>
      }
    >
      {body}
    </SectionPanel>
  )
}
