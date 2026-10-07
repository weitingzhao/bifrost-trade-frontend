/**
 * TD-233: a 404 from the plugin is an answer (the name has no row); anything
 * else — a 5xx, a timeout, a network error — is a failed read, which must not
 * be reported as "no data" (CLAUDE.md §5).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import type { IvRadarUniverseItem } from '@/types/ivRadar'
import { ivRadarRows } from '@/hooks/useIvRadarData'
import { fetchIvPercentileForSymbols, ivLookupRow, type IvLookup } from './ivRadar'

vi.mock('@/lib/http', async (orig) => ({
  ...(await orig<typeof import('@/lib/http')>()),
  requestJson: vi.fn(),
}))

const http = await import('@/lib/http')
const requestJson = vi.mocked(http.requestJson)

const ROW = { symbol: 'AMD', trade_date: '2026-10-05', iv_current: 0.52, iv_percentile_1y: 71, iv_rank_1y: 64, lookback_days: 252 }

function answer(bySymbol: Record<string, () => unknown>) {
  requestJson.mockImplementation(async (url: string) => {
    const sym = new URL(url, 'http://x').searchParams.get('symbol') ?? ''
    return bySymbol[sym]() as never
  })
}

afterEach(() => {
  requestJson.mockReset()
})

describe('fetchIvPercentileForSymbols', () => {
  it('keeps a row, reads a 404 as absent, and a 500 as a failed read', async () => {
    answer({
      AMD: () => ({ rows: [ROW] }),
      NBIS: () => {
        throw new HttpError(404, 'No iv-percentile rows')
      },
      SMCI: () => {
        throw new HttpError(500, 'Internal Server Error')
      },
    })
    const got = await fetchIvPercentileForSymbols(['amd', 'NBIS', 'SMCI'])
    expect(got.get('AMD')?.status).toBe('row')
    expect(ivLookupRow(got.get('AMD'))?.iv_rank_1y).toBe(64)
    expect(got.get('NBIS')).toEqual({ status: 'absent' })
    expect(got.get('SMCI')).toEqual({ status: 'error', message: 'Internal Server Error' })
  })

  it('reads an empty rows list as absent, and a network failure as a failed read', async () => {
    answer({
      SGOV: () => ({ rows: [] }),
      TSLA: () => {
        throw new TypeError('Failed to fetch')
      },
    })
    const got = await fetchIvPercentileForSymbols(['SGOV', 'TSLA'])
    expect(got.get('SGOV')).toEqual({ status: 'absent' })
    expect(got.get('TSLA')).toEqual({ status: 'error', message: 'Failed to fetch' })
  })
})

describe('ivRadarRows', () => {
  const universe: IvRadarUniverseItem[] = [
    { symbol: 'AMD', sources: ['watchlist'] },
    { symbol: 'NBIS', sources: ['watchlist'] },
    { symbol: 'SMCI', sources: ['holdings'] },
  ]

  it('marks a failed read as read failed, not as a name without data', () => {
    const rows = ivRadarRows(
      universe,
      new Map<string, IvLookup>([
        ['AMD', { status: 'row', row: ROW }],
        ['NBIS', { status: 'absent' }],
        ['SMCI', { status: 'error', message: 'HTTP 503' }],
      ]),
    )
    expect(rows.map((r) => [r.symbol, r.bucket, r.readFailed])).toEqual([
      ['AMD', 'neutral', null],
      ['NBIS', 'no_data', null],
      ['SMCI', 'no_data', 'HTTP 503'],
    ])
  })

  it('throws when every read failed, so the radar is in error rather than all "no data"', () => {
    const allFailed = new Map<string, IvLookup>(
      universe.map((u) => [u.symbol, { status: 'error', message: 'HTTP 502' }]),
    )
    expect(() => ivRadarRows(universe, allFailed)).toThrow(/Every IV percentile read failed \(3 names\): HTTP 502/)
  })

  it('does not throw when the plugin answered absent for every name', () => {
    const allAbsent = new Map<string, IvLookup>(universe.map((u) => [u.symbol, { status: 'absent' }]))
    expect(ivRadarRows(universe, allAbsent).every((r) => r.bucket === 'no_data' && r.readFailed == null)).toBe(true)
  })
})
