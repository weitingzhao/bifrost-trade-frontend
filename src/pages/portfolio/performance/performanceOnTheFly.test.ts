import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildOtfRows, otfCountLabel } from './performanceOnTheFly'

function exec(over: Partial<Execution>): Execution {
  return {
    account_executions_id: 1,
    account_id: 'U0000001',
    contract_key: 'k',
    symbol: 'ZZZ',
    sec_type: 'STK',
    side: 'Buy',
    qty: 10,
    price: 12.5,
    time: 1_790_000_000,
    trade_date: '2026-09-15',
    ...over,
  }
}

describe('buildOtfRows', () => {
  it('shapes a stock fill as signed shares', () => {
    const [r] = buildOtfRows([exec({ quantity: 400, price: 52.184, commission: -0.4, realized_pnl: 18 })])
    expect(r.sym).toBe('ZZZ')
    expect(r.what).toBe('+400 sh')
    expect(r.qty).toBe('+400')
    expect(r.price).toBe('52.18')
    expect(r.comm).toBe('0.40')
    expect(r.realized).toBe(18)
    expect(r.date).toBe('15SEP26')
  })

  it('names an option fill by its contract token, from an OCC symbol or from the fields', () => {
    const rows = buildOtfRows([
      exec({ account_executions_id: 2, sec_type: 'OPT', side: 'Sell', qty: 2, symbol: 'QQQX  260919P00228000' }),
      exec({ account_executions_id: 3, sec_type: 'OPT', side: 'Sell', qty: 1, symbol: 'YYY', expiry: '20261017', strike: 7.5, option_right: 'C' }),
    ])
    expect(rows[0].sym).toBe('QQQX')
    expect(rows[0].what).toBe('−2 19SEP26 228P')
    expect(rows[1].sym).toBe('YYY')
    expect(rows[1].what).toBe('−1 17OCT26 7.5C')
  })

  it('groups options before stocks and keeps the incoming order inside a group', () => {
    const rows = buildOtfRows([
      exec({ account_executions_id: 1, symbol: 'AAA' }),
      exec({ account_executions_id: 2, sec_type: 'OPT', symbol: 'BBB', expiry: '2026-10-17', strike: 5, option_right: 'P' }),
      exec({ account_executions_id: 3, symbol: 'CCC' }),
    ])
    expect(rows.map((r) => r.sym)).toEqual(['BBB', 'AAA', 'CCC'])
    expect(otfCountLabel(rows)).toBe('3 fills · 2 sec types')
  })

  it('leaves realized empty when the broker sent none', () => {
    const [r] = buildOtfRows([exec({ realized_pnl: null, commission: null })])
    expect(r.realized).toBeNull()
    expect(r.comm).toBe('—')
    expect(otfCountLabel([r])).toBe('1 fill · 1 sec type')
    expect(otfCountLabel([])).toBe('no fills')
  })
})
