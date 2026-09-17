import { describe, expect, it } from 'vitest'
import { buildTransferPayRows, netOf } from './transferPayRows'
import type { AccountTransaction } from '@/types/trading'

/** Epoch seconds at midnight UTC, the shape every ts in this ledger has. */
function at(iso: string, amount: number, account_id = 'U17123565'): AccountTransaction {
  return {
    account_id,
    ts: String(Date.parse(`${iso}T00:00:00Z`) / 1000),
    amount,
    type: 'other',
    currency: 'USD',
    description: 'x',
  }
}

const SEP_11 = at('2026-09-11', 4000)
const SEP_02 = at('2026-09-02', 7.25)
const AUG_31 = at('2026-08-31', -10)
const AUG_14 = at('2026-08-14', 122.4)

describe('buildTransferPayRows', () => {
  it('opens a separator on each new month and leaves the rows in order', () => {
    const filtered = [SEP_11, SEP_02, AUG_31, AUG_14]
    const rows = buildTransferPayRows({ page: filtered, filtered, groupByMonth: true })
    expect(rows.map(r => r.row)).toEqual(['month', 'tx', 'tx', 'month', 'tx', 'tx'])
    expect(rows.filter(r => r.row === 'month').map(r => r.row === 'month' && r.label)).toEqual([
      'SEP 2026',
      'AUG 2026',
    ])
  })

  it('counts and nets the whole month, not the part that fits on this page', () => {
    const filtered = [SEP_11, SEP_02, AUG_31, AUG_14]
    const rows = buildTransferPayRows({
      page: [SEP_11],
      filtered,
      groupByMonth: true,
    })
    const month = rows.find(r => r.row === 'month')
    expect(month?.row === 'month' && month.events).toBe(2)
    expect(month?.row === 'month' && month.net).toBeCloseTo(4007.25, 2)
  })

  it('emits no separators at all when grouping is off', () => {
    const filtered = [SEP_11, AUG_31]
    const rows = buildTransferPayRows({ page: filtered, filtered, groupByMonth: false })
    expect(rows.map(r => r.row)).toEqual(['tx', 'tx'])
  })

  it('gives every row a distinct key even when two rows are identical', () => {
    const twin = at('2026-09-02', 7.25)
    const page = [SEP_02, twin]
    const rows = buildTransferPayRows({ page, filtered: page, groupByMonth: false })
    expect(new Set(rows.map(r => r.key)).size).toBe(2)
  })
})

describe('netOf', () => {
  it('treats an unusable amount as nothing rather than poisoning the total', () => {
    const bad = { ...SEP_11, amount: Number.NaN }
    expect(netOf([SEP_02, bad])).toBeCloseTo(7.25, 2)
  })
})
