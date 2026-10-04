/**
 * The symbol the shell is on, in the top bar.
 *
 * Solid means the page beneath is reading it. Dimmed means it is held — the
 * page ignores it, and it is waiting for the next one that does. Making that
 * difference visible is the whole point: a symbol shown at full strength on a
 * page that is not filtered by it is a lie the reader acts on.
 */
import { cn } from '@/lib/utils'
import { CloseButton } from '@/components/data-display/CloseButton'
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
            'hidden items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-dense-micro sm:inline-flex',
            isScoped
              ? 'bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] text-foreground'
              : 'bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] text-muted-foreground opacity-55',
          )}
        >
          {symbol}
          <CloseButton size="sm" onClick={clearSymbol} label={`Clear symbol ${symbol}`} />
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
