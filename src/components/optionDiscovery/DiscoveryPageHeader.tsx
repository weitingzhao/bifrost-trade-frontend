import type { ReactNode } from 'react'
import { PageHeader } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useDiscoveryNav } from '@/hooks/useDiscoveryNav'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import { DiscoveryHint } from './DiscoveryHint'

const INFO_TEXT =
  'Option Discovery: choose underlying (from Watchlist STK with Option? on) and expiration. Expirations and quotes use Massive delayed snapshot sync + PostgreSQL.'

export function DiscoveryPageHeader({
  massiveStatus,
  extraActions,
}: {
  massiveStatus: MassiveStatusResponse | null
  extraActions?: ReactNode
}) {
  const { goToScreener } = useDiscoveryNav()

  return (
    <PageHeader
      breadcrumb={
        <p className="text-xs font-medium">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={goToScreener}
            aria-label="Research home"
          >
            Research
          </button>
          <span className="text-muted-foreground"> / Option Discovery</span>
        </p>
      }
      title="Option Discovery"
      actions={
        <>
          <InfoTooltip text={INFO_TEXT} />
          {massiveStatus?.configured && (
            <DiscoveryHint
              as="span"
              className="mt-0 font-semibold"
              title={massiveStatus.delay_notice}
            >
              Massive · 15 min delayed
            </DiscoveryHint>
          )}
          {massiveStatus?.configured && massiveStatus && !massiveStatus.trades_enabled && (
            <InfoTooltip text="Tape (last trades) is not available on this tier. Enable trades in Massive config for Developer." />
          )}
          {extraActions}
        </>
      }
    />
  )
}
