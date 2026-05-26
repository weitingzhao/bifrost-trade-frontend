/** Centralised TanStack Query key factory.
 *  Use spread to build full keys: [...QUERY_KEYS.trading.performance, params]
 */
export const QUERY_KEYS = {
  market: {
    quotesLive:     ['market', 'quotes-live']       as const,
    quotesSnapshot: ['market', 'quotes-snapshot']   as const,
    systemMessages: ['market', 'system-messages']   as const,
  },
  trading: {
    performance:    ['trading', 'performance']       as const,
    executions:     ['trading', 'executions']        as const,
    executionsBook: ['trading', 'executions-book']   as const,
    optStockLinks:  ['trading', 'opt-stock-links']   as const,
  },
  monitor: {
    status:         ['monitor', 'status']            as const,
    heartbeat:      ['monitor', 'heartbeat']         as const,
    operations:     ['monitor', 'operations']        as const,
  },
  portfolio: {
    accounts:       ['portfolio', 'accounts']        as const,
    positions:      ['portfolio', 'positions']       as const,
  },
  research: {
    greeks:         ['research', 'greeks']           as const,
    screener:       ['research', 'screener']         as const,
    stockData:      ['research', 'stock-data']       as const,
  },
  strategy: {
    instances:      ['strategy', 'instances']        as const,
    opportunities:  ['strategy', 'opportunities']    as const,
    structures:     ['strategy', 'structures']       as const,
    gates:          ['strategy', 'gates']            as const,
  },
  ops: {
    celery:         ['ops', 'celery']                as const,
    daemon:         ['ops', 'daemon']                as const,
  },
} as const
