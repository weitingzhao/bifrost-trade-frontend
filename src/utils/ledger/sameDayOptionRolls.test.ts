import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import {
  computeBackendOptPairsFromExecutions,
  computeOptionDayPnLForPerformanceDate,
  ledgerOptionExecutionCashFlowSigned,
  sortExecByExecutionDateThenTime,
} from '@/utils/ledger/performanceUtils'
import {
  buildEconomicOptDeltaByDay,
  computeEconomicOptByDayFromExecutions,
  detectSameDayOptionRolls,
} from '@/utils/ledger/sameDayOptionRolls'

function makeOpt(overrides: Partial<Execution> & { account_executions_id: number }): Execution {
  return {
    account_id: 'U1',
    contract_key: 'RKLB|OPT|20260515|20|P',
    symbol: 'RKLB',
    sec_type: 'OPT',
    side: 'Sell',
    qty: 1,
    price: 5,
    time: 1_700_000_000,
    trade_date: '2026-05-01',
    option_right: 'P',
    expiry: '20260515',
    strike: 20,
    commission: 0,
    ...overrides,
  }
}

describe('detectSameDayOptionRolls', () => {
  it('detects same-day close+open on different contracts (short roll)', () => {
    const openOld = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-04-01',
      time: 1,
      side: 'Sell',
      price: 5,
      contract_key: 'RKLB|OPT|20260515|20|P',
      expiry: '20260515',
      strike: 20,
    })
    const closeOld = makeOpt({
      account_executions_id: 2,
      trade_date: '2026-05-14',
      time: 10,
      side: 'Buy',
      price: 8,
      contract_key: 'RKLB|OPT|20260515|20|P',
      expiry: '20260515',
      strike: 20,
    })
    const openNew = makeOpt({
      account_executions_id: 3,
      trade_date: '2026-05-14',
      time: 11,
      side: 'Sell',
      price: 7,
      contract_key: 'RKLB|OPT|20260619|22|P',
      expiry: '20260619',
      strike: 22,
    })

    const rolls = detectSameDayOptionRolls([openOld, closeOld, openNew])
    expect(rolls).toHaveLength(1)
    expect(rolls[0]!.dateStr).toBe('2026-05-14')
    expect(rolls[0]!.qty).toBe(1)
    expect(rolls[0]!.closeExecutionId).toBe(2)
    expect(rolls[0]!.openExecutionId).toBe(3)

    const expectedCash =
      ledgerOptionExecutionCashFlowSigned(closeOld) + ledgerOptionExecutionCashFlowSigned(openNew)
    expect(rolls[0]!.cashRoll).toBeCloseTo(expectedCash, 6)
    // |cash_roll| should be much smaller than typical book close cliff (|300|).
    expect(Math.abs(rolls[0]!.cashRoll)).toBeLessThan(150)
  })

  it('does not treat cross-day close then open as a roll', () => {
    const openOld = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-04-01',
      time: 1,
      side: 'Sell',
      price: 5,
      contract_key: 'RKLB|OPT|20260515|20|P',
      expiry: '20260515',
      strike: 20,
    })
    const closeOld = makeOpt({
      account_executions_id: 2,
      trade_date: '2026-05-14',
      time: 10,
      side: 'Buy',
      price: 8,
      contract_key: 'RKLB|OPT|20260515|20|P',
      expiry: '20260515',
      strike: 20,
    })
    const openNew = makeOpt({
      account_executions_id: 3,
      trade_date: '2026-05-15',
      time: 11,
      side: 'Sell',
      price: 7,
      contract_key: 'RKLB|OPT|20260619|22|P',
      expiry: '20260619',
      strike: 22,
    })

    const rolls = detectSameDayOptionRolls([openOld, closeOld, openNew])
    expect(rolls).toHaveLength(0)
  })

  it('emits no rolls on a plain open day', () => {
    const openOnly = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-04-01',
      side: 'Sell',
      price: 5,
    })
    expect(detectSameDayOptionRolls([openOnly])).toHaveLength(0)
  })
})

