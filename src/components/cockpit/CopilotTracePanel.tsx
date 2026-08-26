import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { TraceEvent } from '@/hooks/useCopilotSession'
import { ChevronDown } from 'lucide-react'

export function CopilotTracePanel({
  events,
  collapsed,
  onCollapsedChange,
}: {
  events: TraceEvent[]
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
}) {
  if (events.length === 0) return null

  return (
    <Collapsible open={!collapsed} onOpenChange={(open) => onCollapsedChange(!open)}>
      <CollapsibleTrigger className="flex w-full items-center gap-1 rounded border border-border/50 px-2 py-1 text-dense-caption text-muted-foreground hover:bg-secondary/50">
        <ChevronDown className={cn('size-3 transition-transform', !collapsed && 'rotate-180')} />
        Trace ({events.length} events)
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto rounded border border-border/40 bg-background/80 p-1.5">
          {events.map((ev) => (
            <li
              key={ev.id}
              className={cn(
                'flex items-center justify-between gap-2 font-mono text-dense-caption',
                (ev.durationMs ?? 0) > 2000 && 'text-warning',
              )}
            >
              <span>{ev.kind}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {ev.durationMs != null ? `${ev.durationMs}ms` : '…'}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
