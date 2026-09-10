import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LabRedirect } from '@/pages/research/analyze/hub/LabRedirect'
import { AppLayout } from '@/layout/AppLayout'
import { SettingsLayout } from '@/layout/SettingsLayout'
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
      {
        path: 'research/discovery',
        lazy: lazyPage(() => import('@/pages/research/analyze/DiscoveryPage')),
      },
      /* research-loop-automation C1 — five Analyze hubs; the retired labs redirect with their query intact */
      {
        path: 'research/lens-coverage',
        lazy: lazyPage(() => import('@/pages/research/data/lensCoverage/LensCoveragePage')),
      },
      {
        path: 'research/dossier',
        lazy: lazyPage(() => import('@/pages/research/analyze/dossier/DossierPage')),
      },
      {
        path: 'research/vol-regime',
        lazy: lazyPage(() => import('@/pages/research/analyze/volRegime/VolRegimePage')),
      },
      {
        path: 'research/dealer-levels',
        lazy: lazyPage(() => import('@/pages/research/analyze/dealerLevels/DealerLevelsPage')),
      },
      {
        path: 'research/scenario',
        lazy: lazyPage(() => import('@/pages/research/analyze/scenario/ScenarioPage')),
      },
      {
        path: 'research/flow',
        lazy: lazyPage(() => import('@/pages/research/analyze/flow/FlowPage')),
      },
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
        element: <Navigate to="/operations/daemon" replace />,
      },
      {
        path: 'research/risk',
        element: <Navigate to="/operations/daemon" replace />,
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

      {
        path: 'operations/daemon',
        lazy: lazyPage(() => import('@/pages/operations/DaemonPage')),
      },
      {
        path: 'operations/platform',
        lazy: lazyPage(() => import('@/pages/operations/PlatformStatusPage')),
      },

      {
        path: 'settings/daemon',
        lazy: lazyPage(() => import('@/pages/settings/DaemonStatusPage')),
      },
      {
        path: 'settings/api',
        lazy: lazyPage(() => import('@/pages/settings/ApiHealthPage')),
      },
      {
        path: 'settings/socket',
        lazy: lazyPage(() => import('@/pages/settings/SocketPage')),
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
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/coverage" replace /> },
          {
            path: 'coverage',
            lazy: lazyPage(() => import('@/pages/settings/CoveragePage')),
          },
          // The four pages Coverage replaced, and the two-link Feed shell.
          { path: 'coverage/overview', element: <Navigate to="/settings/coverage?view=watchlist" replace /> },
          { path: 'coverage/overview-detail', element: <Navigate to="/settings/coverage?view=watchlist" replace /> },
          { path: 'coverage/option', element: <Navigate to="/settings/coverage?view=option" replace /> },
          { path: 'coverage/stock-ib', element: <Navigate to="/settings/coverage?view=stock" replace /> },
          {
            path: 'feed',
            lazy: lazyPage(() => import('@/pages/settings/FeedPage')),
          },
          { path: 'subscribe', element: <Navigate to="/settings/feed" replace /> },
          { path: 'feed/ib', element: <Navigate to="/settings/feed" replace /> },
          // Data Readiness is a Research page; Research owns its menu entry.
          {
            path: 'data-readiness',
            lazy: lazyPage(() => import('@/pages/research/data/StockDataPage')),
          },
          // Reference, not settings.
          { path: 'daemon-app', element: <Navigate to="/operations/daemon" replace /> },
          { path: 'tech-stack', element: <Navigate to="/docs/tech-stack" replace /> },
          { path: 'ui-design-system', element: <Navigate to="/docs/ui-design-system" replace /> },
          {
            path: 'ib',
            lazy: lazyPage(() => import('@/pages/settings/IbConnectionPage')),
          },
        ],
      },
    ],
  },
])
