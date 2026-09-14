import { describe, expect, it } from 'vitest'
import { rowLamp, type RunStatusRead } from './runLamp'

describe('rowLamp', () => {
  const statuses = (entries: [string, RunStatusRead][]) => new Map(entries)

  it('is green for a row that wrote and links no run', () => {
    expect(rowLamp([], statuses([])).lamp).toBe('green')
  })

  it('is red only for a failed run, amber for one not finished, green when all completed', () => {
    expect(rowLamp(['a', 'b'], statuses([['a', 'completed'], ['b', 'failed']])).lamp).toBe('red')
    // 2026-09-11 on DEV: the harness run finished and is waiting on the Owner.
    expect(rowLamp(['a'], statuses([['a', 'awaiting_approval']]))).toEqual({ lamp: 'yellow', why: '1 awaiting approval' })
    expect(rowLamp(['a', 'b'], statuses([['a', 'completed'], ['b', 'completed']]))).toEqual({ lamp: 'green', why: '2 completed' })
  })

  it('is grey when it does not know — loading, unreadable, or a word it has not seen', () => {
    expect(rowLamp(['a'], statuses([])).lamp).toBe('gray')
    expect(rowLamp(['a', 'b'], statuses([['a', 'gone'], ['b', 'error']])).lamp).toBe('gray')
    expect(rowLamp(['a'], statuses([['a', 'paused']])).lamp).toBe('gray')
    // One unreadable run does not hide what the readable one says.
    expect(rowLamp(['a', 'b'], statuses([['a', 'running'], ['b', 'gone']]))).toEqual({
      lamp: 'yellow',
      why: '1 still running · 1 unreadable',
    })
  })
})
