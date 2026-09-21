import { describe, expect, it } from 'vitest'
import { loopLines, nameLines, notableReading } from './digestRead'

// Invented, in the shape DEV returns (measured 2026-09-21): exhibits keyed by
// symbol, each a list of lens readings with a band and what it means.
const payload = {
  symbols: ['AMD', 'QUIET'],
  exhibits: {
    AMD: [
      { lens: 'iv_rank', band: 'lean_cold', means: 'Implied vol near its 1y low.', as_of: '2026-09-18', freshness: 'fresh' },
      { lens: 'gex_regime', band: 'hot', means: 'Negative net gamma — dealers chase moves.', as_of: '2026-09-18', freshness: 'fresh' },
    ],
    QUIET: [{ lens: 'terrain_regime', band: 'neutral', means: 'No standalone edge.', as_of: '2026-09-18', freshness: 'fresh' }],
  },
  loop: {
    runs: [],
    objectives: [{ id: 'obj-1', title: 'Daily Loop' }],
    pending: { candidate_batch: 29, policy_suggestion: 1, hypothesis_suggestion: 0 },
    trust: { l0: false, reason: 'trust matrix unreachable' },
  },
}

describe('notableReading', () => {
  it('prefers a lens at an extreme over one that is leaning', () => {
    expect(notableReading(payload.exhibits.AMD)?.lens).toBe('gex_regime')
  })

  it('still prints a name whose every lens declined', () => {
    // "Nothing stands out" is the read. A name that vanished would be taken
    // for one that was never looked at.
    expect(notableReading(payload.exhibits.QUIET)?.lens).toBe('terrain_regime')
    expect(notableReading([])).toBeNull()
  })
})

describe('nameLines', () => {
  it('gives each name its reading and the page the lens belongs to', () => {
    const lines = nameLines(payload)
    expect(lines.map((l) => l.sym)).toEqual(['AMD', 'QUIET'])
    expect(lines[0].text).toContain('GEX hot')
    expect(lines[0].cite).toEqual({ label: 'GEX', to: '/research/symbol?tab=dealer&symbol=AMD#gex' })
  })
})

describe('loopLines', () => {
  it('says what ran, what waits, and what is not trusted', () => {
    const lines = loopLines(payload)
    expect(lines[0].text).toContain('no run since yesterday')
    expect(lines[1].text).toContain('29 candidate batches')
    // A zero is not printed as a queue of nothing.
    expect(lines[1].text).not.toContain('hypothesis suggestion')
    expect(lines[1].cite?.to).toBe('/research/loop/decisions')
    expect(lines[2].text).toContain('not L0')
  })

  it('has nothing to say about a loop the digest did not describe', () => {
    expect(loopLines({})).toEqual([])
  })
})
