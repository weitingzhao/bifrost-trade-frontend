import { cn } from '@/lib/utils'
import type { TopologyLamp } from './topologyRegistry'

export const TOPOLOGY_VIEWBOX_WIDTH = 1280
export const TOPOLOGY_VIEWBOX_HEIGHT = 480

export const topologyShellClass = cn(
  'relative overflow-hidden rounded-lg border border-border/60 bg-[#0a0e14] dark:bg-[#060a0f]',
)

export const topologyShellEmbeddedClass = cn(
  'relative flex h-full min-h-0 w-full flex-col bg-[#0a0e14] dark:bg-[#060a0f]',
)

export const topologyGridOverlayClass = cn('pointer-events-none absolute inset-0 opacity-[0.35]')

export const topologyGradientOverlayClass = cn(
  'pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/[0.03] via-transparent to-amber-500/[0.02]',
)

export const topologyHeaderClass = cn(
  'relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/15 px-3 py-2 shrink-0',
)

export const topologyHeaderEmbeddedClass = cn(
  'relative z-20 flex flex-wrap items-center justify-between gap-1.5 border-b border-cyan-500/15 px-3 py-1.5 shrink-0',
)

export const topologyHeaderTitleClass = cn(
  'font-mono text-dense-caption font-bold uppercase tracking-[0.2em] text-cyan-500/80',
)

export const topologyHeaderMetaClass = cn('font-mono text-dense-caption text-muted-foreground')

export const topologyHeaderRightClass = cn(
  'flex items-center gap-2 font-mono text-dense-caption uppercase tracking-wider text-muted-foreground',
)

export const topologyCanvasEmbeddedClass = cn('relative w-full shrink-0 overflow-hidden')

export const topologyCanvasEmbeddedInnerClass = cn('relative h-full w-full')

export const topologyCanvasPageClass = cn('relative w-full min-h-[280px]')

export const topologyLegendClass = cn(
  'relative z-20 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border/40 px-3 py-1.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground shrink-0',
)

export const topologyLegendEmbeddedClass = cn(
  'relative z-20 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border/40 px-3 py-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground shrink-0',
)

export const topologyNodeShellClass = cn(
  'relative min-w-[76px] max-w-[92px] rounded border bg-card/90 px-1.5 py-1 backdrop-blur-sm transition-shadow duration-300',
)

export const topologyCeleryNodeShellClass = cn(
  'relative min-w-[80px] max-w-[104px] rounded border bg-card/90 px-1.5 py-1 backdrop-blur-sm transition-shadow duration-300',
)

export const topologyNodeLampGlow: Record<TopologyLamp, string> = {
  green: 'border-lamp-green/40 shadow-[0_0_10px_-3px_var(--color-lamp-green)]',
  yellow: 'border-lamp-yellow/40 shadow-[0_0_10px_-3px_var(--color-lamp-yellow)]',
  red: 'border-lamp-red/40 shadow-[0_0_10px_-3px_var(--color-lamp-red)]',
}

export const topologyEdgeLampStroke: Record<TopologyLamp, string> = {
  green: 'stroke-lamp-green/50',
  yellow: 'stroke-lamp-yellow/50',
  red: 'stroke-lamp-red/40',
}

export const topologyNodeStatusClass = (lamp: TopologyLamp): string =>
  cn(
    'mt-0.5 font-mono text-[8px] uppercase tracking-wider',
    lamp === 'green' && 'text-lamp-green',
    lamp === 'yellow' && 'text-lamp-yellow',
    lamp === 'red' && 'text-lamp-red',
  )
