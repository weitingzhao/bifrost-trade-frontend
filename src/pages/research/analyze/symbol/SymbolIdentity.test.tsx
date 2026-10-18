import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { SymbolFaces } from './useSymbolFaces'
import { SymbolIdentity } from './SymbolIdentity'

// Reads stay unanswered: this test is about which lines the head draws.
vi.mock('@/hooks/useQuotes', () => ({ useQuotes: () => ({ data: undefined }) }))
vi.mock('@/api/research/sepaScreenerWide', () => ({ fetchSepaScreenerWide: () => new Promise(() => {}) }))
vi.mock('@/api/marketData/dailyBars', () => ({ fetchDailyClosesMulti: () => new Promise(() => {}) }))
vi.mock('@/hooks/useSymbolLegs', () => ({ useSymbolLegs: () => [], sharesHeld: () => 0 }))
vi.mock('@/lib/symbolTrail', () => ({ useSymbolTrail: () => null }))
vi.mock('@/layout/PagePlaceButtons', () => ({ PagePlaceButtons: () => null }))
vi.mock('@/components/layout', () => ({ PageFaceSwitch: () => <span>Reading | Method</span> }))
vi.mock('@/components/research', () => ({
  AddToPoolButton: () => <button type="button">Pool</button>,
  PlanThisButton: () => <button type="button">Plan this</button>,
  SaveAsHypothesisButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}))

const faces: SymbolFaces = {
  views: [],
  record: {} as SymbolFaces['record'],
  drove: null,
  decisive: { n: 0, of: 8 },
  held: false,
  watched: false,
  earnings: null,
  loading: false,
  failed: [],
}

function head(props: { wideTall?: boolean; compact?: boolean; page?: boolean; read?: SymbolFaces }) {
  const { read, ...rest } = props
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SymbolIdentity symbol="ZZA" faces={read ?? faces} tab="overview" subjectControl={<span>Follow</span>} {...rest} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  const header = container.querySelector('header') as HTMLElement
  return {
    lines: header.children.length,
    text: header.textContent ?? '',
    rows: [...header.children].map((c) => c.textContent ?? ''),
  }
}

describe('SymbolIdentity', () => {
  it('draws three lines on a wide, tall screen: the verdict on the subject line, Send ending the why line, from and snapshot shown', () => {
    const { lines, rows, text } = head({ wideTall: true })
    expect(lines).toBe(3)
    expect(text).not.toContain('Verdict')
    expect(rows[0]).toContain('No decisive edge')
    expect(rows[1]).toMatch(/lenses decisive[\s\S]*opened directly[\s\S]*Hyp/)
    expect(rows[2]).toContain('snapshot · today only')
    expect(text).not.toContain('Hypothesis')
  })

  it('keeps the same three lines everywhere else above compact, without from or the snapshot word', () => {
    const { lines, rows, text } = head({})
    expect(lines).toBe(3)
    expect(rows[0]).toContain('No decisive edge')
    expect(rows[1]).toContain('Hyp')
    expect(text).not.toContain('snapshot')
    expect(text).not.toContain('opened directly')
    // The verbs' stand-in stays: the app has no artifact id to hide.
    expect(rows[2]).toContain('read · no artifact store')
  })

  it('keeps the 440 panel head, and drops Follow / Lock and Send for the compact page', () => {
    expect(head({ compact: true }).text).toMatch(/Follow[\s\S]*Send/)
    const page = head({ compact: true, page: true })
    expect(page.text).not.toContain('Follow')
    expect(page.text).not.toContain('Send')
    expect(page.text).toContain('not held')
  })

  it('gives the compact page the why readings under the verdict, then where the name came from', () => {
    const { rows } = head({ compact: true, page: true })
    const verdict = rows.findIndex((r) => r.includes('No decisive edge'))
    const why = rows.findIndex((r) => r.includes('0 of 8 lenses decisive'))
    const from = rows.findIndex((r) => r.includes('opened directly'))
    expect(verdict).toBeGreaterThanOrEqual(0)
    expect(why).toBe(verdict + 1)
    expect(from).toBe(why + 1)
    // Nothing read and no list behind the name: no readings line at all.
    const bare = head({ compact: true, page: true, read: { ...faces, decisive: { n: 0, of: 0 } } })
    expect(bare.text).not.toContain('lenses decisive')
    expect(bare.rows.length).toBe(rows.length - 1)
  })
})
