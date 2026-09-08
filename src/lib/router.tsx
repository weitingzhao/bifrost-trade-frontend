import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LabRedirect } from '@/pages/research/analyze/hub/LabRedirect'
import { AppLayout } from '@/layout/AppLayout'
import { SettingsLayout } from '@/layout/SettingsLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'

/** Eager — high-traffic monitoring entry points */
import LivePage from '@/pages/market/LivePage'
import StockWatchlistPage from '@/pages/research/data/StockWatchlistPage'
import PositionsPage from '@/pages/portfolio/PositionsPage'
import InstancesPage from '@/pages/strategy/InstancesPage'

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
        path: 'research/workbench',
        lazy: lazyPage(() => import('@/pages/research/seats/WorkbenchPage')),
      },

      { path: 'market/live', element: <LivePage /> },
      { path: 'market/watchlist', element: <Navigate to="/research/watchlist" replace /> },

      { path: 'research/watchlist', element: <StockWatchlistPage /> },

      {
        path: 'portfolio/accounts',
        lazy: lazyPage(() => import('@/pages/portfolio/AccountsPage')),
      },
      { path: 'portfolio/positions', element: <PositionsPage /> },
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

      { path: 'strategy/instances/:instanceId?', element: <InstancesPage /> },
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
        path: 'operations/logs',
        lazy: lazyPage(() => import('@/pages/operations/LogsPage')),
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
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/coverage/overview" replace /> },

          {
            path: 'subscribe',
            lazy: lazyPage(() => import('@/pages/settings/SubscribePage')),
          },

          {
            path: 'coverage/overview',
            lazy: lazyPage(() => import('@/pages/settings/CoverageOverviewPage')),
          },
          {
            path: 'coverage/overview-detail',
            lazy: lazyPage(() => import('@/pages/settings/CoverageOverviewDetailPage')),
          },
          {
            path: 'coverage/option',
            lazy: lazyPage(() => import('@/pages/settings/CoverageOptionPage')),
          },
          {
            path: 'coverage/stock-ib',
            lazy: lazyPage(() => import('@/pages/settings/CoverageStockIbPage')),
          },
          {
            path: 'data-readiness',
            lazy: lazyPage(() => import('@/pages/research/data/StockDataPage')),
          },

          {
            path: 'feed/ib',
            lazy: lazyPage(() => import('@/pages/settings/FeedIbPage')),
          },

          {
            path: 'daemon-app',
            lazy: lazyPage(() => import('@/pages/settings/DaemonAppPage')),
          },
          {
            path: 'tech-stack',
            lazy: lazyPage(() => import('@/pages/settings/TechStackPage')),
          },
          {
            path: 'ui-design-system',
            lazy: lazyPage(() => import('@/pages/settings/UiDesignSystemPage')),
          },
          {
            path: 'ib',
            lazy: lazyPage(() => import('@/pages/settings/IbConnectionPage')),
          },
        ],
      },
    ],
  },
])
