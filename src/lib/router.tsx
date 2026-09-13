import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LabRedirect } from '@/pages/research/analyze/hub/LabRedirect'
import { AppLayout } from '@/layout/AppLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'

/** Eager — high-traffic monitoring entry points */

function lazyPage(
  factory: () => Promise<{ default: ComponentType<unknown> }>,
): () => Promise<{ Component: ComponentType<unknown> }> {
  return async () => {
    const { default: Component } = await factory()
    return { Component }
  }
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/research" replace /> },
      {
        path: 'research',
        lazy: lazyPage(() => import('@/pages/research/ResearchHomePage')),
      },
      {
        path: 'research/overview',
        lazy: lazyPage(() => import('@/pages/research/seats/ResearchOverviewPage')),
      },
      {
        path: 'research/copilot',
        lazy: lazyPage(() => import('@/pages/research/seats/CopilotDeskPage')),
      },
      {
        path: 'research/copilot/trading',
        lazy: lazyPage(() => import('@/pages/research/seats/TradingCopilotPage')),
      },
      {
        path: 'research/workbench',
        lazy: lazyPage(() => import('@/pages/research/seats/WorkbenchPage')),
      },

      { path: 'market/live', lazy: lazyPage(() => import('@/pages/market/LivePage')) },
      { path: 'market/watchlist', element: <Navigate to="/research/watchlist" replace /> },

      { path: 'research/watchlist', lazy: lazyPage(() => import('@/pages/research/data/StockWatchlistPage')) },

      {
        path: 'portfolio/accounts',
        lazy: lazyPage(() => import('@/pages/portfolio/AccountsPage')),
      },
      { path: 'portfolio/positions', lazy: lazyPage(() => import('@/pages/portfolio/PositionsPage')) },
      {
        path: 'portfolio/backing',
        lazy: lazyPage(() => import('@/pages/portfolio/backing/BackingPage')),
      },
      {
        path: 'portfolio/performance',
        lazy: lazyPage(() => import('@/pages/portfolio/PerformancePage')),
      },
      {
        path: 'portfolio/ledger',
        lazy: lazyPage(() => import('@/pages/portfolio/TradeLedgerPage')),
      },
      {
        path: 'portfolio/transfer',
        lazy: lazyPage(() => import('@/pages/portfolio/TransferPayPage')),
      },
      {
        path: 'portfolio/trade-history',
        element: <Navigate to="/portfolio/ledger" replace />,
      },
      /* The Trading Copilot moved from Portfolio to the Copilot seat. */
      {
        path: 'portfolio/copilot',
        element: <Navigate to="/research/copilot/trading" replace />,
      },
      /* Model Analysis merged into Backing & Model as its lower band. */
      {
        path: 'portfolio/model-analysis',
        element: <Navigate to="/portfolio/backing#model" replace />,
      },

      {
        path: 'research/daily-brief',
        lazy: lazyPage(() => import('@/pages/research/discover/DailyBriefPage')),
      },
      {
        path: 'research/stock-screener',
        lazy: lazyPage(() => import('@/pages/research/data/StockScreenerPage')),
      },
      /* Legacy URL — the page is a Stock Screener; SEPA is one of its condition
         families, not its identity. Kept so existing bookmarks resolve. */
      {
        path: 'research/sepa',
        element: <Navigate to="/research/stock-screener" replace />,
      },
      {
        path: 'research/screener',
        lazy: lazyPage(() => import('@/pages/research/data/ScreenerPage')),
      },
      {
        path: 'research/stock-data',
        element: <Navigate to="/settings/data-readiness" replace />,
      },
      {
        path: 'research/playbook',
        lazy: lazyPage(() => import('@/pages/copilot/PlaybookPage')),
      },
      {
        path: 'research/agent-personas',
        lazy: lazyPage(() => import('@/pages/copilot/AgentPersonaPage')),
      },
      /* One name, one page. The five Analyze hubs (C1) and the Dossier are its
         tabs; both generations of retired URL resolve in one hop. */
      {
        path: 'research/symbol',
        lazy: lazyPage(() => import('@/pages/research/analyze/symbol/SymbolPage')),
      },
      {
        path: 'research/lens-coverage',
        lazy: lazyPage(() => import('@/pages/research/data/lensCoverage/LensCoveragePage')),
      },
      { path: 'research/dossier', element: <LabRedirect from="/research/dossier" /> },
      { path: 'research/vol-regime', element: <LabRedirect from="/research/vol-regime" /> },
      { path: 'research/dealer-levels', element: <LabRedirect from="/research/dealer-levels" /> },
      { path: 'research/scenario', element: <LabRedirect from="/research/scenario" /> },
      { path: 'research/flow', element: <LabRedirect from="/research/flow" /> },
      { path: 'research/discovery', element: <LabRedirect from="/research/discovery" /> },
      { path: 'research/iv-radar', element: <LabRedirect from="/research/iv-radar" /> },
      { path: 'research/vrp-lab', element: <LabRedirect from="/research/vrp-lab" /> },
      { path: 'research/vol-surface-lab', element: <LabRedirect from="/research/vol-surface-lab" /> },
      { path: 'research/gex-intraday', element: <LabRedirect from="/research/gex-intraday" /> },
      { path: 'research/opex-cycle-lab', element: <LabRedirect from="/research/opex-cycle-lab" /> },
      { path: 'research/analysis-model', element: <LabRedirect from="/research/analysis-model" /> },
      { path: 'research/forecast-sessions', element: <LabRedirect from="/research/forecast-sessions" /> },
      { path: 'research/intraday-playbook', element: <LabRedirect from="/research/intraday-playbook" /> },
      { path: 'research/order-sentiment', element: <LabRedirect from="/research/order-sentiment" /> },
      {
        path: 'research/scan',
        lazy: lazyPage(() => import('@/pages/research/discover/ScanPage')),
      },
      /* Wave Discover-IA — /research/option-scan alias to Scan */
      {
        path: 'research/option-scan',
        element: <Navigate to="/research/scan" replace />,
      },
      /* Wave Discover-IA — new grouped Stock Explorer (SEPA + Momentum + Events + Rules link) */
      {
        path: 'research/explorer',
        lazy: lazyPage(() => import('@/pages/research/discover/StockExplorerPage')),
      },
      {
        path: 'research/signal-decay',
        lazy: lazyPage(() => import('@/pages/research/validate/SignalDecayPage')),
      },
      {
        path: 'research/signal-decay/:symbol',
        lazy: lazyPage(() => import('@/pages/research/validate/SignalDecayPage')),
      },
      {
        path: 'research/signal-health',
        lazy: lazyPage(() => import('@/pages/research/data/SignalHealthPage')),
      },
      {
        path: 'research/greeks',
        lazy: lazyPage(() => import('@/pages/research/analyze/GreeksPage')),
      },
      {
        path: 'research/backtest',
        lazy: lazyPage(() => import('@/pages/research/validate/BacktestPage')),
      },
      {
        path: 'research/momentum-radar',
        lazy: lazyPage(() => import('@/pages/research/discover/MomentumRadarPage')),
      },
      {
        path: 'research/sepa-daily-core',
        lazy: lazyPage(() => import('@/pages/research/discover/SepaDailyCorePage')),
      },
      {
        path: 'research/event-radar',
        lazy: lazyPage(() => import('@/pages/research/discover/EventRadarPage')),
      },

      /* Wave Z+R — Research Loop */
      {
        path: 'research/loop/candidates',
        lazy: lazyPage(() => import('@/pages/research/loop/CandidatePoolPage')),
      },
      {
        path: 'research/loop/hypotheses',
        lazy: lazyPage(() => import('@/pages/research/loop/HypothesisBoardPage')),
      },
      {
        path: 'research/loop/decisions',
        lazy: lazyPage(() => import('@/pages/research/loop/DecisionInboxPage')),
      },
      {
        path: 'research/loop/harness',
        lazy: lazyPage(() => import('@/pages/research/loop/HarnessConsolePage')),
      },
      {
        path: 'research/loop/objectives/:objectiveId',
        lazy: lazyPage(() => import('@/pages/research/loop/ObjectivePage')),
      },
      {
        path: 'research/loop/runs/:runId',
        lazy: lazyPage(() => import('@/pages/research/loop/LoopRunPipelinePage')),
      },

      /* The Risk Model page is retired: its four daemon figures live on the Daemon page. Old links land there. */
      {
        path: 'portfolio/risk',
        element: <Navigate to="/system/daemon" replace />,
      },
      {
        path: 'research/risk',
        element: <Navigate to="/system/daemon" replace />,
      },

      { path: 'strategy/instances/:instanceId?', lazy: lazyPage(() => import('@/pages/strategy/InstancesPage')) },
      {
        path: 'strategy/win-rate',
        lazy: lazyPage(() => import('@/pages/strategy/WinRatePage')),
      },
      {
        path: 'strategy/structures',
        lazy: lazyPage(() => import('@/pages/strategy/StructuresPage')),
      },
      {
        path: 'strategy/opportunities',
        lazy: lazyPage(() => import('@/pages/strategy/OpportunitiesPage')),
      },
      {
        path: 'strategy/allocations',
        lazy: lazyPage(() => import('@/pages/strategy/AllocationsPage')),
      },
      {
        path: 'strategy/gates',
        lazy: lazyPage(() => import('@/pages/strategy/GatesPage')),
      },
      {
        path: 'strategy/option-category',
        lazy: lazyPage(() => import('@/pages/strategy/OptionCategoryPage')),
      },

      // ── System ───────────────────────────────────────────────────────
      // One shell: these render inside AppLayout like every other page. They
      // used to sit under a `SettingsLayout` that grew a navigation aside of
      // its own, which cost the breadcrumb, the Omnibar, the symbol chip and
      // the Inbox the moment you opened one of them.
      {
        path: 'system/coverage',
        lazy: lazyPage(() => import('@/pages/system/CoveragePage')),
      },
      {
        path: 'system/feed',
        lazy: lazyPage(() => import('@/pages/system/FeedPage')),
      },
      // Data Readiness is a Research page. System lists it because "is the
      // data there" gets asked from here too; Research keeps its own entry.
      {
        path: 'system/data-readiness',
        lazy: lazyPage(() => import('@/pages/research/data/StockDataPage')),
      },
      {
        path: 'system/topology',
        lazy: lazyPage(() => import('@/pages/system/TopologyPage')),
      },
      {
        path: 'system/daemon',
        lazy: lazyPage(() => import('@/pages/system/DaemonStatusPage')),
      },
      {
        path: 'system/api',
        lazy: lazyPage(() => import('@/pages/system/ApiHealthPage')),
      },
      {
        path: 'system/socket',
        lazy: lazyPage(() => import('@/pages/system/SocketPage')),
      },
      {
        path: 'system/platform',
        lazy: lazyPage(() => import('@/pages/system/PlatformPluginsPage')),
      },
      {
        path: 'system/ib',
        lazy: lazyPage(() => import('@/pages/system/IbConnectionPage')),
      },

      {
        path: 'docs/tech-stack',
        lazy: lazyPage(() => import('@/pages/docs/TechStackPage')),
      },
      {
        path: 'docs/ui-design-system',
        lazy: lazyPage(() => import('@/pages/docs/UiDesignSystemPage')),
      },
      {
        path: 'docs/research-blueprint',
        lazy: lazyPage(() => import('@/pages/docs/researchBlueprint/ResearchBlueprintPage')),
      },
      {
        path: 'docs/research-calibration',
        lazy: lazyPage(() => import('@/pages/docs/researchBlueprint/ResearchBlueprintPage')),
      },
      // The old names, kept working. `/settings/*` and `/operations/*` were
      // two words for the same machine; bookmarks and old links predate the
      // rename and must not 404.
      { path: 'settings', element: <Navigate to="/system/coverage" replace /> },
      { path: 'settings/coverage', element: <Navigate to="/system/coverage" replace /> },
      { path: 'settings/coverage/overview', element: <Navigate to="/system/coverage?view=watchlist" replace /> },
      { path: 'settings/coverage/overview-detail', element: <Navigate to="/system/coverage?view=watchlist" replace /> },
      { path: 'settings/coverage/option', element: <Navigate to="/system/coverage?view=option" replace /> },
      { path: 'settings/coverage/stock-ib', element: <Navigate to="/system/coverage?view=stock" replace /> },
      { path: 'settings/feed', element: <Navigate to="/system/feed" replace /> },
      { path: 'settings/subscribe', element: <Navigate to="/system/feed" replace /> },
      { path: 'settings/feed/ib', element: <Navigate to="/system/feed" replace /> },
      { path: 'settings/data-readiness', element: <Navigate to="/system/data-readiness" replace /> },
      { path: 'settings/ib', element: <Navigate to="/system/ib" replace /> },
      { path: 'settings/api', element: <Navigate to="/system/api" replace /> },
      { path: 'settings/socket', element: <Navigate to="/system/socket" replace /> },
      { path: 'settings/daemon', element: <Navigate to="/system/daemon" replace /> },
      { path: 'settings/daemon-app', element: <Navigate to="/system/daemon" replace /> },
      { path: 'settings/tech-stack', element: <Navigate to="/docs/tech-stack" replace /> },
      { path: 'settings/ui-design-system', element: <Navigate to="/docs/ui-design-system" replace /> },
      { path: 'operations/daemon', element: <Navigate to="/system/daemon" replace /> },
      { path: 'operations/platform', element: <Navigate to="/system/platform" replace /> },
    ],
  },
])
