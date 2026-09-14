import { describe, expect, it } from 'vitest'
import { decisionDraftView, hintValue } from './decisionDraft'

// Two of the fourteen pending on DEV, 2026-09-13, trimmed.
const lpg = {
  hypothesis_id: 'daily-loop-stock-explorer-lpg-run-1a078b3a64d5b6-bc05db3823',
  verdict: 'avoid',
  rationale: 'run_1a090a957b50a0c09 re-proposed LPG — already covered by this hypothesis.',
  risk_hint: {
    stop: 45.71,
    levels: { pin_wall: 55, pullback_zone: 53 },
    caveats: ['negative live VRP vs IV rank 100 — premium sale not supported'],
    invalidation: ['sepa_score < 70 (now 79.0)', 'path leaves PIVOT', 'close < 50-day 45.71'],
  },
  sizing_hint: {
    note: 'extended 19% above 50-day into a pin',
    conditional: 'if 55 close holds, starter <=3-5% NetLiq',
    recommended: 'none at current levels',
  },
}

const wt = {
  hypothesis_id: 'daily-loop-stock-explorer-wt-run-1a078b3a64d5b6a-bbee6d7aaf',
  verdict: 'watch',
  risk_hint: {
    stop: 21.47,
    targets: [25, 25.91],
    early_trigger: 'close below 22.5 GEX shelf',
    invalidation: ['close < 50-day 21.47'],
  },
  sizing_hint: {
    instrument: 'defined-risk long on a 22.5 GEX-shelf retest',
    max_risk_pct_netliq: 1,
    notional_note: '~$30k-$55k notional against the 21.47 stop',
    tranche: 'starter 0.5-1% NetLiq risk',
  },
}

describe('decisionDraftView', () => {
  it('puts the verdict, the numbers and what would prove it wrong where a reader looks', () => {
    const v = decisionDraftView(lpg)
    expect(v.verdict).toBe('avoid')
    expect(v.levels).toEqual([
      { label: 'stop', value: '45.71' },
      { label: 'pin wall', value: '55' },
      { label: 'pullback zone', value: '53' },
    ])
    expect(v.invalidation).toHaveLength(3)
    expect(v.caveats).toHaveLength(1)
    expect(v.sizingHeadline).toBe('none at current levels')
    // The headline is not repeated as a line.
    expect(v.sizing).toEqual([
      { label: 'conditional', value: 'if 55 close holds, starter <=3-5% NetLiq' },
      { label: 'note', value: 'extended 19% above 50-day into a pin' },
    ])
  })

  it('reads the other shape the curator writes, with no headline', () => {
    const v = decisionDraftView(wt)
    expect(v.levels).toEqual([
      { label: 'stop', value: '21.47' },
      { label: 'targets', value: '25 / 25.91' },
      { label: 'early trigger', value: 'close below 22.5 GEX shelf' },
    ])
    expect(v.sizingHeadline).toBeNull()
    expect(v.sizing.map((l) => l.label)).toEqual(['tranche', 'max risk', 'instrument', 'notional note'])
    expect(v.sizing[1].value).toBe('1% of NetLiq')
  })

  it('keeps a key it has not met, under its own name', () => {
    const v = decisionDraftView({
      verdict: 'hold / no new action',
      risk_hint: { why_no_order: 'D10 — observe only', concentration: { NVDA: 0.42 } },
      sizing_hint: { action: 'none', desk_note: 'wait for the print' },
    })
    expect(v.riskOther).toEqual([
      { label: 'why no order', value: 'D10 — observe only' },
      { label: 'concentration', value: 'NVDA 0.42' },
    ])
    expect(v.sizingHeadline).toBe('none')
    expect(v.sizing).toEqual([{ label: 'desk note', value: 'wait for the print' }])
    expect(decisionDraftView({})).toMatchObject({ verdict: null, levels: [], invalidation: [], sizing: [] })
  })
})

describe('hintValue', () => {
  it('flattens lists and objects to one line', () => {
    expect(hintValue([1, 'two'])).toBe('1 / two')
    expect(hintValue({ pin_wall: 55 })).toBe('pin wall 55')
    expect(hintValue(null)).toBe('—')
  })
})
