import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useMassiveFeedHashScroll } from '@/pages/settings/feed/massive/hooks/useMassiveFeedHashScroll'
import { useMassiveStatus } from '@/pages/settings/feed/massive/hooks/useMassiveStatus'
import { MassiveStockDelayDbBody } from '@/pages/settings/coverage/stock/MassiveStockDelayDbBody'

const PAGE_INFO =
  'Massive (Polygon) stocks: REST and synced reference data are delayed per vendor plan (~15 minutes). For realtime watchlist history and EOD bar pulls, use Data Coverage → Stock → IB Live (Redis).'

export default function CoverageStockMassivePage() {
  useMassiveFeedHashScroll()
  const { data: massiveStatus } = useMassiveStatus()
  const { data: monitorStatus } = useMonitorStatus()
  const configured = Boolean(massiveStatus?.configured)

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Data Coverage — Stock
            <span className="font-normal text-muted-foreground">/ Massive Delay (DB)</span>
            <InfoTooltip text={PAGE_INFO} />
          </span>
        }
        description="Massive delayed PostgreSQL reference, OHLC sync, and NYSE holidays."
        actions={
          configured ? (
            <Badge variant="secondary" title={massiveStatus?.delay_notice}>
              Delayed feed
            </Badge>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/coverage/stock-ib">IB Live (Redis)</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/feed/massive-stock">Massive Stock (API checklist)</Link>
        </Button>
      </div>

      <MassiveStockDelayDbBody
        configured={configured}
        massiveStatus={massiveStatus}
        monitorStatus={monitorStatus}
      />
    </PageShell>
  )
}
