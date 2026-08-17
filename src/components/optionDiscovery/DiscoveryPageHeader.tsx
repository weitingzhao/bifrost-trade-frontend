import type { ReactNode } from 'react'
import { PageHeader } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useDiscoveryNav } from '@/hooks/useDiscoveryNav'
import type { MarketDataPluginStatus } from '@/types/optionDiscovery'
import { DiscoveryHint } from './DiscoveryHint'

const INFO_TEXT =
  'Option Discovery: choose underlying (from Watchlist STK with Option? on) and expiration. Expirations and quotes use Polygon delayed snapshot sync (Market Data Plugin) + PostgreSQL.'

export function DiscoveryPageHeader({
  pluginStatus,
  extraActions,
}: {
  pluginStatus: MarketDataPluginStatus | null
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
          {pluginStatus?.configured && (
            <DiscoveryHint
              as="span"
              className="mt-0 font-semibold"
              title={pluginStatus.delay_notice}
            >
              Polygon · 15 min delayed
            </DiscoveryHint>
          )}
          {pluginStatus?.configured && pluginStatus && !pluginStatus.trades_enabled && (
            <InfoTooltip text="Tape (last trades) is not available on this tier. Enable trades in Market Data Plugin / Polygon config for Developer." />
          )}
          {extraActions}
        </>
      }
    />
  )
}
