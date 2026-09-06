/**
 * Vol Regime — how volatility is priced for one symbol, in three views.
 * `/research/vol-regime?view=iv-rank|vrp|skew`
 */
import { LabHub, type LabViewDef } from '@/pages/research/analyze/hub/LabHub'
import { IvRankSection } from './IvRankSection'
import { SkewSection } from './SkewSection'
import { VrpSection } from './VrpSection'

const VIEWS: LabViewDef[] = [
  {
    id: 'iv-rank',
    label: 'IV Rank',
    description:
      'Underlying IV Rank regime for Benchmarks ∪ optionable Watchlist ∪ Holdings. Drill into Option Discovery for chain/structure. Observe-only (D10).',
    showDate: false,
    render: () => <IvRankSection />,
  },
  {
    id: 'vrp',
    label: 'IV−RV spread',
    description:
      'Volatility Risk Premium (IV − RV) percentile regime. Sell-vol edge when VRP high, buy-vol edge when VRP low. Observe-only (D10).',
    showDate: false,
    render: () => <VrpSection />,
  },
  {
    id: 'skew',
    label: 'Skew & surface',
    description:
      'Gatheral raw SVI fit per expiry. Surface term structure, per-strike residuals, and cross-symbol skew extremes. Observe-only (D10).',
    render: () => <SkewSection />,
  },
]

export default function VolRegimePage() {
  return <LabHub title="Vol Regime" views={VIEWS} defaultView="iv-rank" />
}
