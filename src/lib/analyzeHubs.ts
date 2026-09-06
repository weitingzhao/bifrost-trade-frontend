/**
 * The Analyze hubs — five doors instead of twelve (research-loop-automation C1,
 * D-RLA-1).
 *
 * Twelve labs sat as twelve nav entries, each its own page with its own header,
 * context bar and regime ribbon. They were three subjects wearing twelve
 * costumes: how volatility is priced (IV rank, IV−RV spread, skew), where the
 * dealers sit (gamma levels, OpEx), and what the model expects (terrain,
 * forecast sessions, playbook). Each subject is now one hub with `?view=` tabs.
 * Flow stays a placeholder until the options tape is on the plan (D-RLA-4).
 *
 * This is the only place the retired paths survive: the router redirects
 * through it, and every link in the app goes through `labHref` so a rename
 * happens once.
 */
export const ANALYZE_HUB = {
  volRegime: '/research/vol-regime',
  dealerLevels: '/research/dealer-levels',
  scenario: '/research/scenario',
  flow: '/research/flow',
  discovery: '/research/discovery',
} as const

export type LabViewId = 'iv-rank' | 'vrp' | 'skew' | 'gex' | 'opex' | 'model' | 'sessions' | 'playbook'

export const VIEW_PARAM = 'view'

export const LAB_VIEW_HUB: Record<LabViewId, string> = {
  'iv-rank': ANALYZE_HUB.volRegime,
  vrp: ANALYZE_HUB.volRegime,
  skew: ANALYZE_HUB.volRegime,
  gex: ANALYZE_HUB.dealerLevels,
  opex: ANALYZE_HUB.dealerLevels,
  model: ANALYZE_HUB.scenario,
  sessions: ANALYZE_HUB.scenario,
  playbook: ANALYZE_HUB.scenario,
}

/** Append `symbol=` whether or not the route already carries a query. */
export function withSymbolParam(route: string, symbol?: string | null): string {
  const sym = (symbol ?? '').trim().toUpperCase()
  if (!sym) return route
  const [pathAndQuery, hash] = route.split('#', 2)
  const joiner = pathAndQuery.includes('?') ? '&' : '?'
  return `${pathAndQuery}${joiner}symbol=${encodeURIComponent(sym)}${hash ? `#${hash}` : ''}`
}

/** The hub view for a lab, with the symbol carried along. */
export function labHref(view: LabViewId, symbol?: string | null): string {
  return withSymbolParam(`${LAB_VIEW_HUB[view]}?${VIEW_PARAM}=${view}`, symbol)
}

/** The Flow placeholder, optionally at its multi-leg anchor. */
export function flowHref(symbol?: string | null, anchor?: 'multi-leg'): string {
  return withSymbolParam(`${ANALYZE_HUB.flow}${anchor ? `#${anchor}` : ''}`, symbol)
}

export interface RetiredAnalyzePath {
  hub: string
  view?: LabViewId
}

/** Old page path → hub (+ view). The redirect table. */
export const RETIRED_ANALYZE_PATHS: Record<string, RetiredAnalyzePath> = {
  '/research/iv-radar': { hub: ANALYZE_HUB.volRegime, view: 'iv-rank' },
  '/research/vrp-lab': { hub: ANALYZE_HUB.volRegime, view: 'vrp' },
  '/research/vol-surface-lab': { hub: ANALYZE_HUB.volRegime, view: 'skew' },
  '/research/gex-intraday': { hub: ANALYZE_HUB.dealerLevels, view: 'gex' },
  '/research/opex-cycle-lab': { hub: ANALYZE_HUB.dealerLevels, view: 'opex' },
  '/research/analysis-model': { hub: ANALYZE_HUB.scenario, view: 'model' },
  '/research/forecast-sessions': { hub: ANALYZE_HUB.scenario, view: 'sessions' },
  '/research/intraday-playbook': { hub: ANALYZE_HUB.scenario, view: 'playbook' },
  '/research/order-sentiment': { hub: ANALYZE_HUB.flow },
}

/**
 * Where an old URL lands, keeping its query (`?symbol=`, `?date=`) and hash.
 *
 * A plain `<Navigate to="/research/vol-regime?view=iv-rank">` would drop the
 * symbol a bookmark or a Copilot link carried — the one thing the reader
 * followed the link for.
 */
export function redirectTarget(from: string, search: string, hash: string): string | null {
  const target = RETIRED_ANALYZE_PATHS[from]
  if (!target) return null
  const params = new URLSearchParams(search)
  if (target.view) params.set(VIEW_PARAM, target.view)
  const query = params.toString()
  return `${target.hub}${query ? `?${query}` : ''}${hash ?? ''}`
}
