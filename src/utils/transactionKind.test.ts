import { describe, expect, it } from 'vitest'
import { KIND_RULE, cancelNoteOf, kindOf } from '@/utils/transactionKind'

const at = (type: string, description: string) => ({ type, description })

describe('kindOf', () => {
  it('reads the six classes out of the description', () => {
    expect(kindOf(at('other', 'W******03:ABCOPRANP FOR SEP 2026'))).toBe('Data fee')
    expect(kindOf(at('other', 'W******03:OPRA NP L1 FOR JAN 2026'))).toBe('Data fee')
    expect(kindOf(at('other', 'USD IBKR MANAGED SECURITIES (SYEP) INTEREST FOR AUG-2026'))).toBe(
      'Lending',
    )
    expect(kindOf(at('other', 'USD CREDIT INT FOR AUG-2026'))).toBe('Financing')
    expect(kindOf(at('other', 'USD DEBIT INT FOR DEC-2025'))).toBe('Financing')
    expect(kindOf(at('other', 'USD BORROW FEES FOR DEC-2025'))).toBe('Financing')
    expect(kindOf(at('other', 'CANCEL[W******03:SNAPSHOTVALUENONPRO] FOR AUG 2026'))).toBe('Cancel')
  })

  it('catches the tax suffix this broker actually sends, not just WITHHOLDING TAX', () => {
    // Zero of the 116 rows say WITHHOLDING TAX; all 17 tax rows look like this.
    expect(kindOf(at('other', 'SGOV(US46436E7186) CASH DIVIDEND USD 0.31 PER SHARE - US TAX'))).toBe(
      'Tax',
    )
    expect(kindOf(at('other', 'WITHHOLDING TAX ON DIVIDEND PFF(US4642886877)'))).toBe('Tax')
  })

  it('echoes the labels the broker does give rather than calling them Other', () => {
    expect(kindOf(at('deposit', 'CASH RECEIPTS / ELECTRONIC FUND TRANSFERS'))).toBe('Transfer')
    expect(kindOf(at('withdrawal', 'DISBURSEMENT INITIATED BY CLIENT'))).toBe('Transfer')
    expect(kindOf(at('dividend', 'SGOV(US46436E7186) CASH DIVIDEND USD 0.42 PER SHARE'))).toBe(
      'Dividend',
    )
  })

  it('lets a cancellation win over the type it is filed under', () => {
    // Two of the five cancellations arrive typed as withdrawals.
    expect(kindOf(at('withdrawal', 'CANCELLATION'))).toBe('Cancel')
  })

  it('falls through to Other when nothing matches, and says so in the rule', () => {
    expect(kindOf(at('other', 'SOMETHING NOBODY HAS SEEN'))).toBe('Other')
    expect(kindOf(at('other', ''))).toBe('Other')
    expect(KIND_RULE).toContain('else Other')
  })

  it('prints every rule it runs', () => {
    for (const token of [
      'CANCEL*',
      'SYEP',
      'MANAGED SECURITIES',
      'CREDIT INT',
      'DEBIT INT',
      'BORROW FEES',
      ' - US TAX',
      'ABCOPRANP',
    ]) {
      expect(KIND_RULE, token).toContain(token)
    }
  })
})

describe('cancelNoteOf', () => {
  it('names the subscription and the month a bracketed cancellation reverses', () => {
    expect(cancelNoteOf(at('other', 'CANCEL[W******03:SNAPSHOTVALUENONPRO] FOR AUG 2026'))).toEqual({
      state: 'named',
      ref: 'W******03:SNAPSHOTVALUENONPRO',
      period: 'AUG 2026',
    })
    expect(cancelNoteOf(at('other', 'CANCEL[W******03:OPRA NP L1] FOR JAN 2026'))).toEqual({
      state: 'named',
      ref: 'W******03:OPRA NP L1',
      period: 'JAN 2026',
    })
  })

  it('refuses to guess what a bare CANCELLATION reverses', () => {
    expect(cancelNoteOf(at('withdrawal', 'CANCELLATION'))).toEqual({ state: 'unidentified' })
  })

  it('has nothing to say about a row that is not a cancellation', () => {
    expect(cancelNoteOf(at('deposit', 'CASH RECEIPTS / ELECTRONIC FUND TRANSFERS'))).toBeNull()
  })
})
