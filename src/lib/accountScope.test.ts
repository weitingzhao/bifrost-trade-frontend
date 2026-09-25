import { describe, expect, it } from 'vitest'
import { inAccountScope, pairToScope, scopeAccountId, scopeToPair } from './accountScope'

// Made-up ids: the shape is what is under test, not anybody's account.
const HOST = 'U0000001'
const SEC = 'U0000002'

describe('account scope', () => {
  it('maps the shell scope to a page pair and back', () => {
    expect(scopeToPair('all')).toEqual({ host: true, secondary: true })
    expect(scopeToPair('HOST')).toEqual({ host: true, secondary: false })
    expect(pairToScope({ host: false, secondary: true })).toBe('SEC')
    // Neither is a page state the shell never carries.
    expect(pairToScope({ host: false, secondary: false })).toBeNull()
    // One object per scope, so memos keyed on it hold.
    expect(scopeToPair('SEC')).toBe(scopeToPair('SEC'))
  })

  it('names the broker id of a single scope, and none under All', () => {
    expect(scopeAccountId('HOST', HOST, SEC)).toBe(HOST)
    expect(scopeAccountId('all', HOST, SEC)).toBeNull()
    expect(scopeAccountId('SEC', HOST, '')).toBeNull()
  })

  it('keeps rows in scope, and rows with no account in every scope', () => {
    expect(inAccountScope(HOST, 'HOST', HOST, SEC)).toBe(true)
    expect(inAccountScope(SEC, 'HOST', HOST, SEC)).toBe(false)
    expect(inAccountScope(SEC.toLowerCase(), 'SEC', HOST, SEC)).toBe(true)
    expect(inAccountScope(null, 'HOST', HOST, SEC)).toBe(true)
    expect(inAccountScope(SEC, 'all', HOST, SEC)).toBe(true)
  })
})
