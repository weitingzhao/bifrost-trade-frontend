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
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useEarningsDates } from '@/hooks/useNarrative'
import { withSymbolParam } from '@/lib/symbolLink'
import { todayIso } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'
import { flattenPositions } from '@/utils/positionsGrouping'
import { fmtExpiry } from '@/utils/positions'
import type { Bar } from '@/types/market'
import { selectLegs } from './selectLegs'
import {
  PRICE_WINDOWS,
  type PriceWindow,
  type TradeSegment,
  aggFor,
  aggIndexFor,
  aggregateBars,
  barIsoDate,
  fmtPl,
  sessionIndexFor,
  sessionsForWindow,
  sessionsUntil,
  tradeSegmentsFor,
  windowForSessionsAgo,
} from './symbolPriceModel'

/** The vendor keeps two rolling years; the API caps a page at 500. */
const HISTORY_LIMIT = 500
const CONE_CAP_SESSIONS = 30

interface PlacedSegment {
  seg: TradeSegment
  /** Index into the full daily history; null = before it. */
  openIdx: number | null
  closeIdx: number | null
  openAgo: number
}

export function SymbolPriceChart({ symbol }: { symbol: string }) {
  const sym = symbol.trim().toUpperCase()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [win, setWin] = useState<PriceWindow>('60')
  const [tradesOn, setTradesOn] = useState(true)

  const barsQ = useQuery({
    queryKey: ['market', 'bars', sym, '1 D', HISTORY_LIMIT],
    queryFn: () => fetchBars(sym, '1 D', HISTORY_LIMIT),
    enabled: Boolean(sym),
    staleTime: 5 * 60_000,
  })
  const exQ = useExhibitComposite(['gex_regime', 'opex_pin', 'vrp'], sym)
  const opexQ = useQuery({
    queryKey: ['research', 'opex-current', sym, 'no-map'],
    queryFn: () => fetchOpexCurrent(sym, undefined, false),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const earnQ = useEarningsDates(sym)
  const bookQ = useLedgerExecutionsBook({ limit: 0 })
  const monitorQ = useMonitorStatus()

  const daily = useMemo<Bar[]>(() => {
    const rows = (barsQ.data?.bars ?? []).filter(
      (b): b is Bar & { time: number } => b.time != null && Number.isFinite(b.time),
    )
    return [...rows].sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
  }, [barsQ.data])
  const dates = useMemo(() => daily.map((b) => barIsoDate(b.time as number)), [daily])
  const total = daily.length

  const winSessions = sessionsForWindow(win, total)
  const agg = aggFor(winSessions)
  const winStart = total - winSessions
  const chartBars = useMemo(
    () => aggregateBars(daily.slice(winStart), agg),
    [daily, winStart, agg],
  )

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
  const coneSlots = coneSessions != null ? Math.ceil(coneSessions / agg) : 0

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

  const legs = useMemo(
    () => selectLegs(flattenPositions(monitorQ.data?.portfolio?.accounts ?? []), sym),
    [monitorQ.data, sym],
  )
  const segments = useMemo(
    () => tradeSegmentsFor(bookQ.data?.items ?? [], sym, legs),
    [bookQ.data, sym, legs],
  )
  const placed = useMemo<PlacedSegment[]>(() => {
    if (total === 0) return []
    return segments.map((seg) => {
      const openIdx = sessionIndexFor(dates, seg.openDate)
      const closeIdx = seg.closeDate ? sessionIndexFor(dates, seg.closeDate) : null
      return { seg, openIdx, closeIdx, openAgo: total - 1 - (openIdx ?? 0) }
    })
  }, [segments, dates, total])

  // A closed position that ended before the window stays off the candles; an
  // open one is always visible, clipped at the left edge when it began earlier.
  const shown = useMemo(
    () =>
      placed.filter(
        (p) => p.seg.closeDate == null || (p.closeIdx != null && p.closeIdx >= winStart),
      ),
    [placed, winStart],
  )
  const hidden = placed.filter((p) => !shown.includes(p))
  // The overlay's strikes stretch the y-domain the way the walls do — a trade
  // drawn off the pane would otherwise vanish without a word.
  const tradeDomain = useMemo(
    () => (tradesOn ? shown.map((p) => p.seg.strike).filter((v) => Number.isFinite(v)) : []),
    [tradesOn, shown],
  )

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

  const renderTrades = (ctx: ChartOverlayContext) => {
    if (!tradesOn || shown.length === 0) return null
    const lastX = ctx.xForSlot(0)
    return (
      <g>
        {shown.map((p) => {
          const { seg } = p
          const clipped = p.openIdx == null || p.openIdx < winStart
          const x0 = clipped
            ? ctx.paddingLeft + 1
            : ctx.xForIndex(aggIndexFor(winSessions, agg, p.openIdx! - winStart))
          const x1 =
            seg.closeDate == null
              ? lastX
              : ctx.xForIndex(aggIndexFor(winSessions, agg, (p.closeIdx ?? winStart) - winStart))
          const y = ctx.yForPrice(seg.strike)
          if (!Number.isFinite(y) || y < ctx.paddingTop || y > ctx.paddingTop + ctx.priceHeight)
            return null
          const open = seg.closeDate == null
          const segDte = open && seg.expiryIso ? sessionsUntil(today, seg.expiryIso) : null
          const dashEnd =
            open && segDte != null && coneSessions != null
              ? ctx.xForSlot(Math.min(segDte, coneSessions) / agg)
              : null
          const plColor =
            seg.pnl == null
              ? 'var(--muted-foreground)'
              : seg.pnl >= 0
                ? 'var(--color-profit)'
                : 'var(--color-loss)'
          const plText =
            seg.pnl == null ? (open ? 'open' : '') : `${fmtPl(seg.pnl)}${seg.pnlIsMark ? ' mark' : ''}`
          const tip =
            `${seg.name} · opened ${seg.openDate}` +
            (clipped ? ' (before this window)' : '') +
            (open
              ? ` · still open — dashed runs to expiry${seg.pnl != null ? ` · mark ${fmtPl(seg.pnl)}` : ''}`
              : ` · closed ${seg.closeDate} · realized ${seg.pnl != null ? fmtPl(seg.pnl) : '—'}`) +
            ` · ${seg.fills} fill${seg.fills > 1 ? 's' : ''} · click → Book`
          return (
            <g
              key={seg.key}
              onClick={() => navigate(withSymbolParam('/portfolio/ledger', sym))}
              style={{ cursor: 'pointer' }}
            >
              <title>{tip}</title>
              <line
                x1={x0}
                x2={Math.max(x0, x1)}
                y1={y}
                y2={y}
                stroke="var(--sk-contract)"
                strokeWidth={2}
              />
              {dashEnd != null && dashEnd > x1 ? (
                <line
                  x1={x1}
                  x2={dashEnd}
                  y1={y}
                  y2={y}
                  stroke="var(--sk-contract)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  opacity={0.55}
                />
              ) : null}
              {!clipped ? (
                <circle cx={x0} cy={y} r={3.5} fill="var(--sk-contract)" stroke="var(--background)" />
              ) : null}
              {!open ? (
                <rect
                  x={x1 - 3.5}
                  y={y - 3.5}
                  width={7}
                  height={7}
                  fill={plColor}
                  stroke="var(--background)"
                />
              ) : null}
              <text
                x={x0 + 6}
                y={y - 5}
                fontSize="9"
                fontFamily="var(--font-mono)"
                fill="var(--sk-contract)"
              >
                {seg.name} <tspan fill={plColor}>{plText}</tspan>
              </text>
            </g>
          )
        })}
      </g>
    )
  }

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
      brushL: `${(((total - winSessions) / total) * 100).toFixed(1)}%`,
      brushW: `${((winSessions / total) * 100).toFixed(1)}%`,
      ticks: placed.map((p) => ({
        key: p.seg.key,
        x: `${(((p.openIdx ?? 0) / (total - 1)) * 100).toFixed(1)}%`,
        color:
          p.seg.pnl == null
            ? 'var(--muted-foreground)'
            : p.seg.pnl >= 0
              ? 'var(--color-profit)'
              : 'var(--color-loss)',
        title: `${p.seg.name} · ${p.openAgo} sessions ago${
          p.seg.pnl != null ? ` · ${fmtPl(p.seg.pnl)}` : ''
        } — click to bring it into the window`,
        jump: () => setWin(windowForSessionsAgo(p.openAgo)),
      })),
    }
  }, [daily, total, winSessions, placed])

  if (!sym) return null

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
        </span>
      }
      note="levels from this page — no technicals"
      action={
        <span className="inline-flex items-center gap-2">
          <SegmentControl
            ariaLabel="Window"
            size="xs"
            value={win}
            onChange={(v) => setWin(v as PriceWindow)}
            options={[...PRICE_WINDOWS]}
          />
          {segments.length > 0 ? (
            <button
              type="button"
              onClick={() => setTradesOn((v) => !v)}
              title="Your option fills on this symbol, drawn at strike level — open dot, close square, dashed to expiry while open"
              className={cn(
                'inline-flex h-5 items-center rounded border px-1.5 font-mono text-dense-micro',
                tradesOn
                  ? 'border-[var(--sk-accent)] text-foreground'
                  : 'border-border text-muted-foreground',
              )}
            >
              trades · {segments.length}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(withSymbolParam('/research/ratings/stocks', sym))}
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
          <BarsCandlestickChart
            bars={chartBars}
            period="1 D"
            showVwap={false}
            futureSlots={coneSlots}
            levels={levels}
            verticals={verticals}
            cone={
              coneSessions != null && spot != null && iv30 != null
                ? {
                    sessions: coneSlots,
                    widthAt: (d) => spot * iv30 * Math.sqrt((d * agg) / 252),
                  }
                : undefined
            }
            domainPrices={tradeDomain}
            renderPriceOverlay={renderTrades}
          />
          {tradesOn && hidden.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setWin(windowForSessionsAgo(Math.max(...hidden.map((p) => p.openAgo))))
              }
              title="Trades before this window — click to widen it"
              className="absolute bottom-8 left-14 rounded border border-border bg-background/75 px-1.5 py-0.5 font-mono text-dense-micro text-[var(--sk-contract)]"
            >
              ← {hidden.length} earlier trade{hidden.length > 1 ? 's' : ''}
            </button>
          ) : null}
          <div className="relative h-4 font-mono text-dense-micro text-muted-foreground">
            <span className="absolute left-0">−{winSessions}d</span>
            {todayPct != null ? (
              <span className="absolute -translate-x-1/2" style={{ left: `${todayPct}%` }}>
                today
              </span>
            ) : null}
            <span className="absolute right-0">{coneLabel}</span>
          </div>
          {tradesOn && mini && segments.length > 0 ? (
            <div className="relative mt-1 h-[26px]">
              <svg
                viewBox="0 0 900 26"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                <path d={mini.line} fill="none" stroke="var(--sk-line)" strokeWidth={1} />
              </svg>
              <span
                className="pointer-events-none absolute inset-y-0 border-l border-[var(--sk-accent)]"
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
