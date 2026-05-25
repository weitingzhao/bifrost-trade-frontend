import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { fmtUsd, fmtExpiry, pnlColorClass } from '@/utils/positions'
import type { OpenOptionPosition } from '@/types/positions'

function fmtGreek(v: number | null | undefined): string {
  return v != null ? v.toFixed(4) : '—'
}

function fmtPct(v: number | null | undefined): string {
  return v != null ? `${(v * 100).toFixed(2)}%` : '—'
}

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-mono tabular-nums text-right', className)}>{value}</span>
    </div>
  )
}

interface Props {
  position: OpenOptionPosition
}

export function OptionInspectorPanel({ position: pos }: Props) {
  const right = pos.right === 'C' ? 'Call' : pos.right === 'P' ? 'Put' : pos.right
  const side = pos.qty > 0 ? 'Long' : pos.qty < 0 ? 'Short' : 'Flat'
  const premium = pos.avg_cost != null ? -(pos.qty * pos.avg_cost) : null
  const changePct =
    pos.mark_price != null && pos.avg_cost != null && pos.avg_cost !== 0
      ? ((pos.mark_price - pos.avg_cost) / pos.avg_cost) * 100
      : null

  // Try to get Greeks from underlying live position data
  const lp = pos.position
  const delta = lp ? (lp as unknown as Record<string, unknown>).delta as number | null : null
  const gamma = lp ? (lp as unknown as Record<string, unknown>).gamma as number | null : null
  const theta = lp ? (lp as unknown as Record<string, unknown>).theta as number | null : null
  const vega = lp ? (lp as unknown as Record<string, unknown>).vega as number | null : null
  const iv = lp ? (lp as unknown as Record<string, unknown>).impliedVol as number | null : null

  const hasGreeks = delta != null || gamma != null || theta != null || vega != null

  return (
    <div className="divide-y divide-border text-xs">
      {/* Contract */}
      <div className="p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract</p>
        <div className="space-y-0.5">
          <Row label="Underlying" value={pos.symbol} />
          <Row label="Type" value={right} />
          <Row label="Strike" value={fmtUsd(pos.strike)} />
          <Row label="Expiry" value={fmtExpiry(pos.expiry)} />
          <Row label="Side" value={
            <Badge variant={side === 'Long' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">{side}</Badge>
          } />
          <Row label="Pool" value={
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', pos.pool_label === 'On' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-yellow-500 text-yellow-600 dark:text-yellow-400')}
            >
              {pos.pool_label === 'On' ? 'On-track' : 'Off-track'}
            </Badge>
          } />
          <Row label="Account" value={pos.account_id} />
          <Row label="Contract Key" value={<span className="text-[10px] font-mono">{pos.contract_key}</span>} />
        </div>
      </div>

      {/* Position */}
      <div className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Position</p>
        <div className="space-y-0.5">
          <Row label="Qty (contracts)" value={pos.qty} />
          <Row label="Avg Cost / share" value={fmtUsd(pos.avg_cost)} />
          <Row label="Mark Price" value={fmtUsd(pos.mark_price)} />
          <Row label="Net Premium" value={fmtUsd(premium)} />
          {changePct != null && (
            <Row
              label="Mark vs Cost"
              value={`${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`}
              className={pnlColorClass(changePct)}
            />
          )}
          <Row
            label="Unrealized P&L"
            value={fmtUsd(pos.unrealized_pnl)}
            className={pnlColorClass(pos.unrealized_pnl)}
          />
        </div>
      </div>

      {/* Greeks (if available from IB live data) */}
      {hasGreeks && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Greeks (Live)</p>
          <div className="space-y-0.5">
            {iv != null && <Row label="IV" value={fmtPct(iv as number)} />}
            <Row label="Delta (Δ)" value={fmtGreek(delta)} />
            <Row label="Gamma (Γ)" value={fmtGreek(gamma)} />
            <Row label="Theta (θ)" value={fmtGreek(theta)} />
            <Row label="Vega (ν)" value={fmtGreek(vega)} />
          </div>
        </div>
      )}

      {/* Attribution */}
      {(pos.strategy_instance_id || pos.strategy_opportunity_name) && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attribution</p>
          <div className="space-y-0.5">
            {pos.strategy_instance_id && <Row label="Instance ID" value={`#${pos.strategy_instance_id}`} />}
            {pos.strategy_instance_label && <Row label="Label" value={pos.strategy_instance_label} />}
            {pos.strategy_opportunity_name && <Row label="Opportunity" value={pos.strategy_opportunity_name} />}
            {pos.attribution_type && <Row label="Attribution" value={pos.attribution_type} />}
            {pos.attribution_ratio != null && (
              <Row label="Ratio" value={`${(pos.attribution_ratio * 100).toFixed(0)}%`} />
            )}
          </div>
        </div>
      )}

      <Separator />
    </div>
  )
}
