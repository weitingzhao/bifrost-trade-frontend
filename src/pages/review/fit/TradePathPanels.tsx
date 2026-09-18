/**
 * The two panels the design puts at the top of Single trade: where the
 * underlying went, and what the position was worth while it went there.
 *
 * They share one x scale — an index over the sessions the contract has bars for
 * — so a vertical line means the same session in both, which is the whole
 * reason they are stacked rather than side by side.
 *
 * The amber area between the held curve and its own running maximum is the
 * design's point: it is what was on the table and not taken.
 */
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { linearScale } from '@/lib/chartScale'
import { chartAxisTickFill, chartTokens } from '@/lib/chartTokens'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtUsd } from '@/utils/positions'
import type { DailyBar } from '@/api/marketData/dailyBars'
import type { ExpiryBranch, MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewTrade } from '@/utils/reviewTrades'

const VW = 1000
/** The right-hand gutter the value labels sit in. */
const PLOT_RIGHT = 872
const PL = 8
const PT = 10

const INK = 'var(--foreground)'
const MUTE = 'var(--muted-foreground)'
const GREEN = 'var(--color-profit)'
const RED = 'var(--color-loss)'
const AMBER = 'var(--color-warning)'

function path(points: readonly { x: number; y: number }[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">{children}</p>
  )
}

interface Props {
  trade: ReviewTrade
  markPath: MarkPath | null
  expiryBranch: ExpiryBranch | null
  underlying: readonly DailyBar[]
}

export function TradePathPanels({ trade, markPath, expiryBranch, underlying }: Props) {
  const geometry = useMemo(() => {
    if (markPath == null) return null
    const dates = [...new Set([...markPath.held, ...markPath.ifHeld].map((p) => p.date))].sort()
    const index = new Map(dates.map((d, i) => [d, i]))
    const xAt = (date: string) => {
      const i = index.get(date) ?? 0
      return PL + (dates.length > 1 ? i / (dates.length - 1) : 0) * (PLOT_RIGHT - PL)
    }

    // The running maximum: the best mark available by each session. The area
    // between it and the held curve is opportunity that existed and was passed.
    let running = -Infinity
    const runMax = markPath.held.map((p) => {
      running = Math.max(running, p.pl)
      return { date: p.date, pl: running }
    })

    return { dates, xAt, runMax }
  }, [markPath])

  const underlyingCloses = useMemo(
    () => underlying.filter((b) => b.close != null && (!geometry || geometry.dates.includes(b.date))),
    [underlying, geometry],
  )

  return (
    <>
      <section className={positionsUi.panel} aria-label="Underlying">
        <header className={positionsUi.panelHead}>
          <span className={positionsUi.cap}>Underlying</span>
          <span className={positionsUi.panelTitle}>
            {trade.underlying} through the days it was held
          </span>
          <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-muted-foreground')}>
            strike {trade.strike} · {trade.right === 'P' ? 'put' : 'call'}
          </span>
        </header>
        {geometry == null || underlyingCloses.length < 2 ? (
          <Empty>
            The underlying&rsquo;s daily closes for this window are not on hand, so the price panel is withheld
            rather than drawn from the two ends.
          </Empty>
        ) : (
          <UnderlyingChart
            closes={underlyingCloses}
            strike={trade.strike}
            xAt={geometry.xAt}
            exitDate={trade.closedOn}
          />
        )}
      </section>

      <section className={positionsUi.panel} aria-label="Position P&L">
        <header className={positionsUi.panelHead}>
          <span className={positionsUi.cap}>Position P&amp;L</span>
          <span className={positionsUi.panelTitle}>What the position was worth, session by session</span>
          <span className="ml-auto text-dense-meta text-muted-foreground">
            amber is what was on the table and not taken
          </span>
        </header>
        {markPath == null || geometry == null ? (
          <Empty>
            No daily bar for this contract covers the days it was held, so there is no path, no best mark and no
            worst mark on this trade.
          </Empty>
        ) : (
          <>
            <PnlChart
              markPath={markPath}
              runMax={geometry.runMax}
              xAt={geometry.xAt}
              expiryBranch={expiryBranch}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-1.5 text-dense-meta text-muted-foreground">
              <Key color={INK}>what I held</Key>
              {markPath.ifHeld.length > 1 ? (
                <Key color={MUTE} dashed>
                  after my exit, had I stayed
                </Key>
              ) : null}
              <Key color={AMBER} dashed>
                best mark available by then
              </Key>
              <span>
                {markPath.bars} of {markPath.businessDays} sessions have a bar
              </span>
            </div>
          </>
        )}
      </section>
    </>
  )
}

function Key({ color, dashed, children }: { color: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block w-4.5"
        style={{ borderTopWidth: 2, borderTopStyle: dashed ? 'dashed' : 'solid', borderTopColor: color }}
      />
      {children}
    </span>
  )
}

