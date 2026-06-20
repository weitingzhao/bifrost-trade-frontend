import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import type { StatusResponse } from '@/types/monitor'
import { EmptyState } from '@/components/data-display'

export interface MassiveStockDelayDbBodyProps {
  configured: boolean
  massiveStatus?: MassiveStatusResponse
  monitorStatus?: StatusResponse
}

/** Massive delay DB stock coverage — full migration pending (CI build stub). */
export function MassiveStockDelayDbBody({ configured }: MassiveStockDelayDbBodyProps) {
  return (
    <EmptyState
      title="Stock coverage (Massive)"
      description={
        configured
          ? 'Massive delay DB coverage migration in progress.'
          : 'Configure Massive API in Settings to enable delay DB coverage.'
      }
    />
  )
}
