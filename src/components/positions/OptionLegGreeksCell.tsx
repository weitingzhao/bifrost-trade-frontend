/**
 * What one leg is doing, per day and per point of vol.
 *
 * The portfolio totals answer "is the book earning"; they cannot answer "which
 * leg do I close". A seller decides that on the leg's own theta — what it still
 * pays to hold — and on the vol it is carrying versus what was sold.
 *
 * Vendor values from the market-data warehouse, so they are end-of-day standing
 * beside a live quote. The capture date prints when it is not today's, because a
 * theta from three weeks ago is a different number than the one being decided on.
 */
import type { PositionGreeks } from '@/hooks/useOptionGreeks'

export const LEG_GREEKS_TITLE =
  'Vendor implied vol for this contract, then the position’s own theta a day and delta — signed by the contracts held, so a short leg earns positive theta. End-of-day figures; a date shows when they were not captured today.'

export function OptionLegGreeksCell({
  greeks,
  today,
}: {
  greeks: PositionGreeks | undefined
  /** YYYY-MM-DD. Anything captured earlier than this is stamped. */
  today: string
}) {
  if (!greeks || (greeks.iv == null && greeks.theta == null)) {
    return (
      <span
        className="text-muted-foreground"
        title="No vendor row for this contract — excluded from the portfolio totals too, not treated as zero."
      >
        —
      </span>
    )
  }

  const day = greeks.asOf ? greeks.asOf.slice(0, 10) : null
  const stale = day != null && day < today

  return (
    <span className="flex flex-col items-end leading-tight" title={LEG_GREEKS_TITLE}>
      <span className="font-mono tabular-nums">
        {greeks.iv != null ? `IV ${(greeks.iv * 100).toFixed(0)}%` : 'IV —'}
        {stale ? <span className="text-warning"> @{day?.slice(5)}</span> : null}
      </span>
      <span className="text-dense-caption font-mono text-muted-foreground">
        {greeks.theta != null ? (
          <span className={greeks.theta >= 0 ? 'text-profit' : 'text-loss'}>
            θ{greeks.theta >= 0 ? '+' : ''}
            {greeks.theta.toFixed(0)}
          </span>
        ) : (
          'θ—'
        )}
        {greeks.delta != null ? ` Δ${greeks.delta.toFixed(0)}` : ''}
        {greeks.vega != null ? ` ν${greeks.vega.toFixed(0)}` : ''}
      </span>
    </span>
  )
}

/** Today in the local calendar, as the vendor stamps dates. */
export function localDayStamp(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
