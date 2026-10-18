/**
 * What a page is on compact (design Rev .163 → .164, DESIGN_CONTRACTS §18.2;
 * the design's table is `shell-registry.js` `compactTier`). Only compact, and
 * never inside a surface: medium and up have every page at full strength.
 *
 * - **act** — watch the book and act on it: positions, the inbox, close and
 *   roll, alerts, limits.
 * - **read** — readable as is; anything marked `data-sr-build` (screen
 *   builders, editors) hides.
 * - **desk** — built for a larger screen. The phone shows a page that says so
 *   and where it lives (`DeskGate`), never a blank page, and More lists the
 *   row faint with the reason — the `FilterChip missing` rule: do not hide it,
 *   say why.
 *
 * Trade-specific (HANDOFF Rev .163: not promoted to `@bifrost/ui`). The old
 * names a redirect still answers to are listed beside their pages, so a tier is
 * right before and after the redirect lands.
 */
export type CompactTier = 'act' | 'read' | 'desk'
/** Rev .163's name. */
export type PhoneTier = CompactTier

const ACT: ReadonlySet<string> = new Set([
  '/home',
  '/portfolio/positions',
  '/trade/desk',
  '/trade/expiration',
  '/trade/assignment',
  // The old name of a trade's page, still a redirect (Rev .172 lists it with /trade/:id).
  '/instance',
  '/research/loop/decisions',
  '/review/proposals',
  '/research/event-radar',
  '/risk/limits',
])

const READ: ReadonlySet<string> = new Set([
  // Portfolio's other pages
  '/portfolio',
  '/portfolio/performance',
  '/portfolio/pnl-explain',
  '/portfolio/backing',
  '/portfolio/accounts',
  '/portfolio/ledger',
  '/portfolio/transfer',
  '/portfolio/corporate-actions',
  // Trading
  '/trade/fills',
  '/trade/plans',
  // Risk's other pages
  '/risk',
  '/risk/margin',
  '/risk/portfolio',
  '/risk/stress',
  // Symbol and its tab routes
  '/research/symbol',
  '/research/vol-regime',
  '/research/dealer-levels',
  '/research/scenario',
  '/research/flow',
  // Stock screen and its aliases
  '/research/stocks',
  '/research/screener',
  '/research/explorer',
  '/research/ratings/stocks',
  // Events, the calendar, the brief, the lists
  '/research/events',
  '/home/calendar',
  '/research/daily-brief',
  '/research/watchlist',
  '/research/book',
  '/research/journal',
  // Review's four
  '/review',
  '/review/trade',
  '/review/objectives',
  '/review/habits',
  // Beside the page, and System's two
  '/market/live',
  '/settings',
  '/system/status',
])

/** A trade's own page, `/trade/123` (or its old `/instance/123`) — act: it is where a roll or a close is decided. */
const TRADE_PAGE = /^\/(trade|instance)\/\d+\/?$/

export function compactTier(pathname: string): CompactTier {
  const p = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  if (ACT.has(p) || TRADE_PAGE.test(p)) return 'act'
  if (READ.has(p)) return 'read'
  return 'desk'
}

/** Rev .163's name. */
export const phoneTier = compactTier

/** The reason a desk-tier row gives, on the gate and on More's faint rows. */
export const DESK_TIER_REASON = 'Built for a larger screen — iPhone watches the book and acts on it'
