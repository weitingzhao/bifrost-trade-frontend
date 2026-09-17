import { describe, expect, it } from 'vitest'
import { fmtExpiryOccToken, ledgerContractDisplay } from './ledgerContractMark'

describe('ledger contract mark', () => {
  it('writes DDMMMYY from YYYYMMDD expiry', () => {
    expect(fmtExpiryOccToken('20260817')).toBe('17AUG26')
    expect(fmtExpiryOccToken('2026-08-17')).toBe('17AUG26')
  })

  it('puts OCC only in the hover string', () => {
    const d = ledgerContractDisplay({
      symbol: 'AAPL',
      expiry: '20260817',
      contract_key: 'AAPL|OPT|20260817|150|C',
    })
    expect(d.mark).toBe('AAPL 17AUG26 150C')
    expect(d.occ).toBe('AAPL|OPT|20260817|150|C')
  })

  it('writes one contract format whatever the row carries (§14.4.2)', () => {
    // A Flex row: OCC-style symbol, strike and right as columns, key strike with one decimal.
    expect(
      ledgerContractDisplay({
        symbol: 'ZZZ   240119P00007500',
        expiry: '20240119',
        strike: 7.5,
        option_right: 'P',
        contract_key: 'ZZZ   240119P00007500|OPT|20240119|7.5|P',
      }).mark,
    ).toBe('ZZZ 19JAN24 7.5P')
    // A group row with no strike of its own reads it from the key.
    expect(
      ledgerContractDisplay({ symbol: 'ZZZ', expiry: '20240119', strike: 0, contract_key: 'ZZZ|OPT|20240119|50.0|C' }).mark,
    ).toBe('ZZZ 19JAN24 50C')
  })

  it('leaves a stock as its symbol', () => {
    expect(ledgerContractDisplay({ symbol: 'ZZZ', contract_key: 'ZZZ|STK|||' }).mark).toBe('ZZZ')
  })
})
