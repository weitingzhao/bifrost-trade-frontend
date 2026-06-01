import { StatusLamp } from '@/components/StatusLamp'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCeleryHeaderMetrics } from '@/hooks/useCeleryHeaderMetrics'

/** Lamp + pending badge beside sidebar Celery link (Legacy Settings celery nav semantics). */
export function CeleryNavLamp() {
  const { lamp, pendingTotal, title } = useCeleryHeaderMetrics(true)
  const pendingLabel =
    pendingTotal != null
      ? pendingTotal > 99
        ? '99+'
        : String(pendingTotal)
      : null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 shrink-0 ml-auto" tabIndex={0}>
          <StatusLamp lamp={lamp} className="h-2 w-2" />
          {pendingLabel != null && pendingTotal != null && pendingTotal > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px] font-mono leading-none">
              {pendingLabel}
            </Badge>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  )
}
