import { PageHeader, PageShell } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'

export default function FeedMassiveStockPage() {
  return (
    <PageShell>
      <PageHeader
        title="Massive — Stock"
        description="Polygon stock REST, WebSocket, and OHLCV backfill (see Celery stocks_massive queues)."
      />
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Detailed stock feed panels are being migrated from Legacy. Use Operations → Celery for
          stocks_massive job queues and Settings → API for Massive service health.
        </CardContent>
      </Card>
    </PageShell>
  )
}
