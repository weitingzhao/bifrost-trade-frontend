import { postDocsShutdown } from '@/api/docs'
import { postMarketShutdown, postResearchShutdown, postStrategyShutdown } from '@/api/research'
import { postMassiveShutdown } from '@/api/massive'
import { postMonitorShutdown } from '@/api/monitor'
import { postOpsShutdown } from '@/api/ops'
import { postPortfolioShutdown } from '@/api/portfolio'
import { postTradingShutdown } from '@/api/trading'

export interface ApiShutdownConfig {
  label: string
  scriptHint: string
  requiresOpsToken: boolean
  post: () => Promise<{ ok: boolean; error?: string }>
}

export const API_SHUTDOWN_BY_KEY: Record<string, ApiShutdownConfig> = {
  monitor: {
    label: 'Monitor API',
    scriptHint: 'python scripts/run_server.py',
    requiresOpsToken: true,
    post: postMonitorShutdown,
  },
  ops: {
    label: 'Ops API',
    scriptHint: 'python scripts/run_server_ops.py',
    requiresOpsToken: true,
    post: postOpsShutdown,
  },
  docs: {
    label: 'Docs API',
    scriptHint: 'python scripts/run_server_docs.py',
    requiresOpsToken: true,
    post: postDocsShutdown,
  },
  trading: {
    label: 'Trading API',
    scriptHint: 'python scripts/run_server_trading.py',
    requiresOpsToken: true,
    post: () => postTradingShutdown(),
  },
  portfolio: {
    label: 'Portfolio API',
    scriptHint: 'python scripts/run_server_portfolio.py',
    requiresOpsToken: true,
    post: () => postPortfolioShutdown(),
  },
  research: {
    label: 'Research API',
    scriptHint: 'python scripts/run_server_research.py',
    requiresOpsToken: true,
    post: () => postResearchShutdown(),
  },
  strategy: {
    label: 'Strategy API',
    scriptHint: 'python scripts/run_server_strategy.py',
    requiresOpsToken: true,
    post: () => postStrategyShutdown(),
  },
  market: {
    label: 'Market API',
    scriptHint: 'python scripts/run_server_market.py',
    requiresOpsToken: true,
    post: () => postMarketShutdown(),
  },
  massive: {
    label: 'Massive API',
    scriptHint: 'python scripts/run_server_massive.py',
    requiresOpsToken: false,
    post: postMassiveShutdown,
  },
}

/** Sidecar shutdown at explicit service base (trading/portfolio/research tabs). */
export function shutdownAtServiceBase(
  serviceKey: string,
  base: string,
): Promise<{ ok: boolean; error?: string }> {
  const b = base.replace(/\/$/, '')
  switch (serviceKey) {
    case 'trading':
      return postTradingShutdown(b)
    case 'portfolio':
      return postPortfolioShutdown(b)
    case 'research':
      return postResearchShutdown(b)
    case 'strategy':
      return postStrategyShutdown(b)
    case 'market':
      return postMarketShutdown(b)
    default:
      return Promise.resolve({ ok: false, error: 'Unknown service' })
  }
}
