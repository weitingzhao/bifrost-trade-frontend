import type { TopologyEdgeDef, TopologyZoneDef } from './topologyRegistry'
import { TOPOLOGY_EDGES } from './topologyRegistry'

export type TopologyLayoutMode = 'wide' | 'tall' | 'balanced'

export interface TopologyLayoutSpec {
  mode: TopologyLayoutMode
  label: string
  viewBox: { width: number; height: number }
  zones: TopologyZoneDef[]
  nodeLayout: Record<string, { x: number; y: number }>
  edges: TopologyEdgeDef[]
}

/** Default — horizontal bands, 2× prior vertical space (1280×480). */
const WIDE_LAYOUT: TopologyLayoutSpec = {
  mode: 'wide',
  label: 'Wide',
  viewBox: { width: 1280, height: 480 },
  zones: [
    {
      id: 'edge',
      label: 'EDGE',
      x: 8,
      y: 8,
      width: 84,
      height: 464,
      labelClass: 'fill-teal-400/50',
      rectClass: 'fill-teal-500/[0.03] stroke-teal-500/15',
    },
    {
      id: 'api_control',
      label: 'CONTROL APIS',
      x: 100,
      y: 8,
      width: 204,
      height: 72,
      labelClass: 'fill-cyan-500/50',
      rectClass: 'fill-cyan-500/[0.03] stroke-cyan-500/15',
    },
    {
      id: 'api_account',
      label: 'ACCOUNT APIS',
      x: 312,
      y: 8,
      width: 136,
      height: 72,
      labelClass: 'fill-amber-500/45',
      rectClass: 'fill-amber-500/[0.02] stroke-amber-500/12',
    },
    {
      id: 'api_research',
      label: 'RESEARCH APIS',
      x: 456,
      y: 8,
      width: 288,
      height: 72,
      labelClass: 'fill-violet-400/45',
      rectClass: 'fill-violet-500/[0.02] stroke-violet-500/12',
    },
    {
      id: 'api_data',
      label: 'DATA APIS',
      x: 752,
      y: 8,
      width: 112,
      height: 72,
      labelClass: 'fill-emerald-400/50',
      rectClass: 'fill-emerald-500/[0.03] stroke-emerald-500/15',
    },
    {
      id: 'celery',
      label: 'CELERY RUNTIME',
      x: 100,
      y: 88,
      width: 1080,
      height: 248,
      labelClass: 'fill-orange-400/45',
      rectClass: 'fill-orange-500/[0.03] stroke-orange-500/12',
    },
    {
      id: 'daemon',
      label: 'DAEMONS',
      x: 100,
      y: 344,
      width: 240,
      height: 128,
      labelClass: 'fill-rose-400/45',
      rectClass: 'fill-rose-500/[0.03] stroke-rose-500/12',
    },
  ],
  nodeLayout: {
    ib_ingestor: { x: 50, y: 56 },
    ib_account_agent: { x: 50, y: 136 },
    ib_operator: { x: 50, y: 216 },
    massive_ws: { x: 50, y: 296 },
    monitor: { x: 132, y: 48 },
    ops: { x: 192, y: 48 },
    docs: { x: 252, y: 48 },
    trading: { x: 352, y: 48 },
    portfolio: { x: 412, y: 48 },
    research: { x: 488, y: 48 },
    strategy: { x: 568, y: 48 },
    market: { x: 648, y: 48 },
    massive: { x: 792, y: 48 },
    celery_beat: { x: 180, y: 128 },
    celery_broker: { x: 280, y: 128 },
    celery_q_stocks_ib: { x: 380, y: 220 },
    celery_q_stocks_massive_high: { x: 520, y: 220 },
    celery_q_stocks_massive: { x: 660, y: 220 },
    celery_q_options_massive_high: { x: 800, y: 220 },
    celery_q_options_massive: { x: 940, y: 220 },
    daemon_trading: { x: 160, y: 400 },
    account_sync: { x: 260, y: 400 },
  },
  edges: TOPOLOGY_EDGES,
}

