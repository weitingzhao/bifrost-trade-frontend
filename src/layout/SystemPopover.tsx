/**
 * Everything that can be down, in one 340px panel.
 *
 * Design: `design/trade/_Shell TopBar.dc.html`, which hangs this off a System
 * button in the top bar. It hangs off the status bar's system lamp instead —
 * that lamp is already the always-on three-state reading, and a second one in
 * the top bar would be two lamps for one fact. The panel is the same: a row
 * per service, grouped, each row a way to the page that can say more.
 *
 * Rows are derived, never listed. The topology registry already knows every
 * service and which zone it belongs to, and `usePlatformPlugins` knows the Ops
 * plugins; a hand-written list here would be a second inventory to keep in
 * step with the map on `/system/topology`.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { HealthLamp } from '@bifrost/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useSystemTopologyHealth } from '@/hooks/useSystemTopologyHealth'
import { usePlatformPlugins } from '@/hooks/usePlatformPlugins'
import {
  DEFAULT_TOPOLOGY_LAYOUT_MODE,
  getTopologyLayout,
} from '@/components/topology/topologyLayouts'
import type { TopologyNodeHealth, TopologyZoneId } from '@/components/topology/topologyRegistry'

/** Where a row goes when you click it — the page that can say more than a lamp. */
const PAGE_FOR_KIND: Record<TopologyNodeHealth['kind'], string> = {
  api: '/system/api',
  socket: '/system/socket',
  daemon: '/system/daemon',
}

/** Zone order and labels come from the map, so the panel groups the way it draws. */
const ZONES = getTopologyLayout(DEFAULT_TOPOLOGY_LAYOUT_MODE).zones.map((z) => ({
  id: z.id as TopologyZoneId,
  label: z.label,
}))

const rowClass =
  'flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-muted/60'
const headClass =
  'px-2 pb-0.5 pt-2 text-dense-micro font-semibold uppercase tracking-[0.12em] text-muted-foreground/60'

function Row({ to, lamp, name, sub, meta, onNavigate }: {
  to: string
  lamp: string
  name: string
  sub?: string
  meta?: string
  onNavigate: () => void
}) {
  return (
    <Link to={to} onClick={onNavigate} className={rowClass}>
      <HealthLamp lamp={lamp} variant="dot" />
      <span className="min-w-0 flex-1 truncate text-dense-label">
        <span className="text-foreground">{name}</span>
        {sub ? <span className="text-muted-foreground"> {sub}</span> : null}
      </span>
      {meta ? (
        <span className="shrink-0 font-mono text-dense-micro tabular-nums text-muted-foreground/70">
          {meta}
        </span>
      ) : null}
    </Link>
  )
}

interface SystemPopoverProps {
  /** The status-bar segment that opens this — rendered as the trigger. */
  children: React.ReactNode
}

export function SystemPopover({ children }: SystemPopoverProps) {
  const [open, setOpen] = useState(false)
  // Both hooks share their query keys with the pages and the status bar, so
  // opening this costs no extra request; it only stops polling when closed.
  const { nodes, isLoading } = useSystemTopologyHealth(open)
  const { rows: plugins } = usePlatformPlugins(open)
  const close = () => setOpen(false)

  const byZone = new Map<TopologyZoneId, TopologyNodeHealth[]>()
  for (const node of nodes) {
    if (node.zoneId == null) continue
    const list = byZone.get(node.zoneId)
    if (list) list.push(node)
    else byZone.set(node.zoneId, [node])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-[340px] max-h-[min(70vh,560px)] overflow-y-auto p-1"
      >
        <div className="flex items-center gap-2 border-b border-border px-2 pb-1.5 pt-1">
          <span className="text-dense-label font-semibold">System</span>
          <span className="font-mono text-dense-micro text-muted-foreground/70">
            {isLoading ? 'probing…' : `${nodes.filter((n) => n.lamp === 'green').length}/${nodes.length} online`}
          </span>
        </div>

        {ZONES.map((zone) => {
          const zoneNodes = byZone.get(zone.id)
          if (!zoneNodes?.length) return null
          return (
            <div key={zone.id}>
              <p className={headClass}>{zone.label}</p>
              {zoneNodes.map((node) => (
                <Row
                  key={node.key}
                  to={PAGE_FOR_KIND[node.kind]}
                  lamp={node.lamp}
                  name={node.name}
                  sub={node.subtitle}
                  meta={node.ms != null ? `${node.ms}ms` : undefined}
                  onNavigate={close}
                />
              ))}
            </div>
          )
        })}

        {plugins.length > 0 && (
          <div>
            <p className={headClass}>Ops plugins</p>
            {plugins.map((row) => (
              <Row
                key={row.def.key}
                to="/system/platform"
                lamp={row.fetchError ? 'unknown' : row.lamp}
                name={row.def.label}
                meta={row.fetchError ? 'unreachable' : row.isLoading ? 'checking' : row.lamp}
                onNavigate={close}
              />
            ))}
          </div>
        )}

        <Link
          to="/system/topology"
          onClick={close}
          className={cn(rowClass, 'mt-1 border-t border-border pt-1.5 text-dense-label')}
        >
          <span className="flex-1">Topology</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </PopoverContent>
    </Popover>
  )
}
