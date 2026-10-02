/**
 * Position (design Rev .102): what an open instance holds right now — spot,
 * days to its last expiry, the net delta in shares, theta a day and the open
 * legs' P&L, then a row per holding. The Greeks are the vendor's rows Positions
 * reads, scaled to the holding; a leg the vendor did not price keeps its row,
 * reads `—`, and the sums say how many legs they cover.
 */
import { Link } from 'react-router-dom'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtPctFromFraction, fmtUsd, fmtUsdRound } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PositionView } from '@/utils/tradeRecord/tradeRecordModel'

const signed0 = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(0)}`)

export function TradePositionSection({
  p,
  pending,
  positionsTo,
  onLeave,
}: {
  p: PositionView
  pending: boolean
  positionsTo: string
  onLeave?: () => void
}) {
  const partial = p.priced < p.optionRows
  const greekNote = pending
    ? 'reading Greeks…'
    : p.priced === 0
      ? 'no Greeks on file for these contracts'
      : partial
        ? `Greeks on ${p.priced} of ${p.optionRows} legs`
        : p.greeksAsOf
          ? `Greeks as of ${new Date(p.greeksAsOf).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
          : ''
  return (
    <div className="flex flex-col gap-2 mat-card py-3">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-3.5">
        <span className="text-dense-body font-semibold">Position</span>
        <span className="text-dense-micro text-[var(--sk-mute2)]">held now · cushion = distance of a short strike from spot</span>
        <Link to={positionsTo} onClick={onLeave} className={cn(positionsUi.link, 'ml-auto text-dense-label')}>
          Open on Positions →
        </Link>
      </div>
      <div data-sr-kpi="strip-inset" className="!py-0">
        <PositionsStat cap="Spot now" value={p.spot != null ? `$${p.spot.toFixed(2)}` : '—'} />
        <PositionsStat
          cap="DTE"
          value={p.dte == null ? '—' : p.dte < 0 ? 'past' : `${p.dte}d`}
          ink={p.dte != null && p.dte <= 7 ? 'text-warning' : undefined}
        />
        <PositionsStat cap="Net Δ · sh" value={signed0(p.delta)} sub={partial && p.priced > 0 ? 'partial' : ''} />
        <PositionsStat
          cap="Θ / day"
          value={p.theta == null ? '—' : `${p.theta >= 0 ? '+' : '−'}${fmtUsdRound(Math.abs(p.theta))}`}
          ink={p.theta == null ? undefined : p.theta >= 0 ? 'text-profit' : 'text-loss'}
          sub={partial && p.priced > 0 ? 'partial' : ''}
        />
        <PositionsStat
          cap="Unrealized"
          value={p.unrealized == null ? '—' : `${p.unrealized >= 0 ? '+' : ''}${fmtUsdRound(p.unrealized)}`}
          ink="text-[var(--color-unrealized)]"
        />
      </div>
      <div className="overflow-x-auto">
        <table data-sr-table="" className="w-full">
          <thead>
            <tr>
              <th>Holding</th>
              <th data-sr-col="num">Qty</th>
              <th data-sr-col="num">Mark</th>
              <th data-sr-col="num">Value</th>
              <th data-sr-col="num">Δ</th>
              <th data-sr-col="num">Cushion</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => (
              <tr key={r.key}>
                <td
                  className={cn(
                    'font-mono whitespace-nowrap',
                    r.kind === 'stk' ? 'text-[var(--sk-ticker)]' : 'text-[var(--sk-contract,#7dd3fc)]',
                  )}
                  title={r.kind === 'stk' ? "The account's shares now, covering the short calls — not attributed to the trade" : undefined}
                >
                  {r.label}
                </td>
                <td data-sr-col="num">{r.qty > 0 ? `+${r.qty}` : `−${Math.abs(r.qty)}`}</td>
                <td data-sr-col="num">{r.mark != null ? `$${r.mark.toFixed(2)}` : '—'}</td>
                <td data-sr-col="num">{r.value != null ? fmtUsd(r.value) : '—'}</td>
                <td data-sr-col="num" className={r.delta == null ? 'text-muted-foreground' : undefined}>
                  {signed0(r.delta)}
                </td>
                <td
                  data-sr-col="num"
                  className={
                    r.cushion == null
                      ? 'text-muted-foreground'
                      : r.cushion < 0
                        ? 'text-loss'
                        : r.cushion < 0.05
                          ? 'text-warning'
                          : 'text-[var(--sk-mute2)]'
                  }
                >
                  {fmtPctFromFraction(r.cushion, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {greekNote ? <p className="m-0 px-3.5 text-dense-micro text-muted-foreground">{greekNote}</p> : null}
    </div>
  )
}
