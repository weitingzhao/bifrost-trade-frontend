import { domainOrigin } from '@/lib/devApiUrl'

/**
 * Every gateway route key.
 *
 * Typing `key` as this union is what stops the service list and the panels
 * that read it from drifting apart: move a key and every reader of it stops
 * compiling, instead of returning `undefined` at render time.
 */
export const API_ROUTE_KEYS = [
  'monitor',
  'ops',
  'docs',
  'trading',
  'portfolio',
  'strategy',
  'research',
  'market',
] as const

export type ApiRouteKey = (typeof API_ROUTE_KEYS)[number]

export interface ServiceDef {
  key: ApiRouteKey
  name: string
  base: string
  port: string
  description: string
  healthPath: string
}

export type Lamp = 'green' | 'yellow' | 'red'

/**
 * The processes behind the gateway, one entry each.
 *
 * There used to be eight: monitor, ops, docs, trading, portfolio, strategy,
 * research, market. Probing every `/health` shows what they actually are —
 * monitor, ops and docs are all `bifrost-monitor`; trading, portfolio and
 * strategy are all `bifrost-account`. Eight lamps could only ever tell four
 * stories, and three of them always went red together. The gateway paths they
 * served are still real; they are routes, not services, and a health board
 * that counts routes as services reports redundancy as coverage.
 *
 * Cluster-wide health, history and alerting live in the Ops Console
 * (Observability, Control Room, connectivity matrix). This board answers a
 * narrower question: can this frontend reach each API process right now.
 */
export const ARCH_SERVICES: ServiceDef[] = [
  { key: 'monitor', name: 'Monitor',   base: domainOrigin('monitor'), port: '8765', description: 'Daemon status, ops control and the OpenAPI gateway', healthPath: '/health' },
]

export const ACCOUNT_SERVICES: ServiceDef[] = [
  { key: 'trading',   name: 'Account',   base: domainOrigin('trading'),   port: '8769', description: 'Orders, positions, Greeks and the strategy gate', healthPath: '/health' },
]

export const RESEARCH_SERVICES: ServiceDef[] = [
  // TD-39: the Trade API's research app, not the Research engine (/api/plugin/research,
  // bifrost-research); it serves no backtest.
  { key: 'research', name: 'Trade research', base: domainOrigin('research'), port: '8773', description: 'Screener, option discovery, Greeks, data readiness and feedback', healthPath: '/health' },
  { key: 'market',   name: 'Market',   base: domainOrigin('market'),   port: '8772', description: 'Quotes SSE, bars and the watchlist',      healthPath: '/health' },
]

export const ALL_SERVICES = [...ARCH_SERVICES, ...ACCOUNT_SERVICES, ...RESEARCH_SERVICES]

/** Most severe lamp in a set — red beats yellow beats green. */
export function worstLamp(lamps: Lamp[]): Lamp {
  if (lamps.includes('red')) return 'red'
  if (lamps.includes('yellow')) return 'yellow'
  return 'green'
}
