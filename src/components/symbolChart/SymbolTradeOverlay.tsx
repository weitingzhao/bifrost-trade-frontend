/**
 * The instance book on price (design Rev .102). Each instance on this symbol
 * is one track: its short and long legs drawn at their strikes over the days
 * they were held, a roll drawn as the old leg running to the roll day and a
 * vertical jump to the new strike (↻ and the day's net premium at the seam),
 * one label `#109 −6 170C +$3,121`. Hovering a track lights that instance and
 * fades the rest; clicking any of its lines opens the instance face over the
 * page, stepping this symbol's instances. Shares held now are one lime line at
 * their blended cost, split into the covered calls' backing and what is free.
 *
 * Strikes outside the chart's price range are clamped to its edge and marked
 * ↑ / ↓ rather than stretching the candles to reach them.
 */
import type { ChartOverlayContext } from '@/components/charts/BarsCandlestickChart'
import {
  aggIndexFor,
  fmtPl,
  sessionIndexFor,
  sessionsUntil,
  type Holding,
  type TradeTrack,
} from '@/components/symbolChart/symbolPriceModel'

const CHAR_W = 5.4
const INK = {
  contract: 'var(--sk-contract)',
  trade: 'var(--color-trade-multi)',
  shares: 'var(--sk-ticker)',
  profit: 'var(--color-profit)',
  loss: 'var(--color-loss)',
  unrealized: 'var(--color-unrealized)',
  mute: 'var(--muted-foreground)',
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export interface TradeOverlayProps {
  ctx: ChartOverlayContext
  tracks: readonly TradeTrack[]
  dates: readonly string[]
  winStart: number
  /** One past the last session drawn — history after it is off the right edge. */
  winEnd: number
  winSessions: number
  agg: number
  today: string
  coneSessions: number | null
  hover: string | null
  /** The one track kept lit and labelled (the Instance page); the rest read at 20% until hovered. */
  focusKey?: string | null
  onHover: (key: string | null) => void
  onOpen: (track: TradeTrack) => void
  onOpenId: (id: number) => void
  holding: Holding | null
  spot: number | null
  /** The ids the instance book holds; a number outside it opens nothing. Null while loading. */
  known: ReadonlySet<number> | null
  /** The mini chart (Symbol's 440 panel): no text layer — a trade's label only while it is hovered. */
  quiet?: boolean
}

export function SymbolTradeOverlay(p: TradeOverlayProps) {
  const { ctx, dates, winStart, winSessions, agg } = p
  const top = ctx.paddingTop
  const bottom = ctx.paddingTop + ctx.priceHeight
  const right = ctx.paddingLeft + ctx.innerWidth
  const lastX = ctx.xForSlot(0)
  const yOf = (price: number): { y: number; edge: '' | '↑' | '↓' } => {
    const y = ctx.yForPrice(price)
    if (!Number.isFinite(y)) return { y: top, edge: '↑' }
    if (y < top) return { y: top + 1, edge: '↑' }
    if (y > bottom) return { y: bottom - 1, edge: '↓' }
    return { y, edge: '' }
  }
  const xOfDate = (iso: string): { x: number; clipped: boolean } => {
    const idx = sessionIndexFor(dates, iso)
    if (idx == null || idx < winStart) return { x: ctx.paddingLeft + 1, clipped: true }
    if (idx >= p.winEnd) return { x: lastX, clipped: true }
    return { x: ctx.xForIndex(aggIndexFor(winSessions, agg, idx - winStart)), clipped: false }
  }

  // Label placement: the hovered track alone while hovering; otherwise open
  // tracks first, then the most recent. Full text when it fits, the #token when
  // only that fits, nothing when neither does.
  const placed: Rect[] = []
  const labelFor = new Map<string, { x: number; y: number; full: boolean; edge: string }>()
  const order = [...p.tracks].sort((a, b) => {
    if ((a.closeDate == null) !== (b.closeDate == null)) return a.closeDate == null ? -1 : 1
    return (b.closeDate ?? b.openDate).localeCompare(a.closeDate ?? a.openDate)
  })
  const lit = p.hover ?? p.focusKey ?? null
  for (const t of lit ? order.filter((x) => x.key === lit) : p.quiet ? [] : order) {
    const last = t.legs[t.legs.length - 1]
    const { x } = xOfDate(last.openDate)
    const { y, edge } = yOf(last.strike)
    const text = `${edge}${t.name} ${t.pnl != null ? fmtPl(t.pnl) : t.closeDate == null ? 'open' : ''}`
    const full: Rect = { x: x + 5, y: y - 13, w: text.length * CHAR_W, h: 11 }
    const token: Rect = { ...full, w: `${edge}${t.id != null ? `#${t.id}` : '·'}`.length * CHAR_W }
    if (!placed.some((r) => overlaps(r, full))) {
      placed.push(full)
      labelFor.set(t.key, { x: full.x, y: y - 4, full: true, edge })
    } else if (!placed.some((r) => overlaps(r, token))) {
      placed.push(token)
      labelFor.set(t.key, { x: token.x, y: y - 4, full: false, edge })
    }
  }

  const opens = (id: number | null): id is number =>
    id != null && (p.known == null || p.known.has(id))
  const h = p.holding
  const hy = h?.avg != null ? yOf(h.avg) : null
  const unr = h?.avg != null && p.spot != null ? (p.spot - h.avg) * h.qty : null

  return (
    <g>
      {h && hy ? (
        <g>
          <title>
            {`Held now: ${h.qty.toLocaleString('en-US')} sh at a blended cost of ${h.avg!.toFixed(2)}${
              unr != null ? `, unrealized ${fmtPl(unr)} against ${p.spot!.toFixed(2)}` : ''
            }. Shares under a covered call are its backing; the rest are free to write against.`}
          </title>
          <line
            x1={ctx.paddingLeft}
            x2={right}
            y1={hy.y}
            y2={hy.y}
            stroke={INK.shares}
            strokeWidth={1.25}
            opacity={p.hover ? 0.3 : 0.85}
          />
          {p.quiet ? null : (
            <>
          <text
            x={right - 2}
            y={hy.y - 4}
            fontSize="9"
            fontFamily="var(--font-mono)"
            textAnchor="end"
            fill={INK.shares}
          >
            {hy.edge}
            {h.qty.toLocaleString('en-US')} sh · avg {h.avg!.toFixed(2)}
            {unr != null ? (
              <tspan fill={unr >= 0 ? INK.profit : INK.loss}> {fmtPl(unr)}</tspan>
            ) : null}
          </text>
          <text
            x={right - 2}
            y={hy.edge === '↓' ? hy.y - 15 : hy.y + 10}
            fontSize="9"
            fontFamily="var(--font-mono)"
            textAnchor="end"
            fill={INK.mute}
          >
            {h.backing.map((b, i) => (
              <tspan
                key={b.id}
                fill={opens(b.id) ? INK.trade : INK.mute}
                style={{ cursor: opens(b.id) ? 'pointer' : 'default' }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (opens(b.id)) p.onOpenId(b.id)
                }}
              >
                {i > 0 ? ' · ' : ''}#{b.id} {b.qty.toLocaleString('en-US')} backing
              </tspan>
            ))}
            {h.free > 0
              ? `${h.backing.length ? ' · ' : ''}free ${h.free.toLocaleString('en-US')}`
              : ''}
          </text>
            </>
          )}
        </g>
      ) : null}

      {p.tracks.map((t) => {
        const faded = lit != null && lit !== t.key
        const open = t.closeDate == null
        const plInk =
          t.pnl == null ? INK.mute : open ? INK.unrealized : t.pnl >= 0 ? INK.profit : INK.loss
        const label = labelFor.get(t.key)
        const tip =
          `${t.name} · opened ${t.openDate}` +
          (open ? ' · open' : ` · closed ${t.closeDate}`) +
          (t.pnl != null ? ` · ${open ? 'mark' : 'realized'} ${fmtPl(t.pnl)}` : '') +
          (t.joints.length ? ` · rolled ${t.joints.length}×` : '') +
          ` · ${t.fills} fill${t.fills > 1 ? 's' : ''}` +
          (t.id == null
            ? ' · no trade claims these fills — click → Ledger'
            : opens(t.id)
              ? ' · click → its record'
              : ` · #${t.id} is not in the trade book — nothing to open`)
        return (
          <g
            key={t.key}
            opacity={faded ? 0.2 : 1}
            style={{ cursor: opens(t.id) || t.id == null ? 'pointer' : 'default' }}
            onMouseEnter={() => p.onHover(t.key)}
            onMouseLeave={() => p.onHover(null)}
            onClick={() => (t.id == null || opens(t.id) ? p.onOpen(t) : undefined)}
          >
            <title>{tip}</title>
            {t.legs.map((l) => {
              const a = xOfDate(l.openDate)
              const x1 = l.flatDate ? xOfDate(l.flatDate).x : lastX
              const { y } = yOf(l.strike)
              const legOpen = l.flatDate == null
              const dte = legOpen && l.expiryIso ? sessionsUntil(p.today, l.expiryIso) : null
              const dashEnd =
                legOpen && dte != null && p.coneSessions != null
                  ? ctx.xForSlot(Math.min(dte, p.coneSessions) / agg)
                  : null
              const legInk = l.pnl == null ? INK.mute : l.pnl >= 0 ? INK.profit : INK.loss
              return (
                <g key={l.key}>
                  {/* A wide transparent stroke so a thin line is easy to hover and click. */}
                  <line
                    x1={a.x}
                    x2={Math.max(a.x, x1)}
                    y1={y}
                    y2={y}
                    stroke="transparent"
                    strokeWidth={8}
                  />
                  <line
                    x1={a.x}
                    x2={Math.max(a.x, x1)}
                    y1={y}
                    y2={y}
                    stroke={INK.contract}
                    strokeWidth={l.side < 0 ? 2 : 1.5}
                    strokeDasharray={l.side < 0 ? undefined : '5 2'}
                  />
                  {dashEnd != null && dashEnd > x1 ? (
                    <line
                      x1={x1}
                      x2={dashEnd}
                      y1={y}
                      y2={y}
                      stroke={INK.contract}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      opacity={0.55}
                    />
                  ) : null}
                  {!a.clipped ? (
                    <circle cx={a.x} cy={y} r={3} fill={INK.contract} stroke="var(--background)" />
                  ) : null}
                  {!legOpen &&
                  !t.joints.some((j) => j.date === l.flatDate && j.fromStrike === l.strike) ? (
                    <rect
                      x={x1 - 3}
                      y={y - 3}
                      width={6}
                      height={6}
                      fill={legInk}
                      stroke="var(--background)"
                    />
                  ) : null}
                </g>
              )
            })}
            {t.joints.map((j) => {
              const { x, clipped } = xOfDate(j.date)
              if (clipped) return null
              const y0 = yOf(j.fromStrike).y
              const y1 = yOf(j.toStrike).y
              const ink = j.net >= 0 ? INK.profit : INK.loss
              return (
                <g key={`${j.date}|${j.fromStrike}|${j.toStrike}`}>
                  <line x1={x} x2={x} y1={y0} y2={y1} stroke={INK.contract} strokeWidth={1.5} />
                  <text
                    x={x + 3}
                    y={(y0 + y1) / 2 + 3}
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    fill={ink}
                  >
                    ↻ {fmtPl(j.net)} {j.net >= 0 ? 'cr' : 'db'}
                  </text>
                </g>
              )
            })}
            {label ? (
              <text x={label.x} y={label.y} fontSize="9" fontFamily="var(--font-mono)">
                {label.edge ? <tspan fill={INK.mute}>{label.edge}</tspan> : null}
                {label.full ? (
                  <>
                    <tspan fill={INK.trade}>{t.id != null ? `#${t.id}` : ''}</tspan>
                    <tspan fill={INK.contract}>
                      {t.id != null ? t.name.slice(`#${t.id}`.length) : t.name}
                    </tspan>
                    <tspan fill={plInk}> {t.pnl != null ? fmtPl(t.pnl) : open ? 'open' : ''}</tspan>
                  </>
                ) : (
                  <tspan fill={INK.trade}>{t.id != null ? `#${t.id}` : '·'}</tspan>
                )}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
