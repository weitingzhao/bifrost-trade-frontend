/** Prompt scope registry — site / domain / page paths for scoped Fix Prompts. */

export type PromptDomainId =
  | 'market'
  | 'portfolio'
  | 'research'
  | 'strategy'
  | 'operations'
  | 'settings'

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
    id: 'operations',
    label: 'Operations',
    pathGlobs: ['pages/operations/**'],
  },
  {
    id: 'settings',
    label: 'Settings',
    pathGlobs: ['pages/settings/**', 'layout/SettingsLayout.tsx'],
  },
]

export const PROMPT_PAGES: PromptPageDef[] = [
  { route: '/market/live', label: 'Live', domain: 'market', pathGlobs: ['pages/market/live/**'] },

  { route: '/portfolio/accounts', label: 'Accounts', domain: 'portfolio', pathGlobs: ['pages/portfolio/AccountsPage.tsx', 'components/accounts/**'] },
  { route: '/portfolio/positions', label: 'Positions', domain: 'portfolio', pathGlobs: ['pages/portfolio/PositionsPage.tsx', 'components/positions/**'] },
  { route: '/portfolio/performance', label: 'Performance', domain: 'portfolio', pathGlobs: ['pages/portfolio/PerformancePage.tsx', 'pages/portfolio/performance/**', 'components/performance/**'] },
  { route: '/portfolio/model-analysis', label: 'Model Analysis', domain: 'portfolio', pathGlobs: ['pages/portfolio/ModelAnalysisPage.tsx', 'pages/portfolio/modelAnalysis/**'] },
  { route: '/portfolio/ledger', label: 'Trade Ledger', domain: 'portfolio', pathGlobs: ['pages/portfolio/TradeLedgerPage.tsx', 'pages/portfolio/ledger/**'] },
  { route: '/portfolio/transfer', label: 'Transfer & Pay', domain: 'portfolio', pathGlobs: ['pages/portfolio/TransferPayPage.tsx'] },

  { route: '/research/watchlist', label: 'Stock Watchlist', domain: 'research', pathGlobs: ['pages/research/StockWatchlistPage.tsx', 'pages/research/watchlist/**'] },
  { route: '/research/sepa', label: 'Stock Screener', domain: 'research', pathGlobs: ['pages/research/StockScreenerPage.tsx', 'pages/research/stockScreener/**'] },
  { route: '/research/screener', label: 'Option Screener', domain: 'research', pathGlobs: ['pages/research/ScreenerPage.tsx', 'pages/research/optionScreener/**'] },
  { route: '/research/stock-data', label: 'Stock Data Readiness', domain: 'research', pathGlobs: ['pages/research/StockDataPage.tsx'] },
  { route: '/research/discovery', label: 'Option Discovery', domain: 'research', pathGlobs: ['pages/research/DiscoveryPage.tsx'] },
  { route: '/research/greeks', label: 'IV & Greeks', domain: 'research', pathGlobs: ['pages/research/GreeksPage.tsx'] },
  { route: '/research/risk', label: 'Risk Model', domain: 'research', pathGlobs: ['pages/research/RiskModelPage.tsx'] },
  { route: '/research/backtest', label: 'Backtest', domain: 'research', pathGlobs: ['pages/research/BacktestPage.tsx'] },

  { route: '/strategy/instances', label: 'Instances', domain: 'strategy', pathGlobs: ['pages/strategy/InstancesPage.tsx', 'components/strategy/instanceDetail/**', 'components/strategy/InstancesGroupedTable.tsx'] },
  { route: '/strategy/win-rate', label: 'Win Rate', domain: 'strategy', pathGlobs: ['pages/strategy/WinRatePage.tsx'] },
  { route: '/strategy/structures', label: 'Structure', domain: 'strategy', pathGlobs: ['pages/strategy/StructuresPage.tsx', 'components/strategy/StructuresTable.tsx'] },
  { route: '/strategy/opportunities', label: 'Opportunity', domain: 'strategy', pathGlobs: ['pages/strategy/OpportunitiesPage.tsx', 'components/strategy/OpportunitiesTable.tsx', 'components/strategy/OpportunityFormModal.tsx'] },
  { route: '/strategy/allocations', label: 'Allocations', domain: 'strategy', pathGlobs: ['pages/strategy/AllocationsPage.tsx'] },
  { route: '/strategy/gates', label: 'Gates', domain: 'strategy', pathGlobs: ['pages/strategy/GatesPage.tsx'] },
  { route: '/strategy/option-category', label: 'Option Category', domain: 'strategy', pathGlobs: ['pages/strategy/OptionCategoryPage.tsx'] },

  { route: '/operations/daemon', label: 'Daemon', domain: 'operations', pathGlobs: ['pages/operations/DaemonPage.tsx'] },
  { route: '/operations/celery', label: 'Celery', domain: 'operations', pathGlobs: ['pages/operations/CeleryPage.tsx', 'pages/operations/celery/**'] },
  { route: '/operations/logs', label: 'Logs', domain: 'operations', pathGlobs: ['pages/operations/LogsPage.tsx'] },

  { route: '/settings/ui-design-system', label: 'UI Design System', domain: 'settings', pathGlobs: ['pages/settings/UiDesignSystemPage.tsx', 'pages/settings/uiDesignSystem/**'] },
  { route: '/settings/coverage/overview', label: 'Coverage Overview', domain: 'settings', pathGlobs: ['pages/settings/CoverageOverviewPage.tsx', 'pages/settings/coverage/**'] },
  { route: '/settings/subscribe', label: 'Subscribe', domain: 'settings', pathGlobs: ['pages/settings/SubscribePage.tsx', 'pages/settings/subscribe/**'] },
  { route: '/settings/tech-stack', label: 'Tech Stack', domain: 'settings', pathGlobs: ['pages/settings/TechStackPage.tsx'] },
  { route: '/settings/ib', label: 'IB Connection', domain: 'settings', pathGlobs: ['pages/settings/IbConnectionPage.tsx'] },
  { route: '/settings/socket', label: 'Socket', domain: 'settings', pathGlobs: ['pages/settings/SocketPage.tsx'] },
  { route: '/settings/api', label: 'API Health', domain: 'settings', pathGlobs: ['pages/settings/ApiHealthPage.tsx'] },
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
