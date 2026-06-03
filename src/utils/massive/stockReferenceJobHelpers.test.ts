import { describe, expect, it } from 'vitest'
import {
  isRefJobTerminal,
  summarizeRefJobResult,
  type RefJobTrackItem,
} from './stockReferenceJobHelpers'

describe('summarizeRefJobResult', () => {
  it('formats universe rows upserted from summary', () => {
    const summary = summarizeRefJobResult({
      job_id: '1',
      status: 'done',
      result: { summary: { rows_upserted: 12682 } },
    })
    expect(summary).toBe('rows upserted 12682')
  })

  it('formats daily_smart period detail', () => {
    const summary = summarizeRefJobResult({
      job_id: '2',
      status: 'done',
      result: {
        rows_upserted: 100,
        summary: {
          custom_bars_sync_mode: 'daily_smart',
          period_detail: {
            resolved_start_date: '2020-01-01',
            resolved_end_date: '2024-01-01',
            daily_sync_policy: 'full_20y',
          },
        },
      },
    })
    expect(summary).toContain('full 2020-01-01→2024-01-01')
    expect(summary).toContain('rows 100')
  })
})

describe('isRefJobTerminal', () => {
  const base: RefJobTrackItem = {
    jobId: 'x',
    kind: 'feed_stocks_tickers_reference_universe',
    status: 'running',
    enqueuedAt: Date.now(),
  }

  it('treats streamError as terminal', () => {
    expect(isRefJobTerminal({ ...base, streamError: 'boom' })).toBe(true)
  })

  it('treats done and failed as terminal', () => {
    expect(isRefJobTerminal({ ...base, status: 'done' })).toBe(true)
    expect(isRefJobTerminal({ ...base, status: 'failed' })).toBe(true)
    expect(isRefJobTerminal({ ...base, status: 'running' })).toBe(false)
  })
})
