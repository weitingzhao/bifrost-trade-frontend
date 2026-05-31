import { PageHeader, PageShell } from '@/components/layout'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default function CoverageOverviewDetailPage() {
  const { data: status, isLoading } = useMonitorStatus()
  const items = status?.live_ui?.subscribed_tickers ?? []

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Data Coverage — Detail"
        description="Per-symbol subscription list from daemon live UI state."
      />
      {isLoading ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground text-sm">No subscribed tickers in status.</TableCell>
                </TableRow>
              ) : (
                items.map(sym => (
                  <TableRow key={sym}>
                    <TableCell className="font-mono text-sm">{sym}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </PageShell>
  )
}
