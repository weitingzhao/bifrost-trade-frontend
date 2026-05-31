import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function CoverageStockIbPage() {
  return (
    <PageShell>
      <PageHeader
        title="Data Coverage — Stock (IB Live)"
        description="IB real-time Redis stock coverage."
      />
      <Button variant="outline" size="sm" asChild>
        <Link to="/settings/socket">IB ingest on Socket page</Link>
      </Button>
    </PageShell>
  )
}
