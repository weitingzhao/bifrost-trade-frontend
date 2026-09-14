/**
 * My legs on this name — one row of the Symbol 判定视图 (contract §11.7).
 *
 * A verdict without knowing you already carry stock or short a put on the same
 * name reads out of context. The rail lists what the broker actually shows on
 * this symbol, so the tabs above are read against a position, not a blank page.
 *
 * Data source is the monitor status snapshot the rest of Trade reads (single
 * cached query, per Owner decision 2026-09-05 on Golden Source authority — no
 * second in-house derivation). D10-safe: display only, no order actions.
 *
 * Colour discipline: unrealized PnL uses `unrealizedPnlColorClass` (open marks
 * are not conclusions, no direction colour); the +/− and long/short text stay
 * neutral because side is a fact, not a verdict.
 *
 * Renders nothing when the account holds no leg on this symbol; the page does
 * not carry a "you have no positions" line for every name in the universe.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { flattenPositions } from '@/utils/positionsGrouping'
import { fmtExpiry, fmtUsd } from '@/utils/positions'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import { selectLegs, type SymbolLeg } from './selectLegs'

function stockLabel(leg: SymbolLeg): string {
  return `${leg.qty > 0 ? 'long' : 'short'} ${Math.abs(leg.qty).toLocaleString()} sh`
}

function optionLabel(leg: SymbolLeg): string {
  const side = leg.qty > 0 ? 'long' : 'short'
  const contracts = Math.abs(leg.qty)
  // Prototype (Research Symbol.dc.html L771) writes contracts as `245C`, not
  // `245 call` — the trader-native form and half the width of the gloss.
  const strike = leg.strike != null ? leg.strike.toLocaleString() : '—'
  const expiry = fmtExpiry(leg.expiry)
  return `${side} ${contracts} × ${expiry} ${strike}${leg.right ?? ''}`.trim()
}

export function SymbolMyLegs({ symbol }: { symbol: string }) {
  const { data } = useMonitorStatus()
  const legs = useMemo(
    () => selectLegs(flattenPositions(data?.portfolio?.accounts ?? []), symbol),
    [data?.portfolio?.accounts, symbol],
  )

  if (legs.length === 0) return null

  const totalPnl = legs.reduce((a, l) => a + (l.unrealized ?? 0), 0)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-border/60 bg-muted/20 px-2 py-1 text-dense-meta">
      <span className="shrink-0 text-muted-foreground">My legs</span>
      {legs.map((leg) => (
        <span key={leg.key} className="inline-flex items-center gap-1 font-mono tabular-nums">
          <span className="text-muted-foreground">{leg.qty > 0 ? '+' : '−'}</span>
          <span className="text-foreground">{leg.kind === 'STK' ? stockLabel(leg) : optionLabel(leg)}</span>
          {leg.avgCost != null ? (
            <span className="text-muted-foreground">@ {fmtUsd(leg.avgCost)}</span>
          ) : null}
          {leg.unrealized != null ? (
            <span className={unrealizedPnlColorClass(leg.unrealized)}>{fmtUsd(leg.unrealized)}</span>
          ) : null}
        </span>
      ))}
      <span aria-hidden className="text-border">·</span>
      <span className={`font-mono tabular-nums ${unrealizedPnlColorClass(totalPnl)}`}>
        Net {fmtUsd(totalPnl)}
      </span>
      <Link
        to={`/portfolio/positions?symbol=${encodeURIComponent(symbol)}`}
        className="ml-auto text-muted-foreground hover:text-foreground hover:underline"
        title="Open Positions with this symbol scoped"
      >
        Positions →
      </Link>
    </div>
  )
}
