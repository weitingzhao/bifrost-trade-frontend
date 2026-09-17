import { describe, expect, it } from 'vitest'
import {
  ALL_TYPES,
  countByAccount,
  countByKind,
  countByType,
  emptySelectionReason,
  rangeLabelOf,
  selectRows,
} from './transferPaySelection'
import { RANGE_PRESET_OPTIONS } from '@/utils/transferPay'
import type { TransactionKind } from './kindRules'
import type { AccountTransaction } from '@/types/trading'

const A = 'U17123565'
const B = 'U8829175'

function tx(over: Partial<AccountTransaction>): AccountTransaction {
  return {
    account_id: A,
    ts: 1789084800,
    amount: -6,
    type: 'other',
    currency: 'USD',
    description: 'W******03:ABCOPRANP FOR SEP 2026',
    ...over,
  }
}

const LEDGER: AccountTransaction[] = [
  tx({}),
  tx({ description: 'USD CREDIT INT FOR AUG-2026', amount: 7.25 }),
  tx({ account_id: B, type: 'deposit', description: 'CASH RECEIPTS', amount: 4000 }),
  tx({ account_id: B, type: 'dividend', description: 'SGOV CASH DIVIDEND', amount: 122.4 }),
]

describe('chip counts', () => {
  it('counts each account across the whole ledger', () => {
    expect(countByAccount(LEDGER)).toEqual({ [A]: 2, [B]: 2 })
  })

  it('counts types and kinds over whatever rows it is handed', () => {
    expect(countByType(LEDGER)).toEqual({ deposit: 1, withdrawal: 0, dividend: 1, other: 2 })
    const kinds = countByKind(LEDGER)
    expect(kinds['Data fee']).toBe(1)
    expect(kinds.Financing).toBe(1)
    expect(kinds.Transfer).toBe(1)
    expect(kinds.Dividend).toBe(1)
    expect(kinds.Other).toBe(0)
  })

  it('gives every kind a count, including the ones with none', () => {
    const kinds = countByKind([])
    expect(Object.values(kinds).every(n => n === 0)).toBe(true)
    expect(Object.keys(kinds)).toHaveLength(8)
  })
})

describe('selectRows', () => {
  const all = { accountId: 'all', types: new Set(ALL_TYPES), kinds: new Set<TransactionKind>() }

  it('shows everything when no chip narrows it', () => {
    expect(selectRows(LEDGER, all)).toHaveLength(4)
  })

  it('narrows by account, by type and by kind together', () => {
    expect(selectRows(LEDGER, { ...all, accountId: B })).toHaveLength(2)
    expect(selectRows(LEDGER, { ...all, types: new Set(['other'] as const) })).toHaveLength(2)
    expect(selectRows(LEDGER, { ...all, kinds: new Set<TransactionKind>(['Financing']) })).toHaveLength(1)
  })

  it('reads an empty kind set as every kind, not as no kind', () => {
    expect(selectRows(LEDGER, { ...all, kinds: new Set<TransactionKind>() })).toHaveLength(4)
  })

  it('shows nothing when every type is cleared', () => {
    expect(selectRows(LEDGER, { ...all, types: new Set() })).toHaveLength(0)
  })
})

describe('emptySelectionReason', () => {
  const base = { accountId: 'all', types: new Set(ALL_TYPES), kinds: new Set<TransactionKind>() }

  it('points at the cleared type row when that is what emptied it', () => {
    expect(emptySelectionReason({ ...base, types: new Set() }, 'Last 365 calendar days')).toContain(
      'No type is selected',
    )
  })

  it('points at the kind chips when they are the narrowest thing on', () => {
    expect(
      emptySelectionReason({ ...base, kinds: new Set<TransactionKind>(['Tax']) }, 'Year to date'),
    ).toContain('Clearing the kind chips')
  })

  it('otherwise names the range, because the account simply has nothing in it', () => {
    expect(emptySelectionReason(base, 'Last business day')).toBe(
      'This account has no cash events in last business day.',
    )
  })
})

describe('rangeLabelOf', () => {
  it('reads the label the Range control shows', () => {
    expect(rangeLabelOf('last_365', RANGE_PRESET_OPTIONS)).toBe('Last 365 calendar days')
    expect(rangeLabelOf('last_business_day', RANGE_PRESET_OPTIONS)).toBe('Last business day')
  })
})
