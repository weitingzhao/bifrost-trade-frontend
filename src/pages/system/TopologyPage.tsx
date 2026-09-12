import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader, PageShell } from '@/components/layout'
import { useSystemTopologyHealth } from '@/hooks/useSystemTopologyHealth'
import { ServiceTopologyOverview } from '@/components/topology/ServiceTopologyOverview'

/**
 * The service map, as a page.
 *
 * It used to be a panel that rose from the bottom of whatever you were looking
 * at, resizable by drag, summonable from a sidebar icon. That shape cost it
 * height it needed and put an ops surface underneath a trading one. Nothing was
 * lost moving it here: `ServiceTopologyOverview` already had a page mode — the
 * dock was the special case, passing `embedded`.
 */
export default function TopologyPage() {
  const { nodes, alertCount, isLoading, refetch } = useSystemTopologyHealth(true)

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Topology"
        titleSize="large"
        description={
          isLoading
            ? 'Probing every service this frontend depends on…'
            : alertCount > 0
              ? `${alertCount} service${alertCount > 1 ? 's' : ''} not answering`
              : 'Every probed service answered'
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0 gap-1.5">
            <RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Re-probe
          </Button>
        }
      />
      <ServiceTopologyOverview nodes={nodes} />
    </PageShell>
  )
}
