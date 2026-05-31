import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function CoverageStockMassivePage() {
  return (
    <PageShell>
      <PageHeader
        title="Data Coverage — Stock (Massive)"
        description="Massive delayed DB stock OHLCV coverage."
      />
      <Button variant="outline" size="sm" asChild>
        <Link to="/research/stock-data">Stock data readiness</Link>
      </Button>
    </PageShell>
  )
}
