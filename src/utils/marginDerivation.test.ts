import { describe, it, expect } from 'vitest'
import { marginDerivation } from './marginDerivation'
import { derivationFields, derivationRows } from './derivation'
import { rollupMargin } from './marginPressure'
import type { IbAccountSnapshot } from '@/types/monitor'

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
    // EWLV − Maint = 468,533.44 against the reported 468,859.46.
    expect(v.ExcessLiquidity.check).toMatchObject({ verdict: 'differs', computed: '$468,533.44', gap: '$326.02 (0.07%)' })
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
