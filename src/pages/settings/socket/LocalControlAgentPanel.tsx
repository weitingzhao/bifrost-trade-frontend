import { StatusLamp } from '@/components/StatusLamp'
import type { OpsHealthResponse } from '@/api/ops'
import { localControlAgentLamp } from '@/utils/socketIngestLamp'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { socketSectionTitleClass } from './socketIngestUi'

export function LocalControlAgentPanel({ opsHealth }: { opsHealth: OpsHealthResponse | undefined }) {
  const lamp = localControlAgentLamp(opsHealth?.agent_reachable)
  const socketPath = (opsHealth?.agent_socket ?? '').trim()

  let detail: string
  if (opsHealth?.agent_reachable === true) {
    detail =
      'Reachable. Ingest start/stop below is delegated through this socket (systemd on the host).'
  } else if (opsHealth?.agent_reachable === false) {
    detail = opsHealth?.agent_error?.trim()
      ? opsHealth.agent_error
      : 'Unreachable — check bifrost-agent.service, socket permissions, and sudoers.'
  } else {
    detail =
      'Reachability not reported (upgrade Ops or inspect GET /ops/health). Ingest rows may show unknown until the agent answers.'
  }

  return (
    <section aria-labelledby="local-control-agent-heading">
      <h2
        id="local-control-agent-heading"
        className={`${socketSectionTitleClass} flex items-center gap-2 mb-2`}
      >
        <StatusLamp lamp={lamp} className="h-2.5 w-2.5" />
        Local Control Agent
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Separate systemd proxy (bifrost-agent) over a Unix socket. If red, ingest control via Ops will fail even when units exist.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h2>
      <p className="text-sm text-muted-foreground mt-2 mb-2">{detail}</p>
      {socketPath ? (
        <p className="text-sm text-muted-foreground">
          Socket: <code className="font-mono text-xs">{socketPath}</code>
        </p>
      ) : null}
    </section>
  )
}
