import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { TraceEvent } from '@/hooks/useCopilotSession'
import { ChevronDown } from 'lucide-react'

/**
 * Collapsed-header summary (program research-copilot-reach P3).
 *
 * The old header read `Trace (89 events)` — and most of those 89 were `token`
 * heartbeats emitted every 500ms while streaming. The number was large, alarming
 * and told the user nothing. Summarize what they actually care about: how many
 * tools ran, whether a specialist agent was handed off to, and how long it took.
 *
 * Cost is deliberately absent — `TraceEvent` carries no token/price field and
 * `/usage` is a daily aggregate, not per-turn. Better to omit than to invent.
 */
function summarizeTrace(events: TraceEvent[]): string {
  const tools = events.filter((e) => e.kind.startsWith('tool:')).length
  const handoffs = events.filter((e) => e.kind.startsWith('handoff:')).length

  const times = events.map((e) => e.at).filter((n) => Number.isFinite(n))
  const last = events[events.length - 1]
  const spanMs =
    times.length > 0 ? Math.max(...times) + (last?.durationMs ?? 0) - Math.min(...times) : 0

  const parts: string[] = []
  parts.push(tools === 1 ? '1 tool' : `${tools} tools`)
  if (handoffs > 0) parts.push(handoffs === 1 ? '1 handoff' : `${handoffs} handoffs`)
  if (spanMs >= 100) parts.push(spanMs >= 1000 ? `${(spanMs / 1000).toFixed(1)}s` : `${spanMs}ms`)

  return `Trace · ${parts.join(' · ')}`
}

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
        {summarizeTrace(events)}
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
