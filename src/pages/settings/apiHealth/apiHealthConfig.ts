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
  { key: 'monitor', name: 'Monitor',   base: import.meta.env.VITE_API_MONITOR  as string, port: '8765', description: 'Daemon status & control', healthPath: '/health' },
  { key: 'ops',     name: 'Ops',       base: import.meta.env.VITE_API_OPS      as string, port: '8768', description: 'Celery management',        healthPath: '/health' },
  { key: 'docs',    name: 'Docs',      base: import.meta.env.VITE_API_DOCS     as string, port: '8767', description: 'OpenAPI gateway',           healthPath: '/health' },
]

export const ACCOUNT_SERVICES: ServiceDef[] = [
  { key: 'trading',   name: 'Trading',   base: import.meta.env.VITE_API_TRADING   as string, port: '8769', description: 'Orders & positions',   healthPath: '/health' },
  { key: 'portfolio', name: 'Portfolio', base: import.meta.env.VITE_API_PORTFOLIO as string, port: '8771', description: 'Multi-account Greeks', healthPath: '/health' },
]

export const RESEARCH_SERVICES: ServiceDef[] = [
  { key: 'research', name: 'Research', base: import.meta.env.VITE_API_RESEARCH as string, port: '8773', description: 'SEPA screener & backtest',  healthPath: '/health' },
  { key: 'strategy', name: 'Strategy', base: import.meta.env.VITE_API_STRATEGY as string, port: '8770', description: 'Strategy gate',             healthPath: '/health' },
  { key: 'market',   name: 'Market',   base: import.meta.env.VITE_API_MARKET   as string, port: '8772', description: 'Real-time quotes SSE',      healthPath: '/health' },
]

export const MASSIVE_SERVICES: ServiceDef[] = [
  { key: 'massive', name: 'Massive', base: import.meta.env.VITE_API_MASSIVE as string, port: '8766', description: 'Polygon data query', healthPath: '/research/massive/health' },
]

export const ALL_SERVICES = [...ARCH_SERVICES, ...ACCOUNT_SERVICES, ...RESEARCH_SERVICES, ...MASSIVE_SERVICES]

export const DOC_PATHS: Record<string, { swagger: string; redoc: string; openapi: string | null }> = {
  monitor:   { swagger: '/docs',                  redoc: '/redoc',                  openapi: '/openapi.json'           },
  ops:       { swagger: '/ops/docs',              redoc: '/ops/redoc',              openapi: '/ops/openapi.json'       },
  docs:      { swagger: '/research/docs/docs',    redoc: '/research/docs/redoc',    openapi: '/research/docs/openapi.json' },
  trading:   { swagger: '/trading/docs',          redoc: '/trading/redoc',          openapi: '/trading/openapi.json'   },
  portfolio: { swagger: '/portfolio/docs',        redoc: '/portfolio/redoc',        openapi: '/portfolio/openapi.json' },
  research:  { swagger: '/docs',                  redoc: '/redoc',                  openapi: '/openapi.json'           },
  strategy:  { swagger: '/strategy/docs',         redoc: '/strategy/redoc',         openapi: '/strategy/openapi.json'  },
  market:    { swagger: '/market/docs',           redoc: '/market/redoc',           openapi: '/market/openapi.json'    },
  massive:   { swagger: '/research/massive/docs', redoc: '/research/massive/redoc', openapi: '/research/massive/openapi.json' },
}
