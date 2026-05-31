import { PageHeader, PageShell } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'

export default function FeedMassiveOptionPage() {
  return (
    <PageShell>
      <PageHeader
        title="Massive — Option"
        description="Option chain snapshots, contracts reference, and options_massive workers."
      />
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Option chain ingest is driven from Research → Option Discovery and Celery
          options_massive queues. API health is on Settings → API (Massive tab).
        </CardContent>
      </Card>
    </PageShell>
  )
}
