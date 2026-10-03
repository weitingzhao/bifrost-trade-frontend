import { describe, expect, it } from 'vitest'
import { optContractKey, optExpiryDigits, optRightLetter, optStrikeText } from './contractKey'

/**
 * Golden: the strings core writes for these strikes — `bifrost_core.portfolio.contract_key.opt_key`
 * over a float strike, i.e. the positions format (run 2026-10-03, core 0.41.0):
 *   opt_key('ZZZQ', '20261016', k, 'C') for k in (80.0, 82.5, 82.25, 0.5, 1000.0, 1234.125, 7.75, 0.05, 117.5)
 * The contract (ZZZQ) is invented.
 */
const CORE: ReadonlyArray<[number, string]> = [
  [80, 'ZZZQ|OPT|20261016|80.0|C'],
  [82.5, 'ZZZQ|OPT|20261016|82.5|C'],
  [82.25, 'ZZZQ|OPT|20261016|82.25|C'],
  [0.5, 'ZZZQ|OPT|20261016|0.5|C'],
  [1000, 'ZZZQ|OPT|20261016|1000.0|C'],
  [1234.125, 'ZZZQ|OPT|20261016|1234.125|C'],
  [7.75, 'ZZZQ|OPT|20261016|7.75|C'],
  [0.05, 'ZZZQ|OPT|20261016|0.05|C'],
  [117.5, 'ZZZQ|OPT|20261016|117.5|C'],
]

describe('optContractKey (TD-25)', () => {
  it.each(CORE)('writes strike %s as core does', (strike, key) => {
    expect(optContractKey('ZZZQ', '20261016', strike, 'C')).toBe(key)
  })

  it('keeps 82.25 as 82.25 — the manual-fill form used to write 82.3, another contract', () => {
    expect(optContractKey('zzzq', '2026-10-16', '82.25', 'PUT')).toBe('ZZZQ|OPT|20261016|82.25|P')
  })

  it('reads every expiry spelling into 8 digits', () => {
    expect(optExpiryDigits('2026-10-16')).toBe('20261016')
    expect(optExpiryDigits('261016')).toBe('20261016')
    expect(optExpiryDigits(20261016)).toBe('20261016')
    expect(optExpiryDigits('')).toBe('')
  })

  it('reads the right and an absent strike', () => {
    expect(optRightLetter('call')).toBe('C')
    expect(optRightLetter('P')).toBe('P')
    expect(optRightLetter(null)).toBe('')
    expect(optStrikeText(null)).toBe('')
    expect(optStrikeText('')).toBe('')
    expect(optStrikeText('abc')).toBe('')
  })
})
