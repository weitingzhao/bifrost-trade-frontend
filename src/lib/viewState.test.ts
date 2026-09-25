import { describe, expect, it } from 'vitest'
import { failedDetail, sourceState, staleDetail } from './viewState'

const q = (p: Partial<Parameters<typeof sourceState>[0]>) => ({
  data: undefined,
  isPending: false,
  isError: false,
  error: null,
  ...p,
})

describe('sourceState', () => {
  it('tells a failure with nothing to show from a refresh that failed over a copy', () => {
    expect(sourceState(q({ isError: true, error: new Error('503') }))).toBe('failed')
    expect(sourceState(q({ isError: true, data: { rows: [] } }))).toBe('stale')
  })

  it('is loading only on the first read', () => {
    expect(sourceState(q({ isPending: true }))).toBe('loading')
    expect(sourceState(q({ data: {} }))).toBe('ready')
  })
})

describe('the details', () => {
  // Thursday 2026-09-24, 13:41:07Z = 09:41:07 ET.
  const at = Date.UTC(2026, 8, 24, 13, 41, 7)

  it('says when it failed and that nothing was evaluated', () => {
    const d = failedDetail(q({ isError: true, error: new Error('HTTP 503'), errorUpdatedAt: at }), 'Nothing on this page was evaluated.')
    expect(d).toBe('HTTP 503 · 09:41:07 ET. Nothing on this page was evaluated.')
  })

  it('says what is shown and what may be missing', () => {
    const d = staleDetail(q({ data: {}, dataUpdatedAt: at - 5 * 60_000, errorUpdatedAt: at }), 'breaches since then are not shown.')
    expect(d).toBe('Showing 09:36 · failed 09:41:07 ET — breaches since then are not shown.')
  })
})
