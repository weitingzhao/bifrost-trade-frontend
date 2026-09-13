import { describe, expect, it } from 'vitest'
import { lensCell } from './freshnessRule'

describe('lensCell', () => {
  it('is green only when the batch itself says it is ok', () => {
    expect(lensCell({ isPending: false, isError: false, overall: 'ok', asOf: '2026-09-13T01:15:03Z' }))
      .toEqual({ lamp: 'green', value: '13 Sep' })
  })

  it('warns when the batch answered and said it is behind', () => {
    // The batch grades itself against its own SLA. Rendering that verdict is
    // the point; second-guessing it here would put two opinions on screen.
    expect(lensCell({ isPending: false, isError: false, overall: 'stale', asOf: '2026-09-10T01:15:03Z' }))
      .toEqual({ lamp: 'yellow', value: '10 Sep' })
  })

  it('keeps the two quiet states grey and apart', () => {
    // `checking` is a fact about this render; `unavailable` is a fact about the
    // batch. Neither is a fault, so neither takes the fault colour.
    expect(lensCell({ isPending: true, isError: false })).toEqual({ lamp: 'gray', value: 'checking' })
    expect(lensCell({ isPending: false, isError: true })).toEqual({ lamp: 'gray', value: 'unavailable' })
    expect(lensCell({ isPending: false, isError: false, overall: 'ok', asOf: null }))
      .toEqual({ lamp: 'gray', value: 'unavailable' })
  })

  it('never reports green without a date behind it', () => {
    const green = lensCell({ isPending: false, isError: false, overall: 'ok', asOf: undefined })
    expect(green.lamp).not.toBe('green')
  })
})
