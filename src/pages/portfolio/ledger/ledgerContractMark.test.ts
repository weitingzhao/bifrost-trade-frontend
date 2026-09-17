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
    expect(d.mark).toBe('AAPL 17AUG26')
    expect(d.occ).toBe('AAPL|OPT|20260817|150|C')
  })
})
