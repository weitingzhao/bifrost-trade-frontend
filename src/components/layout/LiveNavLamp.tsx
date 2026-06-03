import { StatusLamp } from '@/components/StatusLamp'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { computeLiveNavLamp } from '@/utils/livePageLamps'

/** Small lamp beside sidebar Live link (Legacy live nav semantics). */
export function LiveNavLamp() {
  const { data: status } = useMonitorStatus()
  const daemonAlive = status?.daemon?.heartbeat?.daemon_alive === true
  const { color, title } = computeLiveNavLamp(status, daemonAlive)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0" tabIndex={0}>
          <StatusLamp lamp={color} variant="dot" className="h-2 w-2" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  )
}
