import { describe, expect, it } from 'vitest'
import { contractParams, howFrom } from './symbolGo'

describe('picking a name', () => {
  it('reads ⇧ as compare and ⌘ / Ctrl as the page', () => {
    expect(howFrom({ shiftKey: true, metaKey: true })).toBe('compare')
    expect(howFrom({ metaKey: true })).toBe('page')
    expect(howFrom({ ctrlKey: true })).toBe('page')
    expect(howFrom(null)).toBe('swap')
  })

  it('hands a contract over as the Chain face’s own seed', () => {
    // Made-up contract: the shape is under test, not anybody's book.
    expect(contractParams({ multi: false, expiry: '20270115', strike: 42.5, right: 'P' })).toEqual({
      expiration: '2027-01-15',
      strike: '42.5',
      right: 'P',
    })
    // What is not known is not sent: the face opens on its own default.
    expect(contractParams({ multi: true })).toEqual({})
  })
})
