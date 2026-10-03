/**
 * TD-30: from api 0.3.3 every sell comes back with quantity −|q| (before, every
 * sell came back +|q|). The page must print the same numbers on both shapes.
 *
 * Each fixture exists twice — `before` (the old wire: sells positive) and
 * `after` (the new wire: sells negative) — and every helper the Ledger and
 * Performance read is asserted to give the same, hand-worked figure on both.
 * The figures are what the code before this change produced on `before`.
 * All accounts, symbols and prices are invented.
 */
import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import { computeDayRealizedUnrealizedStock } from '@/utils/ledger/performanceUtils'
import {
  tradeOptionStockSlippageAdjustment,
  ledgerOptDetailRowPnl,
  scaledLedgerOptDetailRowPnl,
  sliceExecutionForTradeOptView,
} from '@/utils/ledger/ledgerOptHelpers'
import { buildOptExecutionGroups } from '@/utils/ledger/optExecutionGroups'
import { toFill } from '@/utils/reviewContracts'
import { signedFillQty } from '@/components/positions/quickCloseOffset'
import { executionQtyLabel } from '@/components/positions/linkExecutionModalHelpers'
import { fillQtyShown } from '@/utils/fillQuantity'

const SELLS = new Set(['SELL', 'SLD', 'S'])

/** The new wire: the TD-30 rule applied to a row of the old one. */
function afterTd30(e: Execution): Execution {
  const mag = Math.abs(e.quantity)
  return { ...e, quantity: SELLS.has(e.side.trim().toUpperCase()) ? -mag : mag }
}

function fill(p: Partial<Execution> & Pick<Execution, 'account_executions_id' | 'side' | 'quantity' | 'price'>): Execution {
  return {
    account_id: 'U0000001',
    contract_key: 'ACME|STK|||',
    symbol: 'ACME',
    sec_type: 'STK',
    time: 1_700_000_000 + p.account_executions_id!,
    trade_date: '2026-01-05',
    commission: 0,
    ...p,
  }
}

// Stock: a buy then a partial sell (TWS spelling), and a short opened and covered.
const stockBefore: Execution[] = [
  fill({ account_executions_id: 1, side: 'BOT', quantity: 100, price: 50, commission: 1 }),
  fill({ account_executions_id: 2, side: 'SLD', quantity: 60, price: 55, commission: 0.6 }),
  fill({ account_executions_id: 3, symbol: 'WIDG', contract_key: 'WIDG|STK|||', side: 'SELL', quantity: 20, price: 10, commission: 0.2 }),
  fill({ account_executions_id: 4, symbol: 'WIDG', contract_key: 'WIDG|STK|||', side: 'BUY', quantity: 20, price: 9, commission: 0.2 }),
]

const optKey = 'ACME|OPT|20260320|40|P'
function opt(p: Partial<Execution> & Pick<Execution, 'account_executions_id' | 'side' | 'quantity' | 'price'>): Execution {
  return fill({ sec_type: 'OPT', contract_key: optKey, option_right: 'P', strike: 40, expiry: '20260320', commission: 1.3, ...p })
}

// Option: a short put opened and bought back; the open has a linked stock fill.
const optOpenBefore = opt({ account_executions_id: 21, side: 'SELL', quantity: 2, price: 1.5 })
const optCloseBefore = opt({ account_executions_id: 22, side: 'BUY', quantity: 2, price: 0.4, trade_date: '2026-01-20' })
const links: Record<number, OptionStockLinkSummary> = {
  21: { links: [{ account_execution_option_stock_link_id: 7, stock_account_executions_id: 2, stock_quantity: 60 }], slippage_total: 12.5 },
}

// Split: one sell of 3 contracts across two trades. Allocations are stored as sent (sells negative).
const splitBefore = opt({
  account_executions_id: 31,
  side: 'SLD',
  quantity: 3,
  price: 2,
  commission: 1.5,
  realized_pnl: 90,
  fill_splits: [
    { trade_id: 11, quantity: -2 },
    { trade_id: 12, quantity: -1 },
  ],
})
const splitLinks: Record<number, OptionStockLinkSummary> = { 31: { links: [], slippage_total: 30 } }

const shapes = [
  ['before (sells +|q|)', (e: Execution) => e],
  ['after TD-30 (sells −|q|)', afterTd30],
] as const

