import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'
import type { TopologyLamp, TopologyNodeHealth } from './topologyRegistry'
import {
  DEFAULT_TOPOLOGY_LAYOUT_MODE,
  getTopologyLayout,
  type TopologyLayoutSpec,
} from './topologyLayouts'
import {
  topologyCanvasEmbeddedClass,
  topologyCanvasEmbeddedInnerClass,
  topologyCanvasPageClass,
  topologyEdgeLampStroke,
  topologyGradientOverlayClass,
  topologyGridOverlayClass,
  topologyHeaderClass,
  topologyHeaderEmbeddedClass,
  topologyHeaderMetaClass,
  topologyHeaderRightClass,
  topologyHeaderTitleClass,
  topologyLegendClass,
  topologyLegendEmbeddedClass,
  topologyCeleryNodeShellClass,
  topologyNodeLampGlow,
  topologyNodeShellClass,
  topologyNodeStatusClass,
  topologyShellClass,
  topologyShellEmbeddedClass,
} from './serviceTopologyUi'

export type { TopologyNodeHealth }

interface ServiceTopologyOverviewProps {
  nodes: TopologyNodeHealth[]
  embedded?: boolean
  layout?: TopologyLayoutSpec
}

function EnvChip({ profile }: { profile: 'dev' | 'prod' }) {
  if (profile === 'dev') {
    return (
      <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-sky-500 dark:text-sky-400">
        DEV
      </span>
    )
  }
  return (
    <span className="rounded border border-green-600/30 bg-green-600/10 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400">
      PROD
    </span>
  )
}

function ReactorNode({
  node,
  layout,
  compact,
}: {
  node: TopologyNodeHealth
  layout: TopologyLayoutSpec
  compact?: boolean
}) {
  const pos = layout.nodeLayout[node.key]
  if (!pos) return null

  const { width, height } = layout.viewBox
  const statusLabel =
    node.lamp === 'green' ? 'ONLINE' : node.lamp === 'yellow' ? 'PROBE' : 'OFFLINE'
  const isApi = node.kind === 'api'
  const isCelery = node.kind === 'celery'
  const shellClass = isCelery ? topologyCeleryNodeShellClass : topologyNodeShellClass

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: `${(pos.x / width) * 100}%`, top: `${(pos.y / height) * 100}%` }}
    >
      <div className={cn(shellClass, topologyNodeLampGlow[node.lamp])}>
        {!compact && (
          <>
            <span className="pointer-events-none absolute -left-px -top-px h-1.5 w-1.5 border-l border-t border-foreground/25" />
            <span className="pointer-events-none absolute -right-px -top-px h-1.5 w-1.5 border-r border-t border-foreground/25" />
            <span className="pointer-events-none absolute -bottom-px -left-px h-1.5 w-1.5 border-b border-l border-foreground/25" />
            <span className="pointer-events-none absolute -bottom-px -right-px h-1.5 w-1.5 border-b border-r border-foreground/25" />
          </>
        )}

        <div className="flex items-center gap-0.5">
          <StatusLamp
            lamp={node.lamp}
            variant="dot"
            className={cn('shrink-0', compact ? 'h-1.5 w-1.5' : 'h-2 w-2')}
          />
          <span className={cn('font-semibold leading-none truncate', compact ? 'text-[9px]' : 'text-[11px]')}>
            {node.name}
          </span>
          {node.profile && <EnvChip profile={node.profile} />}
        </div>

        <div
          className={cn(
            'mt-0.5 flex items-center justify-between gap-0.5 font-mono tabular-nums text-muted-foreground',
            compact ? 'text-[7px]' : 'text-[9px]',
          )}
        >
          {isApi ? (
            <>
              <span>:{node.port}</span>
              {node.ms != null ? <span>{node.ms}ms</span> : <span>—</span>}
            </>
          ) : (
            <span
              className={cn('truncate', isCelery && 'whitespace-normal line-clamp-2 leading-tight')}
              title={node.subtitle}
            >
              {node.subtitle ?? '—'}
            </span>
          )}
        </div>

        {!compact && <p className={topologyNodeStatusClass(node.lamp)}>{statusLabel}</p>}
      </div>
    </div>
  )
}

