/**
 * The funnel's one job: name the stage that emptied.
 *
 * Each case here is a different emptiness, and telling them apart is the
 * whole point — "the store is dark", "the window is empty" and "your filters
 * are too tight" send the reader to three different places.
 */
import { describe, expect, it } from 'vitest'
import type { ScreenerResponse } from '@/types/research'
import { screenerFunnel } from './screenerFunnelModel'

const DEAD: ScreenerResponse = {
  ok: true,
  groups: [],
  total_contracts: 0,
  symbols_scanned: ['ANET', 'CAVA'],
  symbols_failed: ['ANET', 'CAVA'],
  warnings: {
    ANET: 'No snapshot data — run Market Data Plugin sync first',
    CAVA: 'No snapshot data — run Market Data Plugin sync first',
  },
}

describe('screenerFunnel', () => {
  it('says nothing has been run rather than printing zeroes', () => {
    // A zero is a count. "Not run yet" is not one, and a strip of zeroes over
    // an untouched page reads as a screen that found nothing.
    const cells = screenerFunnel(['ANET'], 'Cash Secured Put', null)
    expect(cells.slice(1).map((c) => c.value)).toEqual(['—', '—', '—'])
    expect(cells.slice(1).every((c) => c.note === 'not run yet')).toBe(true)
  })

  it('carries the engine’s own reason when every name fails', () => {
    // This is DEV today: the store, not the filters. The sentence comes from
    // the engine so the page never has to guess at the cause.
    const cells = screenerFunnel(['ANET', 'CAVA'], 'Cash Secured Put', DEAD)
    expect(cells[1]).toMatchObject({ value: '0', tone: 'dead' })
    expect(cells[1].note).toBe('No snapshot data — run Market Data Plugin sync first')
    expect(cells[3].note).toBe('nothing reached the filters')
  })

  it('blames the filters only when contracts actually reached them', () => {
    const cells = screenerFunnel(['ANET'], 'Cash Secured Put', {
      ...DEAD,
      symbols_failed: [],
      warnings: {},
      total_contracts: 180,
    })
    expect(cells[2]).toMatchObject({ value: '180', tone: 'ok' })
    expect(cells[3].note).toBe('every contract in the window fails a filter — loosen one')
  })

  it('counts the rows that passed, not the groups that hold them', () => {
    const cells = screenerFunnel(['ANET'], 'Cash Secured Put', {
      ...DEAD,
      symbols_failed: [],
      warnings: {},
      total_contracts: 180,
      groups: [
        { symbol: 'ANET', spot: 1, best_score: 1, avg_iv: 1, contract_count: 2, contracts: [{}, {}] },
      ] as ScreenerResponse['groups'],
    })
    expect(cells[3]).toMatchObject({ value: '2', tone: 'ok' })
  })

  it('names a mixed failure without pretending one reason covers it', () => {
    const cells = screenerFunnel(['A', 'B', 'C'], 'Cash Secured Put', {
      ...DEAD,
      symbols_scanned: ['A', 'B', 'C'],
      symbols_failed: ['A', 'B'],
      warnings: { A: 'No snapshot data', B: 'Unknown symbol' },
    })
    expect(cells[1].note).toContain('and 1 other reason')
    expect(cells[1].tone).toBe('warn')
  })
})
