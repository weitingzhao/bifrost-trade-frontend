import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import type { Trade } from '@/types/strategy'
import { fillMultiplier, readTrades } from './tradeReadings'

// Invented trade and fills (fixtures are never copied from DEV).
const trade = (state: Trade['state'], closedOn: string | null = null): Trade =>
  ({
    trade_id: 5,
    strategy_opportunity_id: 1,
    strategy_opportunity_name: 'O1',
    strategy_structure_id: 2,
    strategy_structure_name: 'S2',
    account_id: 'U0000000',
    opened_at: '2031-03-01T15:00:00Z',
    label: null,
    created_at: '2031-03-01T15:00:00Z',
    updated_at: '2031-03-01T15:00:00Z',
    state,
    closed_on: closedOn,
  }) as Trade

const fill = (sec_type: string, side: string, price: number, quantity: number, commission = 0): Execution =>
  ({
    account_executions_id: null,
    account_id: 'U0000000',
    contract_key: sec_type === 'STK' ? 'ZZQ|STK|||' : 'ZZQ|OPT|20310321|50|C',
    symbol: 'ZZQ',
    sec_type,
    side,
    quantity,
    price,
    time: null,
    commission,
    trade_id: 5,
  }) as Execution

describe('readTrades', () => {
  it('carries closed_on as closedOn once closed, null while open', () => {
    expect(readTrades([trade('closed', '2031-03-04')], [])[0].closedOn).toBe('2031-03-04')
    expect(readTrades([trade('expired', '2031-03-21')], [])[0].closedOn).toBe('2031-03-21')
    expect(readTrades([trade('open')], [])[0].closedOn).toBeNull()
  })

  it('multiplies option fills by 100 and stock fills by 1 (TD-213)', () => {
    const [opt] = readTrades([trade('closed', '2031-03-04')], [fill('OPT', 'SLD', 2, 1, 1), fill('OPT', 'BOT', 0.5, 1, 1)])
    expect(opt.realised).toBe(148)
    const [stk] = readTrades([trade('closed', '2031-03-04')], [fill('STK', 'BOT', 50, 100), fill('STK', 'SLD', 52, 100)])
    expect(stk.realised).toBe(200)
  })

  it('fillMultiplier reads the sec_type', () => {
    expect(fillMultiplier({ sec_type: 'STK' })).toBe(1)
    expect(fillMultiplier({ sec_type: ' stk ' })).toBe(1)
    expect(fillMultiplier({ sec_type: 'OPT' })).toBe(100)
  })
})
