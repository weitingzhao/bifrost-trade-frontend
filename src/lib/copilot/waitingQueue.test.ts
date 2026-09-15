import { describe, expect, it } from 'vitest'
import {
  waitingQueueHeadline,
  waitingQueueShowsApprove,
  waitingQueueShowsDismiss,
  waitingQueueSummary,
  waitingQueueTotal,
} from './waitingQueue'

describe('waitingQueue', () => {
  it('adds draft pending and run counts, never invents a third source', () => {
    expect(waitingQueueTotal(214, 10)).toBe(224)
    expect(waitingQueueTotal(0, 0)).toBe(0)
  })

  it('names the collapsed row in English', () => {
    expect(waitingQueueHeadline(224)).toBe('224 waiting on you')
    expect(
      waitingQueueSummary({ digest: true, draftPending: 214, runCount: 10 }),
    ).toBe('Daily digest · 213 drafts · 10 runs')
  })

  it('does not put Approve on digest or loop runs', () => {
    expect(waitingQueueShowsApprove('digest')).toBe(false)
    expect(waitingQueueShowsApprove('draft')).toBe(true)
    expect(waitingQueueShowsApprove('run')).toBe(false)
    expect(waitingQueueShowsDismiss('run')).toBe(false)
    expect(waitingQueueShowsDismiss('digest')).toBe(true)
  })
})
