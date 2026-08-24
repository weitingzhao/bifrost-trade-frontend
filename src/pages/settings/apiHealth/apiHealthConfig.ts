import { domainOrigin } from '@/lib/devApiUrl'

export interface ServiceDef {
  key: string
  name: string
  base: string
  port: string
  description: string
  healthPath: string
}

export type Lamp = 'green' | 'yellow' | 'red'

export const ARCH_SERVICES: ServiceDef[] = [
  { key: 'monitor', name: 'Monitor',   base: domainOrigin('monitor'), port: '8765', description: 'Daemon status & control', healthPath: '/health' },
  { key: 'ops',     name: 'Ops',       base: domainOrigin('ops'),     port: '8768', description: 'Operations control',       healthPath: '/health' },
  { key: 'docs',    name: 'Docs',      base: domainOrigin('docs'),    port: '8767', description: 'OpenAPI gateway',           healthPath: '/health' },
]

export const ACCOUNT_SERVICES: ServiceDef[] = [
  { key: 'trading',   name: 'Trading',   base: domainOrigin('trading'),   port: '8769', description: 'Orders & positions',   healthPath: '/health' },
  { key: 'portfolio', name: 'Portfolio', base: domainOrigin('portfolio'), port: '8771', description: 'Multi-account Greeks', healthPath: '/health' },
]

export const RESEARCH_SERVICES: ServiceDef[] = [
  { key: 'research', name: 'Research', base: domainOrigin('research'), port: '8773', description: 'SEPA screener & backtest',  healthPath: '/health' },
  { key: 'strategy', name: 'Strategy', base: domainOrigin('strategy'), port: '8770', description: 'Strategy gate',             healthPath: '/health' },
  { key: 'market',   name: 'Market',   base: domainOrigin('market'),   port: '8772', description: 'Real-time quotes SSE',      healthPath: '/health' },
]

export const ALL_SERVICES = [...ARCH_SERVICES, ...ACCOUNT_SERVICES, ...RESEARCH_SERVICES]

export const DOC_PATHS: Record<string, { swagger: string; redoc: string; openapi: string | null }> = {
  monitor:   { swagger: '/docs',                  redoc: '/redoc',                  openapi: '/openapi.json'           },
  ops:       { swagger: '/ops/docs',              redoc: '/ops/redoc',              openapi: '/ops/openapi.json'       },
  docs:      { swagger: '/research/docs/docs',    redoc: '/research/docs/redoc',    openapi: '/research/docs/openapi.json' },
  trading:   { swagger: '/trading/docs',          redoc: '/trading/redoc',          openapi: '/trading/openapi.json'   },
  portfolio: { swagger: '/portfolio/docs',        redoc: '/portfolio/redoc',        openapi: '/portfolio/openapi.json' },
  research:  { swagger: '/docs',                  redoc: '/redoc',                  openapi: '/openapi.json'           },
  strategy:  { swagger: '/strategy/docs',         redoc: '/strategy/redoc',         openapi: '/strategy/openapi.json'  },
  market:    { swagger: '/market/docs',           redoc: '/market/redoc',           openapi: '/market/openapi.json'    },
}
