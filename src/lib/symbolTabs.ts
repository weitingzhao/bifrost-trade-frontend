/**
 * One symbol, one page, seven tabs — five doors folded into one.
 *
 * The app already made this move once: `analyzeHubs.ts` records twelve labs
 * becoming five hubs with `?view=` tabs, because they were "three subjects
 * wearing twelve costumes". Design (`design/trade/Research Symbol.dc.html`)
 * makes the same move one level up — the five doors are one name's six faces,
 * and reading them meant leaving the name each time.
 *
 * Owner overrode the standing "defer merges" decision for this page
 * specifically, 2026-09-12; it still holds everywhere else.
 *
 * Sections stack inside a tab rather than sub-tabbing. Volatility is four
 * lenses that are read *together* to form one verdict — hiding three of the
 * four behind a sub-tab is what made the old twelve-page layout hard to hold.
 * The retired `?view=` values survive as anchors so every existing deep link
 * still lands on its section.
 */
import { withSymbolParam } from '@/lib/symbolLink'
import {
  LAB_VIEW_LENS,
  RETIRED_HUB_TAB,
  SYMBOL_PATH,
  TAB_PARAM,
  VIEW_TAB,
  labHref,
  redirectTarget,
  type LabViewId,
  type SymbolTabId,
} from '@/lib/analyzeHubs'

export { SYMBOL_PATH, TAB_PARAM, VIEW_TAB, RETIRED_HUB_TAB, type SymbolTabId }

export interface SymbolTabDef {
  id: SymbolTabId
  label: string
  /**
   * Registry lenses this tab is answerable for. The tab's dot is the worst of
   * them, so a name's problem is visible without opening the tab that holds it.
   */
  lenses: readonly string[]
}

export const SYMBOL_TABS: readonly SymbolTabDef[] = [
  { id: 'overview', label: 'Overview', lenses: [] },
  { id: 'volatility', label: 'Volatility', lenses: ['iv_rank', 'vrp', 'term_slope', 'skew'] },
  { id: 'dealer', label: 'Dealer', lenses: ['gex_regime', 'opex_pin'] },
  { id: 'scenario', label: 'Scenario', lenses: ['terrain_regime'] },
  { id: 'flow', label: 'Flow', lenses: ['order_sentiment'] },
  { id: 'chain', label: 'Chain', lenses: [] },
  // The seventh face, built 2026-09-24: a structure on this name, priced at
  // expiry and today off the chain's own EOD marks. It waited on data that now
  // exists (`market-data` snapshots carry iv/delta per contract).
  { id: 'payoff', label: 'Payoff', lenses: [] },
]

const TAB_IDS = new Set<string>(SYMBOL_TABS.map((t) => t.id))

export function isSymbolTab(value: string | null | undefined): value is SymbolTabId {
  return value != null && TAB_IDS.has(value)
}

/**
 * The tab a URL means, in the order the reader's intent is most specific:
 * an explicit `?tab=`, then the `?view=` of a deep link written before the
 * merge, then Overview.
 */
export function tabFor(tab: string | null, view: string | null): SymbolTabId {
  if (isSymbolTab(tab)) return tab
  if (view && view in VIEW_TAB) return VIEW_TAB[view as LabViewId]
  return 'overview'
}

/** A link to one tab, with the symbol carried. */
export function symbolTabHref(tab: SymbolTabId, symbol?: string | null): string {
  return withSymbolParam(`${SYMBOL_PATH}?${TAB_PARAM}=${tab}`, symbol)
}

/** The lab view each lens is the skin of — `LAB_VIEW_LENS` read the other way. */
const LENS_VIEW = new Map(
  (Object.entries(LAB_VIEW_LENS) as [LabViewId, string][]).map(([view, lens]) => [lens, view]),
)

/**
 * Where one registry lens is read, on one symbol: its section when it had a
 * lab view, else the tab answerable for it, else null.
 *
 * The registry's own `page_route` still names the retired hubs, which redirect
 * — a link built from it costs a bounce through a URL that no longer exists.
 */
export function lensHref(lens: string, symbol?: string | null): string | null {
  const view = LENS_VIEW.get(lens)
  if (view) return labHref(view, symbol)
  const tab = SYMBOL_TABS.find((t) => t.lenses.includes(lens))
  return tab ? symbolTabHref(tab.id, symbol) : null
}

/**
 * Where an old hub URL lands, keeping the query it carried and turning its
 * `?view=` into the section anchor. A bookmark on `vol-regime?view=vrp&symbol=X`
 * followed the link for the VRP section on X; both have to survive.
 */
export function symbolRedirectTarget(
  from: string,
  search: string,
  hash: string,
): string | null {
  const tabFromPath = RETIRED_HUB_TAB[from]
  if (!tabFromPath) return null
  const params = new URLSearchParams(search)
  const view = params.get('view')
  params.delete('view')
  params.set(TAB_PARAM, view && view in VIEW_TAB ? VIEW_TAB[view as LabViewId] : tabFromPath)
  const anchor = hash || (view ? `#${view}` : '')
  const query = params.toString()
  return `${SYMBOL_PATH}${query ? `?${query}` : ''}${anchor}`
}

/**
 * Where any retired Analyze URL lands, in one navigation.
 *
 * Two generations of rename stack here: the nine lab pages that became hub
 * views (C1), and the six hubs that are now tabs. Resolving them one at a time
 * would bounce a bookmark through an intermediate URL — and the intermediate
 * no longer exists, so the second hop would have to be a redirect off a
 * redirect. Both hops are computed before navigating.
 */
export function analyzeRedirect(from: string, search: string, hash: string): string | null {
  const viaHub = redirectTarget(from, search, hash)
  if (viaHub == null) return symbolRedirectTarget(from, search, hash)
  const hashAt = viaHub.indexOf('#')
  const withoutHash = hashAt >= 0 ? viaHub.slice(0, hashAt) : viaHub
  const hubHash = hashAt >= 0 ? viaHub.slice(hashAt) : ''
  const qAt = withoutHash.indexOf('?')
  const path = qAt >= 0 ? withoutHash.slice(0, qAt) : withoutHash
  const query = qAt >= 0 ? withoutHash.slice(qAt) : ''
  return symbolRedirectTarget(path, query, hubHash)
}