describe.each(shapes)('TD-30 sell sign — %s', (_label, wire) => {
  it('stock day realized / unrealized FIFO does not drop the sells', () => {
    const out = computeDayRealizedUnrealizedStock(stockBefore.map(wire))
    // ACME: 60 matched → (55 − 50) × 60 − 0.6 − 0.6 = 298.8; 40 left at 50 plus 0.4 commission.
    // WIDG: short 20 @ 10 covered @ 9 → 20 − 0.2 − 0.2 = 19.6.
    expect(out.realized).toBeCloseTo(318.4, 9)
    expect(out.unrealized).toBeCloseTo(2000.4, 9)
  })

  it('option detail row P&L does not flip the sell twice', () => {
    const open = wire(optOpenBefore)
    const close = wire(optCloseBefore)
    // Sell 2 × 1.50 × 100 − 1.3 = 298.7 in; buy 2 × 0.40 × 100 − 1.3 = 78.7 → −78.7.
    expect(ledgerOptDetailRowPnl(open, undefined)).toEqual({ displayPnl: 298.7, hasCombinedStock: false, stockAdj: 0 })
    expect(ledgerOptDetailRowPnl(close, undefined).displayPnl).toBeCloseTo(-78.7, 9)
    // With the linked stock: premium plus 12.50 slippage.
    const linked = ledgerOptDetailRowPnl(open, links)
    expect(linked.displayPnl).toBeCloseTo(311.2, 9)
    expect(linked.hasCombinedStock).toBe(true)
  })

  it('scaled option row P&L (Performance realized rows)', () => {
    const open = wire(optOpenBefore)
    const close = wire(optCloseBefore)
    expect(scaledLedgerOptDetailRowPnl(open, 0.5, undefined).displayPnl).toBeCloseTo(149.35, 9)
    expect(scaledLedgerOptDetailRowPnl(close, 0.5, undefined).displayPnl).toBeCloseTo(-39.35, 9)
    expect(scaledLedgerOptDetailRowPnl(open, 0.5, links)).toEqual({ displayPnl: expect.closeTo(155.6, 9), hasCombinedStock: true })
  })

  it('option contract group: same quantities, value and realized', () => {
    const [g] = buildOptExecutionGroups([optOpenBefore, optCloseBefore].map(wire))
    expect(g!.status).toBe('realized')
    expect(g!.net_qty).toBe(0)
    expect(g!.buy_volume).toBe(2)
    expect(g!.sell_volume).toBe(2)
    expect(g!.realized_pnl).toBeCloseTo(298.7 - 81.3, 9)
  })

  it('split allocation: the slice and the slippage share are unchanged', () => {
    const ex = wire(splitBefore)
    const mine = sliceExecutionForTradeOptView(ex, 11)!
    expect(mine.quantity).toBe(-2)
    expect(mine.commission).toBeCloseTo(1, 9)
    expect(mine.realized_pnl).toBeCloseTo(60, 9)
    expect(tradeOptionStockSlippageAdjustment([ex], 11, splitLinks)).toBeCloseTo(20, 9)
    expect(tradeOptionStockSlippageAdjustment([ex], 12, splitLinks)).toBeCloseTo(10, 9)
    // The parent row: 3 × 2.00 × 100 − 1.5 = 598.5, plus its 30 of slippage.
    expect(ledgerOptDetailRowPnl(ex, splitLinks).displayPnl).toBeCloseTo(628.5, 9)
  })

  it('already sign-agnostic readers agree', () => {
    expect(toFill(wire(optOpenBefore))).toMatchObject({ side: 'sell', qty: 2, cash: 298.7 })
    expect(signedFillQty(wire(optOpenBefore))).toBe(-2)
    expect(signedFillQty(wire(optCloseBefore))).toBe(2)
  })

  it('printed quantities stay the magnitude next to the side', () => {
    const sold = wire(stockBefore[1]!)
    expect(fillQtyShown(sold.quantity)).toBe(60)
    expect(executionQtyLabel(sold)).toBe('60')
    expect(fillQtyShown(wire(stockBefore[0]!).quantity)).toBe(100)
    expect(fillQtyShown(null)).toBe('—')
    expect(fillQtyShown(undefined)).toBe('—')
  })
})

describe('TD-30 fixtures', () => {
  it('the new wire is signed by side, the old one is not', () => {
    expect(afterTd30(stockBefore[1]!).quantity).toBe(-60)
    expect(afterTd30(stockBefore[0]!).quantity).toBe(100)
    expect(stockBefore[1]!.quantity).toBe(60)
  })
})

describe('option-stock link stock_quantity display', () => {
  it('prints the magnitude for a signed sell leg and an old positive one', () => {
    expect(fillQtyShown(-100)).toBe(100)
    expect(fillQtyShown(100)).toBe(100)
    expect(String(fillQtyShown(-100))).toBe('100')
  })
})
