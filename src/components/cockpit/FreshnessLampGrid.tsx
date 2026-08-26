import { StatusLamp } from '@/components/StatusLamp'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCockpitFreshness } from '@/hooks/useCockpitFreshness'
import type { LampColor } from '@/lib/researchFreshness'

function LampRow({
  title,
  lamp,
  ts,
  label,
  isLoading,
}: {
  title: string
  lamp: LampColor
  ts: string | null
  label: string | null
  isLoading: boolean
}) {
  const tip = [
    label ? `Latest: ${label}` : 'No recent item',
    ts ? `At: ${ts}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/50 px-2.5 py-2">
          <StatusLamp lamp={isLoading ? 'gray' : lamp} className="h-2.5 w-2.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p className="truncate text-dense-meta text-foreground">
              {isLoading ? 'Loading…' : label ?? '—'}
            </p>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs text-dense-meta">
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

export function FreshnessLampGrid() {
  const f = useCockpitFreshness()
  return (
    <div className="space-y-1.5">
      <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
        Freshness
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        <LampRow
          title="Hypothesis"
          lamp={f.hypothesis.lamp}
          ts={f.hypothesis.ts}
          label={f.hypothesis.label}
          isLoading={f.hypothesis.isLoading}
        />
        <LampRow
          title="Backtest"
          lamp={f.backtest.lamp}
          ts={f.backtest.ts}
          label={f.backtest.label}
          isLoading={f.backtest.isLoading}
        />
        <LampRow
          title="Discovery"
          lamp={f.discovery.lamp}
          ts={f.discovery.ts}
          label={f.discovery.label}
          isLoading={f.discovery.isLoading}
        />
      </div>
    </div>
  )
}
