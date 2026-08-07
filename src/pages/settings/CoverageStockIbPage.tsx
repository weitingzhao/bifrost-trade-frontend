import { PageHeader, PageShell } from '@/components/layout'
import { StockIbCoverageBody } from '@/pages/settings/coverage/stock/StockIbCoverageBody'

export default function CoverageStockIbPage() {
  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Data Coverage — Stock (IB Live)"
        description="IB-backed coverage of Watchlist stocks and reference indices by bar period. Includes EOD pull and index refresh."
      />
      <StockIbCoverageBody />
    </PageShell>
  )
}
