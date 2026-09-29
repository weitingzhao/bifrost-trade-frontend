import { beforeEach, describe, expect, it } from 'vitest'
import { markPagedFrom, pagedFromFor, surfaceOf } from './pagedFrom'

describe('page ↔ surface (Rev .103)', () => {
  beforeEach(() => sessionStorage.clear())

  it('returns to where the frame was, only from the page it was written for', () => {
    markPagedFrom('/portfolio/outcome?x=1', '/instance/7?list=7,8')
    expect(pagedFromFor('/instance/7')).toBe('/portfolio/outcome?x=1')
    expect(pagedFromFor('/instance/8')).toBe('/home')
  })

  it('a deep link has no source and goes Home', () => {
    expect(pagedFromFor('/research/symbol')).toBe('/home')
  })

  it('knows which pages can go back to being a surface', () => {
    expect(surfaceOf('/instance/159', '?list=158,159&from=Ledger')).toMatchObject({
      key: 'instance',
      instance: 159,
      instanceList: [158, 159],
      instanceFrom: 'Ledger',
    })
    expect(surfaceOf('/research/symbol', '?symbol=NVDA')?.key).toBe('symbol')
    expect(surfaceOf('/portfolio/positions', '')).toBeNull()
  })
})
