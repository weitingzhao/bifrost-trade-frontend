import { PageHeader, PageShell } from '@/components/layout'
import { StockIbCoverageBody } from '@/pages/settings/coverage/stock/StockIbCoverageBody'

export default function CoverageStockIbPage() {
  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Data Coverage — Stock (Polygon)"
        description="Polygon-backed coverage of Watchlist stocks and reference indices. Pull and EOD enqueue Market Data Plugin ingest jobs."
      />
      <StockIbCoverageBody />
    </PageShell>
  )
}
