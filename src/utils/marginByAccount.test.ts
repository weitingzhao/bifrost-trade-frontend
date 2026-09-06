import { describe, it, expect } from 'vitest'
import { rollupMargin } from './marginPressure'
import { PRESSURE_BANDS } from './bookVsBase'
import { PRESSURE_TICKS, marginAccountRows, pct0, usdAbbrev } from './marginByAccount'

// Shape and values taken from the live DEV snapshot on 2026-09-05.
const HOST = {
  account_id: 'U17123565',
  summary: {
    NetLiquidation: '644944.21',
    EquityWithLoanValue: '682554.57',
    MaintMarginReq: '214021.13',
    ExcessLiquidity: '468859.46',
    Cushion: '0.726977',
    BuyingPower: '1874133.76',
  },
}
const SECONDARY = {
  account_id: 'U8829175',
  summary: {
    NetLiquidation: '376390.56',
    MaintMarginReq: '93875.02',
    ExcessLiquidity: '285479.08',
    Cushion: '0.758465',
    BuyingPower: '1141916.31',
  },
}
/** Funded, but the broker sent neither Cushion nor ExcessLiquidity. */
const BLIND = {
  account_id: 'U99000001',
  summary: { NetLiquidation: '120000.00', MaintMarginReq: '90000.00' },
}
const BOTH = { host: true, secondary: true }

function withPressure(id: string, pressure: number) {
  return {
    account_id: id,
    summary: {
      NetLiquidation: '100000',
      ExcessLiquidity: String(100000 * (1 - pressure)),
      Cushion: String(1 - pressure),
    },
  }
}

describe('usdAbbrev', () => {
  it('abbreviates the way the cockpit does', () => {
    expect(usdAbbrev(1874133.76)).toBe('$1.87M')
    expect(usdAbbrev(468859.46)).toBe('$468.9k')
    expect(usdAbbrev(950)).toBe('$950.00')
  })
  it('shows unknown as a dash, never as $0', () => {
    expect(usdAbbrev(null)).toBe('—')
    expect(usdAbbrev(Number.NaN)).toBe('—')
  })
})

describe('pct0', () => {
  it('rounds to whole percent and dashes null', () => {
    expect(pct0(0.273023)).toBe('27%')
    expect(pct0(null)).toBe('—')
  })
})

describe('PRESSURE_TICKS', () => {
  it('sits on the cockpit bands so both draw the same boundaries', () => {
    expect(PRESSURE_TICKS).toEqual([
      PRESSURE_BANDS.idle,
      PRESSURE_BANDS.heavy,
      PRESSURE_BANDS.critical,
    ])
  })
})

describe('marginAccountRows', () => {
  it('orders host, secondary, then others in rollup order, with labels', () => {
    const other1 = withPressure('U00000001', 0.2)
    const other2 = withPressure('U00000002', 0.3)
    const rows = marginAccountRows(
      rollupMargin([other2, SECONDARY, other1, HOST]),
      HOST.account_id,
      SECONDARY.account_id,
      BOTH
    )
    expect(rows.map((r) => r.accountId)).toEqual([
      HOST.account_id,
      SECONDARY.account_id,
      other2.account_id,
      other1.account_id,
    ])
    expect(rows.map((r) => r.label)).toEqual(['Host', 'Secondary', 'U00000002', 'U00000001'])
    expect(rows.map((r) => r.role)).toEqual(['host', 'secondary', 'other', 'other'])
  })

  it('formats the row text from the broker fields', () => {
    const [host] = marginAccountRows(
      rollupMargin([HOST]),
      HOST.account_id,
      SECONDARY.account_id,
      BOTH
    )
    expect(host.pctText).toBe('27%')
    expect(host.detailText).toBe('cushion 73% · excess $468.9k · BP $1.87M')
    expect(host.pressure).toBeCloseTo(1 - 0.726977, 6)
    expect(host.level).toBe(1)
    expect(host.tone).toBe('profit')
  })

  it('prints every raw broker field in the hover title, one per line', () => {
    const [host] = marginAccountRows(rollupMargin([HOST]), HOST.account_id, '', BOTH)
    expect(host.rawTitle.split('\n')).toEqual([
      'U17123565 — Host',
      'NetLiquidation $644,944.21',
      'MaintMarginReq $214,021.13',
      'ExcessLiquidity $468,859.46',
      'BuyingPower $1,874,133.76',
      'Cushion 0.7270',
    ])
  })

  it('grades by the cockpit bands so the two never disagree', () => {
    const rows = marginAccountRows(
      // Just inside each band: 1 − 0.9 lands a hair under 0.1 in floating
      // point, so the idle boundary is not probed exactly.
      rollupMargin([
        withPressure('A', 0.05),
        withPressure('B', PRESSURE_BANDS.idle + 0.02),
        withPressure('C', PRESSURE_BANDS.heavy),
        withPressure('D', PRESSURE_BANDS.critical),
      ]),
      '',
      '',
      BOTH
    )
    expect(rows.map((r) => r.level)).toEqual([0, 1, 2, 3])
    expect(rows.map((r) => r.tone)).toEqual(['profit', 'profit', 'warning', 'loss'])
  })

  it('leaves a missing cushion unknown — no level, no text, dashes in the title', () => {
    const [blind] = marginAccountRows(rollupMargin([BLIND]), '', '', BOTH)
    expect(blind.pressure).toBeNull()
    expect(blind.cushion).toBeNull()
    expect(blind.level).toBeNull()
    expect(blind.tone).toBeNull()
    expect(blind.pctText).toBeNull()
    expect(blind.detailText).toBeNull()
    expect(blind.rawTitle).toContain('ExcessLiquidity —')
    expect(blind.rawTitle).toContain('BuyingPower —')
    expect(blind.rawTitle).toContain('Cushion —')
  })

  it('dashes excess and buying power inside the text when only those are missing', () => {
    const [row] = marginAccountRows(
      rollupMargin([{ account_id: 'X', summary: { NetLiquidation: '1000', Cushion: '0.5' } }]),
      '',
      '',
      BOTH
    )
    expect(row.pctText).toBe('50%')
    expect(row.detailText).toBe('cushion 50% · excess — · BP —')
  })

  it('marks scope from the filter, and leaves unfiltered accounts in scope', () => {
    const other = withPressure('U00000001', 0.2)
    const rows = marginAccountRows(
      rollupMargin([HOST, SECONDARY, other]),
      HOST.account_id,
      SECONDARY.account_id,
      { host: false, secondary: true }
    )
    expect(rows.map((r) => r.inScope)).toEqual([false, true, true])
  })

  it('does not let a blank configured id claim a blank-id account as host', () => {
    const rows = marginAccountRows(
      rollupMargin([{ account_id: '', summary: { NetLiquidation: '1000', Cushion: '0.9' } }]),
      '',
      '',
      BOTH
    )
    expect(rows[0].role).toBe('other')
    expect(rows[0].inScope).toBe(true)
  })
})
