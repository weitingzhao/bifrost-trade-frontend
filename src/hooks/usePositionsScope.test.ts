import { describe, it, expect } from 'vitest'
import { parsePositionsScope, serializePositionsScope } from './usePositionsScope'

describe('positions scope in the URL', () => {
  it('reads both accounts when the URL names none, and a subset when it does', () => {
    expect(parsePositionsScope(new URLSearchParams('')).accountFilter).toEqual({ host: true, secondary: true })
    expect(parsePositionsScope(new URLSearchParams('acct=host')).accountFilter).toEqual({ host: true, secondary: false })
    expect(parsePositionsScope(new URLSearchParams('acct=secondary,host')).accountFilter).toEqual({
      host: true,
      secondary: true,
    })
  })

  it('normalises symbol and expiry the way the inputs do', () => {
    const s = parsePositionsScope(new URLSearchParams('symbol=nvda&expiry=2026-11-20x'))
    expect(s.filterSymbol).toBe('NVDA')
    expect(s.filterExpiry).toBe('20261120')
  })

  it('round-trips and leaves other params alone', () => {
    const base = new URLSearchParams('sort=cash')
    const out = serializePositionsScope(
      { accountFilter: { host: false, secondary: true }, filterSymbol: 'RKLB', filterExpiry: '' },
      base,
    )
    expect(out.get('sort')).toBe('cash')
    expect(out.get('acct')).toBe('secondary')
    expect(out.get('symbol')).toBe('RKLB')
    expect(out.has('expiry')).toBe(false)
    expect(parsePositionsScope(out)).toEqual({
      accountFilter: { host: false, secondary: true },
      filterSymbol: 'RKLB',
      filterExpiry: '',
    })
  })

  it('drops the account key when both are on, so the default URL is clean', () => {
    const out = serializePositionsScope({ accountFilter: { host: true, secondary: true }, filterSymbol: '', filterExpiry: '' })
    expect(out.toString()).toBe('')
  })
})
