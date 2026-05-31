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
    celeryBeat:     ['research', 'celery-beat']      as const,
  },
  strategy: {
    instances:      ['strategy', 'instances']        as const,
    opportunities:  ['strategy', 'opportunities']    as const,
    structures:     ['strategy', 'structures']       as const,
    gates:          ['strategy', 'gates']            as const,
    gateSafety:     ['strategy', 'gate-safety']      as const,
    allocations:    ['strategy', 'allocations']      as const,
    winRate:        ['strategy', 'win-rate']         as const,
  },
  ops: {
    workers:            ['ops', 'workers']                   as const,
    queuesSummary:      ['ops', 'queues-summary']            as const,
    workerProfiles:     ['ops', 'worker-profiles']           as const,
    workerInstances:    ['ops', 'worker-instances']          as const,
    celeryCapabilities: ['ops', 'celery-capabilities']       as const,
    aggregatedJobs:     ['ops', 'aggregated-jobs']           as const,
    brokerStatus:       ['ops', 'broker-status']             as const,
    audit:              ['ops', 'audit']                     as const,
    celery:             ['ops', 'celery']                    as const,
    daemon:             ['ops', 'daemon']                    as const,
    massiveJobs:        ['ops', 'massive-jobs']              as const,
    barsJobs:           ['ops', 'bars-jobs']                 as const,
    // Socket / market ingest services
    ingestServices:     ['ops', 'ingest-services']           as const,
    opsHealth:          ['ops', 'ops-health']                as const,
    capabilities:       ['ops', 'capabilities']              as const,
  },
} as const
