import { useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SymbolPicker } from '@/components/symbol'
import { ContextSnapshot } from '@/components/cockpit/ContextSnapshot'
import { FreshnessLampGrid } from '@/components/cockpit/FreshnessLampGrid'
import { useCockpitContext } from '@/hooks/useCockpitContext'

/**
 * Session context editor (Wave RS-UX6).
 *
 * Replaces the old `Context` tab, which was the third place showing the same
 * symbol/date — the Lab page header and the composer chip already had it.
 * "What am I asking about" belongs next to the input, so the chip itself is now
 * the trigger.  Data freshness moved in here too: it is context about what the
 * Copilot can see, not an "action".
 *
 * Changes still sync with ResearchContextBar on Lab pages (URL + sessionStorage).
 */
export function CopilotContextPopover({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ctx = useCockpitContext()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={6}
        className="z-[250] w-[min(22rem,calc(100vw-2rem))] space-y-3 p-3"
      >
        <div>
          <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Session context
          </p>
          <p className="mt-0.5 text-dense-micro leading-snug text-muted-foreground/80">
            Attached to every message. Syncs with the Lab page context bar.
          </p>
        </div>

        {ctx.hasSymbol ? (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <span className="text-dense-caption font-medium text-muted-foreground">
                  Symbol
                </span>
                <SymbolPicker
                  value={ctx.symbol}
                  onSelect={ctx.setSymbol}
                  className="w-28"
                  showPin
                />
              </div>
              <div className="space-y-1">
                <span className="text-dense-caption font-medium text-muted-foreground">
                  Date
                </span>
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
          </>
        ) : (
          <p className="text-dense-meta text-muted-foreground">
            No symbol in session — pick one on any Lab page or pin one from the rail.
          </p>
        )}

        <FreshnessLampGrid />
      </PopoverContent>
    </Popover>
  )
}
