import { describe, expect, it } from 'vitest'
import type { ExecutionFreshnessItem } from '@/types/trading'
import {
  clockLabel,
  flexPullStale,
  flexPullTsFromCoverage,
  isoToEpochSec,
  latestClientExecFreshness,
  latestFlexFreshness,
  pullAndRecLine,
} from './accountsFreshness'

function item(overrides: Partial<ExecutionFreshnessItem>): ExecutionFreshnessItem {
  return {
    account_id: 'U1',
    source: 'flex_trades',
    latest_exec_ts: 1_700_000_000,
    days_since_latest: 0.2,
    ...overrides,
  }
}

describe('isoToEpochSec', () => {
  it('parses ISO UTC', () => {
    expect(isoToEpochSec('2026-08-18T18:56:40.421977Z')).toBe(
      Date.parse('2026-08-18T18:56:40.421977Z') / 1000,
    )
    expect(isoToEpochSec(null)).toBeNull()
    expect(isoToEpochSec('')).toBeNull()
  })
})

describe('latestFlexFreshness', () => {
  it('picks the newest flex_trades row', () => {
    const best = latestFlexFreshness([
      item({ account_id: 'A', latest_exec_ts: 10 }),
      item({ account_id: 'B', source: 'tws_client', latest_exec_ts: 99 }),
      item({ account_id: 'C', latest_exec_ts: 20 }),
    ])
    expect(best?.account_id).toBe('C')
  })
})

describe('latestClientExecFreshness', () => {
  it('uses TWS sources only', () => {
    const best = latestClientExecFreshness([
      item({ source: 'flex_trades', latest_exec_ts: 500 }),
      item({ source: 'tws_client', latest_exec_ts: 40 }),
      item({ source: 'tws_event', latest_exec_ts: 80 }),
    ])
    expect(best?.latest_exec_ts).toBe(80)
    expect(best?.source).toBe('tws_event')
  })
})

describe('flexPullTsFromCoverage', () => {
  it('takes max updated_at on flex-* dimensions', () => {
    const ts = flexPullTsFromCoverage([
      { dimension: 'flex-trades', updated_at: '2026-08-18T18:56:40Z' },
      { dimension: 'flex-transactions', updated_at: '2026-08-18T18:56:46Z' },
    ])
    expect(ts).toBe(Date.parse('2026-08-18T18:56:46Z') / 1000)
  })
})

describe('pullAndRecLine', () => {
  it('formats both clocks', () => {
    expect(pullAndRecLine(null, null)).toBe('Pull — · Rec —')
  })
})

describe('flexPullStale', () => {
  it('is stale after 36h', () => {
    const now = 1_800_000_000
    expect(flexPullStale(now - 10, now)).toBe(false)
    expect(flexPullStale(now - 36 * 3600, now)).toBe(true)
    expect(flexPullStale(null, now)).toBe(false)
  })
})

describe('clockLabel', () => {
  it('returns dash for missing', () => {
    expect(clockLabel(null)).toBe('—')
  })
})
