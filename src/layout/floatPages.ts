/**
 * Which component a floated route renders.
 *
 * The design floats an **iframe** because its prototypes are separate
 * documents. This app is one SPA, so a float renders the page component
 * directly — no iframe, no embed flag, no shell to hide, because the shell was
 * never inside the page.
 *
 * The cost is this table: a second place that maps a route to a component,
 * beside `router.tsx`. It is small and it is gated — `floatPages.test.ts`
 * parses the router and fails if a route here resolves to a different module
 * than the router gives it, so the two cannot drift silently.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type PageComponent = LazyExoticComponent<ComponentType>

/**
 * Keyed by route, and deliberately literal: a dynamic `import(path)` would
 * defeat the bundler's static analysis and cost a chunk per page anyway.
 */
export const FLOAT_PAGES: Record<string, PageComponent> = {
  '/research/loop/harness': lazy(() => import('@/pages/research/loop/HarnessConsolePage')),
  '/research/loop/decisions': lazy(() => import('@/pages/research/loop/DecisionInboxPage')),
  '/research/book': lazy(() => import('@/pages/research/book/ResearchBookPage')),
  '/research/loop/hypotheses': lazy(() => import('@/pages/research/loop/HypothesisBoardPage')),
  '/research/loop/candidates': lazy(() => import('@/pages/research/loop/CandidatePoolPage')),
  '/research/watchlist': lazy(() => import('@/pages/research/data/StockWatchlistPage')),
  '/research/journal': lazy(() => import('@/pages/research/journal/JournalPage')),
  '/research/copilot': lazy(() => import('@/pages/research/seats/CopilotDeskPage')),
  '/research/copilot/trading': lazy(() => import('@/pages/research/seats/TradingCopilotPage')),
}

export function floatPageFor(to: string): PageComponent | null {
  return FLOAT_PAGES[to] ?? null
}
