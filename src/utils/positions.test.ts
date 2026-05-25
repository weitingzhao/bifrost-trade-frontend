import { describe, it, expect } from 'vitest'
import {
  fmtUsd,
  fmtPct,
  formatLastUpdate,
  fmtExpiry,
  rightLabel,
  buildQuoteMap,
  buildCkMap,
  uniqueSymbols,
  uniqueContractKeys,
  resolveBasePrice,
  fmtExecDaysAgo,
} from './positions'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { QuotesResponse, DailyBenchmark } from '@/types/market'
import type { LivePositionRow } from '@/types/positions'

describe('fmtUsd', () => {
  it('formats numbers as USD currency', () => {
    expect(fmtUsd(1234.56)).toBe('$1,234.56')
    expect(fmtUsd(-500)).toBe('-$500.00')
  })

  it('returns dash for null/undefined/NaN', () => {
    expect(fmtUsd(null)).toBe('—')
    expect(fmtUsd(undefined)).toBe('—')
    expect(fmtUsd(NaN)).toBe('—')
  })

  it('rounds when round=true', () => {
    expect(fmtUsd(1234.56, true)).toBe('$1,235')
  })
})

describe('fmtPct', () => {
  it('formats positive with + sign', () => {
    expect(fmtPct(5.123)).toBe('+5.12%')
  })

  it('formats negative without extra sign', () => {
    expect(fmtPct(-3.456)).toBe('-3.46%')
  })

  it('returns dash for null/undefined/NaN', () => {
    expect(fmtPct(null)).toBe('—')
    expect(fmtPct(undefined)).toBe('—')
    expect(fmtPct(NaN)).toBe('—')
  })
})

describe('formatLastUpdate', () => {
  it('returns dash for null', () => {
    expect(formatLastUpdate(null)).toBe('—')
    expect(formatLastUpdate(undefined)).toBe('—')
  })

  it('formats recent timestamps as seconds', () => {
    const nowSec = Math.floor(Date.now() / 1000)
    expect(formatLastUpdate(nowSec - 30)).toMatch(/^\d+s$/)
  })

  it('formats older timestamps as minutes', () => {
    const nowSec = Math.floor(Date.now() / 1000)
    expect(formatLastUpdate(nowSec - 300)).toMatch(/^\d+m$/)
  })
})

describe('fmtExpiry', () => {
  it('formats YYYYMMDD to MM/DD/YY', () => {
    expect(fmtExpiry('20250620')).toBe('06/20/25')
  })

  it('formats YYYYMM to MM/YY', () => {
    expect(fmtExpiry('202506')).toBe('06/25')
  })

  it('returns dash for undefined', () => {
    expect(fmtExpiry(undefined)).toBe('—')
  })

  it('returns original for other formats', () => {
    expect(fmtExpiry('2025')).toBe('2025')
  })
})

describe('rightLabel', () => {
  it('maps C to Call', () => {
    expect(rightLabel('C')).toBe('Call')
  })

  it('maps P to Put', () => {
    expect(rightLabel('P')).toBe('Put')
  })

  it('returns dash for undefined', () => {
    expect(rightLabel(undefined)).toBe('—')
  })
})

describe('buildQuoteMap', () => {
  it('builds symbol-keyed map from quotes response', () => {
    const data: QuotesResponse = {
      quotes: [
        { symbol: 'AAPL', last: 150, bid: 149.9, ask: 150.1 },
        { symbol: 'nvda', last: 900, bid: 899, ask: 901 },
      ],
    }
    const map = buildQuoteMap(data)
    expect(map['AAPL']?.last).toBe(150)
    expect(map['NVDA']?.last).toBe(900)
  })

  it('returns empty object for undefined', () => {
    expect(buildQuoteMap(undefined)).toEqual({})
  })
})

describe('buildCkMap', () => {
  it('builds contract_key-keyed map', () => {
    const data: QuotesResponse = {
      quotes: [
        { symbol: 'AAPL', contract_key: 'AAPL|OPT|20250620|150|C', last: 5.5, bid: 5.4, ask: 5.6 },
      ],
    }
    const map = buildCkMap(data)
    expect(map['AAPL|OPT|20250620|150|C']?.last).toBe(5.5)
  })
})

describe('uniqueSymbols', () => {
  it('extracts unique STK symbols from accounts', () => {
    const accounts: IbAccountSnapshot[] = [
      {
        account_id: 'U123',
        positions: [
          { symbol: 'AAPL', secType: 'STK' },
          { symbol: 'NVDA', secType: 'STK' },
          { symbol: 'AAPL', secType: 'OPT' },
        ],
      },
    ]
    const syms = uniqueSymbols(accounts)
    expect(syms).toContain('AAPL')
    expect(syms).toContain('NVDA')
    expect(syms).toHaveLength(2)
  })
})

describe('uniqueContractKeys', () => {
  it('extracts OPT contract keys', () => {
    const accounts: IbAccountSnapshot[] = [
      {
        positions: [
          { secType: 'STK', symbol: 'AAPL' },
          { secType: 'OPT', contract_key: 'AAPL|OPT|20250620|150|C' },
        ],
      },
    ]
    const keys = uniqueContractKeys(accounts)
    expect(keys).toEqual(['AAPL|OPT|20250620|150|C'])
  })
})

describe('resolveBasePrice', () => {
  it('prefers pos.daily_prev_close', () => {
    const pos = { daily_prev_close: 145 } as LivePositionRow
    expect(resolveBasePrice(pos, undefined)).toBe(145)
  })

  it('uses benchmark prev_close when is_today', () => {
    const pos = {} as LivePositionRow
    const bench: DailyBenchmark = {
      bar_time: null,
      close: 150,
      prev_close: 148,
      is_today: true,
      is_stale: false,
    }
    expect(resolveBasePrice(pos, bench)).toBe(148)
  })

  it('uses benchmark close when not today', () => {
    const pos = {} as LivePositionRow
    const bench: DailyBenchmark = {
      bar_time: null,
      close: 150,
      prev_close: 148,
      is_today: false,
      is_stale: false,
    }
    expect(resolveBasePrice(pos, bench)).toBe(150)
  })

  it('returns null when no data', () => {
    expect(resolveBasePrice({} as LivePositionRow, undefined)).toBeNull()
  })
})

describe('fmtExecDaysAgo', () => {
  it('returns Today for < 0.5', () => {
    expect(fmtExecDaysAgo(0.2)).toBe('Today')
  })

  it('returns 1 day ago', () => {
    expect(fmtExecDaysAgo(1)).toBe('1 day ago')
  })

  it('returns N days ago', () => {
    expect(fmtExecDaysAgo(5)).toBe('5 days ago')
  })

  it('returns dash for null', () => {
    expect(fmtExecDaysAgo(null)).toBe('—')
  })
})
