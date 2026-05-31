import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layout/AppLayout'
import { SettingsLayout } from '@/layout/SettingsLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'

/** Eager — high-traffic monitoring entry points */
import LivePage from '@/pages/market/LivePage'
import StockWatchlistPage from '@/pages/research/StockWatchlistPage'
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
      { index: true, element: <Navigate to="/market/live" replace /> },

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
        path: 'research/sepa',
        lazy: lazyPage(() => import('@/pages/research/StockScreenerPage')),
      },
      {
        path: 'research/screener',
        lazy: lazyPage(() => import('@/pages/research/ScreenerPage')),
      },
      {
        path: 'research/stock-data',
        lazy: lazyPage(() => import('@/pages/research/StockDataPage')),
      },
      {
        path: 'research/discovery',
        lazy: lazyPage(() => import('@/pages/research/DiscoveryPage')),
      },
      {
        path: 'research/greeks',
        lazy: lazyPage(() => import('@/pages/research/GreeksPage')),
      },
      {
        path: 'research/risk',
        lazy: lazyPage(() => import('@/pages/research/RiskModelPage')),
      },
      {
        path: 'research/backtest',
        lazy: lazyPage(() => import('@/pages/research/BacktestPage')),
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
        path: 'operations/celery',
        lazy: lazyPage(() => import('@/pages/operations/CeleryPage')),
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
            path: 'coverage/stock-massive',
            lazy: lazyPage(() => import('@/pages/settings/CoverageStockMassivePage')),
          },

          {
            path: 'feed/ib',
            lazy: lazyPage(() => import('@/pages/settings/FeedIbPage')),
          },
          {
            path: 'feed/massive',
            lazy: lazyPage(() => import('@/pages/settings/FeedMassiveOverviewPage')),
          },
          {
            path: 'feed/massive-stock',
            lazy: lazyPage(() => import('@/pages/settings/FeedMassiveStockPage')),
          },
          {
            path: 'feed/massive-option',
            lazy: lazyPage(() => import('@/pages/settings/FeedMassiveOptionPage')),
          },
          {
            path: 'feed/massive-comm',
            lazy: lazyPage(() => import('@/pages/settings/FeedMassiveCommPage')),
          },

          {
            path: 'daemon-app',
            lazy: lazyPage(() => import('@/pages/settings/DaemonAppPage')),
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
