import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { readGexLevels, gexRegimeStreak } from './gexReading'
import { GexLevelChips } from './GexLevelChips'
import { faceExtras } from './faceExtras'
import type { ExhibitPayload } from '@/api/research/exhibit'

const levels = { spot: 100, zero_gamma: null, major_call_wall: 110, major_put_wall: 90, total_net_gex: -500, expiry: '2031-11-21' }
const exhibit = (readings: Record<string, unknown>): ExhibitPayload => ({ lens: 'gex_regime', symbol: 'TEST', as_of: '2031-10-20', freshness: 'fresh', readings, history_summary: {}, caveats: [] })

describe('Research daily GEX semantics (TD-274)', () => {
  it.each([-500, 500])('keeps both walls without a flip, with net gamma %s', (net) => {
    const row = { ...levels, total_net_gex: net }
    expect(readGexLevels(row)).toMatchObject({ noFlip: true, longGamma: net >= 0, callLabel: '110', putLabel: '90' })
    const extras = faceExtras([exhibit(row)], { held: false, watched: false }).dealer
    expect(extras?.values?.gex_regime).toBe(`${net < 0 ? 'negative' : 'positive'} γ · no flip`)
    expect(extras?.rows?.find((r) => r.id === 'walls')?.value).toBe('90 / 110')
  })
  it.each([undefined, {}, { zero_gamma: null }, { ...levels, total_net_gex: null }, { ...levels, zero_gamma: undefined }, { zero_gamma: null, total_net_gex: 0, major_call_wall: null, major_put_wall: null }])('does not invent no flip from an incomplete or exposure-free reading', (row) => {
    expect(readGexLevels(row).noFlip).toBe(false)
    expect(readGexLevels(row).zeroLabel).toBe('—')
  })
  it('uses the net sign even when spot is below an existing flip', () => {
    expect(readGexLevels({ ...levels, zero_gamma: 105, total_net_gex: 500 })).toMatchObject({ noFlip: false, longGamma: true, zeroLabel: '105' })
  })
  it('retains the opposite wall and explains an empty exposure side', () => {
    expect(readGexLevels({ ...levels, major_call_wall: null })).toMatchObject({ callLabel: 'no call exposure', putLabel: '90' })
    expect(readGexLevels({ ...levels, major_put_wall: null })).toMatchObject({ putLabel: 'no put exposure', callLabel: '110' })
  })
  it('Chain renders no flip beside the real wall values', () => {
    render(<GexLevelChips readings={levels} />)
    expect(screen.getByText('no flip')).toBeInTheDocument()
    expect(within(screen.getByText('Call wall').parentElement!).getByText('110')).toBeInTheDocument()
    expect(within(screen.getByText('Put wall').parentElement!).getByText('90')).toBeInTheDocument()
  })
  it('Chain keeps missing data distinct from no flip', () => {
    render(<GexLevelChips readings={{}} />)
    expect(screen.queryByText('no flip')).not.toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(3)
  })
  it('Chain keeps the existing flip and the available side of a one-sided row', () => {
    render(<GexLevelChips readings={{ ...levels, zero_gamma: 105, major_put_wall: null }} />)
    expect(screen.getByText('105')).toBeInTheDocument()
    expect(screen.getByText('110')).toBeInTheDocument()
    expect(screen.getByText('no put exposure')).toBeInTheDocument()
  })
  it('no-flip sessions count, while missing sessions break a regime streak', () => {
    const negative = { longGamma: readGexLevels(levels).longGamma }
    expect(gexRegimeStreak([negative, { longGamma: null }, negative, negative])).toEqual({ streak: 2, longGamma: false })
    expect(gexRegimeStreak([negative, { longGamma: null }])).toEqual({ streak: null, longGamma: null })
  })
})
