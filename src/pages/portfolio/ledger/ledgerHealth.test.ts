import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { executionPassesLedgerFilters } from '@/pages/portfolio/ledger/ledgerFilterMatch'
import {
  countUnreportedTransactionType,
  executionMatchesRowType,
} from '@/pages/portfolio/ledger/ledgerRowType'
import {
  buildLedgerReconcile,
  flexMatchKey,
  isUnlinkedExecution,
  unlinkCounts,
} from '@/pages/portfolio/ledger/ledgerReconcile'
import { buildLedgerHealth } from '@/pages/portfolio/ledger/ledgerHealth'
import { getLedgerAccountTabs, ledgerAccountIdFromScope, ledgerScopeFromAccountId } from '@/lib/ledgerAccountTabs'
import type { StatusResponse } from '@/types/monitor'

function exec(partial: Partial<Execution> & Pick<Execution, 'symbol' | 'account_id'>): Execution {
  return {
    account_executions_id: 1,
    contract_key: `${partial.symbol}|STK|||`,
    sec_type: 'STK',
    side: 'Buy',
    qty: 1,
    quantity: 1,
    price: 10,
    time: 1_700_000_000,
    trade_date: '2024-03-15',
    ...partial,
  }
}

describe('ledger row type', () => {
  it('keeps empty transaction_type only in All', () => {
    const blank = exec({ symbol: 'AAA', account_id: 'U0000001', transaction_type: null })
    const exch = exec({ symbol: 'AAA', account_id: 'U0000001', transaction_type: 'ExchTrade' })
    const book = exec({ symbol: 'AAA', account_id: 'U0000001', transaction_type: 'BookTrade' })
    expect(executionMatchesRowType(blank, 'all')).toBe(true)
    expect(executionMatchesRowType(blank, 'exch')).toBe(false)
    expect(executionMatchesRowType(blank, 'book')).toBe(false)
    expect(executionMatchesRowType(exch, 'exch')).toBe(true)
    expect(executionMatchesRowType(book, 'book')).toBe(true)
    expect(countUnreportedTransactionType([blank, exch, book])).toBe(1)
  })
})

describe('unlinked uses allocations as well as strategy_instance_id', () => {
  it('does not count a split fill as unlinked', () => {
    const split = exec({
      symbol: 'AAA',
      account_id: 'U0000001',
      sec_type: 'OPT',
      contract_key: 'AAA|OPT|P|10|20240621',
      strategy_instance_id: null,
      instance_allocations: [
        { strategy_instance_id: 11, allocated_quantity: 1 },
        { strategy_instance_id: 12, allocated_quantity: 1 },
      ],
    })
    const none = exec({
      symbol: 'AAA',
      account_id: 'U0000001',
      sec_type: 'OPT',
      contract_key: 'AAA|OPT|C|10|20240621',
      strategy_instance_id: null,
    })
    expect(isUnlinkedExecution(split)).toBe(false)
    expect(isUnlinkedExecution(none)).toBe(true)
    const opt = unlinkCounts([split, none], 'options')
    expect(opt).toEqual({ n: 1, of: 2, stock: 0, option: 1, combo: 0 })
  })

  it('options basis excludes BAG from the denominator', () => {
    const opt = exec({ symbol: 'AAA', account_id: 'U0000001', sec_type: 'OPT', contract_key: 'AAA|OPT|P|10|20240621' })
    const bag = exec({ symbol: 'AAA', account_id: 'U0000001', sec_type: 'BAG', contract_key: 'AAA|BAG|||' })
    const c = unlinkCounts([opt, bag], 'options')
    expect(c.of).toBe(1)
    expect(c.combo).toBe(0)
  })
})

describe('structure filter does not drop stock fills on Shares', () => {
  const stk = exec({ symbol: 'AAA', account_id: 'U0000001', sec_type: 'STK' })
  const args = {
    accountFilter: 'all',
    symbolFilter: '',
    allowedOpportunityIds: new Set([99]),
    expiryFilterYear: '',
    expiryFilterMonth: '',
    sincePreset: 'all' as const,
    dateRange: { start: '2024-01-01', end: '2024-12-31' },
    rowType: 'all' as const,
  }

  it('keeps the stock row on the shares tab', () => {
    expect(executionPassesLedgerFilters(stk, { ...args, activeTab: 'stocks' })).toBe(true)
  })

  it('still filters option fills on the options tab', () => {
    const opt = exec({
      symbol: 'AAA',
      account_id: 'U0000001',
      sec_type: 'OPT',
      contract_key: 'AAA|OPT|P|10|20240621',
      strategy_opportunity_id: 1,
    })
    expect(executionPassesLedgerFilters(opt, { ...args, activeTab: 'options' })).toBe(false)
  })
})

