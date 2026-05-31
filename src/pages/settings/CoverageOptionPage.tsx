import { PageHeader, PageShell } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function CoverageOptionPage() {
  return (
    <PageShell>
      <PageHeader
        title="Data Coverage — Option"
        description="Option coverage by expiry and strike (Massive DB + IB live)."
      />
      <Card>
        <CardContent className="py-6 space-y-3 text-sm text-muted-foreground">
          <p>Use Research → Option Discovery for chain coverage and snapshot loads.</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/research/discovery">Open Option Discovery</Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  )
}
