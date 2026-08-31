import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
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

      { path: 'market/live', element: <LivePage /> },
      { path: 'market/watchlist', element: <Navigate to="/research/watchlist" replace /> },

      { path: 'research/watchlist', element: <StockWatchlistPage /> },

      {
        path: 'portfolio/accounts',
        lazy: lazyPage(() => import('@/pages/portfolio/AccountsPage')),
      },
      { path: 'portfolio/positions', element: <PositionsPage /> },
      {
        path: 'portfolio/performance',
        lazy: lazyPage(() => import('@/pages/portfolio/PerformancePage')),
      },
      {
        path: 'portfolio/model-analysis',
        lazy: lazyPage(() => import('@/pages/portfolio/ModelAnalysisPage')),
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
        path: 'research/iv-radar',
        lazy: lazyPage(() => import('@/pages/research/analyze/IvRadarPage')),
      },
      {
        path: 'research/vrp-lab',
        lazy: lazyPage(() => import('@/pages/research/analyze/VrpLabPage')),
      },
      {
        path: 'research/signal-health',
        lazy: lazyPage(() => import('@/pages/research/data/SignalHealthPage')),
      },
      {
        path: 'research/vol-surface-lab',
        lazy: lazyPage(() => import('@/pages/research/analyze/VolSurfaceLabPage')),
      },
      {
        path: 'research/opex-cycle-lab',
        lazy: lazyPage(() => import('@/pages/research/analyze/OpExCycleLabPage')),
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
        path: 'research/analysis-model',
        lazy: lazyPage(() => import('@/pages/research/analyze/AnalysisModelPage')),
      },
      {
        path: 'research/intraday-playbook',
        lazy: lazyPage(() => import('@/pages/research/analyze/IntradayPlaybookPage')),
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
        path: 'research/gex-intraday',
        lazy: lazyPage(() => import('@/pages/research/analyze/GexIntradayPage')),
      },
      {
        path: 'research/forecast-sessions',
        lazy: lazyPage(() => import('@/pages/research/analyze/ForecastSessionsPage')),
      },
      {
        path: 'research/order-sentiment',
        lazy: lazyPage(() => import('@/pages/research/analyze/OrderSentimentPage')),
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

      /* Wave Z — Risk Model moved under Portfolio (alias keeps /research/risk) */
      {
        path: 'portfolio/risk',
        lazy: lazyPage(() => import('@/pages/portfolio/RiskModelPage')),
      },
      {
        path: 'research/risk',
        element: <Navigate to="/portfolio/risk" replace />,
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
