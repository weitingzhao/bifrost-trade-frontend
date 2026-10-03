import type { ExecutionSourceScope } from '@/types/trading'

/** Centralised TanStack Query key factory.
 *  Use spread to build full keys: [...QUERY_KEYS.trading.performance, params]
 *  A resource's keys hang off one prefix, so invalidating the prefix reaches
 *  every reading of it — a second literal for the same data is a cache that
 *  writes never refresh.
 */
export const QUERY_KEYS = {
  market: {
    quotesLive: ['market', 'quotes-live'] as const,
    quotesSnapshot: ['market', 'quotes-snapshot'] as const,
    benchmark: (symbol: string) => ['market', 'benchmark', symbol] as const,
    barStats: (symbol: string) => ['market', 'bar-stats', symbol] as const,
  },
  trading: {
    performance: ['trading', 'performance'] as const,
    /** Every executions read sits under this — a fill write invalidates it once. */
    executions: ['trading', 'executions'] as const,
    executionsByScope: (scope: ExecutionSourceScope) => ['trading', 'executions', 'scope', scope] as const,
    /** The Ledger's performance-book reads; nested so a link write elsewhere reaches them. */
    executionsBook: ['trading', 'executions', 'book'] as const,
    optStockLinks: ['trading', 'opt-stock-links'] as const,
    transactions: ['trading', 'transactions'] as const,
  },
  monitor: {
    status: ['monitor', 'status'] as const,
    openOrders: ['monitor', 'open-orders'] as const,
    /** `/api/messages` and its stream — the monitor serves them. */
    systemMessages: ['monitor', 'system-messages'] as const,
  },
  portfolio: {
    modelAnalysis: ['portfolio', 'model-analysis'] as const,
    positionCategories: ['portfolio', 'position-categories'] as const,
    marketStreamsSymbolOrder: ['portfolio', 'market-streams-symbol-order'] as const,
    shortLegs: ['portfolio', 'short-legs'] as const,
  },
  research: {
    greeks: ['research', 'greeks'] as const,
    screener: ['research', 'screener'] as const,
    watchlist: ['research', 'watchlist'] as const,
    performanceKelly: ['research', 'performance-kelly'] as const,
    universeReach: ['research', 'universe-reach'] as const,
    lenses: ['research', 'lenses'] as const,
    exhibit: (lens: string, symbol: string) => ['research', 'exhibit', lens, symbol] as const,
    exhibitComposite: (symbol: string, lenses: string) =>
      ['research', 'exhibit-composite', symbol, lenses] as const,
    candidateOutcome: {
      summary: ['research', 'candidate-outcome', 'summary'] as const,
      rows: ['research', 'candidate-outcome', 'rows'] as const,
    },
    tickerOverview: (symbol: string) => ['research', 'ticker-overview', symbol] as const,
    fundConditions: (symbol: string) => ['research', 'fundamental-conditions', symbol] as const,
    techConditions: (symbol: string) => ['research', 'technical-conditions', symbol] as const,
    fundRaw: (symbol: string) => ['research', 'fund-raw', symbol] as const,
    statements: (symbol: string) => ['research', 'statements', symbol] as const,
    optionPcr: (symbol: string) => ['research', 'option-pcr', symbol] as const,
    ivRadar: ['research', 'iv-radar'] as const,
    scan: ['research', 'scan'] as const,
    alerts: ['research', 'alerts'] as const,
    signalDecay: ['research', 'signal-decay'] as const,
    signalDecayIntersect: ['research', 'signal-decay', 'intersect'] as const,
    vrp: {
      latest: (symbol: string) => ['research', 'vrp', 'latest', symbol] as const,
      history: (symbol: string, days: number) =>
        ['research', 'vrp', 'history', symbol, days] as const,
      extremes: (bucket: 'high' | 'low', limit: number) =>
        ['research', 'vrp', 'extremes', bucket, limit] as const,
      rvCone: (symbol: string, years: number) => ['research', 'vrp', 'rv-cone', symbol, years] as const,
      earningsMoves: (symbol: string, limit: number) =>
        ['research', 'vrp', 'earnings-moves', symbol, limit] as const,
    },
    volSurface: {
      fit: (symbol: string, tradeDate: string) =>
        ['research', 'vol-surface', 'fit', symbol, tradeDate] as const,
      residuals: (symbol: string, tradeDate: string, expiry: string) =>
        ['research', 'vol-surface', 'residuals', symbol, tradeDate, expiry] as const,
      skewExtremes: (limit: number) => ['research', 'vol-surface', 'skew-extremes', limit] as const,
      atmIvTerm: (symbol: string) => ['research', 'vol-surface', 'atm-iv-term', symbol] as const,
      ivCone: (symbol: string) => ['research', 'vol-surface', 'iv-cone', symbol] as const,
    },
    hypothesis: {
      list: ['research', 'hypothesis', 'list'] as const,
      summaryActive: ['research', 'hypothesis', 'summary-active'] as const,
      byId: (id: string) => ['research', 'hypothesis', 'by-id', id] as const,
    },
    drafts: ['research', 'drafts'] as const,
    candidates: (params?: { status?: string; source?: string; days?: number }) =>
      ['research', 'candidates', params ?? {}] as const,
    objectives: (params?: { status?: string }) => ['research', 'objectives', params ?? {}] as const,
    objectiveRuns: (params?: { status?: string; objective_id?: string }) =>
      ['research', 'objective-runs', params ?? {}] as const,
    backtest: {
      runs: ['research', 'backtest', 'runs'] as const,
      runsByHypothesis: (hid: string) =>
        ['research', 'backtest', 'runs', 'hypothesis', hid] as const,
      run: (runId: string) => ['research', 'backtest', 'run', runId] as const,
    },
    home: ['research', 'home', 'aggregate'] as const,
  },
  strategy: {
    opportunities: ['strategy', 'opportunities'] as const,
    structures: ['strategy', 'structures'] as const,
    /** One structure's record — under `structures`, so a structure write reaches it. */
    structure: (id: number) => ['strategy', 'structures', 'detail', id] as const,
    templates: {
      root: ['strategy', 'templates'] as const,
      /** `active` is what a structure can be put on; `all` is the whole catalogue. */
      list: (scope: 'active' | 'all') => ['strategy', 'templates', 'list', scope] as const,
      detail: (id: number | null) => ['strategy', 'templates', 'detail', id] as const,
    },
    /** The six-dimension dictionary the catalogue and the gates both read. */
    dims: ['strategy', 'dims'] as const,
    /** Gate sets (`/gate-sets`; the table keeps its legacy name gate_safety_strategy, naming D6-A). */
    gateSets: ['strategy', 'gate-sets'] as const,
    /** Core's GateParams defaults a new gate set is seeded from — outside `gateSets`, so a gate write does not refetch them. */
    gateSetDefaults: ['strategy', 'gate-set-defaults'] as const,
    allocations: ['strategy', 'allocations'] as const,
  },
  /**
   * Trades (`/trades`, `/trade-reviews`; naming R2). Kept under the `strategy` prefix —
   * the gateway's domain — so a Rules write that invalidates `['strategy']` reaches them.
   */
  trades: {
    /** Every list read hangs off this: a trade write invalidates it and all its filters refetch. */
    list: ['strategy', 'trades'] as const,
    detail: ['strategy', 'trade-detail'] as const,
    winRate: ['strategy', 'trades-win-rate'] as const,
    /** Rev .110: one review record per trade, read by Queue, Trade review and the Review badge. */
    reviews: ['strategy', 'trade-reviews'] as const,
  },
  /** Rev .139: a page's scope kept under a name, listed in the sidebar. */
  savedSearches: ['saved-searches'] as const,
  strategyPlans: {
    /** Every plan query hangs off this, so one write refreshes them all. */
    root: ['strategy-plans'] as const,
    list: (f: { status?: string; symbol?: string; accountId?: string; limit?: number } = {}) =>
      ['strategy-plans', 'list', f.status ?? null, f.symbol ?? null, f.accountId ?? null, f.limit ?? null] as const,
  },
  settings: {
    apiHealth: ['settings', 'api-health'] as const,
  },
  plugin: {
    flexConfigSummary: ['plugin', 'flex-query', 'config-summary'] as const,
    flexCoverageFreshness: ['plugin', 'flex-query', 'coverage-freshness'] as const,
  },
} as const
