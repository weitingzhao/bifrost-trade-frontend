/**
 * Where the P&L came from (design Rev .112, §5.1.3): the Judgment-or-luck
 * reading P&L Explain used to carry, quoted per trade.
 *
 * The attribution — Δ, Γ, vega, θ and what is left unexplained — is computed
 * from the nightly book snapshot (api 0.12.0, TD-138), keyed by trade; Review
 * quotes this contract's rows of it and never recomputes them. The snapshot is
 * taken from 05OCT26 on: a trade whose life has no session pair on file reads
 * no attribution, and the panel says which of the two reasons it is.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { usePnlAttribution } from '@/hooks/useSnapshots'
import type { ReviewContract } from '@/utils/reviewContracts'
import { contractAttribution, tradeLifeRange } from './pnlSourceModel'

/** A severity edge on a card is inline: `mat-card` clears border-colour classes. */
const WARN_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' }

type Trade = Pick<
  ReviewContract,
  'shortPremium' | 'exitKind' | 'tradeId' | 'openedOn' | 'closedOn' | 'underlying' | 'expiry' | 'strike' | 'right' | 'accountId'
>

export function PnlSourcePanel({ trade }: { trade: Trade }) {
  // A credit trade is a sell-vol play and should earn from carry; a debit one is a drift play.
  const should = trade.shortPremium ? 'should earn from θ + vega' : 'should earn from Δ'
  const range = tradeLifeRange(trade.openedOn, trade.closedOn)
  const q = usePnlAttribution({ ...range, tradeId: trade.tradeId }, { enabled: trade.tradeId != null })
  const reading = q.data ? contractAttribution(q.data.items, trade) : null
  const read = reading != null && reading.sessions.length > 0

  const reason =
    trade.tradeId == null
      ? 'The fills were never booked to a trade, and the attribution is keyed by trade.'
      : q.isLoading
        ? 'Reading the daily snapshot…'
        : q.isError
          ? 'The daily snapshot could not be read just now.'
          : q.data === null
            ? 'This API does not serve the daily snapshot yet (trade-api 0.12.0 adds it).'
            : 'No session pair of the daily snapshot falls inside this trade’s life — it is taken nightly from 05OCT26.'

  const parts: { label: string; value: number | null }[] = [
    { label: 'Δ · direction', value: read ? reading.delta : null },
    { label: 'Γ · convexity', value: read ? reading.gamma : null },
    { label: 'Vega · vol marks', value: read ? reading.vega : null },
    { label: 'Θ · carry', value: read ? reading.theta : null },
    { label: 'Unexplained', value: read ? reading.unexplained : null },
  ]

  return (
    <section className={positionsUi.panel} style={read ? undefined : WARN_EDGE} aria-label="Where the P&L came from">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Where the P&amp;L came from</span>
        <span className={positionsUi.panelTitle}>{should}</span>
        {read ? (
          <DenseTag variant={reading.degraded ? 'warning' : 'neutral'} size="cell" className="ml-auto">
            {reading.sessions.length} {reading.sessions.length === 1 ? 'session' : 'sessions'} read
            {reading.degraded ? ` · ${reading.degraded} degraded Greeks` : ''}
          </DenseTag>
        ) : (
          <DenseTag variant="warning" size="cell" className="ml-auto">
            ⚠ no session pair read
          </DenseTag>
        )}
        <Link to="/portfolio/pnl-explain" className={positionsUi.link}>
          P&amp;L Explain →
        </Link>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2 px-3 py-2.5">
        {parts.map((p) => (
          <div key={p.label} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-dense-meta font-semibold text-muted-foreground">{p.label}</span>
            <span
              className={cn(
                positionsUi.mono,
                'text-dense-body font-semibold',
                p.value == null ? 'text-muted-foreground' : pnlColorClass(p.value),
              )}
            >
              {p.value == null ? '—' : fmtSignedUsd0(p.value)}
            </span>
          </div>
        ))}
      </div>
      <p className="m-0 border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
        {read
          ? `This contract's rows of trade #${trade.tradeId} in the daily snapshot: held P&L ${fmtSignedUsd0(reading.held)} over the sessions read, each against the close before it${reading.unread ? `; ${reading.unread} row${reading.unread === 1 ? '' : 's'} not read (opened or closed inside a session, or no Greeks)` : ''}${reading.missing ? `; ${reading.missing} without vendor Greeks` : ''}${trade.exitKind === 'open' ? ' — provisional on an open trade' : ''}.`
          : `${reason}${trade.exitKind === 'open' ? ' On an open trade a reading would be provisional.' : ''}`}
      </p>
    </section>
  )
}
