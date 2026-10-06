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
    /** `/api/market/watchlist` — the market app serves it, so its key is under `market`. */
    watchlist: ['market', 'watchlist'] as const,
  },
  trading: {
    performance: ['trading', 'performance'] as const,
    /** `/performance?summary_only=true` — under `performance`, so a write that refreshes it refreshes this. */
    performanceSummary: ['trading', 'performance', 'summary-only'] as const,
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
  /**
   * The Trade API's research app (`/api/research/…`, `tradeResearchUrl`): screener, Greeks,
   * data readiness, option discovery and feedback. Not the Research service — that is
   * `researchEngine`. Invalidating `tradeResearch.root` reaches every key below.
   */
  tradeResearch: {
    root: ['trade-research'] as const,
    greeks: ['trade-research', 'greeks'] as const,
    screener: ['trade-research', 'screener'] as const,
    tickerOverview: (symbol: string) => ['trade-research', 'ticker-overview', symbol] as const,
    fundConditions: (symbol: string) => ['trade-research', 'fundamental-conditions', symbol] as const,
    techConditions: (symbol: string) => ['trade-research', 'technical-conditions', symbol] as const,
    fundRaw: (symbol: string) => ['trade-research', 'fund-raw', symbol] as const,
    statements: (symbol: string) => ['trade-research', 'statements', symbol] as const,
    optionPcr: (symbol: string) => ['trade-research', 'option-pcr', symbol] as const,
    /** `/research/data/readiness/criteria-stats`. */
    criteriaStats: ['trade-research', 'readiness', 'criteria-stats'] as const,
    /** `/research/data/readiness/tier-stats?tier=`. */
    tierStats: (tier: 'structure' | 'sentiment' | 'momentum') => ['trade-research', 'tier-stats', tier] as const,
    /** One Stock screen chip's server set (`momentum-filter` / `tier-filter`). */
    screenSet: (stage: string, id: string) => ['trade-research', 'screen-set', stage, id] as const,
    feedback: {
      /** Every feedback read hangs off this; a feedback write invalidates it once. */
      root: ['trade-research', 'feedback'] as const,
      summary: ['trade-research', 'feedback', 'summary'] as const,
      reports: (scope: string) => ['trade-research', 'feedback', 'reports', scope] as const,
    },
  },
  /**
   * The Research service (bifrost-research `research-api`, OLAP) — every read made with
   * `researchEngineUrl`, i.e. `/api/plugin/research/…`. A key goes under the backend whose
   * rows it holds; the Trade API's own research app is `tradeResearch`, a separate prefix.
   */
  researchEngine: {
    root: ['research-engine'] as const,
    universeReach: ['research-engine', 'universe-reach'] as const,
    lenses: ['research-engine', 'lenses'] as const,
    exhibit: (lens: string, symbol: string) => ['research-engine', 'exhibit', lens, symbol] as const,
    exhibitComposite: (symbol: string, lenses: string) =>
      ['research-engine', 'exhibit-composite', symbol, lenses] as const,
    candidateOutcome: {
      summary: ['research-engine', 'candidate-outcome', 'summary'] as const,
      rows: ['research-engine', 'candidate-outcome', 'rows'] as const,
    },
    scan: ['research-engine', 'scan'] as const,
    /** Active Pine scripts; saving one invalidates `['research-engine', 'pine']`. */
    pineScripts: ['research-engine', 'pine', 'scripts'] as const,
    pine: ['research-engine', 'pine'] as const,
    pineScriptsWithSource: ['research-engine', 'pine', 'scripts', 'with-source'] as const,
    pineContext: ['research-engine', 'pine', 'context'] as const,
    pineSignalsWithin: (sessions: number) => ['research-engine', 'pine', 'signals', 'within', sessions] as const,
    pineSignalStats: (script: string, side: string, basket: string) =>
      ['research-engine', 'pine', 'signal-stats', script, side, basket] as const,
    indicatorSignalStats: (signal: string, basket: string) =>
      ['research-engine', 'indicators', 'signal-stats', signal, basket] as const,
    /** What each saved-screen vocabulary accepts (`/research/screens/vocabulary`). */
    screenVocabulary: ['research-engine', 'saved-screens', 'vocabulary'] as const,
    /** research-api `/health` — its version decides the simulator's offset basis. */
    health: ['research-engine', 'health'] as const,
    alerts: ['research-engine', 'alerts'] as const,
    signalDecay: ['research-engine', 'signal-decay'] as const,
    signalDecayIntersect: ['research-engine', 'signal-decay', 'intersect'] as const,
    vrp: {
      latest: (symbol: string) => ['research-engine', 'vrp', 'latest', symbol] as const,
      history: (symbol: string, days: number) =>
        ['research-engine', 'vrp', 'history', symbol, days] as const,
      extremes: (bucket: 'high' | 'low', limit: number) =>
        ['research-engine', 'vrp', 'extremes', bucket, limit] as const,
      rvCone: (symbol: string, years: number) => ['research-engine', 'vrp', 'rv-cone', symbol, years] as const,
      earningsMoves: (symbol: string, limit: number) =>
        ['research-engine', 'vrp', 'earnings-moves', symbol, limit] as const,
    },
    volSurface: {
      fit: (symbol: string, tradeDate: string) =>
        ['research-engine', 'vol-surface', 'fit', symbol, tradeDate] as const,
      residuals: (symbol: string, tradeDate: string, expiry: string) =>
        ['research-engine', 'vol-surface', 'residuals', symbol, tradeDate, expiry] as const,
      skewExtremes: (limit: number) => ['research-engine', 'vol-surface', 'skew-extremes', limit] as const,
      atmIvTerm: (symbol: string) => ['research-engine', 'vol-surface', 'atm-iv-term', symbol] as const,
      ivCone: (symbol: string) => ['research-engine', 'vol-surface', 'iv-cone', symbol] as const,
    },
    hypothesis: {
      list: ['research-engine', 'hypothesis', 'list'] as const,
      summaryActive: ['research-engine', 'hypothesis', 'summary-active'] as const,
      byId: (id: string) => ['research-engine', 'hypothesis', 'by-id', id] as const,
    },
    drafts: ['research-engine', 'drafts'] as const,
    candidates: (params?: { status?: string; source?: string; days?: number }) =>
      ['research-engine', 'candidates', params ?? {}] as const,
    objectives: (params?: { status?: string }) => ['research-engine', 'objectives', params ?? {}] as const,
    objectiveRuns: (params?: { status?: string; objective_id?: string }) =>
      ['research-engine', 'objective-runs', params ?? {}] as const,
    backtest: {
      runs: ['research-engine', 'backtest', 'runs'] as const,
      runsByHypothesis: (hid: string) =>
        ['research-engine', 'backtest', 'runs', 'hypothesis', hid] as const,
      run: (runId: string) => ['research-engine', 'backtest', 'run', runId] as const,
      /** A simulator run's trades and curve — under `run`, so a rerun's invalidation reaches it. */
      simDetail: (runId: string) => ['research-engine', 'backtest', 'run', runId, 'sim'] as const,
    },
    home: ['research-engine', 'home', 'aggregate'] as const,
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
    /** IV percentile / rank over a symbol set, read from the market-data plugin (`/market/analytics/iv-percentile`). */
    ivRadar: ['plugin', 'market-data', 'iv-radar'] as const,
    ivPercentile: (symbol: string) => ['plugin', 'market-data', 'iv-percentile', symbol] as const,
    flexConfigSummary: ['plugin', 'flex-query', 'config-summary'] as const,
    flexCoverageFreshness: ['plugin', 'flex-query', 'coverage-freshness'] as const,
    /** One name's corporate actions (`/market/corporate-actions`, the default 400 rows) — Corporate Actions and the Calendar share it. */
    corporateActions: (symbol: string) => ['market-data', 'corporate-actions', symbol] as const,
  },
} as const
