/** Centralised TanStack Query key factory.
 *  Use spread to build full keys: [...QUERY_KEYS.trading.performance, params]
 */
export const QUERY_KEYS = {
  market: {
    quotesLive:     ['market', 'quotes-live']       as const,
    quotesSnapshot: ['market', 'quotes-snapshot']   as const,
    systemMessages: ['market', 'system-messages']   as const,
    benchmark:      (symbol: string) => ['market', 'benchmark', symbol] as const,
  },
  trading: {
    performance:    ['trading', 'performance']       as const,
    executions:     ['trading', 'executions']        as const,
    executionsBook: ['trading', 'executions-book']   as const,
    optStockLinks:  ['trading', 'opt-stock-links']   as const,
    transactions:   ['trading', 'transactions']      as const,
  },
  monitor: {
    status:         ['monitor', 'status']            as const,
    openOrders:     ['monitor', 'open-orders']       as const,
    heartbeat:      ['monitor', 'heartbeat']         as const,
    operations:     ['monitor', 'operations']        as const,
    riskSummary:    ['monitor', 'risk-summary']      as const,
    subscribeExecutions: (statusTick: number | undefined) =>
      ['monitor', 'subscribe', 'executions', statusTick] as const,
  },
  portfolio: {
    accounts:              ['portfolio', 'accounts']              as const,
    positions:             ['portfolio', 'positions']             as const,
    modelAnalysis:         ['portfolio', 'model-analysis']        as const,
    positionCategories:    ['portfolio', 'position-categories']   as const,
    marketStreamsSymbolOrder: ['portfolio', 'market-streams-symbol-order'] as const,
  },
  research: {
    greeks:         ['research', 'greeks']           as const,
    screener:       ['research', 'screener']         as const,
    stockData:      ['research', 'stock-data']       as const,
    watchlist:      ['research', 'watchlist']        as const,
    performanceKelly: ['research', 'performance-kelly'] as const,
    universeReach:  ['research', 'universe-reach']    as const,
    candidateOutcome: {
      summary:     ['research', 'candidate-outcome', 'summary'] as const,
      rows:        ['research', 'candidate-outcome', 'rows']    as const,
    },
    stockDataReadiness: {
      summary:       ['research', 'stock-data-readiness', 'summary'] as const,
      criteriaStats: ['research', 'stock-data-readiness', 'criteria-stats'] as const,
    },
    stockScreener: {
      criteriaStats:    ['research', 'stock-screener', 'criteria-stats'] as const,
      fundDistSymbols:  (n: number) => ['research', 'stock-screener', 'fund-dist', n] as const,
      techDistSymbols:  (n: number) => ['research', 'stock-screener', 'tech-dist', n] as const,
      readinessSnapshot: (key: string) => ['research', 'stock-screener', 'snapshot', key] as const,
    },
    stockInspector: (symbol: string) => ['research', 'stock-inspector', symbol] as const,
    tickerOverview:   (symbol: string) => ['research', 'ticker-overview', symbol] as const,
    fundConditions:   (symbol: string) => ['research', 'fundamental-conditions', symbol] as const,
    techConditions:   (symbol: string) => ['research', 'technical-conditions', symbol] as const,
    fundRaw:          (symbol: string) => ['research', 'fund-raw', symbol] as const,
    statements:       (symbol: string) => ['research', 'statements', symbol] as const,
    optionPcr:        (symbol: string) => ['research', 'option-pcr', symbol] as const,
    barStats:         (symbol: string) => ['market', 'bar-stats', symbol] as const,
    discovery: {
      expirations:    ['research', 'discovery', 'expirations']    as const,
      snapshots:      ['research', 'discovery', 'snapshots']      as const,
      ivTerm:         ['research', 'discovery', 'iv-term']        as const,
      maxPain:        ['research', 'discovery', 'max-pain']       as const,
      greeksCoverage: ['research', 'discovery', 'greeks-coverage'] as const,
      pluginStatus:  ['research', 'discovery', 'plugin-status']  as const,
      dailyChecklist: ['research', 'discovery', 'daily-checklist'] as const,
    },
    ivRadar:        ['research', 'iv-radar']                     as const,
    scan:           ['research', 'scan']                         as const,
    alerts:         ['research', 'alerts']                       as const,
    signalDecay:    ['research', 'signal-decay']                 as const,
    signalDecayIntersect: ['research', 'signal-decay', 'intersect'] as const,
    vrp: {
      latest:     (symbol: string) => ['research', 'vrp', 'latest', symbol] as const,
      history:    (symbol: string, days: number) =>
        ['research', 'vrp', 'history', symbol, days] as const,
      extremes:   (bucket: 'high' | 'low', limit: number) =>
        ['research', 'vrp', 'extremes', bucket, limit] as const,
    },
    volSurface: {
      fit:           (symbol: string, tradeDate: string) =>
        ['research', 'vol-surface', 'fit', symbol, tradeDate] as const,
      termStructure: (symbol: string, tradeDate: string) =>
        ['research', 'vol-surface', 'term', symbol, tradeDate] as const,
      residuals:     (symbol: string, tradeDate: string, expiry: string) =>
        ['research', 'vol-surface', 'residuals', symbol, tradeDate, expiry] as const,
      skewExtremes:  (limit: number) =>
        ['research', 'vol-surface', 'skew-extremes', limit] as const,
    },
    opexCycle: {
      current:     (symbol: string, tradeDate: string) =>
        ['research', 'opex-cycle', 'current', symbol, tradeDate] as const,
      history:     (symbol: string, cycles: number) =>
        ['research', 'opex-cycle', 'history', symbol, cycles] as const,
      pinAnalysis: (symbol: string, cycles: number) =>
        ['research', 'opex-cycle', 'pin-analysis', symbol, cycles] as const,
    },
    hypothesis: {
      list:            ['research', 'hypothesis', 'list']         as const,
      active:          ['research', 'hypothesis', 'active']       as const,
      summaryActive:   ['research', 'hypothesis', 'summary-active'] as const,
      byId:            (id: string) => ['research', 'hypothesis', 'by-id', id] as const,
    },
    drafts: ['research', 'drafts'] as const,
    candidates: (params?: { status?: string; source?: string; days?: number }) =>
      ['research', 'candidates', params ?? {}] as const,
    objectives: (params?: { status?: string }) =>
      ['research', 'objectives', params ?? {}] as const,
    objectiveRuns: (params?: { status?: string; objective_id?: string }) =>
      ['research', 'objective-runs', params ?? {}] as const,
    orderIntents: (params?: { status?: string }) =>
      ['research', 'order-intents', params ?? {}] as const,
    backtest: {
      runs:            ['research', 'backtest', 'runs']           as const,
      runsByHypothesis: (hid: string) =>
        ['research', 'backtest', 'runs', 'hypothesis', hid] as const,
      run:             (runId: string) =>
        ['research', 'backtest', 'run', runId] as const,
    },
    home:             ['research', 'home', 'aggregate']           as const,
  },
  strategy: {
    instances:      ['strategy', 'instances']        as const,
    instanceDetail: ['strategy', 'instance-detail']  as const,
    opportunities:  ['strategy', 'opportunities']    as const,
    structures:     ['strategy', 'structures']       as const,
    structureDetail:['strategy', 'structure-detail'] as const,
    gates:          ['strategy', 'gates']            as const,
    gateSafety:     ['strategy', 'gate-safety']      as const,
    allocations:    ['strategy', 'allocations']      as const,
    winRate:        ['strategy', 'win-rate']         as const,
  },
  settings: {
    apiHealth:        ['settings', 'api-health']        as const,
    apiHealthMarketData: ['settings', 'api-health', 'market-data-status'] as const,
  },
  ops: {
    // Socket / market ingest services
    ingestServices:     ['ops', 'ingest-services']           as const,
    opsHealth:          ['ops', 'ops-health']                as const,
    capabilities:       ['ops', 'capabilities']              as const,
  },
  plugin: {
    flexConfigSummary: ['plugin', 'flex-query', 'config-summary'] as const,
    flexCoverageFreshness: ['plugin', 'flex-query', 'coverage-freshness'] as const,
  },
} as const
