import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { fmtUsd } from '@/utils/positions'
import { formatRiskLabel } from '@/utils/riskProfile'
import type { RiskProfile } from '@/types/positions'

interface Props {
  profile: RiskProfile
}

export function RiskProfileSummary({ profile }: Props) {
  const rl = formatRiskLabel(profile)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div>
        <span className="text-muted-foreground">Risk type</span>
        <div className="mt-0.5">
          <Badge
            variant={profile.risk_type === 'defined' ? 'default' : 'destructive'}
            className="text-[10px]"
          >
            {profile.risk_type === 'defined' ? 'Defined' : profile.risk_type === 'unlimited' ? 'Unlimited' : 'Unknown'}
          </Badge>
        </div>
      </div>
      <div>
        <span className="text-muted-foreground">Max gain</span>
        <p className={cn('font-mono font-semibold mt-0.5', profile.max_gain != null && profile.max_gain > 0 ? 'text-profit' : '')}>
          {profile.max_gain != null ? fmtUsd(profile.max_gain) : '∞'}
        </p>
      </div>
      <div>
        <span className="text-muted-foreground">Max loss</span>
        <p className={cn('font-mono font-semibold mt-0.5', profile.max_loss != null && profile.max_loss < 0 ? 'text-loss' : '')}>
          {profile.max_loss != null ? fmtUsd(profile.max_loss) : '∞'}
        </p>
      </div>
      <div>
        <span className="text-muted-foreground">Breakeven</span>
        <p className="font-mono mt-0.5">
          {profile.breakeven_prices.length > 0
            ? profile.breakeven_prices.map((p) => fmtUsd(p)).join(', ')
            : '—'}
        </p>
      </div>
      {profile.naked_short_call_contracts > 0 && (
        <p className="col-span-full text-[10px] text-muted-foreground">
          {rl.lossLabel === 'Unlimited' ? 'Includes naked short call tail beyond hedge.' : ''}
        </p>
      )}
    </div>
  )
}
