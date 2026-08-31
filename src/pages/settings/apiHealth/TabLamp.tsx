import { useQueries } from '@tanstack/react-query'
import { StatusLamp } from '@/components/StatusLamp'
import { makeProbeQuery } from '@/hooks/useApiHealthProbes'
import type { ServiceDef } from '@/utils/apiHealthConfig'
import { apiHealthTabLampClass } from './apiHealthUi'
import { worstLamp } from '@/utils/apiHealthConfig'

export function TabLamp({ services }: { services: ServiceDef[] }) {
  const results = useQueries({ queries: services.map(makeProbeQuery) })
  const lamp = worstLamp(results.map((r) => (r.isPending ? 'yellow' : r.isError ? 'red' : 'green')))
  return <StatusLamp lamp={lamp} className={apiHealthTabLampClass} />
}
