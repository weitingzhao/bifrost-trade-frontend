import { CopilotContextPopover } from '@/components/cockpit/CopilotContextPopover'
import { alreadyKnowsChips } from '@/lib/copilot/alreadyKnowsChips'
import { useCopilotView } from '@/store/copilotViewStore'

/** Empty-state readout of the same context the composer chip carries. */
export function CopilotAlreadyKnows() {
  const { view, suppressed } = useCopilotView()
  const chips = alreadyKnowsChips(view, suppressed)

  return (
    <div className="flex flex-col gap-1">
      <p className="text-dense-micro uppercase tracking-wide text-muted-foreground">
        It already knows
      </p>
      <div className="flex flex-wrap gap-1">
        {chips.map((c) => (
          <span
            key={`${c.k}:${c.v}`}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-secondary/70 px-1.5 py-0.5 text-dense-caption"
          >
            <span className="text-muted-foreground">{c.k}</span>
            <span className="truncate text-foreground">{c.v}</span>
          </span>
        ))}
        <CopilotContextPopover>
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-dashed border-border/60 px-1.5 py-0.5 text-dense-caption text-muted-foreground hover:text-foreground"
            title="Set session context"
          >
            +
          </button>
        </CopilotContextPopover>
      </div>
    </div>
  )
}
