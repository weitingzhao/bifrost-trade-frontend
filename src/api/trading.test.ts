import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExecutionSchema, ExecutionsWireSchema } from '@/lib/schemas/positions'
import { fetchExecutions } from './trading'

/**
 * The executions row as core's `get_executions` builds it. The schema used to
 * require `qty`, a key no Trade service emits, so every row failed and the
 * warning was noise; a stock row's null strike and expiry failed it too.
 */
const stockRow = {
  account_executions_id: 41,
  account_id: 'U0000001',
  exec_id: 'zz-0001',
  time: 1_760_000_000,
  symbol: 'ZZZ',
  sec_type: 'STK',
  side: 'SELL',
  quantity: -100,
  price: 12.5,
  commission: 1,
  source: 'flex_trades',
  expiry: null,
  strike: null,
  option_right: null,
  realized_pnl: null,
  contract_key: 'ZZZ|STK|||',
  trade_date: '2026-09-30',
  report_date: '2026-09-30',
  transaction_type: 'ExchTrade',
  taxes: 0,
  net_cash: 1249,
  strategy_opportunity_id: null,
  strategy_instance_id: null,
  strategy_opportunity_name: null,
  strategy_instance_label: null,
  instance_allocations: [],
}

const optionRow = {
  ...stockRow,
  account_executions_id: -7,
  sec_type: 'OPT',
  side: 'SLD',
  quantity: 2,
  source: 'tws_client',
  expiry: '20261016',
  strike: 15,
  option_right: 'P',
  contract_key: 'ZZZ|OPT|20261016|15|P',
}

describe('ExecutionSchema matches the wire', () => {
  it('accepts a stock row with null option fields', () => {
    expect(ExecutionSchema.safeParse(stockRow).success).toBe(true)
  })

  it('accepts an option row in the broker spelling of side', () => {
    expect(ExecutionSchema.safeParse(optionRow).success).toBe(true)
  })

  it('rejects a row that carries qty instead of quantity', () => {
    const { quantity, ...rest } = stockRow
    expect(ExecutionSchema.safeParse({ ...rest, qty: quantity }).success).toBe(false)
  })

  it('rejects a body without items, including the old executions key alone', () => {
    expect(ExecutionsWireSchema.safeParse({}).success).toBe(false)
    expect(ExecutionsWireSchema.safeParse({ count: 0 }).success).toBe(false)
    expect(ExecutionsWireSchema.safeParse({ executions: [stockRow, optionRow] }).success).toBe(false)
  })

  it('accepts items', () => {
    expect(ExecutionsWireSchema.safeParse({ items: [stockRow, optionRow], count: 2 }).success).toBe(true)
  })

  it('still checks the rows under items', () => {
    const { quantity, ...rest } = stockRow
    expect(ExecutionsWireSchema.safeParse({ items: [{ ...rest, qty: quantity }] }).success).toBe(false)
  })
})

describe('fetchExecutions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubFetch(body: unknown) {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => new Response(JSON.stringify(body)))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('sends the API scope name and unwraps the rows', async () => {
    const fetchMock = stubFetch({ items: [stockRow], count: 1 })
    const res = await fetchExecutions('performance_book')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('source_scope=performance_book')
    expect(res.items).toHaveLength(1)
    expect(res.items[0].quantity).toBe(-100)
  })

  it('sends no source_scope for the canonical view', async () => {
    const fetchMock = stubFetch({ items: [], count: 0 })
    await fetchExecutions('all')
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('source_scope')
  })

  it('reports a missing items key as drift before reading it as an empty book', async () => {
    stubFetch({})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const res = await fetchExecutions('tws_raw')
    expect(res.items).toEqual([])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('trading/executions'), expect.anything())
  })
})
