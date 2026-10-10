import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ExhibitPayload } from '@/api/research/exhibit'
import { IvScoreReading } from './IvScoreReading'
import { ivScore } from './ivScore'

const exhibit = (value: number | null, caveats: string[] = []): ExhibitPayload => ({
  lens: 'iv_rank', symbol: 'TEST', as_of: '2026-10-09', freshness: 'fresh',
  readings: { iv_rank_1y: value, iv_percentile_1y: value }, history_summary: {}, caveats,
})
describe('Research IV scores', () => {
  it('shows withheld scores and the history reason without inventing zero', () => {
    const html = renderToStaticMarkup(<IvScoreReading exhibit={exhibit(null, ['Insufficient history: 2 sessions, needs 126'])} />)
    expect(html).toContain('Insufficient history: 2 sessions, needs 126')
    expect(html.match(/—/g)).toHaveLength(2)
    expect(ivScore(exhibit(null), 'iv_rank_1y')).toBeNull()
  })
  it('keeps missing data distinct from insufficient history', () => {
    const html = renderToStaticMarkup(<IvScoreReading exhibit={exhibit(null, ['No IV percentile rows'])} />)
    expect(html).toContain('No IV percentile rows')
    expect(html).not.toContain('Insufficient history')
    expect(ivScore(undefined, 'iv_rank_1y')).toBeNull()
  })
  it('retains a legal zero score', () => {
    expect(ivScore(exhibit(0), 'iv_rank_1y')).toBe(0)
    const html = renderToStaticMarkup(<IvScoreReading exhibit={exhibit(0)} />)
    expect(html).not.toContain('—')
    expect(html).toContain('>0<')
  })
  it('uses the authoritative measured score and rejects nonfinite values', () => {
    expect(ivScore(exhibit(37), 'iv_rank_1y')).toBe(37)
    expect(ivScore(exhibit(NaN), 'iv_rank_1y')).toBeNull()
  })
})
