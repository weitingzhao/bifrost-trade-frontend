import { describe, expect, it } from 'vitest'
import { bucketByExpiry, expiryIso, isoOfExpiry, opexDatesAround, thirdFriday } from './bookCalendar'

describe('isoOfExpiry', () => {
  it('reads the compact and the ISO form alike', () => {
    expect(isoOfExpiry('20261120')).toBe('2026-11-20')
    expect(isoOfExpiry('2026-11-20')).toBe('2026-11-20')
    expect(isoOfExpiry('2026-11-20T00:00:00Z')).toBe('2026-11-20')
  })
  it('refuses anything shorter than a day', () => {
    expect(isoOfExpiry('202611')).toBeNull()
    expect(isoOfExpiry('')).toBeNull()
    expect(isoOfExpiry(null)).toBeNull()
  })
})

describe('expiryIso', () => {
  it('falls back to the contract key when the row carries no date', () => {
    expect(expiryIso({ expiry: undefined, lastTradeDateOrContractMonth: undefined, contract_key: 'ZZZ|OPT|20261218|50.0|P' })).toBe(
      '2026-12-18',
    )
    expect(expiryIso({ expiry: '20270115', contract_key: 'ZZZ|OPT|20261218|50.0|P' })).toBe('2027-01-15')
    expect(expiryIso({ expiry: '', contract_key: 'ZZZ|STK|||' })).toBeNull()
  })
})

describe('bucketByExpiry', () => {
  const legs = [
    { id: 'a', exp: '20261218' },
    { id: 'b', exp: '20261120' },
    { id: 'c', exp: '20261218' },
    { id: 'd', exp: '2026-11-20' },
    { id: 'e', exp: '' },
    { id: 'f', exp: '202612' },
  ]
  it('groups by the day, nearest first, keeping the order within a day', () => {
    const out = bucketByExpiry(legs, (l) => l.exp)
    expect(out.map((b) => b.iso)).toEqual(['2026-11-20', '2026-12-18'])
    expect(out[0].items.map((l) => l.id)).toEqual(['b', 'd'])
    expect(out[1].items.map((l) => l.id)).toEqual(['a', 'c'])
  })
  it('reports the expiry in the first item’s own format, so callers keep their keys', () => {
    const out = bucketByExpiry(legs, (l) => l.exp)
    expect(out[0].expiry).toBe('20261120')
  })
  it('leaves out an expiry that cannot be placed in time', () => {
    const ids = bucketByExpiry(legs, (l) => l.exp).flatMap((b) => b.items.map((l) => l.id))
    expect(ids).not.toContain('e')
    expect(ids).not.toContain('f')
  })
})

describe('OPEX arithmetic', () => {
  it('is the third Friday', () => {
    expect(thirdFriday(2026, 9)).toBe('2026-10-16')
    expect(opexDatesAround('2026-10-04', 3)).toEqual(['2026-10-16', '2026-11-20', '2026-12-18'])
  })
})
