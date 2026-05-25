import { describe, it, expect } from 'vitest'
import {
  stkContractKey,
  buildPositionCategoryByAccountContract,
  getStkLedgerBucketForExecution,
} from './stkBuckets'
import type { Execution } from '@/types/positions'
import type { StatusResponse } from '@/types/monitor'

describe('stkContractKey', () => {
  it('builds key from symbol and account', () => {
    expect(stkContractKey('NVDA', 'U123')).toBe('U123|NVDA|STK|||')
  })

  it('trims and uppercases symbol', () => {
    expect(stkContractKey(' nvda ', ' U123 ')).toBe('U123|NVDA|STK|||')
  })
})

describe('buildPositionCategoryByAccountContract', () => {
  it('returns empty map for null status', () => {
    expect(buildPositionCategoryByAccountContract(null).size).toBe(0)
  })

  it('maps positions by account+contract_key', () => {
    const status = {
      portfolio: {
        accounts: [
          {
            account_id: 'U123',
            positions: [
              { contract_key: 'NVDA|STK|||', category: 'Tech Stocks' },
              { contract_key: 'TLT|STK|||', category: 'Fixed Income ETF' },
            ],
          },
        ],
      },
    } as unknown as StatusResponse

    const map = buildPositionCategoryByAccountContract(status)
    expect(map.get('U123|NVDA|STK|||')).toBe('Tech Stocks')
    expect(map.get('U123|TLT|STK|||')).toBe('Fixed Income ETF')
  })
})

describe('getStkLedgerBucketForExecution', () => {
  const catMap = new Map<string, string>([
    ['U123|NVDA|STK|||', 'Growth'],
    ['U123|TLT|STK|||', 'Fixed Income ETF'],
    ['U123|SGOV|STK|||', 'Cash-Like Fund'],
  ])

  function makeStk(symbol: string): Execution {
    return {
      account_executions_id: 1,
      account_id: 'U123',
      contract_key: `${symbol}|STK|||`,
      symbol,
      sec_type: 'STK',
      side: 'Buy',
      qty: 10,
      price: 100,
      time: 1700000000,
    }
  }

  it('returns null for non-STK', () => {
    const opt = { ...makeStk('NVDA'), sec_type: 'OPT' }
    expect(getStkLedgerBucketForExecution(opt, catMap)).toBeNull()
  })

  it('classifies regular stocks as stocks bucket', () => {
    expect(getStkLedgerBucketForExecution(makeStk('NVDA'), catMap)).toBe('stocks')
  })

  it('classifies fixed income category', () => {
    expect(getStkLedgerBucketForExecution(makeStk('TLT'), catMap)).toBe('fixed_income')
  })

  it('classifies cash-like category', () => {
    expect(getStkLedgerBucketForExecution(makeStk('SGOV'), catMap)).toBe('cash_like')
  })

  it('defaults to stocks when category not found', () => {
    expect(getStkLedgerBucketForExecution(makeStk('UNKNOWN'), catMap)).toBe('stocks')
  })
})
