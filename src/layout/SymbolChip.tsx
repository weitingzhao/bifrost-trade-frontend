/**
 * The symbol the shell is on, in the top bar.
 *
 * Solid means the page beneath is reading it. Dimmed means it is held — the
 * page ignores it, and it is waiting for the next one that does. Making that
 * difference visible is the whole point: a symbol shown at full strength on a
 * page that is not filtered by it is a lie the reader acts on.
 */
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSymbolContext } from '@/lib/symbolContext'

export function SymbolChip() {
  const { symbol, isScoped, clearSymbol } = useSymbolContext()
  if (!symbol) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'hidden items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-dense-micro sm:inline-flex',
            isScoped ? 'bg-secondary text-foreground' : 'text-muted-foreground opacity-55',
          )}
        >
          {symbol}
          <button
            type="button"
            onClick={clearSymbol}
            className="rounded-sm text-muted-foreground hover:text-foreground"
            aria-label={`Clear symbol ${symbol}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isScoped
          ? `This page is scoped to ${symbol}`
          : `${symbol} is held — not applied here; the next page that reads a symbol will use it`}
      </TooltipContent>
    </Tooltip>
  )
}
