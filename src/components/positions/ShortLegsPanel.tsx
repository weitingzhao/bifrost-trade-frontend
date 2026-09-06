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
  // The map prints its own leg and unpriced counts (the unpriced one is a link);
  // the panel adds only the title.
  return (
    <section
      className="rounded-md border border-border bg-secondary/40 px-3 py-1.5"
      aria-label="Short legs against the tightness line"
    >
      <span className="mb-1 block text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
        Short legs — days to expiry against cushion
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
