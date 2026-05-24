import { describe, it, expect } from 'vitest'
import { buildOffTrackPositions, OFF_TRACK_ACCOUNT_ID } from './offTrackPositions'
import type { Execution } from '@/types/positions'

describe('buildOffTrackPositions', () => {
  const baseExec: Omit<Execution, 'side' | 'qty' | 'price'> = {
    account_executions_id: 1,
    account_id: OFF_TRACK_ACCOUNT_ID,
    contract_key: 'AAPL|OPT|20250620|150|C',
    symbol: 'AAPL',
    sec_type: 'OPT',
    right: 'C',
    strike: 150,
    expiry: '20250620',
    time: 1700000000,
  }

  it('returns empty for no off-track executions', () => {
    const execs: Execution[] = [
      { ...baseExec, account_id: 'U001', side: 'Buy', qty: 2, price: 5 },
    ]
    expect(buildOffTrackPositions(execs)).toHaveLength(0)
  })

  it('builds unrealized positions from net qty != 0', () => {
    const execs: Execution[] = [
      { ...baseExec, account_executions_id: 1, side: 'Buy', qty: 2, price: 5 },
      { ...baseExec, account_executions_id: 2, side: 'Sell', qty: -1, price: 7 },
    ]
    const result = buildOffTrackPositions(execs)
    expect(result).toHaveLength(1)
    expect(result[0].qty).toBe(1)
    expect(result[0].pool_label).toBe('Off')
    expect(result[0].kind).toBe('offtrack')
    expect(result[0].unrealized_pnl).toBe(7 - 10) // sell_premium(7) - buy_cost(10)
  })

  it('returns empty when net qty is 0 (fully closed)', () => {
    const execs: Execution[] = [
      { ...baseExec, account_executions_id: 1, side: 'Buy', qty: 2, price: 5 },
      { ...baseExec, account_executions_id: 2, side: 'Sell', qty: -2, price: 7 },
    ]
    expect(buildOffTrackPositions(execs)).toHaveLength(0)
  })

  it('filters by symbol', () => {
    const execs: Execution[] = [
      { ...baseExec, account_executions_id: 1, side: 'Buy', qty: 1, price: 5 },
    ]
    expect(buildOffTrackPositions(execs, 'NVDA')).toHaveLength(0)
    expect(buildOffTrackPositions(execs, 'AAPL')).toHaveLength(1)
  })

  it('filters by expiry prefix', () => {
    const execs: Execution[] = [
      { ...baseExec, account_executions_id: 1, side: 'Buy', qty: 1, price: 5 },
    ]
    expect(buildOffTrackPositions(execs, undefined, '202506')).toHaveLength(1)
    expect(buildOffTrackPositions(execs, undefined, '202507')).toHaveLength(0)
  })
})
