// @vitest-environment jsdom
/**
 * TD-158: a list's earnings come from the batch read, one request per 500
 * names, and fill the per-name cache the Symbol page reads. Fixtures are
 * invented.
 */
import type { ReactNode } from 'react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { earningsChunks, earningsKey, useNamesEarnings } from './useNamesEarnings'

function reading(sym: string, withEstimate: boolean) {
  return {
    symbol: sym,
    dates: withEstimate ? ['2030-02-25', '2030-05-20', '2030-08-19', '2030-11-18'] : [],
    set_aside: [],
    expected_next: withEstimate
      ? { date: '2031-02-24', basis: 'same quarter last year + 52 weeks', from: '2030-02-25', days_away: 12, track: { n: 0, median_miss_days: null, max_miss_days: null } }
      : null,
    filings: withEstimate ? 9 : 0,
    first_filed: withEstimate ? '2029-01-01' : null,
    last_filed: withEstimate ? '2030-11-18' : null,
  }
}

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useNamesEarnings', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads a long list in batches of 500 and seeds each name', async () => {
    const names = Array.from({ length: 1001 }, (_, i) => `Z${String(i).padStart(4, '0')}`)
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async (url) => {
      const asked = new URL(url, 'http://x').searchParams.get('symbols')!.split(',')
      const data = Object.fromEntries(asked.map((s, i) => [s, reading(s, i % 2 === 0)]))
      return new Response(JSON.stringify({ ok: true, data }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useNamesEarnings([...names, ' z0000 ']), { wrapper: wrap(qc) })

    await waitFor(() => expect(Object.keys(result.current)).toHaveLength(1001))
    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [url] of fetchMock.mock.calls) expect(String(url)).toContain('/research/narrative/earnings/batch?symbols=')
    expect(result.current.Z0000).toMatchObject({ kind: 'expected', next: { date: '2031-02-24', daysAway: 12 } })
    expect(result.current.Z0001).toMatchObject({ kind: 'none', absence: { code: 'no_filings' } })
    // The Symbol page's per-name read finds the name already answered.
    expect(qc.getQueryData(earningsKey('Z1000'))).toMatchObject({ symbol: 'Z1000' })
  })

  it('a failed batch leaves its names unread, not without earnings', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useNamesEarnings(['ZZA', 'ZZB']), { wrapper: wrap(qc) })
    await waitFor(() => expect(Object.keys(result.current)).toHaveLength(2))
    expect(result.current.ZZA).toMatchObject({ kind: 'none', absence: { code: 'unread' } })
  })

  it('splits sorted names into calls of at most 500', () => {
    expect(earningsChunks(['A', 'B', 'C'], 2)).toEqual([['A', 'B'], ['C']])
    expect(earningsChunks([])).toEqual([])
  })
})

/**
 * Ratchet (TD-158): no list fans out one earnings request per name. The
 * single-name read is fetched only by `useEarningsDates`, and that hook is
 * called only from surfaces about one name. A new caller is added here on
 * purpose, after checking it does not sit inside a list — a list reads
 * `useNamesEarnings` (the batch).
 */
const SINGLE_NAME_SURFACES = [
  'src/components/symbolChart/SymbolPriceChart.tsx',
  'src/pages/research/analyze/history/HistoryPage.tsx',
  'src/pages/research/analyze/payoff/PayoffBody.tsx',
  'src/pages/research/analyze/symbol/SymbolChainFace.tsx',
  'src/pages/research/analyze/symbol/SymbolDealerHistory.tsx',
  'src/pages/research/analyze/symbol/SymbolFlowPcr.tsx',
  'src/pages/research/analyze/symbol/SymbolForecastSessions.tsx',
  'src/pages/research/analyze/symbol/SymbolSinceSnapshot.tsx',
  'src/pages/research/analyze/symbol/SymbolVolatilityFace.tsx',
  'src/pages/research/analyze/symbol/compactVolEarnings.ts',
  'src/pages/research/analyze/symbol/useSymbolEarnings.ts',
  'src/pages/research/analyze/symbol/useSymbolFaces.ts',
  'src/pages/research/lab/history/LabHistoryPage.tsx',
  'src/pages/research/lab/symbol/LabSymbolPage.tsx',
  'src/pages/research/stocks/method/QueueFace.tsx',
]

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return sources(p)
    return /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

describe('earnings reads per name (ratchet)', () => {
  const root = process.cwd()
  const files = sources(join(root, 'src')).map((p) => ({ path: relative(root, p), text: readFileSync(p, 'utf8') }))

  it('only useEarningsDates fetches one name', () => {
    const fetchers = files.filter((f) => /\bfetchEarningsDates\(/.test(f.text)).map((f) => f.path)
    expect(fetchers.sort()).toEqual(['src/api/research/narrative.ts', 'src/hooks/useNarrative.ts'])
  })

  it('useEarningsDates is called only from single-name surfaces', () => {
    const callers = files
      .filter((f) => /\buseEarningsDates\(/.test(f.text) && f.path !== 'src/hooks/useNarrative.ts')
      .map((f) => f.path)
    expect(callers.sort()).toEqual([...SINGLE_NAME_SURFACES].sort())
  })
})
