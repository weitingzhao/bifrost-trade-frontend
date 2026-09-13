import type { ReactNode } from 'react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { MarketDataPluginStatus } from '@/types/optionDiscovery'
import { DiscoveryHint } from './DiscoveryHint'

const INFO_TEXT =
  'Option Discovery: choose underlying (from Watchlist STK with Option? on) and expiration. Expirations and quotes use Polygon delayed snapshot sync (Market Data Plugin) + PostgreSQL.'

/**
 * The chain's own status chips — what the feed is and what tier it is on.
 *
 * This was a `PageHeader` with a breadcrumb and an "Option Discovery" title,
 * from when the chain was its own page. It is the Symbol page's Chain tab now,
 * and the shell already carries the breadcrumb and the name; a second title
 * inside the body just said the same thing again. What is left is the part
 * only this tab knows: which feed, how delayed, and what the tier withholds.
 */
export function DiscoveryPageHeader({
  pluginStatus,
  extraActions,
}: {
  pluginStatus: MarketDataPluginStatus | null
  extraActions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
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
    </div>
  )
}
