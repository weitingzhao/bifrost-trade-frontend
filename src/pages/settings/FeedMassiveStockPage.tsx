import { PageHeader, PageShell } from '@/components/layout'
import { MassiveRefJobProvider } from '@/components/massive/MassiveRefJobProvider'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Badge } from '@/components/ui/badge'
import { MassiveStockStatusStrip } from '@/pages/settings/feed/massive/components/MassiveStockStatusStrip'
import { useMassiveFeedHashScroll } from '@/pages/settings/feed/massive/hooks/useMassiveFeedHashScroll'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import { MassiveStockFeedBody } from '@/pages/settings/feed/massive/stock/MassiveStockFeedBody'

const STOCK_PAGE_INFO =
  'Massive (Polygon) Stocks API coverage sheet and capability status. Shared REST (Technical Indicators, Market Operations) lives under Feed → Massive Common; corporate actions sync UI remains under Feed → Massive Option.'

export default function FeedMassiveStockPage() {
  useMassiveFeedHashScroll()
  const { data: massiveStatus } = useMassiveStatus()
  const configured = Boolean(massiveStatus?.configured)

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Massive — Stock
            <InfoTooltip text={STOCK_PAGE_INFO} />
          </span>
        }
        description="Polygon stock REST, WebSocket, and flat files capability probes."
        actions={
          configured ? (
            <Badge variant="secondary" title={massiveStatus?.delay_notice}>
              Delayed feed
            </Badge>
          ) : null
        }
      />
      <MassiveRefJobProvider>
        <MassiveStockStatusStrip massiveStatus={massiveStatus} />
        <MassiveStockFeedBody massiveStatus={massiveStatus} />
      </MassiveRefJobProvider>
    </PageShell>
  )
}