/** Stacked bays — better when the dock is narrow or taller than wide. */
const TALL_LAYOUT: TopologyLayoutSpec = {
  mode: 'tall',
  label: 'Stacked',
  viewBox: { width: 880, height: 640 },
  zones: [
    {
      id: 'edge',
      label: 'EDGE',
      x: 8,
      y: 8,
      width: 84,
      height: 624,
      labelClass: 'fill-teal-400/50',
      rectClass: 'fill-teal-500/[0.03] stroke-teal-500/15',
    },
    {
      id: 'api_control',
      label: 'CONTROL APIS',
      x: 100,
      y: 8,
      width: 772,
      height: 64,
      labelClass: 'fill-cyan-500/50',
      rectClass: 'fill-cyan-500/[0.03] stroke-cyan-500/15',
    },
    {
      id: 'api_account',
      label: 'ACCOUNT APIS',
      x: 100,
      y: 80,
      width: 772,
      height: 56,
      labelClass: 'fill-amber-500/45',
      rectClass: 'fill-amber-500/[0.02] stroke-amber-500/12',
    },
    {
      id: 'api_research',
      label: 'RESEARCH APIS',
      x: 100,
      y: 144,
      width: 520,
      height: 56,
      labelClass: 'fill-violet-400/45',
      rectClass: 'fill-violet-500/[0.02] stroke-violet-500/12',
    },
    {
      id: 'api_data',
      label: 'DATA APIS',
      x: 628,
      y: 144,
      width: 244,
      height: 56,
      labelClass: 'fill-emerald-400/50',
      rectClass: 'fill-emerald-500/[0.03] stroke-emerald-500/15',
    },
    {
      id: 'celery',
      label: 'CELERY RUNTIME',
      x: 100,
      y: 208,
      width: 772,
      height: 320,
      labelClass: 'fill-orange-400/45',
      rectClass: 'fill-orange-500/[0.03] stroke-orange-500/12',
    },
    {
      id: 'daemon',
      label: 'DAEMONS',
      x: 100,
      y: 536,
      width: 772,
      height: 96,
      labelClass: 'fill-rose-400/45',
      rectClass: 'fill-rose-500/[0.03] stroke-rose-500/12',
    },
  ],
  nodeLayout: {
    ib_ingestor: { x: 50, y: 72 },
    ib_account_agent: { x: 50, y: 192 },
    ib_operator: { x: 50, y: 312 },
    massive_ws: { x: 50, y: 432 },
    monitor: { x: 180, y: 40 },
    ops: { x: 340, y: 40 },
    docs: { x: 500, y: 40 },
    trading: { x: 220, y: 108 },
    portfolio: { x: 420, y: 108 },
    research: { x: 200, y: 172 },
    strategy: { x: 400, y: 172 },
    market: { x: 600, y: 172 },
    massive: { x: 720, y: 172 },
    celery_beat: { x: 200, y: 248 },
    celery_broker: { x: 320, y: 248 },
    celery_q_stocks_ib: { x: 180, y: 340 },
    celery_q_stocks_massive_high: { x: 340, y: 340 },
    celery_q_stocks_massive: { x: 500, y: 340 },
    celery_q_options_massive_high: { x: 660, y: 340 },
    celery_q_options_massive: { x: 820, y: 340 },
    daemon_trading: { x: 280, y: 576 },
    account_sync: { x: 480, y: 576 },
  },
  edges: TOPOLOGY_EDGES,
}

/** Middle ground — wide canvas with extra Celery vertical room. */
const BALANCED_LAYOUT: TopologyLayoutSpec = {
  ...WIDE_LAYOUT,
  mode: 'balanced',
  label: 'Balanced',
  viewBox: { width: 1280, height: 560 },
  zones: WIDE_LAYOUT.zones.map(z =>
    z.id === 'celery'
      ? { ...z, y: 88, height: 300 }
      : z.id === 'daemon'
        ? { ...z, y: 400, height: 152 }
        : z.id === 'edge'
          ? { ...z, height: 544 }
          : z,
  ),
  nodeLayout: {
    ...WIDE_LAYOUT.nodeLayout,
    ib_ingestor: { x: 50, y: 64 },
    ib_account_agent: { x: 50, y: 160 },
    ib_operator: { x: 50, y: 256 },
    massive_ws: { x: 50, y: 352 },
    celery_beat: { x: 180, y: 140 },
    celery_broker: { x: 280, y: 140 },
    celery_q_stocks_ib: { x: 380, y: 260 },
    celery_q_stocks_massive_high: { x: 520, y: 260 },
    celery_q_stocks_massive: { x: 660, y: 260 },
    celery_q_options_massive_high: { x: 800, y: 260 },
    celery_q_options_massive: { x: 940, y: 260 },
    daemon_trading: { x: 160, y: 468 },
    account_sync: { x: 260, y: 468 },
  },
}

export const TOPOLOGY_LAYOUTS: Record<TopologyLayoutMode, TopologyLayoutSpec> = {
  wide: WIDE_LAYOUT,
  tall: TALL_LAYOUT,
  balanced: BALANCED_LAYOUT,
}

export const DEFAULT_TOPOLOGY_LAYOUT_MODE: TopologyLayoutMode = 'wide'

export function getTopologyLayout(mode: TopologyLayoutMode): TopologyLayoutSpec {
  return TOPOLOGY_LAYOUTS[mode]
}

/** Pick layout from available dock canvas size (width × height in px). */
export function inferTopologyLayoutMode(panelWidth: number, canvasHeight: number): TopologyLayoutMode {
  if (panelWidth <= 0 || canvasHeight <= 0) return DEFAULT_TOPOLOGY_LAYOUT_MODE
  const aspect = panelWidth / canvasHeight
  if (aspect >= 2.4) return 'wide'
  if (aspect <= 1.55) return 'tall'
  return 'balanced'
}

export function layoutAspectRatio(spec: TopologyLayoutSpec): number {
  return spec.viewBox.width / spec.viewBox.height
}
