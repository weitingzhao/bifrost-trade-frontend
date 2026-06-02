import { SUPPORTED_CELERY_QUEUE_NAMES } from '@/utils/celeryRuntime'
import { formatQueueLabel } from '@/utils/celeryQueueLabels'

export type TopologyNodeKind = 'api' | 'socket' | 'daemon' | 'celery'

export type TopologyLamp = 'green' | 'yellow' | 'red'

export interface TopologyNodeDef {
  key: string
  name: string
  kind: TopologyNodeKind
  zoneId: TopologyZoneId
  celeryQueue?: string
}

export interface TopologyNodeHealth {
  key: string
  name: string
  kind: TopologyNodeKind
  lamp: TopologyLamp
  port?: string
  ms?: number
  profile?: 'dev' | 'prod'
  subtitle?: string
  celeryQueue?: string
  zoneId?: TopologyZoneId
}

export interface TopologyEdgeDef {
  from: string
  to: string
  label?: string
}

export type TopologyZoneId =
  | 'edge'
  | 'api_control'
  | 'api_account'
  | 'api_research'
  | 'api_data'
  | 'celery'
  | 'daemon'

export interface TopologyZoneDef {
  id: TopologyZoneId
  label: string
  x: number
  y: number
  width: number
  height: number
  labelClass: string
  rectClass: string
}

export const TOPOLOGY_VIEWBOX = { width: 1280, height: 480 } as const

export const CELERY_BEAT_NODE_KEY = 'celery_beat'
export const CELERY_BROKER_NODE_KEY = 'celery_broker'

export function celeryQueueNodeKey(queueName: string): string {
  return `celery_q_${queueName}`
}

export function isCeleryQueueNodeKey(key: string): boolean {
  return key.startsWith('celery_q_')
}

export function celeryQueueFromNodeKey(key: string): string | undefined {
  if (!isCeleryQueueNodeKey(key)) return undefined
  return key.slice('celery_q_'.length)
}

const CELERY_QUEUE_NODES: TopologyNodeDef[] = SUPPORTED_CELERY_QUEUE_NAMES.map(queue => ({
  key: celeryQueueNodeKey(queue),
  name: formatQueueLabel(queue),
  kind: 'celery' as const,
  zoneId: 'celery' as const,
  celeryQueue: queue,
}))

export const TOPOLOGY_NODE_REGISTRY: TopologyNodeDef[] = [
  { key: 'monitor', name: 'Monitor', kind: 'api', zoneId: 'api_control' },
  { key: 'ops', name: 'Ops', kind: 'api', zoneId: 'api_control' },
  { key: 'docs', name: 'Docs', kind: 'api', zoneId: 'api_control' },
  { key: CELERY_BEAT_NODE_KEY, name: 'Beat Agent', kind: 'celery', zoneId: 'celery' },
  { key: CELERY_BROKER_NODE_KEY, name: 'Broker', kind: 'celery', zoneId: 'celery' },
  ...CELERY_QUEUE_NODES,
  { key: 'trading', name: 'Trading', kind: 'api', zoneId: 'api_account' },
  { key: 'portfolio', name: 'Portfolio', kind: 'api', zoneId: 'api_account' },
  { key: 'research', name: 'Research', kind: 'api', zoneId: 'api_research' },
  { key: 'strategy', name: 'Strategy', kind: 'api', zoneId: 'api_research' },
  { key: 'market', name: 'Market', kind: 'api', zoneId: 'api_research' },
  { key: 'massive', name: 'Massive', kind: 'api', zoneId: 'api_data' },
  { key: 'ib_ingestor', name: 'IB Ingestor', kind: 'socket', zoneId: 'edge' },
  { key: 'ib_account_agent', name: 'IB Acct', kind: 'socket', zoneId: 'edge' },
  { key: 'ib_operator', name: 'IB Operator', kind: 'socket', zoneId: 'edge' },
  { key: 'massive_ws', name: 'Massive WS', kind: 'socket', zoneId: 'edge' },
  { key: 'daemon_trading', name: 'Strategy Daemon', kind: 'daemon', zoneId: 'daemon' },
  { key: 'account_sync', name: 'Account Sync', kind: 'daemon', zoneId: 'daemon' },
]

/** @deprecated Use topologyLayouts + active layout spec in ServiceTopologyOverview. */
export const TOPOLOGY_NODE_LAYOUT: Record<string, { x: number; y: number }> = {
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
}

/** @deprecated Use topologyLayouts. */
export const TOPOLOGY_ZONES: TopologyZoneDef[] = []

export const TOPOLOGY_EDGES: TopologyEdgeDef[] = [
  { from: 'monitor', to: 'trading', label: 'control' },
  { from: 'monitor', to: 'research', label: 'control' },
  { from: 'monitor', to: 'daemon_trading', label: 'status' },
  { from: 'monitor', to: 'ib_ingestor', label: 'health' },
  { from: 'docs', to: 'monitor', label: 'openapi' },
  { from: 'docs', to: 'massive', label: 'openapi' },
  { from: 'docs', to: 'research', label: 'openapi' },
  { from: 'ops', to: CELERY_BROKER_NODE_KEY, label: 'inspect' },
  { from: CELERY_BEAT_NODE_KEY, to: CELERY_BROKER_NODE_KEY, label: 'schedule' },
  { from: CELERY_BROKER_NODE_KEY, to: 'celery_q_stocks_ib', label: 'queue' },
  { from: CELERY_BROKER_NODE_KEY, to: 'celery_q_options_massive', label: 'queue' },
  { from: 'massive', to: 'celery_q_stocks_massive', label: 'jobs' },
  { from: 'massive', to: 'celery_q_options_massive', label: 'jobs' },
  { from: 'massive', to: 'research', label: 'polygon' },
  { from: 'massive', to: 'market', label: 'polygon' },
  { from: 'research', to: 'strategy', label: 'pipeline' },
  { from: 'strategy', to: 'research', label: 'gate' },
  { from: 'trading', to: 'portfolio', label: 'ledger' },
  { from: 'market', to: 'strategy', label: 'quotes' },
  { from: 'ib_ingestor', to: 'market', label: 'ticks' },
  { from: 'ib_operator', to: 'trading', label: 'orders' },
  { from: 'ib_account_agent', to: 'portfolio', label: 'positions' },
  { from: 'massive_ws', to: 'market', label: 'opt quotes' },
  { from: 'daemon_trading', to: 'trading', label: 'engine' },
  { from: 'account_sync', to: 'portfolio', label: 'sync' },
]
