/**
 * What each walked page was built against, in prose.
 *
 * These notes are the record of a walk: what was built, what was deliberately
 * left, and which readings the data cannot make. They are long on purpose — the
 * next person to open a page should not have to reconstruct why a column says
 * "no reading". They live here rather than in `routeRegistry.ts` so that file
 * stays a table someone can read at a glance.
 *
 * Keyed by route path. A page with no note simply has no entry.
 */
import { HOME_NOTES } from './home'
import { PORTFOLIO_NOTES } from './portfolio'
import { RESEARCH_NOTES } from './research'
import { REVIEW_NOTES } from './review'
import { RISK_NOTES } from './risk'
import { SYSTEM_NOTES } from './system'
import { TRADE_NOTES } from './trade'

export const DESIGN_NOTES: Record<string, string> = {
  ...HOME_NOTES,
  ...PORTFOLIO_NOTES,
  ...RESEARCH_NOTES,
  ...REVIEW_NOTES,
  ...RISK_NOTES,
  ...SYSTEM_NOTES,
  ...TRADE_NOTES,
}
