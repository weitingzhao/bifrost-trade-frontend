import { Link, useLocation } from 'react-router-dom'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import {
  copilotPersonaChipSource,
  copilotPersonaChipText,
  copilotVisiblePersona,
} from '@/lib/copilot/copilotVisiblePersona'
import { threadPersona } from '@/lib/copilot/threadPersona'
import { cn } from '@/lib/utils'

/** Title-bar readout. Opens Personas. Does not override the stream. */
export function CopilotPersonaChip({ className }: { className?: string }) {
  const { pathname } = useLocation()
  const { activeAgent, messages } = useCopilotSession()
  // Who answered the thread on screen, when nothing is streaming — the same
  // rule the Threads table's PERSONA column reads.
  const answered = threadPersona(messages)?.[0] ?? null
  const originPath =
    pathname && pathname !== '/' ? pathname : window.location.pathname
  const id = copilotVisiblePersona(activeAgent, originPath, answered)
  if (!id) return null
  const source = copilotPersonaChipSource(activeAgent, answered) ?? 'default'
  const label = copilotPersonaChipText(id, source)

  return (
    <Link
      to="/research/agent-personas"
      title={
        source === 'triage'
          ? 'Triage assigned this agent. Opens Personas — does not change who this stream calls'
          : source === 'answered'
            ? 'Who answered this thread. Opens Personas — does not change who this stream calls'
            : 'Default for this page until triage answers. Opens Personas — does not change who this stream calls'
      }
      className={cn(
        'max-w-[9rem] truncate rounded-md px-1.5 py-0.5',
        'text-dense-caption hover:bg-secondary hover:text-foreground',
        source === 'default' ? 'text-muted-foreground' : 'text-foreground',
        className,
      )}
    >
      {label}
    </Link>
  )
}
