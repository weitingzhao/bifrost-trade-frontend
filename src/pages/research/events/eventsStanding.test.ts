import { describe, expect, it } from 'vitest'
import { eventsStanding, type StoreReading } from './eventsStanding'

const BATCHES = '/research/events/batches'
const store = (path: string, rows: number | null, over: Partial<StoreReading> = {}): StoreReading => ({
  path,
  label: path,
  isError: false,
  isLoading: false,
  rows,
  ...over,
})

const set = (batches: number | null, events: number | null, over: Partial<StoreReading> = {}) => [
  store(BATCHES, batches, over),
  store('/research/event-radar/events', events, over),
  store('/research/events/themes', events, over),
  store('/research/events/calendar', events, over),
]

describe('the four states are one reading, not four empty panels', () => {
  it('calls an unfed board unfed, not quiet', () => {
    // DEV 2026-09-23: every store answers 200 with 0 rows and batches is
    // count 0. Three panels each drawing its own EmptyState would say the
    // market was quiet — a claim about the market from a page that has never
    // been fed.
    const s = eventsStanding(set(0, 0), { batchesPath: BATCHES })
    expect(s.state).toBe('unfed')
    expect(s.title).toBe('Pipeline not connected')
    expect(s.detail).toMatch(/about the ingest, not about the market/)
  })

  it('calls it quiet only once the pipeline has actually run', () => {
    const s = eventsStanding(set(4, 0), { batchesPath: BATCHES, lastBatchAt: '2026-09-22 22:31' })
    expect(s.state).toBe('empty')
    expect(s.title).toBe('Quiet window')
    expect(s.detail).toContain('2026-09-22 22:31')
  })

  it('never renders a failure as an empty board', () => {
    // The rule the design states outright: a store that did not answer has
    // read nothing, so nothing can be called quiet.
    const s = eventsStanding(set(0, 0, { isError: true }), { batchesPath: BATCHES })
    expect(s.state).toBe('failed')
    expect(s.title).toBe('Event radar did not answer')
  })

  it('prefers the failure even when batches would have said unfed', () => {
    const s = eventsStanding(
      [store(BATCHES, 0), store('/research/event-radar/events', null, { isError: true })],
      { batchesPath: BATCHES },
    )
    expect(s.state).toBe('failed')
  })

  it('judges nothing while a store is still answering', () => {
    // Loading looks exactly like zero on these pages, which is the trap
    // Review's own walk recorded. Until every store has answered, the board
    // states nothing.
    const s = eventsStanding(set(0, 0, { isLoading: true }), { batchesPath: BATCHES })
    expect(s.loading).toBe(true)
    expect(s.title).toBe('')
  })

  it('is live as soon as one panel has rows', () => {
    expect(eventsStanding(set(4, 12), { batchesPath: BATCHES }).state).toBe('live')
  })

  it('carries every store so the reader can see which one answered what', () => {
    const s = eventsStanding(set(0, 0), { batchesPath: BATCHES })
    expect(s.stores).toHaveLength(4)
    expect(s.stores.map((x) => x.path)).toContain(BATCHES)
  })
})
