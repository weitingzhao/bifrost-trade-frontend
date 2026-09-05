/**
 * The short-leg risk map in its panel, under the cockpit: every short leg as
 * days-to-expiry against cushion, with the tightness line drawn where it is
 * set. It sits with the gauges rather than the dashboard because it is a
 * picture of the Risk gauge, not of the base.
 */
import { ShortLegRiskMap } from './charts/ShortLegRiskMap'
import type { RiskMapLeg } from '@/utils/shortLegRiskMap'

interface Props {
  legs: RiskMapLeg[]
  tightPct: number
  activeExpiry: string | null
  onLegClick: (leg: RiskMapLeg) => void
  onExpiryClick: (expiry: string) => void
  onUnpricedClick: () => void
}

export function ShortLegsPanel({ legs, tightPct, activeExpiry, onLegClick, onExpiryClick, onUnpricedClick }: Props) {
  const unpriced = legs.filter((l) => l.cushionPct == null).length
  return (
    <section
      className="rounded-md border border-border bg-secondary/40 px-3 py-1.5"
      aria-label="Short legs against the tightness line"
    >
      <span className="mb-1 flex items-baseline justify-between text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Short legs — days to expiry against cushion</span>
        <span className="font-mono normal-case tracking-normal tabular-nums">
          {legs.length} legs
          {unpriced > 0 ? <span className="text-warning"> · {unpriced} unpriced</span> : null}
        </span>
      </span>
      <ShortLegRiskMap
        legs={legs}
        tightPct={tightPct}
        activeExpiry={activeExpiry}
        onLegClick={onLegClick}
        onExpiryClick={onExpiryClick}
        onUnpricedClick={onUnpricedClick}
      />
    </section>
  )
}
