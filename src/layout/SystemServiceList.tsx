/**
 * Everything that can be down, in one 340px panel.
 *
 * Since Rev .60 it is the System half of the menu bar's Control Center
 * (`menubar/ControlCenter.tsx`): the status pill it used to hang off retired
 * into the top bar. A row per service, grouped, each a way to the page that
 * can say more.
 *
 * Rows are derived, never listed. The topology registry already knows every
 * service and which zone it belongs to, and `usePlatformPlugins` knows the Ops
 * plugins; a hand-written list here would be a second inventory.
 *
 * Since the Runtime pages retired (Owner 2026-09-25), a row opens the Ops
 * Console view that can say more — diagnosis is the control plane's — and the
 * foot of the panel opens System Status, the trader's own reading.
 */
import { HealthLamp } from '@bifrost/ui'
import { opsConsoleHref } from '@/lib/opsConsole'
import { useSystemTopologyHealth } from '@/hooks/useSystemTopologyHealth'
import { usePlatformPlugins } from '@/hooks/usePlatformPlugins'
import {
  DEFAULT_TOPOLOGY_LAYOUT_MODE,
  getTopologyLayout,
} from '@/components/topology/topologyLayouts'
import type { TopologyNodeHealth, TopologyZoneId } from '@/components/topology/topologyRegistry'

/** Where a row goes when you click it — the Ops view that can say more than a lamp. */
const OPS_FOR_KIND: Record<TopologyNodeHealth['kind'], { view: string; label: string }> = {
  api: { view: 'satellite-health', label: 'Satellite Health' },
  socket: { view: 'satellite-bus', label: 'Bus Status' },
  daemon: { view: 'satellite-bus', label: 'Bus Status' },
}
const OPS_PLUGINS = { view: 'plugin-gallery', label: 'Plugin Gallery' }

/** Zone order and labels come from the map, so the panel groups the way it draws. */
const ZONES = getTopologyLayout(DEFAULT_TOPOLOGY_LAYOUT_MODE).zones.map((z) => ({
  id: z.id as TopologyZoneId,
  label: z.label,
}))

const rowClass =
  'flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-muted/60'
const headClass =
  'px-2 pb-0.5 pt-2 text-dense-micro font-semibold uppercase tracking-[0.12em] text-muted-foreground/60'

function ServiceRow({ ops, lamp, name, sub, meta, onNavigate }: {
  ops: { view: string; label: string }
  lamp: string
  name: string
  sub?: string
  meta?: string
  onNavigate: () => void
}) {
  return (
    <a
      href={opsConsoleHref(ops.view)}
      target="_blank"
      rel="noreferrer"
      onClick={onNavigate}
      className={rowClass}
      title={`Opens ${ops.label} in the Ops Console`}
    >
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
    </a>
  )
}

/**
 * The service rows, grouped by zone, then the Ops plugins — the System half
 * of the menu bar's Control Center (Rev .60). The centre draws its own header
 * tile and foot; `open` gates the topology probe, which is thirteen /health
 * calls and runs only while someone is reading them.
 */
export function SystemServiceList({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  // Both hooks share their query keys with the pages, so opening this costs no
  // extra request; it only stops polling when closed.
  const { nodes, isLoading } = useSystemTopologyHealth(open)
  const { rows: plugins } = usePlatformPlugins(open)

  const byZone = new Map<TopologyZoneId, TopologyNodeHealth[]>()
  for (const node of nodes) {
    if (node.zoneId == null) continue
    const list = byZone.get(node.zoneId)
    if (list) list.push(node)
    else byZone.set(node.zoneId, [node])
  }

  return (
    <div className="p-1">
      <p className={headClass}>
        {isLoading ? 'probing…' : `${nodes.filter((n) => n.lamp === 'green').length}/${nodes.length} online`}
      </p>
      {ZONES.map((zone) => {
        const zoneNodes = byZone.get(zone.id)
        if (!zoneNodes?.length) return null
        return (
          <div key={zone.id}>
            <p className={headClass}>{zone.label}</p>
            {zoneNodes.map((node) => (
              <ServiceRow
                key={node.key}
                ops={OPS_FOR_KIND[node.kind]}
                lamp={node.lamp}
                name={node.name}
                sub={node.subtitle}
                meta={node.ms != null ? `${node.ms}ms` : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )
      })}
      {plugins.length > 0 && (
        <div>
          <p className={headClass}>Ops plugins</p>
          {plugins.map((row) => (
            <ServiceRow
              key={row.def.key}
              ops={OPS_PLUGINS}
              lamp={row.fetchError ? 'unknown' : row.lamp}
              name={row.def.label}
              meta={row.fetchError ? 'unreachable' : row.isLoading ? 'checking' : row.lamp}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
