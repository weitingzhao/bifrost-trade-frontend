import { Link, useLocation } from 'react-router-dom'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import {
  copilotPersonaChipLabel,
  copilotVisiblePersona,
} from '@/lib/copilot/copilotVisiblePersona'
import { cn } from '@/lib/utils'

/** Title-bar readout. Opens Personas. Does not override the stream. */
export function CopilotPersonaChip({ className }: { className?: string }) {
  const { pathname } = useLocation()
  const { activeAgent } = useCopilotSession()
  const originPath =
    pathname && pathname !== '/' ? pathname : window.location.pathname
  const id = copilotVisiblePersona(activeAgent, originPath)
  if (!id) return null
  const label = copilotPersonaChipLabel(id)

  return (
    <Link
      to="/research/agent-personas"
      title="Open Personas — does not change who this stream calls"
      className={cn(
        'max-w-[7rem] truncate rounded-md px-1.5 py-0.5',
        'text-dense-caption text-muted-foreground hover:bg-secondary hover:text-foreground',
        className,
      )}
    >
      as {label}
    </Link>
  )
}
