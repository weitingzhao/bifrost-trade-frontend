import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CopilotSourceLink } from '@/components/cockpit/CopilotSourceLink'
import type { CopilotToolCall } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'

function pickSymbol(args: Record<string, unknown>, result: unknown): string | undefined {
  if (typeof args.symbol === 'string' && args.symbol.trim()) return args.symbol.trim().toUpperCase()
  const data = (result as { data?: { symbol?: string; rows?: { symbols?: string[] }[] } })?.data
  if (typeof data?.symbol === 'string') return data.symbol
  const first = data?.rows?.[0] as { symbols?: string[]; symbol?: string } | undefined
  if (typeof first?.symbol === 'string') return first.symbol
  if (Array.isArray(first?.symbols) && first.symbols[0]) return String(first.symbols[0])
  return undefined
}

export function CopilotToolCallCard({ call }: { call: CopilotToolCall }) {
  const [open, setOpen] = useState(call.status === 'pending')
  const symbol = pickSymbol(call.arguments, call.result)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded border border-border/50 bg-background/80">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-secondary/40">
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
        <Wrench className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-dense-meta font-mono">{call.name}</span>
        <span
          className={cn(
            'shrink-0 text-dense-caption uppercase',
            call.status === 'pending' && 'text-warning',
            call.status === 'done' && 'text-success',
            call.status === 'error' && 'text-destructive',
          )}
        >
          {call.status}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/40 px-2 py-1.5 space-y-1.5">
        <div className="flex flex-wrap gap-1">
          <CopilotSourceLink toolName={call.name} symbol={symbol} />
        </div>
        <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all text-dense-caption text-muted-foreground font-mono">
          {JSON.stringify(call.arguments, null, 0)}
        </pre>
        {call.result != null && (
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-dense-caption font-mono">
            {JSON.stringify(call.result, null, 2).slice(0, 2000)}
          </pre>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
