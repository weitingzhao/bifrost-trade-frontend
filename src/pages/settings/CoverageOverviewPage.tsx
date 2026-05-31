import { PageHeader, PageShell } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { Skeleton } from '@/components/ui/skeleton'

export default function CoverageOverviewPage() {
  const { data: status, isLoading } = useMonitorStatus()
  const watchlist = status?.live_ui?.subscribed_tickers?.length ?? 0
  const positions = (status?.portfolio?.accounts ?? []).reduce(
    (n, a) => n + (a.positions?.length ?? 0),
    0,
  )

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Data Coverage — Overview"
        description="Aggregated coverage metrics across watchlist and live positions."
      />
      {isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Watchlist symbols</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold font-mono">{watchlist}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">IB positions (monitor)</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold font-mono">{positions}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detail matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/coverage/overview-detail">Per-symbol coverage</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  )
}
