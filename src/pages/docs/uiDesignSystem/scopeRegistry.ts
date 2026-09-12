/** Prompt scope registry — site / domain / page paths for scoped Fix Prompts. */

export type PromptDomainId =
  | 'market'
  | 'portfolio'
  | 'research'
  | 'strategy'
  | 'system'

export type PromptScope =
  | { kind: 'site' }
  | { kind: 'domain'; domain: PromptDomainId }
  | { kind: 'page'; route: string; label: string; domain: PromptDomainId }

export interface PromptDomainDef {
  id: PromptDomainId
  label: string
  /** Globs relative to repo src/ root (bifrost-trade-frontend). */
  pathGlobs: string[]
}

export interface PromptPageDef {
  route: string
  label: string
  domain: PromptDomainId
  /** Page-specific globs; merged with domain globs when building scope. */
  pathGlobs: string[]
}

export const PROMPT_DOMAINS: PromptDomainDef[] = [
  {
    id: 'market',
    label: 'Market',
    pathGlobs: ['pages/market/**', 'hooks/useQuoteStream.ts', 'hooks/useLiveMarketStreams.ts'],
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    pathGlobs: [
      'pages/portfolio/**',
      'components/positions/**',
      'components/accounts/**',
      'components/performance/**',
      'utils/ledger/**',
      'utils/openStockPositions.ts',
      'utils/independentHoldings.ts',
      'hooks/useLedger*.ts',
      'hooks/usePerformance*.ts',
      'hooks/usePositions*.ts',
    ],
  },
  {
    id: 'research',
    label: 'Research',
    pathGlobs: [
      'pages/research/**',
      'components/optionDiscovery/**',
      'hooks/useWatchlist*.ts',
      'hooks/useScreener*.ts',
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy',
    pathGlobs: ['pages/strategy/**', 'components/strategy/**', 'hooks/useStrategies.ts'],
  },
  {
    // `operations` and `settings` were two domains over one subject. The
    // second navigation shell that made them feel separate is gone with
    // `SettingsLayout`; the pages live under `pages/system/`.
    id: 'system',
    label: 'System',
    pathGlobs: ['pages/system/**', 'components/topology/**'],
  },
]

export const PROMPT_PAGES: PromptPageDef[] = [
  { route: '/market/live', label: 'Live', domain: 'market', pathGlobs: ['pages/market/live/**'] },

  { route: '/portfolio/accounts', label: 'Accounts', domain: 'portfolio', pathGlobs: ['pages/portfolio/AccountsPage.tsx', 'components/accounts/**'] },
  { route: '/portfolio/positions', label: 'Positions', domain: 'portfolio', pathGlobs: ['pages/portfolio/PositionsPage.tsx', 'components/positions/**'] },
  { route: '/portfolio/performance', label: 'Performance', domain: 'portfolio', pathGlobs: ['pages/portfolio/PerformancePage.tsx', 'pages/portfolio/performance/**', 'components/performance/**'] },
  { route: '/portfolio/backing', label: 'Backing & Model', domain: 'portfolio', pathGlobs: ['pages/portfolio/backing/**'] },
  { route: '/portfolio/ledger', label: 'Trade Ledger', domain: 'portfolio', pathGlobs: ['pages/portfolio/TradeLedgerPage.tsx', 'pages/portfolio/ledger/**'] },
  { route: '/portfolio/transfer', label: 'Transfer & Pay', domain: 'portfolio', pathGlobs: ['pages/portfolio/TransferPayPage.tsx'] },

  { route: '/research/watchlist', label: 'Stock Watchlist', domain: 'research', pathGlobs: ['pages/research/data/StockWatchlistPage.tsx', 'pages/research/data/watchlist/**'] },
  { route: '/research/stock-screener', label: 'Stock Screener', domain: 'research', pathGlobs: ['pages/research/data/StockScreenerPage.tsx', 'pages/research/data/stockScreener/**'] },
  { route: '/research/screener', label: 'Option Screener', domain: 'research', pathGlobs: ['pages/research/data/ScreenerPage.tsx', 'pages/research/data/optionScreener/**'] },
  { route: '/system/data-readiness', label: 'Data Readiness', domain: 'system', pathGlobs: ['pages/research/data/StockDataPage.tsx', 'pages/research/data/stockDataReadiness/**'] },
  { route: '/research/discovery', label: 'Option Discovery', domain: 'research', pathGlobs: ['pages/research/analyze/DiscoveryPage.tsx'] },
  { route: '/research/vol-regime', label: 'Vol Regime', domain: 'research', pathGlobs: ['pages/research/analyze/volRegime/**', 'pages/research/analyze/hub/**', 'utils/ivRadar/**', 'hooks/useIvRadarData.ts', 'hooks/useHoldingSymbols.ts', 'api/research/ivRadar.ts'] },
  { route: '/research/dealer-levels', label: 'Dealer Levels', domain: 'research', pathGlobs: ['pages/research/analyze/dealerLevels/**'] },
  { route: '/research/scenario', label: 'Scenario Model', domain: 'research', pathGlobs: ['pages/research/analyze/scenario/**'] },
  { route: '/research/flow', label: 'Flow', domain: 'research', pathGlobs: ['pages/research/analyze/flow/**'] },
  { route: '/research/greeks', label: 'Contract Greeks', domain: 'research', pathGlobs: ['pages/research/analyze/GreeksPage.tsx'] },
  { route: '/research/backtest', label: 'Backtest', domain: 'research', pathGlobs: ['pages/research/validate/BacktestPage.tsx'] },

  { route: '/strategy/instances', label: 'Instances', domain: 'strategy', pathGlobs: ['pages/strategy/InstancesPage.tsx', 'components/strategy/instanceDetail/**', 'components/strategy/InstancesGroupedTable.tsx'] },
  { route: '/strategy/win-rate', label: 'Win Rate', domain: 'strategy', pathGlobs: ['pages/strategy/WinRatePage.tsx'] },
  { route: '/strategy/structures', label: 'Structure', domain: 'strategy', pathGlobs: ['pages/strategy/StructuresPage.tsx', 'components/strategy/StructuresTable.tsx'] },
  { route: '/strategy/opportunities', label: 'Opportunity', domain: 'strategy', pathGlobs: ['pages/strategy/OpportunitiesPage.tsx', 'components/strategy/OpportunitiesTable.tsx', 'components/strategy/OpportunityFormModal.tsx'] },
  { route: '/strategy/allocations', label: 'Allocations', domain: 'strategy', pathGlobs: ['pages/strategy/AllocationsPage.tsx'] },
  { route: '/strategy/gates', label: 'Gates', domain: 'strategy', pathGlobs: ['pages/strategy/GatesPage.tsx'] },
  { route: '/strategy/option-category', label: 'Option Category', domain: 'strategy', pathGlobs: ['pages/strategy/OptionCategoryPage.tsx'] },

  { route: '/system/coverage', label: 'Coverage', domain: 'system', pathGlobs: ['pages/system/CoveragePage.tsx', 'pages/system/coverage/**'] },
  { route: '/system/feed', label: 'Feed', domain: 'system', pathGlobs: ['pages/system/FeedPage.tsx', 'pages/system/subscribe/**'] },
  { route: '/system/topology', label: 'Topology', domain: 'system', pathGlobs: ['pages/system/TopologyPage.tsx', 'components/topology/**'] },
  { route: '/system/daemon', label: 'Daemon', domain: 'system', pathGlobs: ['pages/system/DaemonStatusPage.tsx', 'pages/system/daemon/**'] },
  { route: '/system/api', label: 'API Health', domain: 'system', pathGlobs: ['pages/system/ApiHealthPage.tsx', 'pages/system/apiHealth/**'] },
  { route: '/system/socket', label: 'Socket', domain: 'system', pathGlobs: ['pages/system/SocketPage.tsx', 'pages/system/socket/**'] },
  { route: '/system/platform', label: 'Platform', domain: 'system', pathGlobs: ['pages/system/PlatformPluginsPage.tsx'] },
  { route: '/system/ib', label: 'IB Connection', domain: 'system', pathGlobs: ['pages/system/IbConnectionPage.tsx'] },

  { route: '/docs/ui-design-system', label: 'UI Design System', domain: 'system', pathGlobs: ['pages/docs/UiDesignSystemPage.tsx', 'pages/docs/uiDesignSystem/**'] },
  { route: '/docs/tech-stack', label: 'Tech Stack', domain: 'system', pathGlobs: ['pages/docs/TechStackPage.tsx'] },
]

const SITE_PATH_GLOBS = ['pages/**', 'components/**', 'hooks/**', 'utils/**', 'layout/**']

export function getDomainDef(id: PromptDomainId): PromptDomainDef {
  const def = PROMPT_DOMAINS.find(d => d.id === id)
  if (!def) throw new Error(`Unknown domain: ${id}`)
  return def
}

export function resolveScopePathGlobs(scope: PromptScope): string[] {
  if (scope.kind === 'site') return SITE_PATH_GLOBS
  if (scope.kind === 'domain') return getDomainDef(scope.domain).pathGlobs
  const page = PROMPT_PAGES.find(p => p.route === scope.route)
  const domainGlobs = getDomainDef(scope.domain).pathGlobs
  if (!page) return domainGlobs
  return [...new Set([...page.pathGlobs, ...domainGlobs])]
}

export function formatScopeLabel(scope: PromptScope): string {
  if (scope.kind === 'site') return '全站 (site-wide)'
  if (scope.kind === 'domain') return getDomainDef(scope.domain).label
  return `${scope.label} (${scope.route})`
}

export function formatScopePathsForPrompt(scope: PromptScope): string {
  const globs = resolveScopePathGlobs(scope)
  const lines = globs.map(g => `- src/${g}`)
  return lines.join('\n')
}

export const DEFAULT_PROMPT_SCOPE: PromptScope = { kind: 'site' }

export function pagesByDomain(domain: PromptDomainId): PromptPageDef[] {
  return PROMPT_PAGES.filter(p => p.domain === domain)
}
