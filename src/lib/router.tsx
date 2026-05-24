import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layout/AppLayout'
import { SettingsLayout } from '@/layout/SettingsLayout'

import LivePage from '@/pages/market/LivePage'
import WatchlistPage from '@/pages/market/WatchlistPage'

import AccountsPage from '@/pages/portfolio/AccountsPage'
import PositionsPage from '@/pages/portfolio/PositionsPage'
import PerformancePage from '@/pages/portfolio/PerformancePage'

import ScreenerPage from '@/pages/research/ScreenerPage'
import DiscoveryPage from '@/pages/research/DiscoveryPage'
import GreeksPage from '@/pages/research/GreeksPage'
import SepaPage from '@/pages/research/SepaPage'

import InstancesPage from '@/pages/strategy/InstancesPage'
import StructuresPage from '@/pages/strategy/StructuresPage'
import OpportunitiesPage from '@/pages/strategy/OpportunitiesPage'
import GatesPage from '@/pages/strategy/GatesPage'

import DaemonPage from '@/pages/operations/DaemonPage'
import CeleryPage from '@/pages/operations/CeleryPage'
import LogsPage from '@/pages/operations/LogsPage'

import DaemonStatusPage from '@/pages/settings/DaemonStatusPage'
import DaemonAppPage from '@/pages/settings/DaemonAppPage'
import IbConnectionPage from '@/pages/settings/IbConnectionPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/market/live" replace /> },

      { path: 'market/live', element: <LivePage /> },
      { path: 'market/watchlist', element: <WatchlistPage /> },

      { path: 'portfolio/accounts', element: <AccountsPage /> },
      { path: 'portfolio/positions', element: <PositionsPage /> },
      { path: 'portfolio/performance', element: <PerformancePage /> },

      { path: 'research/screener', element: <ScreenerPage /> },
      { path: 'research/discovery', element: <DiscoveryPage /> },
      { path: 'research/greeks', element: <GreeksPage /> },
      { path: 'research/sepa', element: <SepaPage /> },

      { path: 'strategy/instances', element: <InstancesPage /> },
      { path: 'strategy/structures', element: <StructuresPage /> },
      { path: 'strategy/opportunities', element: <OpportunitiesPage /> },
      { path: 'strategy/gates', element: <GatesPage /> },

      { path: 'operations/daemon', element: <DaemonPage /> },
      { path: 'operations/celery', element: <CeleryPage /> },
      { path: 'operations/logs', element: <LogsPage /> },

      // Settings — nested layout with its own secondary left nav
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/daemon" replace /> },
          { path: 'daemon', element: <DaemonStatusPage /> },
          { path: 'daemon-app', element: <DaemonAppPage /> },
          { path: 'ib', element: <IbConnectionPage /> },
        ],
      },
    ],
  },
])
