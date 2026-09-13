import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LabRedirect } from '@/pages/research/analyze/hub/LabRedirect'
import { AppLayout } from '@/layout/AppLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'
import { REDIRECT_ROUTES } from '@/layout/routeRegistry'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'

/** Eager — high-traffic monitoring entry points */

function lazyPage(
  factory: () => Promise<{ default: ComponentType<unknown> }>,
): () => Promise<{ Component: ComponentType<unknown> }> {
  return async () => {
    const { default: Component } = await factory()
    return { Component }
  }
}

/**
 * The retired paths, from the one table that knows them.
 *
 * These were 43 hand-written `<Navigate>` rows here and 43 `redirect` rows in
 * `routeRegistry.ts`, kept in step by hand — the duplication `Docs Gaps.dc.html`
 * F5 asks to remove. The registry is the authority now; adding or renaming a
 * path is one line there.
 *
 * Two mechanisms, and the target picks which: a redirect to the Symbol page is
 * a redirect to a *tab*, so it has to carry the reader's `?symbol=` and land on
 * the right section — `LabRedirect` does that through `analyzeRedirect`. Every
 * other target is a page, where a plain `<Navigate>` is the whole job.
 */
function redirectRoutes(): RouteObject[] {
  return REDIRECT_ROUTES.map((entry) => ({
    path: entry.path.slice(1),
    element:
      entry.redirect === SYMBOL_PATH ? (
        <LabRedirect from={entry.path} />
      ) : (
        <Navigate to={entry.redirect} replace />
      ),
  }))
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/research" replace /> },
      ...redirectRoutes(),
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
        path: 'research/daily-brief',
        lazy: lazyPage(() => import('@/pages/research/discover/DailyBriefPage')),
      },
      {
        path: 'research/stock-screener',
        lazy: lazyPage(() => import('@/pages/research/data/StockScreenerPage')),
      },
      {
        path: 'research/screener',
        lazy: lazyPage(() => import('@/pages/research/data/ScreenerPage')),
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
        path: 'research/symbol',
        lazy: lazyPage(() => import('@/pages/research/analyze/symbol/SymbolPage')),
      },
      {
        path: 'research/lens-coverage',
        lazy: lazyPage(() => import('@/pages/research/data/lensCoverage/LensCoveragePage')),
      },
      {
        path: 'research/scan',
        lazy: lazyPage(() => import('@/pages/research/discover/ScanPage')),
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
    ],
  },
])
