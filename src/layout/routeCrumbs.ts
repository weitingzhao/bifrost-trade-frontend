/**
 * The breadcrumb trail each route sits under.
 *
 * Shared by the page table and the redirect table, which is the only reason
 * they are not inline: two files need the same tuples and a second copy would
 * drift.
 */
/**
 * Live · Alerts · Events sit under Home since design §5a.1.
 *
 * The earlier ruling filed them under Research on the argument that they
 * state the market's facts, and Research is where facts about the market
 * live. That read the content and missed the axis: Home is organised by time
 * of day, and these three are the market's own clock — what is trading now,
 * what I armed and what has fired, what arrives in the next thirty days.
 * The routes do not move; only the trail does.
 */
export const MARKET = ['Home'] as const
export const PORTFOLIO = ['Portfolio'] as const
export const TRADE = ['Trade'] as const
/**
 * Flattened to one level: Desk is no longer a row inside Trade — it *is*
 * Trade (§5a.1), so its six pages hang off the layer directly.
 */
export const TRADE_DESK = ['Trade'] as const
export const RISK = ['Risk'] as const
/**
 * Contract Greeks' own crumbs since design Rev 2026-09-23.3. It is the
 * per-leg detail behind Portfolio Exposure's aggregates, and the design moved
 * it out of Research › Analyze on the ground that its subject is the whole
 * book's option legs — the symbol is a filter, not a subject.
 */
export const RISK_EXPOSURE = ['Risk', 'Portfolio Exposure'] as const
export const REVIEW = ['Review'] as const
export const RESEARCH = ['Research'] as const
/**
 * Equipment trails do not begin in Research any more (design Rev 2026-09-22.2,
 * §5a.8).
 *
 * The three modules left the business tree because they are not phases of the
 * script — Autopilot runs it, The Book remembers it, the Copilot is held while
 * playing it. The breadcrumb was the last thing still filing them under
 * Research, and a trail whose first segment names a tree the page is no longer
 * in points at a row that is not there.
 *
 * So each module is its own root: `The Book › Journal`, `Copilot › Book
 * starters`, and the module homes carry no prefix at all because there is
 * nothing above them. The two pages that moved into a phase take that phase's
 * trail instead — the Decision Inbox reads `Review`, Daily Brief reads `Home`.
 */
export const AUTOPILOT = ['Autopilot'] as const
export const THE_BOOK = ['The Book'] as const
export const COPILOT = ['Copilot'] as const
export const AGENTS = ['System', 'Agents'] as const
/**
 * The three Pipeline folds carry Pipeline in the trail.
 *
 * The Workbench seat became **Pipeline** when the seats were retired (Owner
 * 2026-09-19), and the sidebar nested these three under it — so the trails
 * grew a `Pipeline` segment to match, because a breadcrumb naming a level the
 * menu does not have is a breadcrumb lying about where you are.
 *
 * The segment went again on 2026-09-22 (§5a.9) for exactly the same reason,
 * read the other way: the fold merged into the Research layer, so the three
 * captions sit directly under it and the trail is two deep again.
 */
export const DISCOVER = ['Research', 'Discover'] as const
export const ANALYZE = ['Research', 'Analyze'] as const
export const VALIDATE = ['Research', 'Validate'] as const
export const DATA = ['Research', 'Data'] as const
export const STRATEGY = ['Strategy'] as const
// One group, three folds. `/settings` and `/operations` were two names for one
// thing — the machine under the desk — and Settings additionally ran a second
// navigation shell of its own. Both are `/system/*` now; the old paths redirect.
/** The System landing itself (design's collapse target) sits above the folds. */
export const SYSTEM = ['System'] as const
export const SYSTEM_DATA = ['System', 'Data'] as const
export const SYSTEM_RUNTIME = ['System', 'Runtime'] as const
export const SYSTEM_CONFIG = ['System', 'Configuration'] as const
export const DOCS = ['System', 'Reference'] as const
