import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/button'
import { DataOverviewDetailBody } from '@/pages/settings/coverage/overview/DataOverviewDetailBody'

const PAGE_INFO =
  'Per-symbol watchlist matrix, table focus chips, Compare / Check tools, and option coverage jobs. Aggregates and global coverage are on Data Overview → Summary.'

export default function CoverageOverviewDetailPage() {
  return (
    <PageShell className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Data Coverage — Overview
            <span className="font-normal text-muted-foreground">/ Detail</span>
            <InfoTooltip text={PAGE_INFO} />
          </span>
        }
        description="Watchlist matrix and Massive coverage jobs."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/coverage/overview">Overview summary</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/coverage/option">Option coverage</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/feed/massive-stock">Massive Stock feed</Link>
        </Button>
      </div>

      <DataOverviewDetailBody />
    </PageShell>
  )
}