describe('flex match key uses contract_key not symbol', () => {
  it('pairs a TWS option fill with the Flex copy', () => {
    const tws = exec({
      symbol: 'AAA',
      account_id: 'U0000001',
      sec_type: 'OPT',
      contract_key: 'AAA|OPT|P|10|20240621',
      source: 'tws_client',
      side: 'Buy',
      qty: 2,
      quantity: 2,
      price: 1.5,
      trade_date: '2024-03-15',
    })
    const flex = exec({
      symbol: 'AAA  240621P00010000',
      account_id: 'U0000001',
      sec_type: 'OPT',
      contract_key: 'AAA|OPT|P|10|20240621',
      source: 'flex_trades',
      side: 'Buy',
      qty: 2,
      quantity: 2,
      price: 1.5,
      trade_date: '2024-03-15',
    })
    expect(flexMatchKey(tws)).toBe(flexMatchKey(flex))
    const rec = buildLedgerReconcile(
      [
        tws,
        flex,
        exec({
          symbol: 'BBB',
          account_id: 'U0000001',
          sec_type: 'OPT',
          contract_key: 'BBB|OPT|C|5|20240920',
          source: 'tws_client',
          trade_date: '2024-04-01',
        }),
        exec({
          symbol: 'AAA',
          account_id: 'U0000001',
          sec_type: 'BAG',
          contract_key: 'AAA|BAG|||',
          source: 'tws_client',
        }),
      ],
      [flex],
    )
    expect(rec.groups.find(g => g.id === 'also_flex')?.count).toBe(1)
    expect(rec.groups.find(g => g.id === 'unconfirmed')?.count).toBe(1)
    expect(rec.groups.find(g => g.id === 'bag')?.count).toBe(1)
    expect(rec.groups.find(g => g.id === 'unconfirmed')?.note).not.toMatch(/0 of /)
  })
})

describe('reconcile scope and sources', () => {
  const optFill = (partial: Partial<Execution>) =>
    exec({
      symbol: 'AAA  240621P00010000',
      account_id: 'U0000001',
      sec_type: 'OPT',
      contract_key: 'AAA|OPT|P|10|20240621',
      side: 'Buy',
      qty: 2,
      quantity: 2,
      price: 1.5,
      trade_date: '2024-03-15',
      expiry: '20240621',
      strike: 10,
      option_right: 'P',
      ...partial,
    })

  it('finds the Flex copy even when a filter has hidden it from the rows passed in', () => {
    const tws = optFill({ source: 'tws_client' })
    const flex = optFill({ source: 'flex_trades' })
    const rec = buildLedgerReconcile([tws], [], [tws, flex])
    expect(rec.groups.find(g => g.id === 'also_flex')?.count).toBe(1)
    expect(rec.groups.find(g => g.id === 'unconfirmed')?.count).toBe(0)
  })

  it('reconciles a TWS stock fill instead of leaving it in no group', () => {
    const stock = exec({ symbol: 'AAA', account_id: 'U0000001', sec_type: 'STK', contract_key: 'AAA', source: 'tws_client', side: 'Buy', quantity: 100, qty: 100, price: 10, trade_date: '2024-03-15' })
    const rec = buildLedgerReconcile([stock], [])
    const un = rec.groups.find(g => g.id === 'unconfirmed')
    expect(un?.count).toBe(1)
    expect(un?.label).toBe('Single fills Flex never confirmed')
  })

  it('keeps manual rows apart from journal: they sit beside TWS, outside the book', () => {
    const manual = optFill({ source: 'manual' })
    const journal = optFill({ source: 'journal_closed', account_executions_id: 9 })
    const rec = buildLedgerReconcile([manual, journal], [journal])
    expect(rec.manual).toBe(1)
    expect(rec.groups.find(g => g.id === 'manual')?.count).toBe(1)
    expect(rec.canonical - rec.book).toBe(rec.onlyTws + rec.manual)
  })

  it('names a row by the contract token and keeps the stored key for hover', () => {
    const rec = buildLedgerReconcile([optFill({ source: 'tws_client' })], [])
    const row = rec.groups.find(g => g.id === 'unconfirmed')?.rows[0]
    expect(row?.name).toBe('AAA 21JUN24 10 P')
    expect(row?.title).toBe('AAA|OPT|P|10|20240621')
  })
})

describe('health commissions count rows that have a commission', () => {
  it('does not treat a null commission as a charged row', () => {
    const book = [
      exec({ symbol: 'AAA', account_id: 'U0000001', commission: -1.25, source: 'flex_trades' }),
      exec({ symbol: 'BBB', account_id: 'U0000001', commission: null, source: 'flex_trades' }),
    ]
    const h = buildLedgerHealth({
      canon: book,
      book,
      closedPnl: 0,
      sinceLabel: '1 month',
      unlinkBasis: 'options',
    })
    expect(h.commissionRows).toBe(1)
    expect(h.commissionSum).toBe(-1.25)
  })
})

describe('account chips use the number, not Host / Secondary', () => {
  const status = {
    config: { ib_client: { account: { event_host: 'U0000001', event_secondary: 'U0000002' } } },
  } as StatusResponse

  it('labels the chip with the account id and a role qualifier', () => {
    const tabs = getLedgerAccountTabs(status)
    expect(tabs.map(t => t.label)).toEqual(['U0000001 · host', 'U0000002 · secondary'])
    expect(tabs.some(t => t.label === 'Host' || t.label === 'Secondary')).toBe(false)
  })

  it('maps URL host/secondary tokens onto those ids', () => {
    expect(ledgerAccountIdFromScope({ host: true, secondary: false }, status)).toBe('U0000001')
    expect(ledgerScopeFromAccountId('U0000002', status)).toEqual({ host: false, secondary: true })
  })
})