function UnderlyingChart({
  closes,
  strike,
  xAt,
  exitDate,
}: {
  closes: readonly DailyBar[]
  strike: number
  xAt: (date: string) => number
  exitDate: string | null
}) {
  const H = 150
  const values = closes.map((b) => b.close as number)
  const y = linearScale([...values, strike], { size: H, padStart: PT, padEnd: 18 })
  const line = path(closes.map((b) => ({ x: xAt(b.date), y: y.atInverted(b.close as number) })))
  const exitX = exitDate ? xAt(exitDate) : null
  const last = closes[closes.length - 1]

  return (
    <div className="px-2.5 pt-2 pb-1">
      <svg
        viewBox={`0 0 ${VW} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        role="img"
        aria-label="Underlying close through the holding period, with the strike and the exit"
      >
        <line
          x1={PL}
          y1={y.atInverted(strike)}
          x2={PLOT_RIGHT}
          y2={y.atInverted(strike)}
          stroke={AMBER}
          strokeWidth={1.2}
          strokeDasharray="5 4"
        />
        <text x={PLOT_RIGHT + 8} y={y.atInverted(strike) + 3.5} fontSize={11} fill={AMBER}>
          K {strike}
        </text>
        {exitX == null ? null : (
          <line x1={exitX} y1={PT} x2={exitX} y2={H - 18} stroke={chartTokens.accent} strokeWidth={1.2} />
        )}
        <path d={line} fill="none" stroke={chartTokens.line} strokeWidth={1.8} />
        {last?.close == null ? null : (
          <text
            x={PLOT_RIGHT + 8}
            y={y.atInverted(last.close) + 3.5}
            fontSize={11}
            fill={chartAxisTickFill}
          >
            {last.close.toFixed(2)}
          </text>
        )}
        <text x={PL} y={H - 4} fontSize={10} fill={chartAxisTickFill}>
          {fmtIsoDateToken(closes[0].date)}
        </text>
        <text x={PLOT_RIGHT} y={H - 4} textAnchor="end" fontSize={10} fill={chartAxisTickFill}>
          {fmtIsoDateToken(closes[closes.length - 1].date)}
        </text>
      </svg>
    </div>
  )
}

function PnlChart({
  markPath,
  runMax,
  xAt,
  expiryBranch,
}: {
  markPath: MarkPath
  runMax: readonly { date: string; pl: number }[]
  xAt: (date: string) => number
  expiryBranch: ExpiryBranch | null
}) {
  const H = 200
  const all = [
    ...markPath.held.map((p) => p.pl),
    ...markPath.ifHeld.map((p) => p.pl),
    ...runMax.map((p) => p.pl),
    0,
  ]
  const y = linearScale(all, { size: H, padStart: PT, padEnd: 18 })
  const zeroY = y.atInverted(0)

  const heldPts = markPath.held.map((p) => ({ x: xAt(p.date), y: y.atInverted(p.pl) }))
  const ifHeldPts = markPath.ifHeld.map((p) => ({ x: xAt(p.date), y: y.atInverted(p.pl) }))
  const maxPts = runMax.map((p) => ({ x: xAt(p.date), y: y.atInverted(p.pl) }))
  // The give-back area: down the held curve, back along its own running max.
  const gap = `${path(heldPts)} ${[...maxPts].reverse().map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} Z`

  const exitX = xAt(markPath.held[markPath.held.length - 1].date)
  const marks = [
    { key: 'best', x: xAt(markPath.bestDate), v: markPath.best, fill: GREEN, label: `best ${fmtUsd(markPath.best, true)}` },
    { key: 'worst', x: xAt(markPath.worstDate), v: markPath.worst, fill: RED, label: `worst ${fmtUsd(markPath.worst, true)}` },
    { key: 'exit', x: exitX, v: markPath.realised, fill: chartTokens.accent, label: `out ${fmtUsd(markPath.realised, true)}` },
  ]
  if (expiryBranch && markPath.ifHeld.length > 1) {
    marks.push({
      key: 'expiry',
      x: PLOT_RIGHT,
      v: expiryBranch.pl,
      fill: MUTE,
      label: `expiry ${fmtUsd(expiryBranch.pl, true)}`,
    })
  }

  // Two readings can price within a few dollars of each other, which stacks
  // their gutter labels; nudge them apart while keeping reading order.
  const labels = marks
    .map((m) => ({ ...m, ly: y.atInverted(m.v) }))
    .sort((a, b) => a.ly - b.ly)
  for (let i = 1; i < labels.length; i += 1) {
    if (labels[i].ly - labels[i - 1].ly < 13) labels[i].ly = labels[i - 1].ly + 13
  }

  return (
    <div className="px-2.5 pt-2 pb-1">
      <svg
        viewBox={`0 0 ${VW} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        role="img"
        aria-label="Position P and L through the holding period against the best mark available by each session"
      >
        <path d={gap} fill={AMBER} opacity={0.14} stroke="none" />
        <line x1={PL} y1={zeroY} x2={PLOT_RIGHT} y2={zeroY} stroke={chartTokens.axis} strokeWidth={1} />
        <line x1={exitX} y1={PT} x2={exitX} y2={H - 18} stroke={chartTokens.accent} strokeWidth={1.2} />
        <path d={path(maxPts)} fill="none" stroke={AMBER} strokeWidth={1.2} strokeDasharray="3 3" />
        {ifHeldPts.length > 1 ? (
          <path d={path(ifHeldPts)} fill="none" stroke={MUTE} strokeWidth={1.4} strokeDasharray="4 3" />
        ) : null}
        <path d={path(heldPts)} fill="none" stroke={chartTokens.line} strokeWidth={2} />
        {marks.map((m) => (
          <circle
            key={m.key}
            cx={m.x}
            cy={y.atInverted(m.v)}
            r={3.4}
            fill={m.fill}
            stroke="var(--card)"
            strokeWidth={1.4}
          />
        ))}
        {labels.map((m) => (
          <text key={m.key} x={PLOT_RIGHT + 8} y={m.ly + 3.5} fontSize={11} fill={m.fill}>
            {m.label}
          </text>
        ))}
        <text x={PL} y={H - 4} fontSize={10} fill={chartAxisTickFill}>
          {fmtIsoDateToken(markPath.held[0].date)}
        </text>
        <text x={exitX} y={H - 4} textAnchor="middle" fontSize={10} fill={chartTokens.accent}>
          {fmtIsoDateToken(markPath.held[markPath.held.length - 1].date)}
        </text>
      </svg>
    </div>
  )
}
