import { describe, expect, it } from 'vitest'
import {
  fallbackTotalsAllFromStructures,
  winRateTotalLossDisplayUsd,
  winRateTotalProfitDisplayUsd,
  winPctLabel,
  winPctTone,
} from '@/utils/winRate'
import type { WinRateStructureRow } from '@/types/strategy'

function row(partial: Partial<WinRateStructureRow> & Pick<WinRateStructureRow, 'structure_name'>): WinRateStructureRow {
  return {
    total_instances: 0,
    profit_trades: 0,
    loss_trades: 0,
    total_profit: null,
    total_loss: null,
    profit_investment: null,
    loss_investment: null,
    total_investment: null,
    total_max_risk: null,
    structure_return_pct: null,
    profit_avg_pct: null,
    loss_avg_pct: null,
    single_max_loss_pct: null,
    profit_avg_usd: null,
    loss_avg_usd: null,
    ...partial,
  }
}

describe('winRateTotalLossDisplayUsd', () => {
  it('returns 0 when loss_trades is 0 even if API total_loss is negative', () => {
    const r = row({
      structure_name: 'Test',
      loss_trades: 0,
      total_loss: -500,
      loss_avg_usd: -100,
    })
    expect(winRateTotalLossDisplayUsd(r)).toBe(0)
  })

  it('reconciles with loss_avg_usd × loss_trades when raw disagrees', () => {
    const r = row({
      structure_name: 'Test',
      loss_trades: 2,
      total_loss: -100,
      loss_avg_usd: -50,
    })
    expect(winRateTotalLossDisplayUsd(r)).toBe(-100)
  })
})

describe('winRateTotalProfitDisplayUsd', () => {
  it('prefers implied sum when raw total_profit diverges', () => {
    const r = row({
      structure_name: 'Test',
      profit_trades: 3,
      total_profit: 10,
      profit_avg_usd: 100,
    })
    expect(winRateTotalProfitDisplayUsd(r)).toBe(300)
  })
})

describe('winPctTone', () => {
  it('marks >50% as positive and <50% as negative', () => {
    expect(winPctTone(10, 6)).toBe('positive')
    expect(winPctTone(10, 4)).toBe('negative')
    expect(winPctTone(0, 0)).toBe('dim')
  })
})

describe('winPctLabel', () => {
  it('formats one decimal place', () => {
    expect(winPctLabel(55, 51)).toBe('92.7%')
  })
})

describe('fallbackTotalsAllFromStructures', () => {
  it('aggregates display profit/loss across structures', () => {
    const structures = [
      row({
        structure_name: 'A',
        total_instances: 2,
        profit_trades: 2,
        loss_trades: 0,
        total_profit: 100,
        profit_avg_usd: 50,
        total_max_risk: 1000,
        profit_investment: 100,
        loss_investment: 0,
      }),
      row({
        structure_name: 'B',
        total_instances: 1,
        profit_trades: 0,
        loss_trades: 1,
        total_loss: -50,
        loss_avg_usd: -50,
        total_max_risk: 500,
        profit_investment: 0,
        loss_investment: 200,
        loss_avg_pct: -5,
        single_max_loss_pct: -5,
      }),
    ]
    const totals = fallbackTotalsAllFromStructures(structures)
    expect(totals.structure_name).toBe('All structures')
    expect(totals.total_instances).toBe(3)
    expect(totals.profit_trades).toBe(2)
    expect(totals.loss_trades).toBe(1)
    expect(totals.total_profit).toBe(100)
    expect(totals.total_loss).toBe(-50)
  })
})
