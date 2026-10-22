import { SymbolListEditor } from '@/components/symbol/SymbolListEditor'
import { cn } from '@/lib/utils'
import { RailPanel } from './OptionScreenerRail'
import type { ScreenerSource } from './useScreenerSources'

const DOT: Record<string, string> = {
  scan: 'bg-warning',
  explorer: 'bg-primary',
  book: 'bg-[var(--sk-line2)]',
  watch: 'bg-[var(--sk-line2)]',
}

export function OptionScreenerSources({
  sources,
  activeId,
  symbols,
  onPickSource,
  onDrop,
  onAdd,
}: {
  sources: readonly ScreenerSource[]
  activeId: string | null
  symbols: readonly string[]
  onPickSource: (source: ScreenerSource) => void
  onDrop: (symbol: string) => void
  onAdd: (symbols: string[]) => void
}) {
  return (
    <RailPanel
      step={1}
      title="Underlyings"
      aside={<span className="text-dense-body font-semibold">{symbols.length} selected</span>}
    >
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {sources.map((s) => {
          const dead = s.symbols == null
          const n = s.symbols?.length ?? 0
          return (
            <button
              key={s.id}
              type="button"
              disabled={dead}
              title={s.absent ?? `Add ${n} names from this list; keep existing symbols`}
              onClick={() => onPickSource(s)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-dense-meta',
                dead
                  ? 'cursor-not-allowed border-dashed border-border text-muted-foreground/60'
                  : activeId === s.id
                    ? 'border-primary/60 bg-primary/[0.05]'
                    : 'border-border hover:bg-secondary/60',
              )}
            >
              <span className={cn('size-2 shrink-0 rounded-full', dead ? 'bg-muted' : DOT[s.id])} />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="shrink-0 font-mono text-dense-caption tabular-nums text-muted-foreground">
                {dead ? 'no store' : n}
              </span>
            </button>
          )
        })}
        <SymbolListEditor symbols={symbols} onChange={(next) => {
          const removed = symbols.find((symbol) => !next.includes(symbol))
          if (removed) onDrop(removed)
          else onAdd(next.filter((symbol) => !symbols.includes(symbol)))
        }} />
      </div>
    </RailPanel>
  )
}
