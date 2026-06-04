import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { CoverageOverviewSummaryBody } from '@/pages/settings/coverage/overview/CoverageOverviewSummaryBody'

export default function CoverageOverviewPage() {
  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Data Coverage — Overview"
        description="Aggregated coverage metrics: watchlist summary, Massive job queues, and global PostgreSQL tables."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/coverage/overview-detail">Per-symbol detail</Link>
          </Button>
        }
      />
      <CoverageOverviewSummaryBody />
    </PageShell>
  )
}
