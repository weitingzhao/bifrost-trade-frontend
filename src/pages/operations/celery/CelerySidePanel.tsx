import { CeleryBeatScheduleCard } from './CeleryBeatScheduleCard'
import { BrokerCard } from './BrokerCard'

export function CelerySidePanel() {
  return (
    <div className="space-y-3">
      <CeleryBeatScheduleCard />
      <BrokerCard />
    </div>
  )
}
