import { EmptyState } from '@/components/data-display'
import { Input } from '@/components/ui/input'
import { SymbolPicker } from '@/components/symbol'
import { ContextSnapshot } from '@/components/cockpit/ContextSnapshot'
import { useCockpitContext } from '@/hooks/useCockpitContext'

export function ContextTab() {
  const ctx = useCockpitContext()

  if (!ctx.hasSymbol) {
    return (
      <EmptyState
        title="No symbol in session"
        description="Pick a symbol in any Lab page or pin one below."
        className="py-10"
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <span className="text-dense-caption font-medium text-muted-foreground">Symbol</span>
          <SymbolPicker
            value={ctx.symbol}
            onSelect={ctx.setSymbol}
            className="w-28"
            showPin
          />
        </div>
        <div className="space-y-1">
          <span className="text-dense-caption font-medium text-muted-foreground">Date</span>
          <Input
            type="date"
            value={ctx.dateInput}
            onChange={(e) => ctx.setDate(e.target.value)}
            className="h-7 w-36 font-mono text-sm"
          />
        </div>
      </div>

      <ContextSnapshot
        symbol={ctx.symbol}
        dateInput={ctx.dateInput}
        regimeTag={ctx.regimeTag}
        ivRank={ctx.ivRank}
        freshnessLamp={ctx.freshnessLamp}
        vrpTradeDate={ctx.vrpTradeDate}
        focusedHypothesisTitle={ctx.focusedHypothesis?.title ?? null}
      />

      <p className="text-dense-meta text-muted-foreground leading-snug">
        Changes sync with ResearchContextBar on Lab pages (URL + session storage).
      </p>
    </div>
  )
}
