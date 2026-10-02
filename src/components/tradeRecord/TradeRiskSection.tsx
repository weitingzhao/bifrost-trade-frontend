/**
 * Risk at expiration (design Rev .101): the position as held, drawn name by
 * name — an instance that traded two underlyings has two payoffs, because a
 * payoff is a function of one price. Breakevens are read off the drawn curve,
 * so they move with the With shares / Options only switch.
 */
import { DenseTag, SegmentControl } from '@/components/data-display'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import type { Payoff, PayoffPoint } from '@/utils/tradeRecord/tradeRecordModel'

export interface PayoffView extends Payoff {
  spot: number | null
  /** Still reading the price — not the same as having none. */
  spotPending: boolean
  spotDate: string | null
  /** No quote now: spot is the underlying's last daily close. */
  lastClose?: boolean
  shares: { qty: number; avgCost: number | null; held: number } | null
}

const W = 320
const H = 140

function riskTag(p: PayoffView): { label: string; variant: 'warning' | 'info' } {
  if (p.lossUnbounded) return { label: 'Undefined', variant: 'warning' }
  if (p.shares) return { label: 'Covered', variant: 'info' }
  return { label: 'Defined', variant: 'info' }
}

function Chart({ p }: { p: PayoffView }) {
  const vs = p.points.map((x) => x.total)
  const vmin = Math.min(0, ...vs)
  const vmax = Math.max(0, ...vs)
  const hi = p.points[p.points.length - 1].price || 1
  const Y = (v: number) => H - 6 - ((v - vmin) / (vmax - vmin || 1)) * (H - 12)
  const X = (s: number) => (s / hi) * W
  const zY = Y(0).toFixed(1)
  const path = (f: (v: number) => number) => p.points.map((x) => `${X(x.price).toFixed(1)},${Y(f(x.total)).toFixed(1)}`).join(' ')
  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Payoff at expiration" className="block h-[150px] w-full">
        <polygon points={`0,${zY} ${path((v) => Math.max(0, v))} ${W},${zY}`} fill="color-mix(in oklch, var(--color-profit) 18%, transparent)" />
        <polygon points={`0,${zY} ${path((v) => Math.min(0, v))} ${W},${zY}`} fill="color-mix(in oklch, var(--color-loss) 18%, transparent)" />
        <line x1={0} y1={zY} x2={W} y2={zY} stroke="var(--sk-line2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {p.breakevens.map((b) => (
          <line key={b} x1={X(b)} y1={0} x2={X(b)} y2={H} stroke="var(--sk-warn)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ))}
        {p.spot != null ? (
          <line x1={X(Math.min(hi, p.spot))} y1={0} x2={X(Math.min(hi, p.spot))} y2={H} stroke="var(--sk-ticker)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ) : null}
        <polyline points={path((v) => v)} fill="none" stroke="var(--sk-ink)" strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between font-mono text-dense-micro text-muted-foreground">
        <span>0</span>
        <span>{(hi / 2).toFixed(0)}</span>
        <span>{hi.toFixed(0)}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 text-dense-micro text-muted-foreground">
        {p.spot != null ? (
          <span className="whitespace-nowrap">
            <span className="text-[var(--sk-ticker)]">│</span>{' '}
            {p.spotDate ? `spot at close ${p.spotDate}` : p.lastClose ? 'spot · last close' : 'spot now'} {p.spot.toFixed(2)}
          </span>
        ) : p.spotPending ? (
          <span>reading spot…</span>
        ) : (
          <span title="No quote now and no daily close on file for this name">no spot on file</span>
        )}
        <span>
          <span className="text-warning">┆</span> breakeven
        </span>
      </div>
    </div>
  )
}

function row(name: string, pt: PayoffPoint, withStock: boolean, forceTotal?: number) {
  const total = forceTotal ?? pt.total
  return { name, spot: pt.price.toFixed(2), opt: pt.options, stk: withStock ? pt.stock : null, total }
}

export function TradeRiskSection({
  payoffs,
  canCover,
  withShares,
  onWithShares,
  closed,
}: {
  payoffs: PayoffView[]
  canCover: boolean
  withShares: boolean
  onWithShares: (v: boolean) => void
  closed: boolean
}) {
  if (payoffs.length === 0) return null
  return (
    <div className="flex flex-col gap-2.5 mat-card px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-dense-body font-semibold">Risk at expiration</span>
        {canCover ? (
          <span className="ml-auto">
            <SegmentControl
              size="xs"
              ariaLabel="Coverage"
              value={withShares ? 'with' : 'only'}
              onChange={(v) => onWithShares(v === 'with')}
              options={[
                { value: 'with', label: 'With shares' },
                { value: 'only', label: 'Options only' },
              ]}
            />
          </span>
        ) : null}
      </div>
      {closed ? (
        <p className="m-0 text-dense-micro text-muted-foreground">
          The position as it was held. Covering shares are not drawn for a closed trade — stock legs are never
          attributed to a trade, so the shares it held then are not on record.
        </p>
      ) : null}
      {payoffs.map((p) => {
        const tag = riskTag(p)
        const withStock = p.shares != null
        const scen = [
          row('Max gain', p.maxGain, withStock),
          ...p.breakevens.slice(0, 2).map((b) => ({ name: 'Breakeven', spot: b.toFixed(2), opt: null, stk: null, total: 0 })),
          ...(p.spot != null
            ? [
                (() => {
                  const near = p.points.reduce((m, x) => (Math.abs(x.price - p.spot!) < Math.abs(m.price - p.spot!) ? x : m), p.points[0])
                  return { ...row(p.spotDate ? 'At close' : 'Spot now', near, withStock), spot: p.spot.toFixed(2) }
                })(),
              ]
            : []),
          p.lossUnbounded
            ? { name: 'Max loss', spot: '↑', opt: null, stk: null, total: null as number | null }
            : row('Max loss', p.maxLoss, withStock),
        ]
        return (
          <div key={p.root} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-dense-label">
              {payoffs.length > 1 ? (
                <span className="font-mono font-bold text-[var(--sk-ticker)]">{p.root}</span>
              ) : null}
              <DenseTag variant={tag.variant} size="cell">
                {tag.label}
              </DenseTag>
              <span className="text-[var(--sk-mute2)]">
                {p.credit >= 0 ? 'Net credit' : 'Net debit'}{' '}
                <span className="font-mono font-semibold text-foreground">{fmtUsd(Math.abs(p.credit))}</span>
              </span>
              <span className="text-[var(--sk-mute2)]">
                Breakeven{' '}
                <span className="font-mono font-semibold text-foreground">
                  {p.breakevens.length ? p.breakevens.map((b) => `$${b.toFixed(2)}`).join(' / ') : '—'}
                </span>
              </span>
              {p.shares ? (
                <span className="text-[var(--sk-mute2)]" title="The account's shares now, at their average cost now — not the shares held when the call was sold">
                  covered by{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {p.shares.qty} sh @ {p.shares.avgCost != null ? `$${p.shares.avgCost.toFixed(2)}` : '—'}
                  </span>{' '}
                  <span className="text-muted-foreground">(current cost)</span>
                </span>
              ) : null}
            </div>
            <Chart p={p} />
            <div className="overflow-x-auto">
              <table data-sr-table="" className="w-full">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th data-sr-col="num">Spot</th>
                    <th data-sr-col="num">Option</th>
                    <th data-sr-col="num">Stock</th>
                    <th data-sr-col="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {scen.map((s, i) => (
                    <tr key={`${s.name}-${i}`}>
                      <td className="font-semibold">{s.name}</td>
                      <td data-sr-col="num">{s.spot}</td>
                      <td data-sr-col="num" className={s.opt != null ? pnlColorClass(s.opt) : 'text-muted-foreground'}>
                        {s.opt != null ? fmtUsd(s.opt) : s.name === 'Max loss' ? 'unbounded' : '—'}
                      </td>
                      <td data-sr-col="num" className={s.stk != null ? pnlColorClass(s.stk) : 'text-muted-foreground'}>
                        {s.stk != null ? fmtUsd(s.stk) : '—'}
                      </td>
                      <td
                        data-sr-col="num"
                        className={cn(
                          'font-semibold',
                          s.total == null ? 'text-loss' : s.name === 'Breakeven' ? 'text-muted-foreground' : pnlColorClass(s.total),
                        )}
                      >
                        {s.total == null ? 'unbounded' : fmtUsd(s.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
