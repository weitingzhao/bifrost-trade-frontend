import { describe, expect, it } from 'vitest'
import { mapIntentToPrefill } from './orderIntentPrefill'

describe('mapIntentToPrefill', () => {
  it('carries the intent’s symbols under the scope the form actually renders', () => {
    // `symbol` / `watchlist` matched no option in the form, so the names an
    // intent named were dropped on the way in.
    const p = mapIntentToPrefill({ legs: [{ symbol: 'rvty' }] })
    expect(p.scopeType).toBe('explicit_symbols')
    expect(p.symbols).toEqual(['RVTY'])
  })

  it('takes several legs on one name as one symbol', () => {
    const p = mapIntentToPrefill({ legs: [{ symbol: 'MU' }, { symbol: 'MU' }, { symbol: 'AMD' }] })
    expect(p.symbols).toEqual(['MU', 'AMD'])
    expect(p.scopeType).toBe('explicit_symbols')
  })

  it('leaves the scope unset when the intent names nothing — a legless intent is legal', () => {
    const p = mapIntentToPrefill({ legs: [], strategy_template: 'NoStructureConditionalWatch' })
    expect(p.scopeType).toBe('')
    expect(p.symbols).toEqual([])
  })

  it('names the proposal after its template and hypothesis, so the rule says where it came from', () => {
    const p = mapIntentToPrefill({ strategy_template: 'PullbackLimitLongStock', hypothesis_id: 'rvty-stage-2a-xyz' })
    expect(p.name).toBe('Research proposal · PullbackLimitLongStock · rvty-sta')
  })
})
