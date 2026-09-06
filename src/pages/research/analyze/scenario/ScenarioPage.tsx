/**
 * Scenario Model — what the model expects for one symbol, in three views.
 * `/research/scenario?view=model|sessions|playbook`
 */
import { LabHub, type LabViewDef } from '@/pages/research/analyze/hub/LabHub'
import { ModelSection } from './ModelSection'
import { PlaybookSection } from './PlaybookSection'
import { SessionsSection } from './SessionsSection'

const VIEWS: LabViewDef[] = [
  {
    id: 'model',
    label: 'Analysis model',
    description:
      'Terrain regime, close expectation and the gamma zone for one symbol. Observe-only (D10).',
    showDate: false,
    render: () => <ModelSection />,
  },
  {
    id: 'sessions',
    label: 'Forecast sessions',
    description:
      'Forecast sessions and how their paths settled — trust a path only after its hit-rate has earned it.',
    padding: 'compact',
    render: () => <SessionsSection />,
  },
  {
    id: 'playbook',
    label: 'Intraday playbook',
    description: 'Scenario fan, LIVE bias, and path transitions — observe only (D10)',
    render: () => <PlaybookSection />,
  },
]

export default function ScenarioPage() {
  return <LabHub title="Scenario Model" views={VIEWS} defaultView="model" />
}
