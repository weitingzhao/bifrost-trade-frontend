// @vitest-environment jsdom
/**
 * TD-159: whether a name lists only adjusted contracts is Research's count
 * (`option_listing` on the Dossier batch), not a ticker test here. Fixtures
 * are invented.
 */
import type { ReactNode } from 'react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adjustedOnlyListing } from '@/api/research/exhibit'
import { SymbolAdjustedOnlyNote } from './SymbolAdjustedOnlyNote'

function wrap(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function serve(listing: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, data: { symbol: 'ZZZ', lenses: [], exhibits: [], option_listing: listing } }), {
        status: 200,
      }),
    ),
  )
}

describe('SymbolAdjustedOnlyNote', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('says so when Research counts adjusted contracts and no standard one', async () => {
    serve({ as_of: '2031-10-05', standard_contracts: 0, adjusted_contracts: 14, adjusted_roots: ['ZZZ1'] })
    render(wrap(<SymbolAdjustedOnlyNote symbol="ZZZ" />))
    await waitFor(() => expect(screen.getByText(/Only adjusted contracts are listed/)).toBeTruthy())
    expect(screen.getByText(/14 ZZZ1 contracts/)).toBeTruthy()
  })

  it('stays silent on a name with a standard series, no listing, a failed count or an old server', () => {
    expect(adjustedOnlyListing({ as_of: 'x', standard_contracts: 70, adjusted_contracts: 40, adjusted_roots: ['ZZZ1'] })).toBe(false)
    expect(adjustedOnlyListing(null)).toBe(false)
    expect(adjustedOnlyListing(undefined)).toBe(false)
    expect(
      adjustedOnlyListing({ as_of: null, standard_contracts: null, adjusted_contracts: null, adjusted_roots: [], error: 'x' }),
    ).toBe(false)
  })
})

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return sources(p)
    return /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

describe('adjusted contracts are Research’s count (ratchet, TD-159)', () => {
  it('no source re-derives the adjusted root from a ticker', () => {
    const root = process.cwd()
    // Research's rule: the OCC root is the ticker less `O:` and its last 15
    // characters, and an adjusted root ends in a digit.
    const copies = [/isAdjustedOptionTicker/, /length\s*-\s*15\b/, /\[0-9\]\$\/\.test\(/, /\\d\$\/\.test\(root/]
    const hits = sources(join(root, 'src'))
      .filter((p) => copies.some((re) => re.test(readFileSync(p, 'utf8'))))
      .map((p) => relative(root, p))
    expect(hits).toEqual([])
  })
})
