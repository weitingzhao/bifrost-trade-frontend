import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function FeedIbPage() {
  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Feed — Interactive Brokers"
        description="IB stock ingest, account agent, and market data paths."
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/socket">Socket &amp; ingest</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings/subscribe">Subscribe &amp; streams</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  )
}
