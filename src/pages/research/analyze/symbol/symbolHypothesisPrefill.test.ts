import { describe, expect, it } from 'vitest'
import type { DossierFaceView, DossierRow } from '@/lib/dossier'
import { symbolHypothesisPrefill } from './symbolHypothesisPrefill'

const row = (id: string, label: string, band: DossierRow['band'], value: string | null): DossierRow =>
  ({ id, label, band, value, verdict: `${label} ${band ?? 'n/a'}`, means: null, asOf: '2026-09-25', href: '', lamp: 'grey', tone: 'neutral', record: null, rates: null, sample: null, recordDetail: null }) as unknown as DossierRow

const view = (id: string, title: string, headline: string, rows: DossierRow[]): DossierFaceView =>
  ({ face: { id, title }, rows, headline, means: 'premium is cheap', tone: 'neutral', lamp: 'grey', coverage: null, href: '' }) as unknown as DossierFaceView

const views = [
  view('volatility', 'Volatility', 'Buy premium bias', [row('iv_rank', 'IV Rank', 'cold', '16'), row('skew', 'Skew', null, null)]),
  view('dealer', 'Dealer levels', 'Positive gamma', [row('gex_regime', 'Gamma regime', 'hot', 'positive γ')]),
]

describe('symbolHypothesisPrefill', () => {
  it('fills the open lens face — its headline, lenses and readings', () => {
    const p = symbolHypothesisPrefill('PLTR', 'volatility', views, 'page thesis')
    expect(p.title).toBe('PLTR — Volatility: Buy premium bias')
    expect(p.thesis).toBe('Buy premium bias — premium is cheap. Readings: IV Rank 16 (cold).')
    expect(p.tags).toEqual(['symbol', 'volatility', 'iv_rank'])
    expect(p.originRef).toMatchObject({ tab: 'volatility', face: 'volatility', readings: { iv_rank: { band: 'cold', value: '16' } } })
  })

  it('falls back to the decisive lenses across the page off a lens face', () => {
    const p = symbolHypothesisPrefill('PLTR', 'chain', views, 'Buy premium bias · Positive gamma')
    expect(p.tags).toEqual(['symbol', 'iv_rank', 'gex_regime'])
    expect(p.thesis).toBe('Buy premium bias · Positive gamma. Readings: IV Rank 16 (cold) · Gamma regime positive γ (hot).')
    expect(p.originRef).not.toHaveProperty('face')
  })

  it('does not double the full stop when the meaning ends in one', () => {
    const v = [view('scenario', 'Scenario', 'Range — fade extremes', [row('terrain_regime', 'Terrain regime', 'neutral' as DossierRow['band'], 'range')])]
    ;(v[0] as unknown as { means: string }).means = 'wait for another lens to confirm.'
    const p = symbolHypothesisPrefill('PLTR', 'scenario', v, 'x')
    expect(p.thesis).toBe('Range — fade extremes — wait for another lens to confirm. Readings: Terrain regime range (neutral).')
  })
})
