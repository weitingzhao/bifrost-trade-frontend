/**
 * Dealer Levels — where the dealers sit for one symbol, in two views.
 * `/research/dealer-levels?view=gex|opex`
 */
import { LabHub, type LabViewDef } from '@/pages/research/analyze/hub/LabHub'
import { GexSection } from './GexSection'
import { OpexSection } from './OpexSection'

const VIEWS: LabViewDef[] = [
  {
    id: 'gex',
    label: 'Gamma levels',
    description:
      'OI-GEX (solid) vs Volume-GEX (inner bar) by strike · pick a snapshot row or scroll timeline',
    padding: 'compact',
    render: () => <GexSection />,
  },
  {
    id: 'opex',
    label: 'OpEx cycle',
    description:
      'Third-Friday OpEx cycle — dealer Vanna & Charm, per-strike exposure map, and historical pin-risk. Observe-only (D10).',
    render: () => <OpexSection />,
  },
]

export default function DealerLevelsPage() {
  return <LabHub title="Dealer Levels" views={VIEWS} defaultView="gex" />
}
