import { fmtIsoDateToken } from '@/lib/format'

/**
 * A fill's trade date as the §14.4 token (`16SEP26`).
 *
 * A journal row carries no trade date, and the cell says so. Its `time` is the
 * moment it was typed in, and showing that as the trade date is the substitution
 * ruling B5 forbids — which is why this does not fall back the way
 * `executionDateStr` does for Performance's day bucketing.
 */
export function fmtLedgerTradeDate(tradeDate: string | null | undefined): string {
  const s = tradeDate == null ? '' : String(tradeDate).trim()
  return s ? fmtIsoDateToken(s) : 'no trade date'
}
