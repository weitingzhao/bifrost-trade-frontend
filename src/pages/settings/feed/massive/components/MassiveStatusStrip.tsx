import { Card, CardContent } from '@/components/ui/card'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import { cn } from '@/lib/utils'

export function MassiveStatusStrip({
  massiveStatus,
}: {
  massiveStatus: MassiveStatusResponse | null | undefined
}) {
  const configured = Boolean(massiveStatus?.configured)

  return (
    <Card variant="elevated" className="py-3">
      <CardContent className="space-y-2 px-4 py-0">
        <div
          className="grid gap-4 sm:grid-cols-2 max-w-md"
          aria-label="Connection status"
        >
          <div className="space-y-0.5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              API
            </div>
            <div
              className={cn(
                'text-sm font-medium',
                configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
              )}
            >
              {configured ? 'Configured' : 'Not configured'}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tier
            </div>
            <div className="text-sm font-medium">{massiveStatus?.tier ?? '—'}</div>
          </div>
        </div>
        {massiveStatus?.delay_notice ? (
          <p className="text-xs text-muted-foreground">{massiveStatus.delay_notice}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
