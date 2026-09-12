import { domainOrigin } from '@/lib/devApiUrl'

/**
 * Every gateway route key, in docs-table order.
 *
 * Typing `key` as this union — and looking routes up in a record keyed by it —
 * is what stops the route table and the panels that read it from drifting
 * apart: move a key and every reader of it stops compiling, instead of
 * returning `undefined` at render time.
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
 * served are still real and still listed in the docs table below; they are
 * routes, not services, and a health board that counts routes as services
 * reports redundancy as coverage.
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
  { key: 'research', name: 'Research', base: domainOrigin('research'), port: '8773', description: 'SEPA screener & backtest',  healthPath: '/health' },
  { key: 'market',   name: 'Market',   base: domainOrigin('market'),   port: '8772', description: 'Real-time quotes SSE',      healthPath: '/health' },
]

export const ALL_SERVICES = [...ARCH_SERVICES, ...ACCOUNT_SERVICES, ...RESEARCH_SERVICES]

/**
 * Every gateway route that publishes an OpenAPI document.
 *
 * Kept at eight while the health board collapsed to four: these are routes the
 * gateway really serves, and a developer looking for the strategy schema needs
 * `/strategy/docs` whether or not `bifrost-account` also answers to `/trading`.
 *
 * Keyed by route, because the API Details panels each ask for one route by
 * name. `API_ROUTES.ops` is total; the `find(…)!` over a services array it
 * replaces went undefined the moment `ops` became a route rather than a lamp.
 */
export const API_ROUTES: Record<ApiRouteKey, ServiceDef> = {
  monitor:   { key: 'monitor',   name: 'Monitor',   base: domainOrigin('monitor'),   port: '8765', description: 'Daemon status & control',  healthPath: '/health' },
  ops:       { key: 'ops',       name: 'Ops',       base: domainOrigin('ops'),       port: '8768', description: 'Operations control',       healthPath: '/health' },
  docs:      { key: 'docs',      name: 'Docs',      base: domainOrigin('docs'),      port: '8767', description: 'OpenAPI gateway',          healthPath: '/health' },
  trading:   { key: 'trading',   name: 'Trading',   base: domainOrigin('trading'),   port: '8769', description: 'Orders & positions',       healthPath: '/health' },
  portfolio: { key: 'portfolio', name: 'Portfolio', base: domainOrigin('portfolio'), port: '8771', description: 'Multi-account Greeks',     healthPath: '/health' },
  strategy:  { key: 'strategy',  name: 'Strategy',  base: domainOrigin('strategy'),  port: '8770', description: 'Strategy gate',            healthPath: '/health' },
  research:  { key: 'research',  name: 'Research',  base: domainOrigin('research'),  port: '8773', description: 'SEPA screener & backtest', healthPath: '/health' },
  market:    { key: 'market',    name: 'Market',    base: domainOrigin('market'),    port: '8772', description: 'Real-time quotes SSE',     healthPath: '/health' },
}

/** The same routes as a list, for the documentation table. */
export const DOC_SERVICES: ServiceDef[] = API_ROUTE_KEYS.map((key) => API_ROUTES[key])

export const DOC_PATHS: Record<ApiRouteKey, { swagger: string; redoc: string; openapi: string | null }> = {
  monitor:   { swagger: '/docs',                  redoc: '/redoc',                  openapi: '/openapi.json'           },
  ops:       { swagger: '/ops/docs',              redoc: '/ops/redoc',              openapi: '/ops/openapi.json'       },
  docs:      { swagger: '/research/docs/docs',    redoc: '/research/docs/redoc',    openapi: '/research/docs/openapi.json' },
  trading:   { swagger: '/trading/docs',          redoc: '/trading/redoc',          openapi: '/trading/openapi.json'   },
  portfolio: { swagger: '/portfolio/docs',        redoc: '/portfolio/redoc',        openapi: '/portfolio/openapi.json' },
  research:  { swagger: '/docs',                  redoc: '/redoc',                  openapi: '/openapi.json'           },
  strategy:  { swagger: '/strategy/docs',         redoc: '/strategy/redoc',         openapi: '/strategy/openapi.json'  },
  market:    { swagger: '/market/docs',           redoc: '/market/redoc',           openapi: '/market/openapi.json'    },
}

/** Most severe lamp in a set — red beats yellow beats green. */
export function worstLamp(lamps: Lamp[]): Lamp {
  if (lamps.includes('red')) return 'red'
  if (lamps.includes('yellow')) return 'yellow'
  return 'green'
}
