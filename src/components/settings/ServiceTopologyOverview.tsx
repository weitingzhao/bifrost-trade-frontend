import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'

type Lamp = 'green' | 'yellow' | 'red'

export interface TopologyServiceHealth {
  key: string
  name: string
  port: string
  lamp: Lamp
  ms?: number
  profile?: 'dev' | 'prod'
}

interface ServiceTopologyOverviewProps {
  services: TopologyServiceHealth[]
}

/** Business dependency edges (from → to). */
const EDGES: { from: string; to: string; label?: string }[] = [
  { from: 'monitor', to: 'trading', label: 'control' },
  { from: 'monitor', to: 'research', label: 'control' },
  { from: 'docs', to: 'monitor', label: 'openapi' },
  { from: 'docs', to: 'massive', label: 'openapi' },
  { from: 'docs', to: 'research', label: 'openapi' },
  { from: 'ops', to: 'massive', label: 'celery' },
  { from: 'massive', to: 'research', label: 'polygon' },
  { from: 'massive', to: 'market', label: 'polygon' },
  { from: 'research', to: 'strategy', label: 'pipeline' },
  { from: 'strategy', to: 'research', label: 'gate' },
  { from: 'trading', to: 'portfolio', label: 'ledger' },
  { from: 'market', to: 'strategy', label: 'quotes' },
]

/** Fixed schematic positions (viewBox 960 × 400). */
const NODE_LAYOUT: Record<string, { x: number; y: number; zone: string }> = {
  monitor:   { x: 120, y: 72,  zone: 'control' },
  ops:       { x: 480, y: 72,  zone: 'control' },
  docs:      { x: 840, y: 72,  zone: 'control' },
  trading:   { x: 160, y: 210, zone: 'account' },
  portfolio: { x: 360, y: 210, zone: 'account' },
  research:  { x: 620, y: 210, zone: 'research' },
  strategy:  { x: 820, y: 210, zone: 'research' },
  market:    { x: 720, y: 300, zone: 'research' },
  massive:   { x: 480, y: 360, zone: 'feed' },
}

const LAMP_GLOW: Record<Lamp, string> = {
  green:  'border-lamp-green/40 shadow-[0_0_14px_-3px_var(--color-lamp-green)]',
  yellow: 'border-lamp-yellow/40 shadow-[0_0_14px_-3px_var(--color-lamp-yellow)]',
  red:    'border-lamp-red/40 shadow-[0_0_14px_-3px_var(--color-lamp-red)]',
}

const LAMP_STROKE: Record<Lamp, string> = {
  green:  'stroke-lamp-green/50',
  yellow: 'stroke-lamp-yellow/50',
  red:    'stroke-lamp-red/40',
}

function EnvChip({ profile }: { profile: 'dev' | 'prod' }) {
  if (profile === 'dev') {
    return (
      <span className="rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide text-sky-500 dark:text-sky-400 bg-sky-500/10 border border-sky-500/30">
        DEV
      </span>
    )
  }
  return (
    <span className="rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400 bg-green-600/10 border border-green-600/30">
      PROD
    </span>
  )
}

function ReactorNode({ svc }: { svc: TopologyServiceHealth }) {
  const layout = NODE_LAYOUT[svc.key]
  if (!layout) return null

  const statusLabel =
    svc.lamp === 'green' ? 'ONLINE' : svc.lamp === 'yellow' ? 'PROBE' : 'OFFLINE'

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ left: `${(layout.x / 960) * 100}%`, top: `${(layout.y / 400) * 100}%` }}
    >
      <div
        className={cn(
          'relative min-w-[112px] rounded-md border bg-card/90 backdrop-blur-sm px-2.5 py-2 transition-shadow duration-300',
          LAMP_GLOW[svc.lamp],
        )}
      >
        {/* Corner bracket accents — industrial SCADA feel */}
        <span className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-foreground/25" />
        <span className="pointer-events-none absolute -right-px -top-px h-2 w-2 border-r border-t border-foreground/25" />
        <span className="pointer-events-none absolute -bottom-px -left-px h-2 w-2 border-b border-l border-foreground/25" />
        <span className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-foreground/25" />

        <div className="flex items-center gap-1.5">
          <StatusLamp lamp={svc.lamp} className="h-2 w-2 shrink-0" />
          <span className="text-xs font-semibold leading-none">{svc.name}</span>
          {svc.profile && <EnvChip profile={svc.profile} />}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums text-muted-foreground">
          <span>:{svc.port}</span>
          {svc.ms != null ? <span>{svc.ms} ms</span> : <span>—</span>}
        </div>

        <p
          className={cn(
            'mt-1 font-mono text-[9px] uppercase tracking-wider',
            svc.lamp === 'green' && 'text-lamp-green',
            svc.lamp === 'yellow' && 'text-lamp-yellow',
            svc.lamp === 'red' && 'text-lamp-red',
          )}
        >
          {statusLabel}
        </p>
      </div>
    </div>
  )
}