function pipePath(
  from: string,
  to: string,
  nodeLayout: TopologyLayoutSpec['nodeLayout'],
): string {
  const a = nodeLayout[from]
  const b = nodeLayout[to]
  if (!a || !b) return ''

  const midY = (a.y + b.y) / 2
  return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`
}

function worstEdgeLamp(fromLamp: TopologyLamp, toLamp: TopologyLamp): TopologyLamp {
  if (fromLamp === 'red' || toLamp === 'red') return 'red'
  if (fromLamp === 'yellow' || toLamp === 'yellow') return 'yellow'
  return 'green'
}

export function ServiceTopologyOverview({
  nodes,
  embedded = false,
  layout: layoutProp,
}: ServiceTopologyOverviewProps) {
  const layout = layoutProp ?? getTopologyLayout(DEFAULT_TOPOLOGY_LAYOUT_MODE)
  const byKey = Object.fromEntries(nodes.map(n => [n.key, n])) as Record<string, TopologyNodeHealth>

  const online = nodes.filter(n => n.lamp === 'green').length
  const probing = nodes.filter(n => n.lamp === 'yellow').length
  const offline = nodes.filter(n => n.lamp === 'red').length
  const apiProfiles = [...new Set(nodes.filter(n => n.kind === 'api').map(n => n.profile).filter(Boolean))]
  const profileLabel =
    apiProfiles.length === 1
      ? apiProfiles[0] === 'dev'
        ? 'DEV PROFILE'
        : 'PROD PROFILE'
      : apiProfiles.length > 1
        ? 'MIXED PROFILE'
        : 'PROFILE UNKNOWN'

  const { width, height } = layout.viewBox
  const aspectStyle = { aspectRatio: `${width} / ${height}` } as const

  return (
    <div className={embedded ? topologyShellEmbeddedClass : topologyShellClass}>
      <div
        className={topologyGridOverlayClass}
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      <div className={topologyGradientOverlayClass} />

      <div className={embedded ? topologyHeaderEmbeddedClass : topologyHeaderClass}>
        <div className="flex items-center gap-3">
          <span className={topologyHeaderTitleClass}>Reactor Map</span>
          <span className="hidden h-3 w-px bg-border/60 sm:block" />
          <span className={topologyHeaderMetaClass}>
            {online}/{nodes.length} online
            {probing > 0 && ` · ${probing} probing`}
            {offline > 0 && ` · ${offline} offline`}
          </span>
        </div>
        <div className={topologyHeaderRightClass}>
          <span className="hidden sm:inline text-muted-foreground/80">{layout.label}</span>
          <span className="hidden h-3 w-px bg-border/60 sm:block" />
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lamp-green" />
            {profileLabel}
          </span>
          <span className="text-border">|</span>
          <span>MIXED 5–20s</span>
        </div>
      </div>

      <div
        className={embedded ? topologyCanvasEmbeddedClass : topologyCanvasPageClass}
        style={embedded ? aspectStyle : undefined}
      >
        <div className={embedded ? topologyCanvasEmbeddedInnerClass : 'relative h-full w-full'}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <marker
                id="reactor-pipe-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" className="fill-lamp-green/40" />
              </marker>
            </defs>

            {layout.zones.map(zone => (
              <g key={zone.id}>
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  rx="4"
                  className={zone.rectClass}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={zone.x + 8}
                  y={zone.y + 14}
                  className={cn('text-[8px] font-bold tracking-[0.12em]', zone.labelClass)}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {zone.label}
                </text>
              </g>
            ))}

            {layout.edges.map(({ from, to, label }) => {
              const fromNode = byKey[from]
              const toNode = byKey[to]
              if (!fromNode || !toNode) return null
              const lamp = worstEdgeLamp(fromNode.lamp, toNode.lamp)
              const d = pipePath(from, to, layout.nodeLayout)
              const a = layout.nodeLayout[from]
              const b = layout.nodeLayout[to]
              const mid = a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null

              return (
                <g key={`${from}-${to}`}>
                  <path
                    d={d}
                    fill="none"
                    strokeWidth="1.5"
                    className={cn(
                      topologyEdgeLampStroke[lamp],
                      lamp === 'green' && 'animate-[dash_3s_linear_infinite]',
                    )}
                    strokeDasharray={lamp === 'green' ? '6 4' : '3 6'}
                    markerEnd={lamp === 'green' ? 'url(#reactor-pipe-arrow)' : undefined}
                  />
                  {label && mid && (
                    <text
                      x={mid.x}
                      y={mid.y - 4}
                      textAnchor="middle"
                      className="fill-muted-foreground/50 text-[7px] uppercase tracking-wider"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {nodes.map(node => (
            <ReactorNode key={node.key} node={node} layout={layout} compact={embedded} />
          ))}
        </div>
      </div>

      <div className={embedded ? topologyLegendEmbeddedClass : topologyLegendClass}>
        <span className="inline-flex items-center gap-1">
          <StatusLamp lamp="green" variant="dot" className="h-1.5 w-1.5" /> Online
        </span>
        <span className="inline-flex items-center gap-1">
          <StatusLamp lamp="yellow" variant="dot" className="h-1.5 w-1.5" /> Probing
        </span>
        <span className="inline-flex items-center gap-1">
          <StatusLamp lamp="red" variant="dot" className="h-1.5 w-1.5" /> Offline
        </span>
        <span className="ml-auto hidden lg:inline">
          Dashed bays — Edge · APIs · Celery · Daemons · Grid btn = auto layout
        </span>
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </div>
  )
}
