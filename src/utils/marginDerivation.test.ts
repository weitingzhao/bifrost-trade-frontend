import { describe, it, expect } from 'vitest'
import { holdingsOf, marginDerivation } from './marginDerivation'
import { derivationFields, derivationRows } from './derivation'
import { rollupMargin } from './marginPressure'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'
import type { SpotResolver } from './spotPrice'

// The DEV snapshot on 2026-09-05, every field the derivation reads.
const HOST = {
  account_id: 'U17123565',
  summary: {
    NetLiquidation: '644944.21',
    EquityWithLoanValue: '682554.57',
    MaintMarginReq: '214021.13',
    InitMarginReq: '214021.13',
    ExcessLiquidity: '468859.46',
    AvailableFunds: '468533.44',
    Cushion: '0.726977',
    BuyingPower: '1874133.76',
    TotalCashValue: '15374.70',
  },
} as unknown as IbAccountSnapshot
const SECONDARY = {
  account_id: 'U8829175',
  summary: {
    NetLiquidation: '376390.56',
    EquityWithLoanValue: '379354.10',
    MaintMarginReq: '93875.02',
    InitMarginReq: '93875.02',
    ExcessLiquidity: '285479.08',
    AvailableFunds: '285479.08',
    Cushion: '0.758465',
    BuyingPower: '1141916.31',
  },
} as unknown as IbAccountSnapshot

const facts = (a: IbAccountSnapshot) => rollupMargin([a]).accounts[0]

describe('marginDerivation', () => {
  it('walks pressure and buying power down to the broker fields', () => {
    const d = marginDerivation(facts(HOST), 'Host')
    expect(d.title).toBe('Host — U17123565')
    expect(derivationRows(d)).toEqual([
      { name: 'Pressure', depth: 0 },
      { name: 'Cushion', depth: 1 },
      { name: 'ExcessLiquidity', depth: 2 },
      { name: 'BuyingPower', depth: 0 },
      { name: 'AvailableFunds', depth: 1 },
    ])
    expect(derivationFields(d)).toEqual(['EquityWithLoanValue', 'MaintMarginReq', 'NetLiquidation', 'InitMarginReq'])
    expect(d.variables.Pressure).toMatchObject({ source: 'page', value: '27%', formula: '1 − {Cushion}' })
    expect(d.variables.Cushion.value).toBe('0.7270')
    expect(d.variables.ExcessLiquidity.value).toBe('$468,859.46')
    expect(d.variables.BuyingPower.value).toBe('$1,874,133.76')
  })
  it("re-runs the broker's identities on its own fields and reports the gap", () => {
    const v = marginDerivation(facts(HOST), 'Host').variables
    expect(v.Cushion.check).toMatchObject({ verdict: 'agrees', computed: '0.7270' })
    expect(v.AvailableFunds.check).toMatchObject({ verdict: 'agrees', computed: '$468,533.44' })
    expect(v.BuyingPower.check).toMatchObject({ verdict: 'agrees', computed: '$1,874,133.76' })
    // EWLV − Maint = 468,533.44 against the reported 468,859.46: within timing noise, so near, not differs.
    expect(v.ExcessLiquidity.check).toMatchObject({ verdict: 'near', computed: '$468,533.44', gap: '$326.02 (0.07%)' })
    expect(v.EquityWithLoanValue.note).toContain('sits above NetLiquidation ($682,554.57 vs $644,944.21)')
    expect(v.InitMarginReq.note).toBe('Equal to MaintMarginReq here.')
    expect(v.Pressure.note).toContain('33% is a different ratio')
  })
  it('closes every identity on the secondary account', () => {
    const v = marginDerivation(facts(SECONDARY), 'Secondary').variables
    for (const name of ['Cushion', 'ExcessLiquidity', 'AvailableFunds', 'BuyingPower']) {
      expect(v[name].check?.verdict, name).toBe('agrees')
    }
  })
  it('says what it cannot check when the broker left a field out', () => {
    const v = marginDerivation({ ...facts(HOST), equityWithLoanValue: null }, 'Host').variables
    expect(v.ExcessLiquidity.check?.verdict).toBe('unchecked')
    expect(v.AvailableFunds.check?.verdict).toBe('unchecked')
    expect(v.EquityWithLoanValue.value).toBe('—')
    const blind = marginDerivation({ ...facts(HOST), cushion: null, pressure: null }, 'Host').variables
    expect(blind.Pressure.value).toBe('—')
    expect(blind.Pressure.note).toContain('no Cushion')
  })
})

// A small account whose books close exactly: cash 10,000; NVDA 100 × 200 and SGOV 50 × 100 = 25,000 stock;
// one short call worth −1,000 → EWLV 35,000, NLV 34,000, gross positions 26,000.
const SMALL = {
  account_id: 'U1',
  summary: {
    NetLiquidation: '34000',
    EquityWithLoanValue: '35000',
    MaintMarginReq: '7000',
    InitMarginReq: '7000',
    ExcessLiquidity: '28000',
    AvailableFunds: '28000',
    Cushion: '0.8235',
    BuyingPower: '112000',
    TotalCashValue: '10000',
    GrossPositionValue: '26000',
  },
} as unknown as IbAccountSnapshot
const FRIDAY = 1_788_480_000 // 2026-09-04 UTC
const row = (r: Partial<LivePositionRow>): LivePositionRow => ({ account_id: 'U1', ...r }) as LivePositionRow
const ROWS: LivePositionRow[] = [
  row({ symbol: 'SGOV', secType: 'STK', position: 50, price: 99, category: 'Cash' }),
  row({ symbol: 'NVDA', secType: 'STK', position: 100, price: 150, category: 'Option leg' }),
  row({ symbol: 'NVDA', secType: 'OPT', position: -1, right: 'C', strike: 245, lastTradeDateOrContractMonth: '20261120' }),
  row({ account_id: 'U2', symbol: 'TSLA', secType: 'STK', position: 250, price: 300 }),
]
const CLOSES: Record<string, number> = { NVDA: 200, SGOV: 100 }
const resolve: SpotResolver = (sym) => (sym in CLOSES ? { price: CLOSES[sym], source: 'close', asOf: FRIDAY } : null)

