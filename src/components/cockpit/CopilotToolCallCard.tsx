import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CopilotSourceLink } from '@/components/cockpit/CopilotSourceLink'
import { ToolResultView } from '@/components/cockpit/ToolResultView'
import { getToolMeta, categoryLabel } from '@/lib/cockpit/toolMeta'
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

/**
 * Tool call chip inside an assistant bubble.  Header shows the tool's
 * friendly Chinese title + category tag; expanded body delegates to
 * `ToolResultView` for the humanized summary (RS-KB QA follow-up — no
 * more raw JSON dumps as the primary view).
 */
export function CopilotToolCallCard({ call }: { call: CopilotToolCall }) {
  const [open, setOpen] = useState(call.status === 'pending')
  const symbol = pickSymbol(call.arguments, call.result)
  const meta = getToolMeta(call.name)

  const hasArgs = Object.keys(call.arguments ?? {}).length > 0

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded border border-border/50 bg-background/80"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-secondary/40">
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
        <Wrench className="size-3 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-dense-meta font-medium text-foreground">
              {meta.title}
            </span>
            <span className="shrink-0 rounded-full border border-border/60 bg-secondary px-1.5 py-0 text-dense-caption text-muted-foreground">
              {categoryLabel(meta.category)}
            </span>
          </div>
          <div className="truncate text-dense-caption text-muted-foreground/80 font-mono">
            {call.name}
          </div>
        </div>
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
      <CollapsibleContent className="border-t border-border/40 px-2 py-1.5 space-y-2">
        <div className="flex flex-wrap gap-1">
          <CopilotSourceLink toolName={call.name} symbol={symbol} />
        </div>
        {hasArgs ? (
          <details className="rounded border border-border/30 bg-secondary/20 px-2 py-1">
            <summary className="cursor-pointer text-dense-caption text-muted-foreground hover:text-foreground">
              调用参数
            </summary>
            <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap break-all text-dense-caption text-foreground/80 font-mono">
              {JSON.stringify(call.arguments, null, 2)}
            </pre>
          </details>
        ) : null}
        {call.result != null ? (
          <ToolResultView toolName={call.name} result={call.result} />
        ) : call.status === 'pending' ? (
          <p className="text-dense-caption text-muted-foreground">调用中…</p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
