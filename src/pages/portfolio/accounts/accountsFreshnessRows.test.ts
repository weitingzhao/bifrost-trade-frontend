import { describe, expect, it } from 'vitest'
import { accountRoles, buildFreshnessRows, daysFor } from './accountsFreshnessRows'
import type { ExecutionFreshnessItem } from '@/types/trading'

// The five rows `/api/trading/executions/freshness` returns on DEV, 2026-09-16.
const ITEMS: ExecutionFreshnessItem[] = [
  { account_id: 'U17123565', source: 'flex_trades', latest_exec_ts: 1789472528, days_since_latest: 1.571 },
  { account_id: 'U17123565', source: 'journal_closed', latest_exec_ts: 1774076889, days_since_latest: 179.76 },
  { account_id: 'U17123565', source: 'tws_client', latest_exec_ts: 1778911822, days_since_latest: 123.8 },
  { account_id: 'U8829175', source: 'flex_trades', latest_exec_ts: 1787834803, days_since_latest: 20.53 },
  { account_id: 'U8829175', source: 'tws_client', latest_exec_ts: 1776131006, days_since_latest: 155.99 },
]

const ROLES = accountRoles(['U17123565', 'U8829175', 'U17113214'])

describe('the account by source table', () => {
  it('reports every pair, so the account that is behind cannot hide', () => {
    const rows = buildFreshnessRows(ITEMS, ROLES)
    expect(rows).toHaveLength(5)

    const behind = rows.find((r) => r.accountId === 'U8829175' && r.source === 'flex_trades')
    expect(behind?.reading).toBe('behind')
    expect(behind?.age).toBe('20.5d')
    // The point of the row: a badge takes the freshest account and would have
    // reported this book as 1.6 days fresh.
    expect(behind?.meaning).toContain('read this row, not that badge')

    const current = rows.find((r) => r.accountId === 'U17123565' && r.source === 'flex_trades')
    expect(current?.reading).toBe('current')
  })

  it('gives the hand-written journal a date and no threshold at all', () => {
    const rows = buildFreshnessRows(ITEMS, ROLES)
    const journal = rows.find((r) => r.source === 'journal_closed')
    expect(journal?.state).toBe('noReading')
    expect(journal?.reading).toBe('last entry 2026-03-21')
    expect(journal?.meaning).toContain('No threshold applies here')
  })

  it('calls a dry TWS link degraded, not broken', () => {
    const rows = buildFreshnessRows(ITEMS, ROLES)
    const tws = rows.find((r) => r.accountId === 'U17123565' && r.source === 'tws_client')
    expect(tws?.reading).toBe('dry')
    expect(tws?.meaning).toContain('Not necessarily broken')
  })

  it('reads a silent pair as no reading rather than as current', () => {
    const rows = buildFreshnessRows(
      [{ account_id: 'U17113214', source: 'flex_trades', latest_exec_ts: null, days_since_latest: null }],
      ROLES,
    )
    expect(rows[0].reading).toBe('no reading')
    expect(rows[0].age).toBe('—')
  })
})

describe('daysFor', () => {
  it('answers null for a pair the endpoint never reported', () => {
    expect(daysFor(ITEMS, 'U17123565', 'tws_client')).toBeCloseTo(123.8)
    // The dormant account has no freshness row at all, which is why its two rec
    // columns are grey rather than showing a zero.
    expect(daysFor(ITEMS, 'U17113214', 'flex_trades')).toBeNull()
  })
})

describe('accountRoles', () => {
  it('names accounts by net liquidation order, which is how the page sorts them', () => {
    expect(ROLES).toEqual({
      U17123565: 'Host',
      U8829175: 'Secondary',
      U17113214: 'dormant',
    })
  })
})
