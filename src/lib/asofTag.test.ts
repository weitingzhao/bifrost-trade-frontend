import { describe, expect, it } from 'vitest'
import type { ExhibitPayload } from '@/api/research/exhibit'
import type { SignalFreshnessItem } from '@/api/research/similarRegime'
import { asofHolding, failedLensFlag, healthFlag, oldestAsof } from './asofTag'

const table = (label: string, status: string, error?: string): SignalFreshnessItem => ({
  label,
  table: `features.${label}`,
  max_computed_at: status === 'missing' ? null : '2026-09-12T02:54:29Z',
  row_count: status === 'missing' ? 0 : 100,
  status,
  age_hours: status === 'missing' ? null : 47.9,
  error,
})

describe('oldestAsof', () => {
  it('shows the oldest session a view mixes, and ignores readings without one', () => {
    expect(oldestAsof([{ as_of: '2026-09-11' }, { as_of: '2026-09-10T00:00:00Z' }, { as_of: null }, {}])).toBe('2026-09-10')
    expect(oldestAsof([{ as_of: 'soon' }, {}])).toBeNull()
  })
})

describe('healthFlag', () => {
  it('raises no flag when the service says ok', () => {
    expect(healthFlag({ overall: 'ok', freshness: [table('vrp', 'fresh')], extra_tables: [] })).toBeNull()
  })

  it('names what is off, with the first line of the error', () => {
    // DEV 2026-09-13: a statement timeout on one table turned overall to degraded.
    const flag = healthFlag({
      overall: 'degraded',
      freshness: [table('vrp', 'fresh'), table('iv_reconstructed', 'missing', 'canceling statement due to statement timeout\n')],
      extra_tables: [],
    })
    expect(flag).toEqual({
      flag: 'DEGRADED',
      detail: 'iv_reconstructed missing (canceling statement due to statement timeout)',
      tone: 'warning',
    })
  })

  it('says it is still checking, or that it could not tell — never nothing', () => {
    expect(healthFlag(undefined, { loading: true })).toMatchObject({ flag: 'CHECKING', tone: 'muted' })
    expect(healthFlag(undefined, { error: true })).toMatchObject({ flag: 'UNKNOWN', tone: 'warning' })
  })
})

describe('failedLensFlag', () => {
  it('flags only lenses the server stubbed as failed', () => {
    const ex = (lens: string, freshness: string, caveats: string[] = []) => ({ lens, freshness, caveats }) as unknown as ExhibitPayload
    expect(failedLensFlag([ex('vrp', 'stale'), ex('skew', 'missing')])).toBeNull()
    expect(failedLensFlag([ex('vrp', 'fresh'), ex('opex_pin', 'missing', ['lens failed: timeout'])])).toEqual({
      flag: 'LENS FAILED',
      detail: 'opex_pin',
      tone: 'warning',
    })
  })
})

describe('asofHolding', () => {
  it('is behind only when a service passed the session that should have landed', () => {
    expect(asofHolding('2026-09-11')).toBe(0)
    expect(asofHolding('2026-09-10', '2026-09-11')).toBe(1)
    expect(asofHolding('2026-09-09', '2026-09-11', 2)).toBe(2)
    expect(asofHolding(null, '2026-09-11', 3)).toBe(0)
  })
})
