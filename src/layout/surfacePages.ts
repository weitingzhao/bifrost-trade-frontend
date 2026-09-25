/**
 * Which component a surfaced route renders — in a float or in a panel tab.
 *
 * The design's surfaces are **iframes** because its prototypes are separate
 * documents. This app is one SPA, so a surface renders the page component
 * directly — no iframe, no embed flag, no shell to hide, because the shell was
 * never inside the page.
 *
 * The cost is this table: a second place that maps a route to a component,
 * beside `router.tsx`. It is small and it is gated — `surfacePages.test.ts`
 * parses the router and fails if a route here resolves to a different module
 * than the router gives it, so the two cannot drift silently.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type PageComponent = LazyExoticComponent<ComponentType>

/**
 * Keyed by route, and deliberately literal: a dynamic `import(path)` would
 * defeat the bundler's static analysis and cost a chunk per page anyway.
 */
export const SURFACE_PAGES: Record<string, PageComponent> = {
  '/research/loop/harness': lazy(() => import('@/pages/research/loop/HarnessConsolePage')),
  '/research/loop/decisions': lazy(() => import('@/pages/research/loop/DecisionInboxPage')),
  '/research/book': lazy(() => import('@/pages/research/book/ResearchBookPage')),
  '/research/loop/hypotheses': lazy(() => import('@/pages/research/loop/HypothesisBoardPage')),
  '/research/loop/candidates': lazy(() => import('@/pages/research/loop/CandidatePoolPage')),
  '/research/watchlist': lazy(() => import('@/pages/research/data/StockWatchlistPage')),
  '/research/journal': lazy(() => import('@/pages/research/journal/JournalPage')),
  '/research/copilot': lazy(() => import('@/pages/research/seats/CopilotDeskPage')),
  '/research/copilot/trading': lazy(() => import('@/pages/research/seats/TradingCopilotPage')),
  '/market/live': lazy(() => import('@/pages/market/LivePage')),
  '/research/event-radar': lazy(() => import('@/pages/research/alerts/AlertsPage')),
  // The one spine page that is also a surface (Rev .58): the Symbol panel.
  '/research/symbol': lazy(() => import('@/pages/research/analyze/symbol/SymbolPage')),
}

export function surfacePageFor(to: string): PageComponent | null {
  return SURFACE_PAGES[to] ?? null
}
