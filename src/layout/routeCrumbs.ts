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
export const RISK = ['Risk'] as const
export const REVIEW = ['Review'] as const
export const RESEARCH = ['Research'] as const
export const AUTOPILOT = ['Research', 'Autopilot'] as const
export const COPILOT = ['Research', 'Copilot'] as const
export const DISCOVER = ['Research', 'Discover'] as const
export const ANALYZE = ['Research', 'Analyze'] as const
export const VALIDATE = ['Research', 'Validate'] as const
export const DATA = ['Research', 'Data'] as const
export const STRATEGY = ['Strategy'] as const
// One group, three folds. `/settings` and `/operations` were two names for one
// thing — the machine under the desk — and Settings additionally ran a second
// navigation shell of its own. Both are `/system/*` now; the old paths redirect.
export const SYSTEM_DATA = ['System', 'Data'] as const
export const SYSTEM_RUNTIME = ['System', 'Runtime'] as const
export const SYSTEM_CONFIG = ['System', 'Configuration'] as const
export const DOCS = ['System', 'Reference'] as const
