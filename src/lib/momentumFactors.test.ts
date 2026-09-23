import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import {
  FACTOR_COLD_AT,
  FACTOR_HOT_AT,
  MOMENTUM_FACTORS,
  momentumFactorReadings,
  momentumFactorText,
  momentumFactorTone,
} from './momentumFactors'

const byKey = (k: string) => MOMENTUM_FACTORS.find((f) => f.key === k)!

describe('the nine factors', () => {
  it('are the engine\'s own nine, in the legend\'s order', () => {
    expect(MOMENTUM_FACTORS.map((f) => f.key)).toEqual([
      'z_sdt',
      'z_v',
      'accept_vwap',
      'z_ofi',
      'h_52w',
      'o_plus',
      'a_factor',
      'r_sec',
      'crash',
    ])
  })

  it('are defined here and nowhere else', () => {
    // They were prose inside Momentum Radar's legend until Stock ratings
    // became the second reader; that page has since been retired (2026-09-23)
    // and these are the only copy. The invariant worth holding is that no
    // page writes one out again — two copies that happen to agree today are
    // the state §14.2 exists to get out of.
    const files = execSync("grep -rl --include=*.ts --include=*.tsx 'extended up' src", {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
      .filter((f) => !f.endsWith('momentumFactors.ts') && !f.endsWith('momentumFactors.test.ts'))
    expect(files, 'a second copy of the factor legend').toEqual([])
    for (const f of MOMENTUM_FACTORS) expect(f.note.length, f.key).toBeGreaterThan(0)
  })

  it('names the one factor that cannot be read, and only that one', () => {
    expect(MOMENTUM_FACTORS.filter((f) => f.pinned).map((f) => f.key)).toEqual(['z_ofi'])
  })
})

describe('reading a factor on the scale the engine actually returns', () => {
  it('reads 0–100 scores, not z-scores', () => {
    // The prototype colours on ±1.5. On this scale 1.5 is near the floor, so
    // the same value has to read weak, not strong.
    expect(momentumFactorTone(byKey('z_sdt'), 1.5)).toBe('weak')
    expect(momentumFactorTone(byKey('z_sdt'), 85.1)).toBe('strong')
    expect(momentumFactorTone(byKey('z_sdt'), 55)).toBe('plain')
  })

  it('takes the boundaries inclusively, as the composite does', () => {
    expect(momentumFactorTone(byKey('h_52w'), FACTOR_HOT_AT)).toBe('strong')
    expect(momentumFactorTone(byKey('h_52w'), FACTOR_COLD_AT)).toBe('weak')
    expect(momentumFactorTone(byKey('h_52w'), FACTOR_COLD_AT + 0.1)).toBe('plain')
  })

  it('never gives the pinned factor a reading, whatever it is sent', () => {
    // 50.0 is the value the engine always returns for it; neutral would say
    // "measured, middling", and it was not measured.
    expect(momentumFactorTone(byKey('z_ofi'), 50)).toBe('unread')
    expect(momentumFactorTone(byKey('z_ofi'), 99)).toBe('unread')
    expect(momentumFactorText(byKey('z_ofi'), 50)).toBe('—')
  })

  it('separates a missing value from a zero', () => {
    expect(momentumFactorText(byKey('r_sec'), null)).toBe('—')
    expect(momentumFactorTone(byKey('r_sec'), null)).toBe('unread')
    expect(momentumFactorText(byKey('r_sec'), 0)).toBe('0.0')
    expect(momentumFactorTone(byKey('r_sec'), 0)).toBe('weak')
  })
})

describe('a row of readings', () => {
  it('is nine long even when the response carries none of them', () => {
    const rows = momentumFactorReadings(null)
    expect(rows).toHaveLength(9)
    expect(rows.every((r) => r.text === '—' && r.tone === 'unread')).toBe(true)
  })

  it('reads a real DEV row (AMD, 2026-09-21) the way the page will', () => {
    const rows = momentumFactorReadings({
      z_sdt: 79.8426,
      z_v: 96.5145,
      accept_vwap: 76.6902,
      z_ofi: 50,
      h_52w: 100,
      o_plus: 100,
      a_factor: 100,
      r_sec: 81.1508,
      crash: 98.5771,
    })
    expect(rows.map((r) => r.text)).toEqual([
      '79.8',
      '96.5',
      '76.7',
      '—',
      '100.0',
      '100.0',
      '100.0',
      '81.2',
      '98.6',
    ])
    expect(rows.filter((r) => r.tone === 'strong')).toHaveLength(8)
    expect(rows.find((r) => r.key === 'z_ofi')?.tone).toBe('unread')
  })
})
