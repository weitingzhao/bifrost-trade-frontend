/**
 * One row per account × source — the reading the header badges cannot give.
 *
 * A badge takes the freshest of the accounts, so an account twenty days behind
 * is invisible until you switch to it. This table shows every pair the
 * freshness endpoint reports, which is where the verdict actually lives.
 *
 * The hand-written journal gets no threshold at all. It is occasional by
 * nature, so age alone says nothing: the row reports when the last entry was
 * written and stays grey.
 */
import type { ExecutionFreshnessItem } from '@/types/trading'

export type FreshnessState = 'current' | 'behind' | 'dry' | 'noReading'

export interface FreshnessRow {
  key: string
  accountId: string
  role: string
  source: string
  /** Newest record, as an age. */
  age: string
  reading: string
  state: FreshnessState
  meaning: string
}

const JOURNAL = 'journal_closed'
const FLEX = 'flex_trades'

/** Roles come from net liquidation order, which is how the page ranks accounts everywhere. */
export function accountRoles(accountIds: readonly string[]): Record<string, string> {
  const roles: Record<string, string> = {}
  accountIds.forEach((id, i) => {
    roles[id] = i === 0 ? 'Host' : i === 1 ? 'Secondary' : 'dormant'
  })
  return roles
}

function ageLabel(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return '—'
  if (days < 1) return `${Math.round(days * 24)}h`
  return days < 100 ? `${days.toFixed(1)}d` : `${Math.round(days)}d`
}

function isoDay(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return 'an unknown date'
  return new Date(ts * 1000).toLocaleDateString('en-CA', { timeZone: 'UTC' })
}

export function buildFreshnessRows(
  items: readonly ExecutionFreshnessItem[],
  roles: Record<string, string>,
): FreshnessRow[] {
  return [...items]
    .sort(
      (a, b) =>
        (a.account_id ?? '').localeCompare(b.account_id ?? '') ||
        (a.source ?? '').localeCompare(b.source ?? ''),
    )
    .map((item) => {
      const accountId = item.account_id ?? '—'
      const source = item.source ?? '—'
      const days = item.days_since_latest
      const base = {
        key: `${accountId}-${source}`,
        accountId,
        role: roles[accountId] ?? '',
        source,
        age: ageLabel(days),
      }

      if (source === JOURNAL) {
        return {
          ...base,
          reading: `last entry ${isoDay(item.latest_exec_ts)}`,
          state: 'noReading' as const,
          meaning:
            'Hand-written entries are occasional. No threshold applies here — this row reports when the last one was written, nothing more.',
        }
      }

      if (days == null || !Number.isFinite(days)) {
        return {
          ...base,
          reading: 'no reading',
          state: 'noReading' as const,
          meaning: 'This source has never written a record for this account.',
        }
      }

      if (days <= 2) {
        return {
          ...base,
          reading: 'current',
          state: 'current' as const,
          meaning: 'Newest record is inside the trading day.',
        }
      }

      const whole = Math.round(days)
      if (days <= 30) {
        return {
          ...base,
          reading: 'behind',
          state: 'behind' as const,
          meaning:
            source === FLEX
              ? `This account has had no new Flex trade for ${whole} days. A badge shows the freshest account, so read this row, not that badge.`
              : `No new record in ${whole} days.`,
        }
      }

      return {
        ...base,
        reading: 'dry',
        state: 'dry' as const,
        meaning:
          source === 'tws_client'
            ? `No TWS execution in ${whole} days. Not necessarily broken — TWS may simply be disconnected while Flex carries the trades.`
            : `No record in ${whole} days from a source that should be writing them.`,
      }
    })
}

/** Days since the newest record for one account × source, or null when the pair is silent. */
export function daysFor(
  items: readonly ExecutionFreshnessItem[],
  accountId: string,
  source: string,
): number | null {
  const hit = items.find((i) => i.account_id === accountId && i.source === source)
  const days = hit?.days_since_latest
  return days != null && Number.isFinite(days) ? days : null
}
