import type { MassiveStatusResponse } from '@/api/massive'
import type { StatusResponse } from '@/api/monitor'
import { EmptyState } from '@/components/data-display'

export interface MassiveStockDelayDbBodyProps {
  configured: boolean
  massiveStatus?: MassiveStatusResponse
  monitorStatus?: StatusResponse
}

/** Massive delay DB stock coverage — full migration pending (CI build stub). */
export function MassiveStockDelayDbBody(_props: MassiveStockDelayDbBodyProps) {
  return (
    <EmptyState
      title="Stock coverage (Massive)"
      description="Massive delay DB coverage migration in progress."
    />
  )
}