describe('holdingsOf', () => {
  it("keeps the account's rows, prices stocks through the resolver, largest first, and lists options by contract", () => {
    const h = holdingsOf(ROWS, 'U1', resolve)
    expect(h.stocks.map((s) => [s.symbol, s.qty, s.price, s.source, s.value])).toEqual([
      ['NVDA', 100, 200, 'close', 20000],
      ['SGOV', 50, 100, 'close', 5000],
    ])
    expect(h.options).toEqual([{ symbol: 'NVDA', right: 'C', strike: 245, expiry: '20261120', qty: -1 }])
  })
  it('falls back to the row mark when the resolver has nothing', () => {
    const h = holdingsOf(ROWS, 'U1', () => null)
    expect(h.stocks.find((s) => s.symbol === 'NVDA')).toMatchObject({ price: 150, source: 'mark', value: 15000 })
  })
})

describe('marginDerivation with holdings', () => {
  it('walks EquityWithLoanValue and NetLiquidation down to cash, each holding, and the implied option value', () => {
    const d = marginDerivation(facts(SMALL), 'Host', holdingsOf(ROWS, 'U1', resolve))
    expect(derivationRows(d).map((r) => `${r.depth}:${r.name}`)).toEqual([
      '0:Pressure',
      '1:Cushion',
      '2:ExcessLiquidity',
      '3:EquityWithLoanValue',
      '4:StockValue',
      '2:NetLiquidation',
      '3:OptionValue',
      '0:BuyingPower',
      '1:AvailableFunds',
    ])
    expect(derivationFields(d)).toEqual(['TotalCashValue', 'MaintMarginReq', 'InitMarginReq'])
    const v = d.variables
    expect(v.StockValue).toMatchObject({ source: 'page', value: '$25,000.00', formula: 'Σ shares × price over 2 holdings' })
    expect(v.StockValue.items?.map((i) => [i.label, i.sub, i.value])).toEqual([
      ['NVDA', '100 sh × $200.00 · close 09-04 · Option leg', '$20,000.00'],
      ['SGOV', '50 sh × $100.00 · close 09-04 · Cash', '$5,000.00'],
    ])
    expect(v.StockValue.itemsCaption).toBe('2 priced · Σ $25,000.00')
    expect(v.StockValue.note).toContain('EquityWithLoanValue − TotalCashValue = $25,000.00')
    expect(v.EquityWithLoanValue.check).toMatchObject({ verdict: 'agrees', computed: '$35,000.00' })
    expect(v.NetLiquidation.check).toMatchObject({ verdict: 'agrees', computed: '$34,000.00' })
    expect(v.OptionValue).toMatchObject({ source: 'implied', formula: '{NetLiquidation} − {EquityWithLoanValue}' })
    expect(v.OptionValue.value).toContain('1,000.00')
    expect(v.OptionValue.note).toContain('Gross option value $1,000.00')
    expect(v.OptionValue.items?.[0]).toMatchObject({ label: 'NVDA 245C 11/20/26', sub: '-1 contract · mark not in snapshot', value: '—' })
    expect(v.TotalCashValue.value).toBe('$10,000.00')
  })
  it('reports a stale page price as a near or differing equity check, never as a broker error', () => {
    const stale: SpotResolver = (sym) => (sym === 'NVDA' ? { price: 203, source: 'close', asOf: FRIDAY } : resolve(sym))
    const v = marginDerivation(facts(SMALL), 'Host', holdingsOf(ROWS, 'U1', stale)).variables
    expect(v.EquityWithLoanValue.check).toMatchObject({ verdict: 'near', gap: '$300.00 (0.86%)' })
    const far: SpotResolver = (sym) => (sym === 'NVDA' ? { price: 300, source: 'close', asOf: FRIDAY } : resolve(sym))
    const w = marginDerivation(facts(SMALL), 'Host', holdingsOf(ROWS, 'U1', far)).variables
    expect(w.EquityWithLoanValue.check?.verdict).toBe('differs')
    expect(w.StockValue.note).toContain('this sum is $10,000.00 above it')
  })
  it('leaves an unpriced holding out of the sum and says so', () => {
    const none: SpotResolver = (sym) => (sym === 'SGOV' ? { price: 100, source: 'close', asOf: FRIDAY } : null)
    const rows = ROWS.map((r) => (r.symbol === 'NVDA' && r.secType === 'STK' ? { ...r, price: null } : r))
    const v = marginDerivation(facts(SMALL), 'Host', holdingsOf(rows, 'U1', none)).variables
    expect(v.StockValue.value).toBe('$5,000.00')
    expect(v.StockValue.itemsCaption).toBe('1 priced, 1 without a price and left out · Σ $5,000.00')
    expect(v.StockValue.items?.find((i) => i.label === 'NVDA')).toMatchObject({ value: '—', warn: true })
  })
})
