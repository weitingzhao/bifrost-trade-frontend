import { useQuery } from '@tanstack/react-query'
import { fetchCopilotUsage } from '@/api/aiCopilot'
import { DenseTag } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'

export function AiUsageTile() {
  const q = useQuery({
    queryKey: ['research', 'copilot', 'usage'],
    queryFn: ({ signal }) => fetchCopilotUsage(signal),
    refetchInterval: 30_000,
    retry: 1,
  })

  if (q.isLoading) {
    return <Skeleton className="h-16 w-full" />
  }

  if (q.isError || !q.data) {
    return (
      <div className="rounded border border-border/50 bg-secondary/40 px-2 py-2">
        <p className="text-dense-label font-medium">AI Usage</p>
        <p className="text-dense-meta text-muted-foreground">Usage unavailable</p>
      </div>
    )
  }

  const { tokens_today, cost_estimate_usd, cap_usd, remaining_usd } = q.data
  const bridgeCount = q.data.bridge_count_today ?? 0
  const bridgeTokens = q.data.bridge_tokens_today ?? 0
  const breached = remaining_usd <= 0

  return (
    <div className="rounded border border-border/50 bg-secondary/40 px-2 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-dense-label font-medium">AI Usage</p>
        <DenseTag variant={breached ? 'danger' : 'success'}>
          {breached ? 'Cap hit' : 'OK'}
        </DenseTag>
      </div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-dense-meta">
        <dt className="text-muted-foreground">Tokens today</dt>
        <dd className="font-mono tabular-nums text-right">{tokens_today.toLocaleString()}</dd>
        <dt className="text-muted-foreground">Cost est.</dt>
        <dd className="font-mono tabular-nums text-right">${cost_estimate_usd.toFixed(4)}</dd>
        <dt className="text-muted-foreground">Daily cap</dt>
        <dd className="font-mono tabular-nums text-right">${cap_usd.toFixed(2)}</dd>
        <dt className="text-muted-foreground">Remaining</dt>
        <dd className="font-mono tabular-nums text-right">${remaining_usd.toFixed(4)}</dd>
        <dt className="text-muted-foreground">Bridge today</dt>
        <dd className="font-mono tabular-nums text-right">
          {bridgeCount} · {bridgeTokens.toLocaleString()} tok
        </dd>
      </dl>
      {breached ? (
        <p className="text-dense-caption text-destructive">Resets at 00:00 UTC</p>
      ) : null}
    </div>
  )
}
