import { describe, expect, it } from 'vitest'
import {
  applyInstancesUrlPatch,
  parseInstancesSearchParams,
} from '@/utils/instancesUrlSync'

describe('instancesUrlSync', () => {
  it('defaults since to q when URL has no since', () => {
    const state = parseInstancesSearchParams(new URLSearchParams('symbol=RKLB'))
    expect(state.filters.symbol).toBe('RKLB')
    expect(state.filters.since).toBe('q')
  })

  it('round-trips symbol + half year filters', () => {
    const next = applyInstancesUrlPatch(new URLSearchParams(), {
      symbol: 'RKLB',
      since: 'half',
    })
    expect(next.get('symbol')).toBe('RKLB')
    expect(next.get('since')).toBe('half')
    const state = parseInstancesSearchParams(next)
    expect(state.filters.symbol).toBe('RKLB')
    expect(state.filters.since).toBe('half')
  })

  it('omits default since=q from URL', () => {
    const next = applyInstancesUrlPatch(new URLSearchParams('since=half'), { since: 'q' })
    expect(next.get('since')).toBeNull()
  })

  it('clear filters removes list params', () => {
    const prev = new URLSearchParams('symbol=RKLB&since=half&status=open&instance=116')
    const next = applyInstancesUrlPatch(prev, {
      instanceId: '',
      filters: {
        status: '',
        structure: '',
        symbol: '',
        right: '',
        expiry: '',
        since: '',
      },
    })
    expect(next.get('symbol')).toBeNull()
    expect(next.get('since')).toBeNull()
    expect(next.get('status')).toBeNull()
    expect(next.get('instance')).toBeNull()
  })
})
