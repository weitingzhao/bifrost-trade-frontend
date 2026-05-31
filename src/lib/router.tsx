import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layout/AppLayout'
import { SettingsLayout } from '@/layout/SettingsLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'

import LivePage from '@/pages/market/LivePage'
import WatchlistPage from '@/pages/market/WatchlistPage'

import AccountsPage from '@/pages/portfolio/AccountsPage'
import PositionsPage from '@/pages/portfolio/PositionsPage'
import PerformancePage from '@/pages/portfolio/PerformancePage'
import ModelAnalysisPage from '@/pages/portfolio/ModelAnalysisPage'
import TradeLedgerPage from '@/pages/portfolio/TradeLedgerPage'
import TransferPayPage from '@/pages/portfolio/TransferPayPage'

import ScreenerPage from '@/pages/research/ScreenerPage'
import DiscoveryPage from '@/pages/research/DiscoveryPage'
import GreeksPage from '@/pages/research/GreeksPage'
import SepaPage from '@/pages/research/SepaPage'
import StockDataPage from '@/pages/research/StockDataPage'
import RiskModelPage from '@/pages/research/RiskModelPage'
import BacktestPage from '@/pages/research/BacktestPage'

import InstancesPage from '@/pages/strategy/InstancesPage'
import StructuresPage from '@/pages/strategy/StructuresPage'
import OpportunitiesPage from '@/pages/strategy/OpportunitiesPage'
import GatesPage from '@/pages/strategy/GatesPage'
import WinRatePage from '@/pages/strategy/WinRatePage'
import AllocationsPage from '@/pages/strategy/AllocationsPage'
import OptionCategoryPage from '@/pages/strategy/OptionCategoryPage'

import DaemonPage from '@/pages/operations/DaemonPage'
import CeleryPage from '@/pages/operations/CeleryPage'
import LogsPage from '@/pages/operations/LogsPage'

// Settings — existing
import DaemonStatusPage from '@/pages/settings/DaemonStatusPage'
import DaemonAppPage from '@/pages/settings/DaemonAppPage'
import IbConnectionPage from '@/pages/settings/IbConnectionPage'

// Settings — Status > API
import ApiHealthPage from '@/pages/settings/ApiHealthPage'

// Settings — Status > App
import SubscribePage from '@/pages/settings/SubscribePage'
import SocketPage from '@/pages/settings/SocketPage'

// Settings — Data Coverage
import CoverageOverviewPage from '@/pages/settings/CoverageOverviewPage'
import CoverageOverviewDetailPage from '@/pages/settings/CoverageOverviewDetailPage'
import CoverageOptionPage from '@/pages/settings/CoverageOptionPage'
import CoverageStockIbPage from '@/pages/settings/CoverageStockIbPage'
import CoverageStockMassivePage from '@/pages/settings/CoverageStockMassivePage'

// Settings — Feed
import FeedIbPage from '@/pages/settings/FeedIbPage'
import FeedMassiveOverviewPage from '@/pages/settings/FeedMassiveOverviewPage'
import FeedMassiveStockPage from '@/pages/settings/FeedMassiveStockPage'
import FeedMassiveOptionPage from '@/pages/settings/FeedMassiveOptionPage'
import FeedMassiveCommPage from '@/pages/settings/FeedMassiveCommPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/market/live" replace /> },

      { path: 'market/live',      element: <LivePage /> },
      { path: 'market/watchlist', element: <WatchlistPage /> },

      { path: 'portfolio/accounts',      element: <AccountsPage /> },
      { path: 'portfolio/positions',     element: <PositionsPage /> },
      { path: 'portfolio/performance',   element: <PerformancePage /> },
      { path: 'portfolio/model-analysis',element: <ModelAnalysisPage /> },
      { path: 'portfolio/ledger',        element: <TradeLedgerPage /> },
      { path: 'portfolio/transfer',      element: <TransferPayPage /> },

      { path: 'research/sepa',       element: <SepaPage /> },
      { path: 'research/screener',   element: <ScreenerPage /> },
      { path: 'research/stock-data', element: <StockDataPage /> },
      { path: 'research/discovery',  element: <DiscoveryPage /> },
      { path: 'research/greeks',     element: <GreeksPage /> },
      { path: 'research/risk',       element: <RiskModelPage /> },
      { path: 'research/backtest',   element: <BacktestPage /> },

      { path: 'strategy/instances',      element: <InstancesPage /> },
      { path: 'strategy/win-rate',       element: <WinRatePage /> },
      { path: 'strategy/structures',     element: <StructuresPage /> },
      { path: 'strategy/opportunities',  element: <OpportunitiesPage /> },
      { path: 'strategy/allocations',    element: <AllocationsPage /> },
      { path: 'strategy/gates',          element: <GatesPage /> },
      { path: 'strategy/option-category',element: <OptionCategoryPage /> },

      { path: 'operations/daemon', element: <DaemonPage /> },
      { path: 'operations/celery', element: <CeleryPage /> },
      { path: 'operations/logs',   element: <LogsPage /> },

      // System operational pages — no secondary sidebar
      { path: 'settings/daemon', element: <DaemonStatusPage /> },
      { path: 'settings/api',    element: <ApiHealthPage /> },
      { path: 'settings/socket', element: <SocketPage /> },

      // Settings — Coverage / Feed / Config (secondary sidebar via SettingsLayout)
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/coverage/overview" replace /> },

          { path: 'subscribe', element: <SubscribePage /> },

          // Data Coverage
          { path: 'coverage/overview',        element: <CoverageOverviewPage /> },
          { path: 'coverage/overview-detail', element: <CoverageOverviewDetailPage /> },
          { path: 'coverage/option',          element: <CoverageOptionPage /> },
          { path: 'coverage/stock-ib',        element: <CoverageStockIbPage /> },
          { path: 'coverage/stock-massive',   element: <CoverageStockMassivePage /> },

          // Feed
          { path: 'feed/ib',            element: <FeedIbPage /> },
          { path: 'feed/massive',       element: <FeedMassiveOverviewPage /> },
          { path: 'feed/massive-stock', element: <FeedMassiveStockPage /> },
          { path: 'feed/massive-option',element: <FeedMassiveOptionPage /> },
          { path: 'feed/massive-comm',  element: <FeedMassiveCommPage /> },

          // Configuration
          { path: 'daemon-app', element: <DaemonAppPage /> },
          { path: 'ib',         element: <IbConnectionPage /> },
        ],
      },
    ],
  },
])
