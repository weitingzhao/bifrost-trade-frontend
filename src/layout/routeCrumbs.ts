/**
 * The breadcrumb trail each route sits under.
 *
 * Shared by the page table and the redirect table, which is the only reason
 * they are not inline: two files need the same tuples and a second copy would
 * drift.
 */
export const MARKET = ['Research', 'Market'] as const
export const PORTFOLIO = ['Portfolio'] as const
export const TRADE = ['Trade'] as const
/** Rules is read from the Desk: the design's own trail is Trade › Desk › Rules. */
export const TRADE_DESK = ['Trade', 'Desk'] as const
export const RISK = ['Risk'] as const
export const REVIEW = ['Review'] as const
export const RESEARCH = ['Research'] as const
export const AUTOPILOT = ['Research', 'Autopilot'] as const
/** The object layer is seat-free (Vision §12): its trail names the Book, not the loop. */
export const THE_BOOK = ['Research', 'The Book'] as const
export const COPILOT = ['Research', 'Copilot'] as const
/**
 * The three Pipeline folds carry Pipeline in the trail.
 *
 * The Workbench seat became **Pipeline** when the seats were retired (Owner
 * 2026-09-19), and the sidebar has nested these three under it since. The
 * trails had not followed, so a reader standing on Symbol was told
 * `Research / Analyze` while the tree beside them said
 * `Research / Pipeline / Analyze` — the breadcrumb's one job is to say where
 * you are, and it was naming a level the menu no longer has.
 */
export const DISCOVER = ['Research', 'Pipeline', 'Discover'] as const
export const ANALYZE = ['Research', 'Pipeline', 'Analyze'] as const
export const VALIDATE = ['Research', 'Pipeline', 'Validate'] as const
export const DATA = ['Research', 'Data'] as const
export const STRATEGY = ['Strategy'] as const
// One group, three folds. `/settings` and `/operations` were two names for one
// thing — the machine under the desk — and Settings additionally ran a second
// navigation shell of its own. Both are `/system/*` now; the old paths redirect.
export const SYSTEM_DATA = ['System', 'Data'] as const
export const SYSTEM_RUNTIME = ['System', 'Runtime'] as const
export const SYSTEM_CONFIG = ['System', 'Configuration'] as const
export const DOCS = ['System', 'Reference'] as const
