import { PageHeader, PageShell } from '@/components/layout'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StockIbCoverageBody } from '@/pages/settings/coverage/stock/StockIbCoverageBody'

export default function CoverageStockIbPage() {
  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Data Coverage — Stock (IB Live)"
        description="IB-backed coverage of Watchlist stocks and reference indices by bar period. Includes EOD pull and index refresh."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/coverage/stock-massive">Massive Delay (DB)</Link>
          </Button>
        }
      />
      <StockIbCoverageBody />
    </PageShell>
  )
}