describe('buildEconomicOptDeltaByDay', () => {
  it('keeps E === R_book when there are no rolls', () => {
    const book = {
      '2026-04-01': { realized: 12.5, unrealized: 0 },
      '2026-04-02': { realized: -3, unrealized: 1 },
    }
    const econ = buildEconomicOptDeltaByDay(book, [])
    expect(econ['2026-04-01']!.delta).toBe(12.5)
    expect(econ['2026-04-01']!.rollCount).toBe(0)
    expect(econ['2026-04-02']!.delta).toBe(-3)
  })

  it('same-day roll: |E| ≪ |R_book| cliff (short put roll fixture)', () => {
    const openOld = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-04-01',
      time: 1,
      side: 'Sell',
      price: 5,
      contract_key: 'RKLB|OPT|20260515|20|P',
      expiry: '20260515',
      strike: 20,
    })
    const closeOld = makeOpt({
      account_executions_id: 2,
      trade_date: '2026-05-14',
      time: 10,
      side: 'Buy',
      price: 8,
      contract_key: 'RKLB|OPT|20260515|20|P',
      expiry: '20260515',
      strike: 20,
    })
    const openNew = makeOpt({
      account_executions_id: 3,
      trade_date: '2026-05-14',
      time: 11,
      side: 'Sell',
      price: 7,
      contract_key: 'RKLB|OPT|20260619|22|P',
      expiry: '20260619',
      strike: 22,
    })
    const all = [openOld, closeOld, openNew]
    const pairs = computeBackendOptPairsFromExecutions(all, sortExecByExecutionDateThenTime)
    const bookDay = computeOptionDayPnLForPerformanceDate('2026-05-14', all, pairs)
    const bookOpt = {
      '2026-04-01': { realized: 0, unrealized: 0 },
      '2026-05-14': { realized: bookDay.realized, unrealized: bookDay.unrealized },
    }

    const econ = computeEconomicOptByDayFromExecutions(bookOpt, all)
    const cell = econ['2026-05-14']!
    expect(cell.rollCount).toBeGreaterThanOrEqual(1)
    expect(Math.abs(bookDay.realized)).toBeGreaterThan(200)
    expect(Math.abs(cell.delta)).toBeLessThan(Math.abs(bookDay.realized) * 0.6)
    expect(Math.abs(cell.delta)).toBeLessThan(200)
  })

  it('cross-day close/open: E equals Book on both days', () => {
    const openOld = makeOpt({
      account_executions_id: 1,
      trade_date: '2026-04-01',
      time: 1,
      side: 'Sell',
      price: 5,
      contract_key: 'RKLB|OPT|20260515|20|P',
      expiry: '20260515',
      strike: 20,
    })
    const closeOld = makeOpt({
      account_executions_id: 2,
      trade_date: '2026-05-14',
      time: 10,
      side: 'Buy',
      price: 8,
      contract_key: 'RKLB|OPT|20260515|20|P',
      expiry: '20260515',
      strike: 20,
    })
    const openNew = makeOpt({
      account_executions_id: 3,
      trade_date: '2026-05-15',
      time: 11,
      side: 'Sell',
      price: 7,
      contract_key: 'RKLB|OPT|20260619|22|P',
      expiry: '20260619',
      strike: 22,
    })
    const all = [openOld, closeOld, openNew]
    const pairs = computeBackendOptPairsFromExecutions(all, sortExecByExecutionDateThenTime)
    const r14 = computeOptionDayPnLForPerformanceDate('2026-05-14', all, pairs)
    const r15 = computeOptionDayPnLForPerformanceDate('2026-05-15', all, pairs)
    const bookOpt = {
      '2026-05-14': { realized: r14.realized, unrealized: r14.unrealized },
      '2026-05-15': { realized: r15.realized, unrealized: r15.unrealized },
    }
    const econ = computeEconomicOptByDayFromExecutions(bookOpt, all)
    expect(econ['2026-05-14']!.rollCount).toBe(0)
    expect(econ['2026-05-14']!.delta).toBeCloseTo(r14.realized, 6)
    expect(econ['2026-05-15']!.rollCount).toBe(0)
    expect(econ['2026-05-15']!.delta).toBeCloseTo(r15.realized, 6)
  })
})
