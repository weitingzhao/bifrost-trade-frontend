import { PageHeader, PageShell } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'

export default function FeedMassiveCommPage() {
  return (
    <PageShell>
      <PageHeader
        title="Massive — Common"
        description="Shared REST utilities (indicators, market status)."
      />
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Common Massive endpoints are shared across Research and data workers. Full inspector UI
          migration is pending; use API health and Celery audit for job activity.
        </CardContent>
      </Card>
    </PageShell>
  )
}
