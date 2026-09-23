import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router-dom'
import { LabRedirect } from '@/pages/research/analyze/hub/LabRedirect'
import { AppLayout } from '@/layout/AppLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'
import { REDIRECT_ROUTES } from '@/layout/routeRegistry'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { redirectTargetFor } from '@/lib/redirectTarget'

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
 * a redirect to a *tab*, so it has to land on the right section — `LabRedirect`
 * does that through `analyzeRedirect`. Every other target is a page, where
 * forwarding the reader's query and hash is the whole job.
 */
/** `/strategy/instances/142` → the shared sheet, on that instance. */
function InstanceRedirect() {
  const { instanceId } = useParams()
  const id = Number(instanceId)
  return (
    <Navigate
      to={Number.isFinite(id) && id > 0 ? `/portfolio/positions?instance=${id}` : '/trade/rules?pick=instance:all'}
      replace
    />
  )
}

/**
 * `/research/explorer?tab=…` — retired 2026-09-23, and the tab says where.
 *
 * A single static target would have forwarded `?tab=events` to Stock ratings,
 * a page that does not read `tab` — the deep link a page ignores, which is the
 * failure the walk rules name. Each of the four tabs went to its own home.
 */
function ExplorerRedirect() {
  const location = useLocation()
  const tab = new URLSearchParams(location.search).get('tab')
  // SEPA's tab went to Stock ratings; no tab lands where the design says the
  // path itself belongs — its registry files `/research/explorer` against the
  // Stock screen's own prototype.
  const to =
    tab === 'events'
      ? '/research/events'
      : tab === 'momentum'
        ? '/research/ratings/stocks?view=leaders'
        : tab === 'sepa'
          ? '/research/ratings/stocks'
          : '/research/screener'
  return <Navigate to={to} replace />
}

const EXPLORER_PATH = '/research/explorer'