function pipePath(from: string, to: string): string {
  const a = NODE_LAYOUT[from]
  const b = NODE_LAYOUT[to]
  if (!a || !b) return ''

  const midY = (a.y + b.y) / 2
  return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`
}

function worstEdgeLamp(fromLamp: Lamp, toLamp: Lamp): Lamp {
  if (fromLamp === 'red' || toLamp === 'red') return 'red'
  if (fromLamp === 'yellow' || toLamp === 'yellow') return 'yellow'
  return 'green'
}

export function ServiceTopologyOverview({ services }: ServiceTopologyOverviewProps) {
  const byKey = Object.fromEntries(services.map((s) => [s.key, s])) as Record<string, TopologyServiceHealth>

  const online = services.filter((s) => s.lamp === 'green').length
  const probing = services.filter((s) => s.lamp === 'yellow').length
  const offline = services.filter((s) => s.lamp === 'red').length
  const profiles = [...new Set(services.map((s) => s.profile).filter(Boolean))]
  const profileLabel =
    profiles.length === 1
      ? profiles[0] === 'dev'
        ? 'DEV PROFILE'
        : 'PROD PROFILE'
      : profiles.length > 1
        ? 'MIXED PROFILE'
        : 'PROFILE UNKNOWN'

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-[#0a0e14] dark:bg-[#060a0f]">
      {/* Grid + scanline atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/[0.03] via-transparent to-amber-500/[0.02]" />

      {/* Header telemetry strip */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/15 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-500/80">
            Reactor Map
          </span>
          <span className="hidden h-3 w-px bg-border/60 sm:block" />
          <span className="font-mono text-[10px] text-muted-foreground">
            {online}/{services.length} online
            {probing > 0 && ` · ${probing} probing`}
            {offline > 0 && ` · ${offline} offline`}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-lamp-green animate-pulse" />
            {profileLabel}
          </span>
          <span className="text-border">|</span>
          <span>AUTO-SCAN 20s</span>
        </div>
      </div>

      {/* Schematic canvas */}
      <div className="relative aspect-[960/400] min-h-[280px] w-full">
        <svg
          viewBox="0 0 960 400"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <marker
              id="pipe-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" className="fill-lamp-green/40" />
            </marker>
          </defs>

          {/* Zone outlines */}
          <rect x="24" y="24" width="912" height="88" rx="4" className="fill-cyan-500/[0.03] stroke-cyan-500/15" strokeWidth="1" strokeDasharray="4 4" />
          <text x="36" y="44" className="fill-cyan-500/50 text-[9px] font-bold tracking-[0.15em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            CONTROL PLANE
          </text>

          <rect x="24" y="148" width="400" height="88" rx="4" className="fill-amber-500/[0.02] stroke-amber-500/12" strokeWidth="1" strokeDasharray="4 4" />
          <text x="36" y="168" className="fill-amber-500/45 text-[9px] font-bold tracking-[0.15em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            ACCOUNT
          </text>

          <rect x="520" y="148" width="416" height="168" rx="4" className="fill-violet-500/[0.02] stroke-violet-500/12" strokeWidth="1" strokeDasharray="4 4" />
          <text x="532" y="168" className="fill-violet-400/45 text-[9px] font-bold tracking-[0.15em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            RESEARCH STACK
          </text>

          <rect x="320" y="328" width="320" height="56" rx="4" className="fill-emerald-500/[0.03] stroke-emerald-500/15" strokeWidth="1" strokeDasharray="4 4" />
          <text x="332" y="348" className="fill-emerald-400/50 text-[9px] font-bold tracking-[0.15em]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            DATA FEED
          </text>

          {/* Dependency pipes */}
          {EDGES.map(({ from, to, label }) => {
            const fromSvc = byKey[from]
            const toSvc = byKey[to]
            if (!fromSvc || !toSvc) return null
            const lamp = worstEdgeLamp(fromSvc.lamp, toSvc.lamp)
            const d = pipePath(from, to)
            const mid = NODE_LAYOUT[from] && NODE_LAYOUT[to]
              ? { x: (NODE_LAYOUT[from].x + NODE_LAYOUT[to].x) / 2, y: (NODE_LAYOUT[from].y + NODE_LAYOUT[to].y) / 2 }
              : null

            return (
              <g key={`${from}-${to}`}>
                <path
                  d={d}
                  fill="none"
                  strokeWidth="1.5"
                  className={cn(LAMP_STROKE[lamp], lamp === 'green' && 'animate-[dash_3s_linear_infinite]')}
                  strokeDasharray={lamp === 'green' ? '6 4' : '3 6'}
                  markerEnd={lamp === 'green' ? 'url(#pipe-arrow)' : undefined}
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

        {services.map((svc) => (
          <ReactorNode key={svc.key} svc={svc} />
        ))}
      </div>

      {/* Legend */}
      <div className="relative z-20 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/40 px-4 py-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1"><StatusLamp lamp="green" className="h-1.5 w-1.5" /> Online</span>
        <span className="inline-flex items-center gap-1"><StatusLamp lamp="yellow" className="h-1.5 w-1.5" /> Probing</span>
        <span className="inline-flex items-center gap-1"><StatusLamp lamp="red" className="h-1.5 w-1.5" /> Offline</span>
        <span className="ml-auto hidden sm:inline">Dashed zones = operational bays · Lines = data / control flow</span>
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </div>
  )
}
