/**
 * The three cells that turn the instance row from a ledger line into a position.
 *
 * Time left, room left, and the price where the trade turns — all derived from
 * fields the row already carried and only showed one level down. Kept together
 * because they are read together: DTE alone says nothing (a 3-day far-OTM short
 * is quiet, a 3-day at-the-money short is an emergency), so the colour that
 * means *risk* lives on the cushion and DTE only ever says *time*.
 */
import { cn } from '@/lib/utils'
import { DenseTag, InlinePnl } from '@/components/data-display'
import { fmtExpiry, fmtUsd } from '@/utils/positions'
import {
  cushionBand,
  summarizeBreakeven,
  summarizeCushion,
  summarizeExpiry,
  type OptionLegLike,
} from '@/utils/positionsOptionRisk'

const DASH = <span className="text-muted-foreground">—</span>

function pct1(v: number): string {
  const p = v * 100
  const sign = p > 0 ? '+' : ''
  return `${sign}${p.toFixed(1)}%`
}

function legLabel(leg: OptionLegLike): string {
  const r = (leg.right ?? '').trim().toUpperCase().charAt(0)
  return `${leg.strike}${r || '?'}`
}

// ── DTE ──────────────────────────────────────────────────────────────────────

export const DTE_TITLE =
  'Days to the nearest expiry across this instance’s option legs. Time only — whether that time is dangerous is the Moneyness column.'

export function InstanceDteCell({ legs }: { legs: readonly OptionLegLike[] }) {
  const { dte, expiry, expiryCount } = summarizeExpiry(legs)
  if (dte == null) return DASH

  const expired = dte < 0
  const label = expired ? `${-dte}d ago` : dte === 0 ? 'today' : `${dte}d`
  const tone = expired ? 'text-loss' : dte <= 7 ? 'text-warning' : undefined

  return (
    <span
      className="flex flex-col leading-tight"
      title={`${DTE_TITLE}\nNearest: ${fmtExpiry(expiry ?? undefined)}${
        expiryCount > 1 ? ` · ${expiryCount} distinct expiries` : ''
      }`}
    >
      <span className={cn('font-mono font-semibold tabular-nums', tone)}>{label}</span>
      <span className="text-dense-caption text-muted-foreground">
        {fmtExpiry(expiry ?? undefined)}
        {expiryCount > 1 ? ` +${expiryCount - 1}` : ''}
      </span>
    </span>
  )
}

// ── Moneyness ────────────────────────────────────────────────────────────────

export const CUSHION_TITLE =
  'Room left on the tightest short leg, as a percentage of its strike. Negative means the strike is already breached. Long legs are excluded — a long going in the money is not a risk.'

export function InstanceCushionCell<T extends OptionLegLike>({
  legs,
  spotOf,
  tightPct,
}: {
  legs: readonly T[]
  spotOf: (leg: T) => number | null
  /** The trader's warning line — see useCushionThreshold. */
  tightPct: number
}) {
  const s = summarizeCushion(legs, spotOf)

  if (s.shortLegCount === 0) {
    return <span className="text-muted-foreground" title="No short legs — nothing to be assigned on.">—</span>
  }
  if (s.cushionPct == null) {
    return (
      <span
        className="text-muted-foreground"
        title={`No underlying quote for ${s.unpricedShortCount} short leg${
          s.unpricedShortCount === 1 ? '' : 's'
        } — cushion unknown, not safe.`}
      >
        n/a
      </span>
    )
  }

  const band = cushionBand(s.cushionPct, tightPct)
  const tone =
    band === 'breached' ? 'text-loss' : band === 'tight' ? 'text-warning' : undefined

  return (
    <span
      className="flex flex-col items-start gap-0.5 leading-tight"
      title={`${CUSHION_TITLE}\nTightest: ${
        s.leg ? legLabel(s.leg) : '—'
      } vs spot ${s.spot != null ? s.spot.toFixed(2) : '—'}${
        s.unpricedShortCount > 0
          ? `\n${s.unpricedShortCount} short leg(s) unpriced and excluded.`
          : ''
      }`}
    >
      <span className={cn('font-mono font-semibold tabular-nums', tone)}>
        {pct1(s.cushionPct)}
        {s.unpricedShortCount > 0 ? <span className="text-muted-foreground">*</span> : null}
      </span>
      {s.itmShortCount > 0 ? (
        <DenseTag variant="danger" size="cell">
          {s.itmShortCount} ITM
        </DenseTag>
      ) : (
        <span className="text-dense-caption font-mono text-muted-foreground">
          {s.leg ? legLabel(s.leg) : ''}
        </span>
      )}
    </span>
  )
}

// ── Breakeven ────────────────────────────────────────────────────────────────

export const AT_EXPIRY_TITLE =
  'At expiration, from the payoff model — not current mark-to-market risk. Max gain / max loss, then the breakeven nearest spot. "Unlimited" on the loss side is what the separate Risk badge used to say.'

/**
 * Max gain, max loss, breakeven and risk type in one cell.
 *
 * They were four columns and 27.5rem wide, which is what pushed the table past
 * the viewport and put current P&L behind a horizontal scroll. They are one
 * subject — where this position ends up at expiration — and they collapse
 * cleanly: an unbounded loss prints as "Unlimited", which is the entire content
 * of the Risk badge that used to sit beside it. Nothing is dropped; the two
 * lines say what the four columns said.
 */
export function InstancePayoffCell({
  gainLabel,
  lossLabel,
  maxGain,
  maxLoss,
  unlimited,
  prices,
  spot,
}: {
  gainLabel: string
  lossLabel: string
  maxGain: number | null
  maxLoss: number | null
  unlimited: boolean
  prices: readonly number[]
  /** Null when the instance spans more than one underlying — no single spot to compare. */
  spot: number | null
}) {
  const be = summarizeBreakeven(prices, spot)

  return (
    <span
      className="flex flex-col items-end leading-tight"
      title={
        `${AT_EXPIRY_TITLE}\nMax gain ${gainLabel} · max loss ${lossLabel}` +
        (be.prices.length > 0
          ? `\nBreakeven: ${be.prices.map((p) => fmtUsd(p)).join(', ')}`
          : '\nNo breakeven in the modelled range.')
      }
    >
      <span className="font-mono tabular-nums">
        <InlinePnl value={maxGain}>
          <span>{gainLabel}</span>
        </InlinePnl>
        <span className="text-muted-foreground"> / </span>
        {unlimited ? (
          <span className="text-loss">{lossLabel}</span>
        ) : (
          <InlinePnl value={maxLoss}>
            <span>{lossLabel}</span>
          </InlinePnl>
        )}
      </span>
      <span className="text-dense-caption text-muted-foreground">
        {be.nearest != null ? (
          <>
            B/E {fmtUsd(be.nearest)}
            {be.prices.length > 1 ? ` +${be.prices.length - 1}` : ''}
            {be.distancePct != null ? ` · spot ${pct1(be.distancePct)}` : ''}
          </>
        ) : (
          'no B/E'
        )}
      </span>
    </span>
  )
}