function RedirectKeepingQuery({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={redirectTargetFor(to, location.search, location.hash)} replace />
}

/**
 * Where the app opens (Owner, 2026-09-17).
 *
 * The design files Home first because it belongs to no layer: it says what
 * needs a decision now, and every row on it leads into the layer that owns the
 * figure behind it. Exported so the one place that decides the front door is
 * the one place a test can pin.
 */
export const INDEX_ROUTE = '/home'

/** `/strategy/instances/142` — retired, but the id it carries still means something. */
const INSTANCE_PATH = '/strategy/instances/:instanceId'

export function redirectRoutes(): RouteObject[] {
  return REDIRECT_ROUTES.map((entry) => ({
    path: entry.path.slice(1),
    element:
      entry.redirect === SYMBOL_PATH ? (
        <LabRedirect from={entry.path} />
      ) : entry.path === INSTANCE_PATH ? (
        // A forward whose target depends on the path: the id travels.
        <InstanceRedirect />
      ) : entry.path === EXPLORER_PATH ? (
        // And one whose target depends on the query: the tab decides.
        <ExplorerRedirect />
      ) : (
        <RedirectKeepingQuery to={entry.redirect} />
      ),
  }))
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={INDEX_ROUTE} replace /> },
      ...redirectRoutes(),
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
        // One page, two faces (§5a.9). The alias renders the layer page with
        // the census face selected; the route drives the face, so the deep
        // link the design keeps still lands on the reading it names.
        path: 'research/workbench',
        lazy: lazyPage(() => import('@/pages/research/seats/ResearchOverviewPage')),
      },

      { path: 'market/live', lazy: lazyPage(() => import('@/pages/market/LivePage')) },

      { path: 'research/watchlist', lazy: lazyPage(() => import('@/pages/research/data/StockWatchlistPage')) },
      {
        path: 'research/journal',
        lazy: lazyPage(() => import('@/pages/research/journal/JournalPage')),
      },

      // The layer's own page (design §5a.1): two folds, neither of which is
      // Portfolio, so the layer gets a page rather than an alias.
      {
        path: 'portfolio',
        lazy: lazyPage(() => import('@/pages/portfolio/overview/PortfolioOverviewPage')),
      },
      {
        path: 'portfolio/accounts',
        lazy: lazyPage(() => import('@/pages/portfolio/AccountsPage')),
      },
      { path: 'portfolio/positions', lazy: lazyPage(() => import('@/pages/portfolio/PositionsPage')) },
      {
        path: 'portfolio/pnl-explain',
        lazy: lazyPage(() => import('@/pages/portfolio/pnlExplain/PnlExplainPage')),
      },
      {
        path: 'risk/portfolio',
        lazy: lazyPage(() => import('@/pages/risk/portfolio/RiskPortfolioPage')),
      },
      {
        path: 'risk/stress',
        lazy: lazyPage(() => import('@/pages/risk/stress/RiskStressPage')),
      },
      // The layer's own page (design §5a.1): six parallel children, none of
      // which can stand for the layer, so the layer gets a page.
      {
        path: 'risk',
        lazy: lazyPage(() => import('@/pages/risk/overview/RiskOverviewPage')),
      },
      {
        path: 'risk/margin',
        lazy: lazyPage(() => import('@/pages/risk/margin/RiskMarginPage')),
      },
      {
        path: 'risk/limits',
        lazy: lazyPage(() => import('@/pages/risk/limits/RiskLimitsPage')),
      },
      {
        path: 'trade/desk',
        lazy: lazyPage(() => import('@/pages/trade/desk/TradeDeskPage')),
      },
      {
        path: 'trade/rules',
        lazy: lazyPage(() => import('@/pages/trade/rules/TradeRulesPage')),
      },
      {
        path: 'trade/plans',
        lazy: lazyPage(() => import('@/pages/trade/plans/TradePlansPage')),
      },
      {
        path: 'trade/playbook',
        lazy: lazyPage(() => import('@/pages/trade/playbook/PlaybookPage')),
      },
      {
        path: 'trade/expiration',
        lazy: lazyPage(() => import('@/pages/trade/expiration/ExpirationPage')),
      },
      {
        path: 'trade/fills',
        lazy: lazyPage(() => import('@/pages/trade/fills/FillsPage')),
      },
      {
        path: 'trade/assignment',
        lazy: lazyPage(() => import('@/pages/trade/assignment/AssignmentPage')),
      },
      {
        path: 'portfolio/backing',
        lazy: lazyPage(() => import('@/pages/portfolio/backing/BackingPage')),
      },
      {
        path: 'review',
        lazy: lazyPage(() => import('@/pages/review/queue/ReviewQueuePage')),
      },
      {
        path: 'review/fit',
        lazy: lazyPage(() => import('@/pages/review/fit/ReviewFitPage')),
      },
      {
        path: 'review/habits',
        lazy: lazyPage(() => import('@/pages/review/habits/ReviewHabitsPage')),
      },
      {
        path: 'review/playbook-stats',
        lazy: lazyPage(() => import('@/pages/review/playbookStats/PlaybookStatsPage')),
      },
      // The loop's closing page (design Review Objectives.dc.html). Built
      // with the chain broken on purpose — see the page's own note.
      {
        path: 'review/objectives',
        lazy: lazyPage(() => import('@/pages/review/objectives/ReviewObjectivesPage')),
      },
      {
        // The Rule proposals page merged into the Decision Inbox (§5a.8, 2026-09-22):
        // one inbox, not two, because a machine proposing and me approving is one
        // act however many ends of the loop it touches. The route stays as the
        // deep link the design keeps, and lands on the view that holds it.
        path: 'review/proposals',
        lazy: lazyPage(() => import('@/pages/research/loop/DecisionInboxPage')),
      },
      {
        path: 'risk/budget',
        lazy: lazyPage(() => import('@/pages/risk/budget/RiskBudgetPage')),
      },
      {
        path: 'risk/sizing',
        lazy: lazyPage(() => import('@/pages/risk/sizing/RiskSizingPage')),
      },
      {
        path: 'home',
        lazy: lazyPage(() => import('@/pages/home/today/TodayPage')),
      },
      {
        path: 'portfolio/corporate-actions',
        lazy: lazyPage(() => import('@/pages/portfolio/corporateActions/CorporateActionsPage')),
      },
      {
        path: 'portfolio/outcome',
        lazy: lazyPage(() => import('@/pages/portfolio/outcome/OutcomePage')),
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
        path: 'research/screener',
        lazy: lazyPage(() => import('@/pages/research/data/StockScreenerPage')),
      },
      {
        path: 'research/contract-screener',
        lazy: lazyPage(() => import('@/pages/research/data/ScreenerPage')),
      },
      {
        path: 'research/agent-personas',
        lazy: lazyPage(() => import('@/pages/copilot/AgentPersonaPage')),
      },
      {
        path: 'research/orchestration',
        lazy: lazyPage(() => import('@/pages/research/orchestration/OrchestrationPage')),
      },
      {
        path: 'research/symbol',
        lazy: lazyPage(() => import('@/pages/research/analyze/symbol/SymbolPage')),
      },
      {
        path: 'research/history',
        lazy: lazyPage(() => import('@/pages/research/analyze/history/HistoryPage')),
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
        path: 'research/event-radar',
        lazy: lazyPage(() => import('@/pages/research/alerts/AlertsPage')),
      },

      /* Wave Z+R — Research Loop */
      {
        path: 'research/loop/candidates',
        lazy: lazyPage(() => import('@/pages/research/loop/CandidatePoolPage')),
      },
      // The fold's own page (design §5a.4): four parallel children and none
      // of them is The Book.
      {
        path: 'research/book',
        lazy: lazyPage(() => import('@/pages/research/book/ResearchBookPage')),
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
        path: 'research/ratings/stocks',
        lazy: lazyPage(() => import('@/pages/research/ratings/StockRatingsPage')),
      },
      {
        path: 'research/loop/runs/:runId',
        lazy: lazyPage(() => import('@/pages/research/loop/LoopRunPipelinePage')),
      },

      // ── System ───────────────────────────────────────────────────────
      // One shell: these render inside AppLayout like every other page. They
      // used to sit under a `SettingsLayout` that grew a navigation aside of
      // its own, which cost the breadcrumb, the Omnibar, the Lens and
      // Alerts the moment you opened one of them.
      {
        // The other half of the same collapse: Status answers the three
        // questions, this holds the trader's own configuration.
        path: 'settings',
        lazy: lazyPage(() => import('@/pages/system/settings/SettingsPage')),
      },
      {
        // The design's collapse target (Owner ruling 2026-09-15): the nine
        // other `/system/*` pages become diagnosis, and this answers the three
        // questions a trader asks before opening a position.
        path: 'system/status',
        lazy: lazyPage(() => import('@/pages/system/status/SystemStatusPage')),
      },
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
        path: 'docs/design-adoption',
        lazy: lazyPage(() => import('@/pages/docs/designAdoption/DesignAdoptionPage')),
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
        path: 'research/events',
        lazy: lazyPage(() => import('@/pages/research/events/EventsPage')),
      },
      {
        path: 'docs/options-kit',
        lazy: lazyPage(() => import('@/pages/docs/optionsKit/OptionsKitPage')),
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
      //
      // Anything else. Without this a path nobody routed rendered a blank
      // document — no shell, no sidebar, forty-four characters of nothing —
      // because `errorElement` only fires on a throw and a no-match does not
      // throw. Found by clicking a link whose comment claimed React Router
      // would "simply render the 404 boundary"; it did not, and the claim had
      // never been checked. Inside the layout, so a wrong URL still lands
      // somewhere with a way out.
      { path: '*', element: <RouteErrorPage /> },
    ],
  },
])
